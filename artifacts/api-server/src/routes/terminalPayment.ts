// artifacts/api-server/src/routes/terminalPayment.ts
/**
 * Kartenzahlung AM Terminal (Stripe Terminal Hardware, server-driven) mit
 * KassenSichV-Fiskalisierung (fiskaly Cloud-TSE).
 *
 * Ablauf (State lebt in Supabase `fiscal_transactions`, Frontend pollt):
 *   POST /checkout    → Zeile (created) → TSE tx ACTIVE → PaymentIntent
 *                       (card_present) → Reader anstoßen → waiting_payment
 *   GET  /status/:id  → PI prüfen; bei succeeded atomarer Claim
 *                       (waiting_payment→finalizing) → TSE FINISH (RECEIPT)
 *                       → n8n (payment_status: paid) → completed
 *   POST /cancel/:id  → Reader-Action + PI canceln, TSE tx als CANCELLATION
 *
 * Compliance: Die TSE-Transaktion startet beim Vorgangsbeginn und wird IMMER
 * beendet. Der Stripe-Webhook finalisiert bewusst NICHT (ein Schreiber:
 * das Polling); Verwaiste räumt der Sweeper in /api/fiscal/closing ab.
 */
import { Router } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { getStripe } from "../stripeClient.js";
import { currentBusinessDay } from "../lib/businessDay.js";
import { resolveVat } from "../lib/products.js";
import { isFiskalyConfigured } from "../fiskaly/config.js";
import {
  abortTransaction,
  finishTransaction,
  startTransaction,
} from "../fiskaly/client.js";
import {
  buildReceiptSchema,
  buildVatAmounts,
  totalCents as sumTotalCents,
  type FiscalLineItem,
} from "../fiskaly/receipt.js";

const router = Router();

const terminalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // Checkout + Polling laufen über dieselbe Route-Gruppe
  message: { error: "Zu viele Anfragen. Bitte warte kurz." },
});
router.use(terminalLimiter);

const N8N_ORDER_WEBHOOK_URL =
  process.env.N8N_ORDER_WEBHOOK_URL?.trim() || "https://feal.app.n8n.cloud/webhook/order_made";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function normalizeQuantity(value: unknown): number {
  const qty = Math.floor(Number(value));
  if (!Number.isFinite(qty)) return 1;
  return Math.min(20, Math.max(1, qty));
}

type ParsedItem = FiscalLineItem & { code?: string; boxOption?: string };

/**
 * Items in Fiskal-Positionen übersetzen. Gleiche Shape wie pay-at-counter/
 * PaymentModal: { id?, itemId?, cartId?, code?, name, price (EUR), quantity }.
 * Server validiert Bounds und bestimmt den USt-Satz (Steuer-Autorität).
 */
function parseItems(raw: unknown[]): { items: ParsedItem[]; error?: string; unknownIds: string[] } {
  const items: ParsedItem[] = [];
  const unknownIds: string[] = [];

  for (const entry of raw as Record<string, unknown>[]) {
    const id = typeof entry?.id === "string" ? entry.id.trim() : "";
    const itemId = typeof entry?.itemId === "string" ? entry.itemId.trim() : "";
    const code = typeof entry?.code === "string" ? entry.code.trim() : "";
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    const priceEur = Number(entry?.price);
    const quantity = normalizeQuantity(entry?.quantity);

    if (!name || !Number.isFinite(priceEur) || priceEur < 0 || priceEur > 999) {
      return { items: [], error: "Ungültiger Artikel (Name/Preis).", unknownIds };
    }
    const unitPriceCents = Math.round(priceEur * 100);

    const { vat, unknown } = resolveVat({ id, itemId, code });
    if (unknown) unknownIds.push(id || itemId || code || name);

    items.push({
      id: id || itemId || code || name,
      code: code || undefined,
      name,
      quantity,
      unitPriceCents,
      vatRate: vat,
      boxOption: typeof entry?.box_option === "string" ? entry.box_option : undefined,
    });
  }

  return { items, unknownIds };
}

