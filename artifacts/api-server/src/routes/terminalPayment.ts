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
 * Hängt ein Vorgang in 'finalizing' (Crash mitten im Abschluss), heilt ihn
 * das Polling nach 90 s selbst; Rest-Fälle finalisiert der Sweeper nach
 * (lib/finalizeFiscal.ts — idempotent, ein Schreiber via State-Guard).
 */
import { Router } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { getStripe } from "../stripeClient.js";
import { currentBusinessDay } from "../lib/businessDay.js";
import { resolveVat } from "../lib/products.js";
import { terminalFloorCents } from "../lib/terminalPricing.js";
import { finalizeFiscalTransaction, rowItems } from "../lib/finalizeFiscal.js";
import { isFiskalyConfigured } from "../fiskaly/config.js";
import { abortTransaction, startTransaction } from "../fiskaly/client.js";
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
 * PaymentModal: { id?, itemId?, number?, code?, name, price (EUR), quantity }.
 *
 * Preis-Autorität (P1-1, Floor-Guard): Der Server erzwingt Client-Preis ≥
 * Basispreis aus dem generierten Terminal-Katalog. Unbekannte itemId → Ablehnen
 * (jede legitime Warenkorb-Zeile hat eine Katalog-itemId; Optionen/Toppings sind
 * in Preis+sizeLabel gefaltet, keine eigenen Zeilen). Der Server bestimmt zudem
 * den USt-Satz (Steuer-Autorität). Modifikatoren schlagen nur auf → der
 * legitime Preis liegt nie unter der Basis, deshalb keine False-Ablehnung.
 */
function parseItems(raw: unknown[]): { items: ParsedItem[]; error?: string; unknownIds: string[] } {
  const items: ParsedItem[] = [];
  const unknownIds: string[] = [];
  const underpriced: string[] = [];

  for (const entry of raw as Record<string, unknown>[]) {
    const id = typeof entry?.id === "string" ? entry.id.trim() : "";
    const itemId = typeof entry?.itemId === "string" ? entry.itemId.trim() : "";
    const numberCode = typeof entry?.number === "string" ? entry.number.trim() : "";
    const code = typeof entry?.code === "string" ? entry.code.trim() : "";
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    const priceEur = Number(entry?.price);
    const quantity = normalizeQuantity(entry?.quantity);

    if (!name || !Number.isFinite(priceEur) || priceEur < 0 || priceEur > 999) {
      return { items: [], error: "Ungültiger Artikel (Name/Preis).", unknownIds };
    }
    const unitPriceCents = Math.round(priceEur * 100);

    // Floor-Guard: Basispreis nachschlagen und Client-Preis dagegen prüfen.
    const floor = terminalFloorCents({ id, itemId, number: numberCode, code });
    if (!floor.known) {
      unknownIds.push(itemId || numberCode || id || code || name);
      continue; // unbekannter Artikel → nicht bepreisbar → Bestellung ablehnen
    }
    if (unitPriceCents < floor.floorCents) {
      underpriced.push(`${itemId || numberCode || id}: ${unitPriceCents}<${floor.floorCents}`);
      continue;
    }

    const { vat } = resolveVat({ id, itemId, code });

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

  if (unknownIds.length > 0) {
    return { items: [], error: `Unbekannte Artikel: ${unknownIds.join(", ")}`, unknownIds };
  }
  if (underpriced.length > 0) {
    // Manipulierter Client-Preis unter der Basis — Bestellung verweigern.
    console.error("terminal checkout: Preis unter Basispreis abgelehnt:", underpriced.join("; "));
    return { items: [], error: "Preisprüfung fehlgeschlagen.", unknownIds };
  }

  return { items, unknownIds };
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

    const { items, error } = parseItems(rawItems);
    if (error) return res.status(400).json({ error });

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
      // P0-1 Self-Heal: Starb der finalisierende Request (Crash/Timeout
      // zwischen Claim und finalem Update), hinge die Zeile sonst für immer
      // hier — Geld eingezogen, keine Order, kein Beleg. Nach 90 s ohne
      // Fortschritt re-claimt genau EIN Poller (atomar über updated_at)
      // und holt die Finalisierung nach.
      const STUCK_MS = 90_000;
      const updatedAt = Date.parse(String(row.updated_at ?? ""));
      if (Number.isFinite(updatedAt) && Date.now() - updatedAt < STUCK_MS) {
        return res.json({ state: "finalizing" });
      }
      const { data: reclaimed } = await supabase
        .from("fiscal_transactions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", fiscalId)
        .eq("state", "finalizing")
        .lt("updated_at", new Date(Date.now() - STUCK_MS).toISOString())
        .select("id");
      if (!reclaimed || reclaimed.length === 0) {
        return res.json({ state: "finalizing" });
      }
      console.warn(`Self-Heal: hängender finalizing-Vorgang ${fiscalId} wird nachfinalisiert.`);
      const healed = await finalizeFiscalTransaction(supabase, row);
      return res.json({ state: "completed", order_number: healed.orderNumber, receipt_id: fiscalId });
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

    // TSE FINISH → n8n → completed/tse_error, mit State-Guard + Rückgabecheck.
    // Scheitert der Abschluss, bleibt die Zeile 'finalizing' und wird per
    // Self-Heal (oben) oder Sweeper nachgeholt — kein schwarzes Loch mehr.
    const result = await finalizeFiscalTransaction(supabase, row);

    // Auch bei TSE-Fehler: Kunde hat bezahlt → Success-Screen mit Nummer;
    // Beleg-Seite weist den TSE-Ausfall aus (Pflicht bei Ausfall).
    return res.json({ state: "completed", order_number: result.orderNumber, receipt_id: fiscalId });
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
    // P2-5: State-Guard gegen das TOCTOU-Race — zwischen dem Read oben und
    // diesem Update kann das Polling den Vorgang bereits finalisiert haben.
    // Ohne Guard würde ein 'completed' hier zu 'canceled' überschrieben
    // (bezahlter Vorgang sähe aus wie storniert).
    const { data: cancelled } = await supabase.from("fiscal_transactions")
      .update({ state: "canceled", updated_at: new Date().toISOString() })
      .eq("id", fiscalId)
      .in("state", ["created", "waiting_payment"])
      .select("id");
    if (!cancelled || cancelled.length === 0) {
      return res.status(409).json({ error: "Zahlung ist bereits abgeschlossen." });
    }

    return res.json({ ok: true, state: "canceled" });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
  }
});

export default router;
