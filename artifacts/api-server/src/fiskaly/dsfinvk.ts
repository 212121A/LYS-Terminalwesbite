// artifacts/api-server/src/fiskaly/dsfinvk.ts
/**
 * fiskaly DSFinV-K API v1 — Kassenabschlüsse (Cash Point Closing) + Export-TAR
 * fürs Finanzamt. Eigene Basis-URL (FISKALY_DSFINVK_BASE_URL), gleiche Keys.
 *
 * Struktur gegen die offizielle OpenAPI-Spec verifiziert
 * (https://dsfinvk.fiskaly.com/api/v1/_spec.json, Stand 2026-07):
 * Beträge sind JSON-Zahlen (nicht Strings wie bei SIGN), `head` kennt kein
 * `company` (Firmendaten zieht fiskaly aus der Organisation), und jede
 * Transaktion braucht `security.tss_tx_id` = SIGN-Transaktions-UUID.
 */
import { randomUUID, createHash } from "node:crypto";
import { getFiskalyEnv, CASH_REGISTER } from "./config.js";
import { VAT_RATE_PERCENT, type VatRate } from "./receipt.js";

function dsfinvkBaseUrl(): string {
  const url = process.env.FISKALY_DSFINVK_BASE_URL?.replace(/\/$/, "");
  if (!url) throw new Error("FISKALY_DSFINVK_BASE_URL fehlt");
  return url;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function bearer(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  const { apiKey, apiSecret } = getFiskalyEnv();
  const response = await fetch(`${dsfinvkBaseUrl()}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || typeof body.access_token !== "string") {
    throw new Error(`DSFinV-K-Auth fehlgeschlagen (HTTP ${response.status})`);
  }
  cachedToken = { token: body.access_token, expiresAt: Date.now() + 30 * 60 * 1000 };
  return cachedToken.token;
}

async function request<T>(method: string, path: string, jsonBody?: unknown): Promise<T> {
  const token = await bearer();
  const response = await fetch(`${dsfinvkBaseUrl()}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    throw new Error(`DSFinV-K ${method} ${path} → HTTP ${response.status}: ${JSON.stringify(body).slice(0, 500)}`);
  }
  return body as T;
}

/** Deterministische UUID (v5-artig aus SHA-1) — Cron-Retry erzeugt dasselbe Closing. */
export function deterministicUuid(seed: string): string {
  const hash = createHash("sha1").update(seed).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0") + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join("-");
}

/** DSFinV-K will Beträge als JSON-Zahl mit max. 2 Dezimalen (multipleOf 0.01). */
function centsToEuro(cents: number): number {
  return Math.round(cents) / 100;
}

/** Kasse einmalig/idempotent im DSFinV-K-Kontext registrieren (Stammdaten). */
export async function upsertCashRegister(): Promise<void> {
  const { clientId, tssId } = getFiskalyEnv();
  await request("PUT", `/cash_registers/${clientId}`, {
    cash_register_type: { type: "MASTER", tss_id: tssId },
    brand: CASH_REGISTER.brand,
    model: CASH_REGISTER.model,
    software: { brand: CASH_REGISTER.brand, version: CASH_REGISTER.softwareVersion },
    base_currency_code: CASH_REGISTER.baseCurrencyCode,
    processing_flags: { unable_to_report_tse: false },
  });
}

export type ClosingTransaction = {
  fiscalId: string;
  tseTxId: string | null; // SIGN-Transaktions-UUID (Spalte tse_tx_id)
  tseTxNumber: number | null;
  createdAt: string; // ISO
  totalCents: number;
  items: { name: string; quantity: number; unit_price_cents: number; vat_rate: VatRate }[];
  vatAmounts: { vat_rate: VatRate; incl_vat_cents: number; vat_cents: number }[];
};

/** DSFinV-K vat_definition_export_id: 1 = 19 % (NORMAL), 2 = 7 % (REDUCED_1). */
const VAT_EXPORT_ID: Record<VatRate, number> = { NORMAL: 1, REDUCED_1: 2 };

function unixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

/**
 * Cash-Point-Closing für einen Geschäftstag aus den fiscal_transactions-Zeilen.
 * Nur Kartenzahlungen (das Terminal kennt kein Bargeld) → cash_amount 0.
 */
export function buildCashPointClosing(
  businessDay: string,
  closingSeq: number,
  transactions: ClosingTransaction[],
) {
  const { clientId } = getFiskalyEnv();
  const totalCents = transactions.reduce((sum, tx) => sum + tx.totalCents, 0);

  const vatTotals = new Map<VatRate, { incl: number; vat: number }>();
  for (const tx of transactions) {
    for (const vat of tx.vatAmounts) {
      const entry = vatTotals.get(vat.vat_rate) ?? { incl: 0, vat: 0 };
      entry.incl += vat.incl_vat_cents;
      entry.vat += vat.vat_cents;
      vatTotals.set(vat.vat_rate, entry);
    }
  }

  const amountsPerVat = [...vatTotals.entries()].map(([rate, { incl, vat }]) => ({
    vat_definition_export_id: VAT_EXPORT_ID[rate],
    incl_vat: centsToEuro(incl),
    excl_vat: centsToEuro(incl - vat),
    vat: centsToEuro(vat),
  }));

  const first = transactions[0];
  const last = transactions[transactions.length - 1];

  return {
    client_id: clientId,
    cash_point_closing_export_id: closingSeq,
    head: {
      business_date: businessDay,
      // Z_START_ID/Z_ENDE_ID = BON_ID der ersten/letzten Transaktion,
      // muss zu transactions[].head.transaction_export_id passen.
      first_transaction_export_id: first ? first.fiscalId : null,
      last_transaction_export_id: last ? last.fiscalId : null,
      export_creation_date: Math.floor(Date.now() / 1000),
    },
    cash_statement: {
      business_cases: [
        {
          type: "Umsatz",
          amounts_per_vat_id: amountsPerVat,
        },
      ],
      payment: {
        full_amount: centsToEuro(totalCents),
        cash_amount: 0,
        cash_amounts_by_currency: [{ currency_code: "EUR", amount: 0 }],
        payment_types: [
          {
            type: "Unbar",
            currency_code: "EUR",
            amount: centsToEuro(totalCents),
          },
        ],
      },
    },
    transactions: transactions.map((tx, index) => ({
      head: {
        type: "Beleg",
        storno: false,
        number: tx.tseTxNumber ?? index + 1,
        timestamp_start: unixSeconds(tx.createdAt),
        timestamp_end: unixSeconds(tx.createdAt),
        transaction_export_id: tx.fiscalId,
        closing_client_id: clientId,
        ...(tx.tseTxId ? { tx_id: tx.tseTxId } : {}),
      },
      data: {
        full_amount_incl_vat: centsToEuro(tx.totalCents),
        payment_types: [
          { type: "Unbar", currency_code: "EUR", amount: centsToEuro(tx.totalCents) },
        ],
        amounts_per_vat_id: tx.vatAmounts.map((vat) => ({
          vat_definition_export_id: VAT_EXPORT_ID[vat.vat_rate],
          incl_vat: centsToEuro(vat.incl_vat_cents),
          excl_vat: centsToEuro(vat.incl_vat_cents - vat.vat_cents),
          vat: centsToEuro(vat.vat_cents),
        })),
        lines: tx.items.map((item, lineIndex) => {
          const gross = item.unit_price_cents * item.quantity;
          const net = Math.round((gross * 100) / (100 + VAT_RATE_PERCENT[item.vat_rate]));
          return {
            business_case: {
              type: "Umsatz",
              amounts_per_vat_id: [
                {
                  vat_definition_export_id: VAT_EXPORT_ID[item.vat_rate],
                  incl_vat: centsToEuro(gross),
                  excl_vat: centsToEuro(net),
                  vat: centsToEuro(gross - net),
                },
              ],
            },
            lineitem_export_id: String(lineIndex + 1),
            storno: false,
            text: item.name,
            item: {
              number: String(lineIndex + 1),
              quantity: item.quantity,
              price_per_unit: centsToEuro(item.unit_price_cents),
            },
          };
        }),
      },
      // Pflichtfeld: Link zur TSE-Signatur — SIGN-Transaktions-UUID,
      // ohne TSE-Bezug verlangt die Spec eine error_message.
      security: tx.tseTxId
        ? { tss_tx_id: tx.tseTxId }
        : { error_message: "Keine TSE-Transaktion vorhanden (Zeile ohne tse_tx_id)" },
    })),
  };
}

export async function submitCashPointClosing(closingId: string, closing: unknown): Promise<unknown> {
  return request("PUT", `/cash_point_closings/${closingId}`, closing);
}

export async function triggerExport(startDate: string, endDate: string): Promise<{ exportId: string }> {
  const { clientId } = getFiskalyEnv();
  const exportId = randomUUID();
  // Auswahl per Geschäftstag (YYYY-MM-DD) im Body — nicht als Query-Params.
  await request("PUT", `/exports/${exportId}`, {
    client_id: clientId,
    business_date_start: startDate,
    business_date_end: endDate,
  });
  return { exportId };
}

export async function getExport(exportId: string): Promise<{ state?: string; [key: string]: unknown }> {
  return request("GET", `/exports/${exportId}`);
}

export function exportDownloadPath(exportId: string): string {
  return `${dsfinvkBaseUrl()}/exports/${exportId}/download`;
}
