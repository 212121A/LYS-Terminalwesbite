// artifacts/api-server/src/lib/finalizeFiscal.ts
/**
 * Finalisierung eines BEZAHLTEN Terminal-Vorgangs: TSE FINISH (RECEIPT) →
 * Bestellung zur Küche (n8n) → Zeile completed/tse_error.
 *
 * Wird vom Status-Polling (Normalfall + Self-Heal nach Crash) UND vom
 * Sweeper in /api/fiscal/closing (Nachholer) aufgerufen. Deshalb idempotent:
 * - eine bereits FINISHED TSE-Transaktion wird gelesen statt erneut beendet
 *   (Crash zwischen TSE FINISH und DB-Update),
 * - n8n wird nur gepostet, wenn n8n_posted noch false ist,
 * - das finale Update greift nur mit State-Guard (state='finalizing') und
 *   der Erfolg wird geprüft — scheitert es, bleibt die Zeile 'finalizing'
 *   und Self-Heal/Sweeper holen später nach. Nichts geht still verloren.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  finishTransaction,
  getTransaction,
  type FiskalyTxResponse,
} from "../fiskaly/client.js";
import {
  buildReceiptSchema,
  totalCents as sumTotalCents,
  type FiscalLineItem,
} from "../fiskaly/receipt.js";

const N8N_ORDER_WEBHOOK_URL =
  process.env.N8N_ORDER_WEBHOOK_URL?.trim() || "https://feal.app.n8n.cloud/webhook/order_made";

export type FiscalRow = Record<string, unknown> & { id: string };

type PayloadItem = FiscalLineItem & { code?: string; boxOption?: string };

export function rowItems(row: { items: unknown }): FiscalLineItem[] {
  const raw = Array.isArray(row.items) ? row.items : [];
  return (raw as Record<string, unknown>[]).map((item) => ({
    id: String(item.id ?? ""),
    name: String(item.name ?? ""),
    quantity: Number(item.quantity ?? 1),
    unitPriceCents: Number(item.unit_price_cents ?? 0),
    vatRate: item.vat_rate === "NORMAL" ? "NORMAL" : "REDUCED_1",
  }));
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

function n8nPayload(fiscalId: string, items: PayloadItem[], boxOption: string | null) {
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

export type FinalizeResult = {
  state: "completed" | "tse_error";
  orderNumber: string | null;
  /** false = finales Update griff nicht (Zeile war nicht mehr 'finalizing' oder DB-Fehler). */
  updated: boolean;
};

export async function finalizeFiscalTransaction(
  supabase: SupabaseClient,
  row: FiscalRow,
): Promise<FinalizeResult> {
  const fiscalId = row.id;
  const items = rowItems({ items: row.items });

  // 1) TSE FINISH (RECEIPT). Bei TSE-Fehler: Zahlung ist durch — Order trotzdem
  //    zur Küche, Ausfall dokumentieren (tse_error) und laut loggen.
  let tseUpdate: Record<string, unknown> = {};
  let tseFailed = false;
  try {
    let finished: FiskalyTxResponse;
    try {
      finished = await finishTransaction(String(row.tse_tx_id), 2, buildReceiptSchema(items));
    } catch (finishErr: unknown) {
      // Nachholer-Fall: Crash lag NACH dem FINISH → Tx ist schon FINISHED,
      // erneutes Beenden schlägt fehl. Dann Signaturdaten lesen statt beenden.
      const existing = row.tse_tx_id
        ? await getTransaction(String(row.tse_tx_id)).catch(() => null)
        : null;
      if (existing?.state === "FINISHED") {
        finished = existing;
      } else {
        throw finishErr;
      }
    }
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
    console.error(
      "TSE FINISH fehlgeschlagen (TSE-Ausfall dokumentieren!):",
      err instanceof Error ? err.message : err,
    );
  }

  // 2) Bestellung zur Küche (n8n) — Kunde HAT bezahlt. Nur wenn der letzte
  //    Lauf sie nicht schon verbucht hat (sonst Doppel-Order in der Küche).
  let orderNumber: string | null =
    typeof row.order_number === "string" && row.order_number ? row.order_number : null;
  let n8nPosted = row.n8n_posted === true;
  if (!n8nPosted) {
    try {
      const boxOption =
        ((Array.isArray(row.items) ? (row.items as Record<string, unknown>[]).find((i) => i.box_option) : null)
          ?.box_option as string | null) ?? null;
      const result = await postPaidOrderToN8n(n8nPayload(fiscalId, items as PayloadItem[], boxOption));
      orderNumber = result.orderNumber ?? orderNumber;
      n8nPosted = true;
    } catch (err: unknown) {
      console.error("n8n-Post nach Zahlung fehlgeschlagen (Cron retried):", err instanceof Error ? err.message : err);
    }
  }

  // 3) Finales Update mit State-Guard + Rückgabecheck (P0-1): nur solange die
  //    Zeile noch 'finalizing' ist. DB-Fehler → 1 Retry; 0 Treffer ohne Fehler
  //    → ein anderer Schreiber hat bereits abgeschlossen (kein Retry nötig).
  const finalState: FinalizeResult["state"] = tseFailed ? "tse_error" : "completed";
  let updated = false;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { data, error } = await supabase
      .from("fiscal_transactions")
      .update({
        ...tseUpdate,
        state: finalState,
        order_number: orderNumber,
        n8n_posted: n8nPosted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fiscalId)
      .eq("state", "finalizing")
      .select("id");

    if (!error && data && data.length > 0) {
      updated = true;
      break;
    }
    if (!error) {
      console.warn(`Finalize ${fiscalId}: Zeile war nicht mehr 'finalizing' — anderer Schreiber hat abgeschlossen.`);
      break;
    }
    console.error(`Finalize-Update für ${fiscalId} fehlgeschlagen (Versuch ${attempt}):`, error.message);
    if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return { state: finalState, orderNumber, updated };
}
