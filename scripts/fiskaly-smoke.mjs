// scripts/fiskaly-smoke.mjs
// Feld-Verifikation gegen die ECHTE fiskaly-Test-API (SIGN DE v2):
//   1× Transaktion ACTIVE → FINISHED (RECEIPT, Mischkorb 7 %/19 %)
//   1× Transaktion ACTIVE → FINISHED (CANCELLATION = Abbruch-Pfad)
//   danach: keine offene Transaktion mehr auf der TSS.
// Dumpt die Raw-Responses — hiermit werden die Feldnamen/Enums bestätigt,
// auf die sich src/fiskaly/{client,receipt}.ts verlassen.
//
// Lauf:  node --env-file=.env scripts/fiskaly-smoke.mjs
// Nötige ENV: FISKALY_API_KEY/SECRET/BASE_URL/TSS_ID/CLIENT_ID

import { randomUUID } from "node:crypto";

const BASE_URL = (process.env.FISKALY_BASE_URL ?? "").replace(/\/$/, "");
const { FISKALY_API_KEY, FISKALY_API_SECRET, FISKALY_TSS_ID, FISKALY_CLIENT_ID } = process.env;

if (!BASE_URL || !FISKALY_API_KEY || !FISKALY_API_SECRET || !FISKALY_TSS_ID || !FISKALY_CLIENT_ID) {
  console.error("ENV unvollständig: FISKALY_API_KEY/SECRET/BASE_URL/TSS_ID/CLIENT_ID nötig (erst fiskaly-setup.mjs laufen lassen).");
  process.exit(1);
}

async function request(method, path, body, headers = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`✗ ${method} ${path} → HTTP ${response.status}`);
    console.error(JSON.stringify(json, null, 2));
    throw new Error(`fiskaly ${method} ${path} fehlgeschlagen`);
  }
  return json;
}

const auth = await request("POST", "/auth", { api_key: FISKALY_API_KEY, api_secret: FISKALY_API_SECRET });
const bearer = { Authorization: `Bearer ${auth.access_token}` };
console.log("✓ Auth\n");

// Beispiel-Beleg wie ihn buildReceiptSchema() erzeugt: 7,00 € Speise + 4,50 € Getränk
const receipt = {
  standard_v1: {
    receipt: {
      receipt_type: "RECEIPT",
      amounts_per_vat_rate: [
        { vat_rate: "REDUCED_1", amount: "7.00" },
        { vat_rate: "NORMAL", amount: "4.50" },
      ],
      amounts_per_payment_type: [{ payment_type: "NON_CASH", amount: "11.50" }],
    },
  },
};

// ── Fall 1: regulärer Bezahlvorgang ────────────────────────────────
const txId = randomUUID();
console.log(`── Transaktion ${txId} (RECEIPT) ──`);
const started = await request("PUT", `/tss/${FISKALY_TSS_ID}/tx/${txId}?tx_revision=1`, {
  state: "ACTIVE",
  client_id: FISKALY_CLIENT_ID,
}, bearer);
console.log("ACTIVE Raw-Response:");
console.log(JSON.stringify(started, null, 2));

const finished = await request("PUT", `/tss/${FISKALY_TSS_ID}/tx/${txId}?tx_revision=2`, {
  state: "FINISHED",
  client_id: FISKALY_CLIENT_ID,
  schema: receipt,
}, bearer);
console.log("\nFINISHED Raw-Response (→ Feldnamen für client.ts prüfen!):");
console.log(JSON.stringify(finished, null, 2));

// Die Felder, auf die sich der Code verlässt:
const expectations = [
  ["number", finished.number],
  ["signature.value", finished.signature?.value],
  ["signature.counter", finished.signature?.counter],
  ["signature.algorithm", finished.signature?.algorithm],
  ["qr_code_data", finished.qr_code_data],
  ["time_start", finished.time_start],
  ["time_end", finished.time_end],
  ["log.timestamp_format", finished.log?.timestamp_format],
  ["tss_serial_number", finished.tss_serial_number],
];
console.log("\nFeld-Check (client.ts-Annahmen):");
let missing = 0;
for (const [name, value] of expectations) {
  const ok = value !== undefined && value !== null;
  if (!ok) missing++;
  console.log(`  ${ok ? "✓" : "✗ FEHLT"}  ${name} = ${JSON.stringify(value)}`);
}

// ── Fall 2: Abbruch-Pfad (CANCELLATION) ────────────────────────────
const abortId = randomUUID();
console.log(`\n── Transaktion ${abortId} (CANCELLATION/Abbruch) ──`);
await request("PUT", `/tss/${FISKALY_TSS_ID}/tx/${abortId}?tx_revision=1`, {
  state: "ACTIVE",
  client_id: FISKALY_CLIENT_ID,
}, bearer);
const aborted = await request("PUT", `/tss/${FISKALY_TSS_ID}/tx/${abortId}?tx_revision=2`, {
  state: "FINISHED",
  client_id: FISKALY_CLIENT_ID,
  schema: {
    standard_v1: {
      receipt: {
        receipt_type: "CANCELLATION",
        amounts_per_vat_rate: [{ vat_rate: "REDUCED_1", amount: "7.00" }],
        amounts_per_payment_type: [{ payment_type: "NON_CASH", amount: "7.00" }],
      },
    },
  },
}, bearer);
console.log(`✓ Abbruch signiert (state: ${aborted.state}, number: ${aborted.number})`);

// ── Keine Leichen? ─────────────────────────────────────────────────
const open = await request("GET", `/tss/${FISKALY_TSS_ID}/tx?states[]=ACTIVE`, undefined, bearer);
const openCount = (open.data ?? []).length;
console.log(`\nOffene (ACTIVE) Transaktionen auf der TSS: ${openCount}`);

if (missing > 0 || openCount > 0) {
  console.error(`\n✗ Smoke-Test FEHLGESCHLAGEN (${missing} fehlende Felder, ${openCount} offene tx) — client.ts/receipt.ts an die Raw-Responses oben anpassen.`);
  process.exit(1);
}
console.log("\n✓ Smoke-Test grün — Feldnamen bestätigt.");
