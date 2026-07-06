// artifacts/api-server/src/fiskaly/client.ts
/**
 * Schmaler fetch-Client für fiskaly SIGN DE v2 (Cloud-TSE, KassenSichV).
 * Kein SDK nötig — natives fetch reicht. Token wird modulweit gecacht:
 * Vercel wiederverwendet warme Container, das spart den Auth-Roundtrip.
 *
 * Transaktions-Lebenszyklus (Pflicht!): jede gestartete Transaktion (ACTIVE)
 * MUSS beendet werden — Erfolg als RECEIPT, Abbruch via abortTransaction.
 * Verwaiste ACTIVE-Transaktionen räumt der Sweeper in /api/fiscal/closing ab.
 */
import { getFiskalyEnv } from "./config.js";
import type { ReceiptSchema } from "./receipt.js";

export class FiskalyError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "FiskalyError";
    this.status = status;
    this.body = body;
  }
}

/** Signatur-/Log-Daten einer TSE-Transaktion (Felder gegen die OpenAPI-Spec verifiziert). */
export type FiskalyTxResponse = {
  _id?: string;
  number: number;
  state: string;
  time_start?: number;
  time_end?: number;
  qr_code_data?: string;
  signature?: {
    value?: string;
    counter?: string; // Spec: string (format bigint)
    algorithm?: string;
  };
  log?: {
    timestamp_format?: string;
    timestamp?: number;
  };
  tss_serial_number?: string;
  client_serial_number?: string;
  [key: string]: unknown;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function fetchToken(): Promise<string> {
  const { apiKey, apiSecret, baseUrl } = getFiskalyEnv();
  const response = await fetch(`${baseUrl}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || typeof body.access_token !== "string") {
    throw new FiskalyError("fiskaly-Auth fehlgeschlagen", response.status, body);
  }
  // Token gilt laut fiskaly deutlich länger; 30 min sind konservativ genug.
  cachedToken = { token: body.access_token, expiresAt: Date.now() + 30 * 60 * 1000 };
  return cachedToken.token;
}

async function bearerToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  return fetchToken();
}

async function fiskalyRequest<T>(
  method: string,
  path: string,
  jsonBody?: unknown,
): Promise<T> {
  const { baseUrl } = getFiskalyEnv();
  let token = await bearerToken();

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
      signal: AbortSignal.timeout(10_000),
    });

    // Abgelaufenes Token: einmal frisch holen und wiederholen.
    if (response.status === 401 && attempt === 1) {
      cachedToken = null;
      token = await fetchToken();
      continue;
    }

    const body = (await response.json().catch(() => ({}))) as unknown;
    if (!response.ok) {
      throw new FiskalyError(`fiskaly ${method} ${path} → HTTP ${response.status}`, response.status, body);
    }
    return body as T;
  }

  throw new FiskalyError(`fiskaly ${method} ${path}: Auth-Retry erschöpft`, 401, null);
}

/** Startet eine TSE-Transaktion (Vorgangsbeginn). txId: selbst erzeugte UUID. */
export async function startTransaction(txId: string): Promise<FiskalyTxResponse> {
  const { tssId, clientId } = getFiskalyEnv();
  return fiskalyRequest<FiskalyTxResponse>(
    "PUT",
    `/tss/${tssId}/tx/${txId}?tx_revision=1`,
    { state: "ACTIVE", client_id: clientId },
  );
}

/** Beendet eine TSE-Transaktion mit Beleg-Daten (Erfolg oder Storno-Beleg). */
export async function finishTransaction(
  txId: string,
  revision: number,
  schema: ReceiptSchema,
): Promise<FiskalyTxResponse> {
  const { tssId, clientId } = getFiskalyEnv();
  return fiskalyRequest<FiskalyTxResponse>(
    "PUT",
    `/tss/${tssId}/tx/${txId}?tx_revision=${revision}`,
    { state: "FINISHED", client_id: clientId, schema },
  );
}

/**
 * Bricht einen Bezahlvorgang ab (Kunde storniert, Karte abgelehnt, Timeout).
 * TSE-konform = FINISHED mit Storno-Beleg (receipt_type CANCELLATION),
 * nicht "löschen" — der Abbruch bleibt in der TSE-Kette dokumentiert.
 */
export async function abortTransaction(
  txId: string,
  revision: number,
  schema: ReceiptSchema,
): Promise<FiskalyTxResponse> {
  return finishTransaction(txId, revision, schema);
}

/** Offene (ACTIVE) Transaktionen der TSS — Grundlage für den Sweeper. */
export async function listOpenTransactions(): Promise<FiskalyTxResponse[]> {
  const { tssId } = getFiskalyEnv();
  const body = await fiskalyRequest<{ data?: FiskalyTxResponse[] }>(
    "GET",
    `/tss/${tssId}/tx?states%5B0%5D=ACTIVE`, // states[0]=ACTIVE, Form aus der fiskaly-Doku
  );
  return body.data ?? [];
}