/** n8n-Post mit engem Budget (2 Versuche × 6 s) — muss in maxDuration 30 passen. */
async function postPaidOrderToN8n(payload: Record<string, unknown>): Promise<{ orderNumber: string | null }> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(N8N_ORDER_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error(`n8n webhook HTTP ${response.status}`);
      const raw = await response.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch {
        parsed = {};
      }
      const value = parsed.order_number ?? parsed.current_number;
      const orderNumber =
        typeof value === "number" && Number.isFinite(value)
          ? String(value)
          : typeof value === "string" && value.trim()
            ? value.trim()
            : null;
      return { orderNumber };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error("n8n webhook error");
      if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw lastError ?? new Error("n8n webhook failed");
}

function n8nPayload(fiscalId: string, items: ParsedItem[], boxOption: string | null) {
  return {
    source: "terminal",
    paymentType: "card-terminal",
    payment_status: "paid",
    sessionId: fiscalId,
    createdAt: new Date().toISOString(),
    totalEur: Number((sumTotalCents(items) / 100).toFixed(2)),
    box_option: boxOption,
    items: items.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      price: item.unitPriceCents / 100,
      quantity: item.quantity,
      ...(item.boxOption ? { box_option: item.boxOption } : {}),
    })),
  };
}

function rowItems(row: { items: unknown }): FiscalLineItem[] {
  const raw = Array.isArray(row.items) ? row.items : [];
  return (raw as Record<string, unknown>[]).map((item) => ({
    id: String(item.id ?? ""),
    name: String(item.name ?? ""),
    quantity: Number(item.quantity ?? 1),
    unitPriceCents: Number(item.unit_price_cents ?? 0),
    vatRate: item.vat_rate === "NORMAL" ? "NORMAL" : "REDUCED_1",
  }));
}

/** TSE-Transaktion als Abbruch beenden; Fehler nur loggen (Sweeper ist Fallback). */
async function abortTseQuietly(tseTxId: string | null, items: FiscalLineItem[], log: (msg: string) => void) {
  if (!tseTxId) return;
  try {
    await abortTransaction(tseTxId, 2, buildReceiptSchema(items, { receiptType: "CANCELLATION" }));
  } catch (err: unknown) {
    log(`TSE-Abbruch fehlgeschlagen (Sweeper räumt auf): ${err instanceof Error ? err.message : err}`);
  }
}

