// artifacts/api-server/src/routes/fiscalClosing.ts
/**
 * Täglicher Fiskal-Job (Vercel-Cron) + DSFinV-K-Export fürs Finanzamt.
 *
 *   GET|POST /api/fiscal/closing  (Auth: Bearer CRON_SECRET)
 *     1) Sweeper: verwaiste Vorgänge (>30 min created/waiting_payment)
 *        → PI canceln, TSE-tx als CANCELLATION beenden, Zeile canceled.
 *        P0-1: hängende finalizing-Vorgänge mit bezahltem PI werden
 *        NACHFINALISIERT (lib/finalizeFiscal.ts) statt storniert — und zwar
 *        VOR dem TSS-Sweep, der die ACTIVE-Tx sonst als CANCELLATION killt.
 *        Zusätzlich: ACTIVE-Transaktionen direkt auf der TSS abräumen.
 *     2) n8n-Retry: completed-Zeilen mit n8n_posted=false erneut zur Küche.
 *     3) Closing: Vortag (Berlin-Geschäftstag) → Cash-Point-Closing an DSFinV-K,
 *        closing_id auf den Zeilen stempeln. Deterministische Closing-UUID
 *        (Seed = Geschäftstag) → Cron-Retry legt kein Duplikat an.
 *
 *   GET /api/fiscal/export?from=YYYY-MM-DD&to=YYYY-MM-DD  (gleiche Auth)
 *     → Export triggern; Antwort enthält export_id + Status-/Download-Pfad.
 *   GET /api/fiscal/export/:id → Status nachschauen.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "../stripeClient.js";
import { currentBusinessDay } from "../lib/businessDay.js";
import { finalizeFiscalTransaction } from "../lib/finalizeFiscal.js";
import { isFiskalyConfigured } from "../fiskaly/config.js";
import { abortTransaction, listOpenTransactions } from "../fiskaly/client.js";
import { buildReceiptSchema, type FiscalLineItem, type VatRate } from "../fiskaly/receipt.js";
import {
  buildCashPointClosing,
  deterministicUuid,
  exportDownloadPath,
  getExport,
  submitCashPointClosing,
  triggerExport,
  upsertCashRegister,
  type ClosingTransaction,
} from "../fiskaly/dsfinvk.js";

const router = Router();

function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: "CRON_SECRET nicht gesetzt." });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
router.use(requireCronSecret);

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const N8N_ORDER_WEBHOOK_URL =
  process.env.N8N_ORDER_WEBHOOK_URL?.trim() || "https://feal.app.n8n.cloud/webhook/order_made";

type Row = Record<string, unknown> & { id: string };

function rowLineItems(row: Row): FiscalLineItem[] {
  const raw = Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : [];
  return raw.map((item) => ({
    id: String(item.id ?? ""),
    name: String(item.name ?? ""),
    quantity: Number(item.quantity ?? 1),
    unitPriceCents: Number(item.unit_price_cents ?? 0),
    vatRate: (item.vat_rate === "NORMAL" ? "NORMAL" : "REDUCED_1") as VatRate,
  }));
}

/** Gestriger Geschäftstag (Berlin): Business-Day von jetzt minus 24 h. */
function previousBusinessDay(): string {
  return currentBusinessDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

async function runSweeper(
  supabase: SupabaseClient,
): Promise<{ swept: number; recovered: number; tseSwept: number }> {
  const stripe = getStripe();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: stale } = await supabase
    .from("fiscal_transactions")
    .select("*")
    .in("state", ["created", "waiting_payment"])
    .lt("created_at", cutoff);

  let swept = 0;
  for (const row of (stale ?? []) as Row[]) {
    try {
      if (row.reader_id) {
        await stripe.terminal.readers.cancelAction(row.reader_id as string).catch(() => {});
      }
      if (row.payment_intent_id) {
        const paymentIntent = await stripe.paymentIntents.retrieve(row.payment_intent_id as string);
        if (paymentIntent.status === "succeeded") {
          // Bezahlt, aber nie finalisiert (Kiosk starb im richtigen Moment):
          // NICHT canceln — als tse_error markieren, manuell prüfen.
          await supabase.from("fiscal_transactions")
            .update({ state: "tse_error", updated_at: new Date().toISOString() })
            .eq("id", row.id).in("state", ["created", "waiting_payment"]);
          console.error(`Sweeper: bezahlter, nie finalisierter Vorgang ${row.id} → tse_error (manuell prüfen!)`);
          continue;
        }
        await stripe.paymentIntents.cancel(row.payment_intent_id as string).catch(() => {});
      }
      if (row.tse_tx_id) {
        await abortTransaction(
          row.tse_tx_id as string,
          2,
          buildReceiptSchema(rowLineItems(row), { receiptType: "CANCELLATION" }),
        ).catch(() => {}); // evtl. nie gestartet/schon beendet
      }
      await supabase.from("fiscal_transactions")
        .update({ state: "canceled", updated_at: new Date().toISOString() })
        .eq("id", row.id).in("state", ["created", "waiting_payment"]);
      swept += 1;
    } catch (err: unknown) {
      console.error(`Sweeper: Vorgang ${row.id} fehlgeschlagen:`, err instanceof Error ? err.message : err);
    }
  }

  // P0-1: In 'finalizing' hängengebliebene Vorgänge (Crash zwischen Claim und
  // Abschluss, Self-Heal im Polling kam nicht mehr — Kiosk aus). Zahlung
  // succeeded → NACHFINALISIEREN statt stornieren; nie bezahlt → abräumen.
  // Muss VOR dem TSS-Sweep laufen, sonst beendet der die bezahlte ACTIVE-Tx
  // als CANCELLATION (bezahlt + storniert = fiskalisch falsch).
  let recovered = 0;
  const { data: stuckRows } = await supabase
    .from("fiscal_transactions")
    .select("*")
    .eq("state", "finalizing")
    .lt("updated_at", cutoff);
  for (const row of (stuckRows ?? []) as Row[]) {
    try {
      const paymentIntent = row.payment_intent_id
        ? await stripe.paymentIntents.retrieve(row.payment_intent_id as string)
        : null;
      if (paymentIntent?.status === "succeeded") {
        const result = await finalizeFiscalTransaction(supabase, row);
        if (result.updated) recovered += 1;
        console.error(
          `Sweeper: hängender finalizing-Vorgang ${row.id} nachfinalisiert → ${result.state}` +
            (result.state === "tse_error" ? " (manuell prüfen!)" : ""),
        );
        continue;
      }
      // Claim ohne erfolgreiche Zahlung (sollte nicht vorkommen) → abräumen.
      if (row.payment_intent_id) {
        await stripe.paymentIntents.cancel(row.payment_intent_id as string).catch(() => {});
      }
      if (row.tse_tx_id) {
        await abortTransaction(
          row.tse_tx_id as string,
          2,
          buildReceiptSchema(rowLineItems(row), { receiptType: "CANCELLATION" }),
        ).catch(() => {});
      }
      await supabase.from("fiscal_transactions")
        .update({ state: "canceled", updated_at: new Date().toISOString() })
        .eq("id", row.id).eq("state", "finalizing");
      swept += 1;
    } catch (err: unknown) {
      console.error(`Sweeper: finalizing-Vorgang ${row.id} fehlgeschlagen:`, err instanceof Error ? err.message : err);
    }
  }

  // Sicherheitsnetz: ACTIVE-Transaktionen direkt auf der TSS (z. B. Zeile fehlt).
  let tseSwept = 0;
  try {
    const open = await listOpenTransactions();
    const halfHourAgo = Date.now() / 1000 - 30 * 60;
    for (const tx of open) {
      const startedAt = typeof tx.time_start === "number" ? tx.time_start : 0;
      if (startedAt > halfHourAgo) continue; // evtl. läuft gerade eine Zahlung
      const txId = (tx._id as string) ?? "";
      if (!txId) continue;
      await abortTransaction(txId, 2, buildReceiptSchema([], { receiptType: "CANCELLATION" }))
        .then(() => { tseSwept += 1; })
        .catch(() => {});
    }
  } catch (err: unknown) {
    console.error("Sweeper: TSS-Abfrage fehlgeschlagen:", err instanceof Error ? err.message : err);
  }

  return { swept, recovered, tseSwept };
}

