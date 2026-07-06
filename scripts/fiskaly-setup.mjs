// scripts/fiskaly-setup.mjs
// Einmaliges Provisioning einer fiskaly Cloud-TSE (SIGN DE v2):
//   TSS anlegen → UNINITIALIZED → Admin-PIN setzen → INITIALIZED → Client anlegen.
// Lauf:  node --env-file=.env scripts/fiskaly-setup.mjs
// Nötige ENV: FISKALY_API_KEY, FISKALY_API_SECRET, FISKALY_BASE_URL
// Optional: FISKALY_ADMIN_PIN (sonst wird einer generiert und ausgegeben)
//
// Ausgabe: FISKALY_TSS_ID / FISKALY_CLIENT_ID / FISKALY_ADMIN_PIN → in Vercel-ENV eintragen.
// Test vs. Production unterscheidet sich NUR über Key/BASE_URL.

import { randomUUID } from "node:crypto";

const BASE_URL = (process.env.FISKALY_BASE_URL ?? "").replace(/\/$/, "");
const API_KEY = process.env.FISKALY_API_KEY;
const API_SECRET = process.env.FISKALY_API_SECRET;

if (!BASE_URL || !API_KEY || !API_SECRET) {
  console.error("FISKALY_BASE_URL, FISKALY_API_KEY und FISKALY_API_SECRET müssen gesetzt sein.");
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

console.log(`fiskaly-Setup gegen ${BASE_URL}\n`);

// 1) Auth
const auth = await request("POST", "/auth", { api_key: API_KEY, api_secret: API_SECRET });
const bearer = { Authorization: `Bearer ${auth.access_token}` };
console.log("✓ Auth");

// 2) TSS anlegen (Antwort enthält admin_puk — nur einmal sichtbar!)
const tssId = randomUUID();
const tss = await request("PUT", `/tss/${tssId}`, {}, bearer);
const adminPuk = tss.admin_puk;
console.log(`✓ TSS angelegt: ${tssId} (state: ${tss.state})`);

// 3) State → UNINITIALIZED (Personalisierung)
await request("PATCH", `/tss/${tssId}`, { state: "UNINITIALIZED" }, bearer);
console.log("✓ TSS → UNINITIALIZED");

// 4) Admin-PIN setzen (mit PUK) und als Admin anmelden
const adminPin = process.env.FISKALY_ADMIN_PIN || String(Math.floor(100000 + Math.random() * 900000));
await request("PATCH", `/tss/${tssId}/admin`, { admin_puk: adminPuk, new_admin_pin: adminPin }, bearer);
await request("POST", `/tss/${tssId}/admin/auth`, { admin_pin: adminPin }, bearer);
console.log("✓ Admin-PIN gesetzt + Admin-Login");

// 5) State → INITIALIZED (ab jetzt kann signiert werden)
await request("PATCH", `/tss/${tssId}`, { state: "INITIALIZED" }, bearer);
console.log("✓ TSS → INITIALIZED");

// 6) Client (= diese eine Kiosk-Kasse) registrieren
const clientId = randomUUID();
await request("PUT", `/tss/${tssId}/client/${clientId}`, { serial_number: `lys-terminal-${clientId.slice(0, 8)}` }, bearer);
console.log(`✓ Client angelegt: ${clientId}`);

// 7) Admin-Logout (Hygiene)
await request("POST", `/tss/${tssId}/admin/logout`, {}, bearer).catch(() => {});

console.log(`
──────────────────────────────────────────────────────
In Vercel-ENV (und lokale .env) eintragen:

FISKALY_TSS_ID=${tssId}
FISKALY_CLIENT_ID=${clientId}
FISKALY_ADMIN_PIN=${adminPin}

⚠ Admin-PUK sicher ablegen (Passwort-Manager), er wird
  nie wieder angezeigt: ${adminPuk}
──────────────────────────────────────────────────────`);