router.post("/checkout", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({ error: "Bestellservice nicht konfiguriert (SUPABASE_*)." });
  }
  const readerId = process.env.STRIPE_TERMINAL_READER_ID;
  if (!readerId || !isFiskalyConfigured()) {
    // TSE/Reader fehlen → Kartenzahlung gar nicht erst anbieten (orderbird = Fallback).
    return res.status(503).json({
      error: "Kartenzahlung am Terminal ist gerade nicht verfügbar. Bitte an der Kasse bezahlen.",
    });
  }

  try {
    const body = req.body ?? {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) return res.status(400).json({ error: "Cart is empty" });

    const { items, error, unknownIds } = parseItems(rawItems);
    if (error) return res.status(400).json({ error });
    if (unknownIds.length > 0 && process.env.NODE_ENV !== "production") {
      console.warn("terminal checkout: unbekannte Artikel-IDs (USt-Default 7 %):", unknownIds.join(", "));
    }

    const total = sumTotalCents(items);
    if (total < 50) return res.status(400).json({ error: "Betrag zu klein." });

    const boxOption = typeof body.box_option === "string" ? body.box_option : null;
    const tseTxId = randomUUID();

    const { data: inserted, error: insertError } = await supabase
      .from("fiscal_transactions")
      .insert({
        state: "created",
        reader_id: readerId,
        tse_tx_id: tseTxId,
        items: items.map((item) => ({
          id: item.id,
          code: item.code,
          name: item.name,
          quantity: item.quantity,
          unit_price_cents: item.unitPriceCents,
          vat_rate: item.vatRate,
          ...(item.boxOption ? { box_option: item.boxOption } : {}),
        })),
        vat_amounts: buildVatAmounts(items),
        total_cents: total,
        payment_type: "NON_CASH",
        business_day: currentBusinessDay(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return res.status(500).json({ error: "Bestellung konnte nicht gespeichert werden." });
    }
    const fiscalId = inserted.id as string;

    // 1) TSE-Transaktion starten (Vorgangsbeginn). Ohne Signatur keine Kartenzahlung.
    try {
      await startTransaction(tseTxId);
    } catch (err: unknown) {
      await supabase.from("fiscal_transactions")
        .update({ state: "tse_error", updated_at: new Date().toISOString() })
        .eq("id", fiscalId);
      console.error("TSE start fehlgeschlagen:", err instanceof Error ? err.message : err);
      return res.status(503).json({
        error: "Kartenzahlung am Terminal ist gerade nicht verfügbar. Bitte an der Kasse bezahlen.",
      });
    }

    // 2) PaymentIntent + Reader anstoßen.
    const stripe = getStripe();
    let paymentIntentId: string | null = null;
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total,
        currency: "eur",
        payment_method_types: ["card_present"],
        capture_method: "automatic",
        metadata: { fiscal_id: fiscalId },
      });
      paymentIntentId = paymentIntent.id;
      await stripe.terminal.readers.processPaymentIntent(readerId, {
        payment_intent: paymentIntent.id,
      });
    } catch (err: unknown) {
      // Reader busy/offline oder Stripe-Fehler → TSE-Vorgang sauber abbrechen.
      await abortTseQuietly(tseTxId, items, (msg) => console.error(msg));
      if (paymentIntentId) {
        await stripe.paymentIntents.cancel(paymentIntentId).catch(() => {});
      }
      await supabase.from("fiscal_transactions")
        .update({ state: "canceled", payment_intent_id: paymentIntentId, updated_at: new Date().toISOString() })
        .eq("id", fiscalId);

      const message = err instanceof Error ? err.message : "Stripe-Fehler";
      const busy = /busy|in_progress|intent_in_progress/i.test(message);
      return res.status(busy ? 409 : 502).json({
        error: busy
          ? "Das Kartenlesegerät ist gerade belegt. Bitte kurz warten und erneut versuchen."
          : "Kartenzahlung konnte nicht gestartet werden. Bitte an der Kasse bezahlen.",
      });
    }

    await supabase.from("fiscal_transactions")
      .update({ state: "waiting_payment", payment_intent_id: paymentIntentId, updated_at: new Date().toISOString() })
      .eq("id", fiscalId);

    return res.json({ id: fiscalId });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
  }
});