async function retryN8n(supabase: SupabaseClient): Promise<number> {
  const { data: unposted } = await supabase
    .from("fiscal_transactions")
    .select("*")
    .eq("state", "completed")
    .eq("n8n_posted", false);

  let retried = 0;
  for (const row of (unposted ?? []) as Row[]) {
    try {
      const items = rowLineItems(row);
      const response = await fetch(N8N_ORDER_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "terminal",
          paymentType: "card-terminal",
          payment_status: "paid",
          sessionId: row.id,
          createdAt: row.created_at,
          totalEur: Number(((row.total_cents as number) / 100).toFixed(2)),
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.unitPriceCents / 100,
            quantity: item.quantity,
          })),
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const orderNumber = parsed.order_number ?? parsed.current_number;
      await supabase.from("fiscal_transactions")
        .update({
          n8n_posted: true,
          ...(orderNumber !== undefined && orderNumber !== null && !row.order_number
            ? { order_number: String(orderNumber) }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      retried += 1;
    } catch (err: unknown) {
      console.error(`n8n-Retry für ${row.id} fehlgeschlagen:`, err instanceof Error ? err.message : err);
    }
  }
  return retried;
}

async function runClosing(supabase: SupabaseClient, businessDay: string) {
  const { data: rows } = await supabase
    .from("fiscal_transactions")
    .select("*")
    .eq("state", "completed")
    .eq("business_day", businessDay)
    .is("closing_id", null)
    .order("created_at", { ascending: true });

  const list = (rows ?? []) as Row[];
  if (list.length === 0) return { businessDay, transactions: 0, closingId: null };

  const transactions: ClosingTransaction[] = list.map((row) => ({
    fiscalId: row.id,
    tseTxId: (row.tse_tx_id as string | null) ?? null,
    tseTxNumber: (row.tse_tx_number as number | null) ?? null,
    createdAt: String(row.created_at),
    totalCents: Number(row.total_cents ?? 0),
    items: (Array.isArray(row.items) ? row.items : []) as ClosingTransaction["items"],
    vatAmounts: (Array.isArray(row.vat_amounts) ? row.vat_amounts : []) as ClosingTransaction["vatAmounts"],
  }));

  // Laufende Abschluss-Nummer: Anzahl früherer Geschäftstage mit Closing + 1.
  const { data: closedDays } = await supabase
    .from("fiscal_transactions")
    .select("business_day")
    .not("closing_id", "is", null)
    .lt("business_day", businessDay);
  const closingSeq = new Set((closedDays ?? []).map((r: Record<string, unknown>) => r.business_day)).size + 1;

  await upsertCashRegister();
  const closingId = deterministicUuid(`lys-terminal-closing:${businessDay}`);
  await submitCashPointClosing(closingId, buildCashPointClosing(businessDay, closingSeq, transactions));

  await supabase.from("fiscal_transactions")
    .update({ closing_id: closingId, updated_at: new Date().toISOString() })
    .eq("state", "completed")
    .eq("business_day", businessDay)
    .is("closing_id", null);

  return { businessDay, transactions: transactions.length, closingId };
}

async function handleClosing(_req: Request, res: Response) {
  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "SUPABASE_* nicht gesetzt." });
  if (!isFiskalyConfigured()) return res.status(503).json({ error: "FISKALY_* nicht gesetzt." });

  try {
    const sweeper = await runSweeper(supabase);
    const n8nRetried = await retryN8n(supabase);
    const closing = await runClosing(supabase, previousBusinessDay());
    return res.json({ ok: true, sweeper, n8nRetried, closing });
  } catch (err: unknown) {
    console.error("Fiscal closing fehlgeschlagen:", err instanceof Error ? err.message : err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
  }
}

// Vercel-Cron ruft GET; manuell ist POST idiomatischer — beides erlaubt.
router.get("/closing", handleClosing);
router.post("/closing", handleClosing);

router.get("/export", async (req, res) => {
  if (!isFiskalyConfigured()) return res.status(503).json({ error: "FISKALY_* nicht gesetzt." });
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: "from/to als YYYY-MM-DD angeben." });
  }
  try {
    const { exportId } = await triggerExport(from, to);
    return res.json({
      export_id: exportId,
      status_url: `/api/fiscal/export/${exportId}`,
      download: exportDownloadPath(exportId),
      hint: "Download benötigt fiskaly-Bearer-Token (Status via status_url prüfen).",
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
  }
});

router.get("/export/:id", async (req, res) => {
  try {
    const info = await getExport(req.params.id);
    return res.json(info);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Error" });
  }
});

export default router;