router.get("/status/:id", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "Nicht konfiguriert." });

  const fiscalId = req.params.id;
  if (!UUID_RE.test(fiscalId)) return res.status(400).json({ error: "Ungültige ID." });

  try {
    const { data: row } = await supabase
      .from("fiscal_transactions")
      .select("*")
      .eq("id", fiscalId)
      .single();
    if (!row) return res.status(404).json({ error: "Unbekannter Vorgang." });

    // Endzustände: idempotent zurückgeben.
    if (row.state === "completed") {
      return res.json({ state: "completed", order_number: row.order_number, receipt_id: row.id });
    }
    if (row.state === "canceled" || row.state === "payment_failed" || row.state === "tse_error") {
      return res.json({ state: row.state });
    }
    if (row.state === "finalizing") {
      return res.json({ state: "finalizing" });
    }
    if (row.state !== "waiting_payment" || !row.payment_intent_id) {
      return res.json({ state: "waiting" });
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(row.payment_intent_id);

    if (paymentIntent.status === "canceled") {
      await abortTseQuietly(row.tse_tx_id, rowItems(row), (msg) => console.error(msg));
      await supabase.from("fiscal_transactions")
        .update({ state: "payment_failed", updated_at: new Date().toISOString() })
        .eq("id", fiscalId);
      return res.json({ state: "payment_failed" });
    }

    if (paymentIntent.status !== "succeeded") {
      return res.json({ state: "waiting" });
    }

    // Zahlung erfolgreich → Finalisierung atomar beanspruchen (genau EIN Schreiber).
    const { data: claimed } = await supabase
      .from("fiscal_transactions")
      .update({ state: "finalizing", updated_at: new Date().toISOString() })
      .eq("id", fiscalId)
      .eq("state", "waiting_payment")
      .select("id");
    if (!claimed || claimed.length === 0) {
      return res.json({ state: "finalizing" });
    }

    const items = rowItems(row);

    // 1) TSE FINISH (RECEIPT). Bei TSE-Fehler: Zahlung ist durch — Order trotzdem
    //    zur Küche, Ausfall dokumentieren (tse_error) und laut loggen.
    let tseUpdate: Record<string, unknown> = {};
    let tseFailed = false;
    try {
      const finished = await finishTransaction(row.tse_tx_id, 2, buildReceiptSchema(items));
      tseUpdate = {
        tse_tx_number: finished.number ?? null,
        tse_serial: finished.tss_serial_number ?? null,
        tse_signature_counter: finished.signature?.counter ?? null,
        tse_signature_value: finished.signature?.value ?? null,
        tse_signature_algorithm: finished.signature?.algorithm ?? null,
        tse_time_format: finished.log?.timestamp_format ?? null,
        tse_time_start: finished.time_start ? new Date(finished.time_start * 1000).toISOString() : null,
        tse_time_end: finished.time_end ? new Date(finished.time_end * 1000).toISOString() : null,
        tse_qr_data: finished.qr_code_data ?? null,
        tse_raw: finished,
      };
    } catch (err: unknown) {
      tseFailed = true;
      console.error("TSE FINISH fehlgeschlagen (TSE-Ausfall dokumentieren!):", err instanceof Error ? err.message : err);
    }

    // 2) Bestellung zur Küche (n8n) — Kunde HAT bezahlt.
    let orderNumber: string | null = null;
    let n8nPosted = false;
    try {
      const boxOption =
        ((Array.isArray(row.items) ? (row.items as Record<string, unknown>[]).find((i) => i.box_option) : null)
          ?.box_option as string | null) ?? null;
      const result = await postPaidOrderToN8n(n8nPayload(fiscalId, items as ParsedItem[], boxOption));
      orderNumber = result.orderNumber;
      n8nPosted = true;
    } catch (err: unknown) {
      console.error("n8n-Post nach Zahlung fehlgeschlagen (Cron retried):", err instanceof Error ? err.message : err);
    }

    await supabase.from("fiscal_transactions")
      .update({
        ...tseUpdate,
        state: tseFailed ? "tse_error" : "completed",
        order_number: orderNumber,
        n8n_posted: n8nPosted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fiscalId);

    // Auch bei TSE-Fehler: Kunde hat bezahlt → Success-Screen mit Nummer;
    // Beleg-Seite weist den TSE-Ausfall aus (Pflicht bei Ausfall).
    return res.json({ state: "completed", order_number: orderNumber, receipt_id: fiscalId });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
  }
});

router.post("/cancel/:id", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "Nicht konfiguriert." });

  const fiscalId = req.params.id;
  if (!UUID_RE.test(fiscalId)) return res.status(400).json({ error: "Ungültige ID." });

  try {
    const { data: row } = await supabase
      .from("fiscal_transactions")
      .select("*")
      .eq("id", fiscalId)
      .single();
    if (!row) return res.status(404).json({ error: "Unbekannter Vorgang." });
    if (row.state === "completed" || row.state === "finalizing") {
      return res.status(409).json({ error: "Zahlung ist bereits abgeschlossen." });
    }
    if (row.state !== "waiting_payment" && row.state !== "created") {
      return res.json({ ok: true, state: row.state });
    }

    const stripe = getStripe();
    if (row.reader_id) {
      await stripe.terminal.readers.cancelAction(row.reader_id).catch(() => {});
    }
    if (row.payment_intent_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(row.payment_intent_id);
      if (paymentIntent.status === "succeeded") {
        // Race: Karte war schneller — Polling schließt den Vorgang ab.
        return res.status(409).json({ error: "Zahlung ist bereits erfolgt." });
      }
      await stripe.paymentIntents.cancel(row.payment_intent_id).catch(() => {});
    }

    await abortTseQuietly(row.tse_tx_id, rowItems(row), (msg) => console.error(msg));
    await supabase.from("fiscal_transactions")
      .update({ state: "canceled", updated_at: new Date().toISOString() })
      .eq("id", fiscalId);

    return res.json({ ok: true, state: "canceled" });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
  }
});

export default router;
