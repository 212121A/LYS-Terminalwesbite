// artifacts/api-server/src/lib/finalizeFiscal.test.ts
// Lauf: npx tsx src/lib/finalizeFiscal.test.ts   (tsx wegen .js-Import-Specifiern)
// Stubbt global.fetch (fiskaly + n8n) und den Supabase-Client — kein Netz, keine DB.

process.env.FISKALY_API_KEY = "test-key";
process.env.FISKALY_API_SECRET = "test-secret";
process.env.FISKALY_BASE_URL = "https://fiskaly.test/api/v2";
process.env.FISKALY_TSS_ID = "tss-1";
process.env.FISKALY_CLIENT_ID = "client-1";
process.env.N8N_ORDER_WEBHOOK_URL = "https://n8n.test/webhook/order_made";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.error(`FAIL ${name} ${detail}`);
  }
}

type FetchPlan = {
  finishStatus?: number; // PUT tx (FINISH); default 200
  getTxState?: string | null; // GET tx; null = 404
  n8nStatus?: number; // default 200
};
let plan: FetchPlan = {};
let fetchLog: string[] = [];

const SIGNED = {
  _id: "tse-tx-1",
  number: 7,
  state: "FINISHED",
  time_start: 1750000000,
  time_end: 1750000060,
  qr_code_data: "V0;qr",
  signature: { value: "sig-val", counter: 42, algorithm: "ecdsa" },
  log: { timestamp_format: "unixTime" },
  tss_serial_number: "serial-1",
};

globalThis.fetch = (async (url: any, opts: any = {}) => {
  const u = String(url);
  const method = opts.method ?? "GET";
  fetchLog.push(`${method} ${u}`);
  const respond = (status: number, body: unknown) =>
    ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) }) as any;

  if (u.endsWith("/auth")) return respond(200, { access_token: "tok" });
  if (u.includes("/tss/tss-1/tx/") && method === "PUT") {
    const status = plan.finishStatus ?? 200;
    return respond(status, status === 200 ? SIGNED : { code: "E_TX_FINISHED" });
  }
  if (u.includes("/tss/tss-1/tx/") && method === "GET") {
    if (plan.getTxState == null) return respond(404, {});
    return respond(200, { ...SIGNED, state: plan.getTxState });
  }
  if (u.includes("n8n.test")) {
    const status = plan.n8nStatus ?? 200;
    return respond(status, { order_number: 55 });
  }
  throw new Error(`unerwarteter fetch: ${method} ${u}`);
}) as typeof fetch;

type UpdateResult = { data: unknown; error: { message: string } | null };
function supabaseStub(results: UpdateResult[]) {
  const calls: Array<{ payload: Record<string, unknown>; filters: Array<[string, string, unknown]> }> = [];
  return {
    calls,
    from(_table: string) {
      const call = { payload: {} as Record<string, unknown>, filters: [] as Array<[string, string, unknown]> };
      const chain: any = {
        update(payload: Record<string, unknown>) { call.payload = payload; return chain; },
        eq(k: string, v: unknown) { call.filters.push(["eq", k, v]); return chain; },
        lt(k: string, v: unknown) { call.filters.push(["lt", k, v]); return chain; },
        async select(_cols: string) { calls.push(call); return results.shift() ?? { data: [{ id: "fx-1" }], error: null }; },
      };
      return chain;
    },
  };
}

const { finalizeFiscalTransaction } = await import("./finalizeFiscal.ts");

const baseRow = {
  id: "fx-1",
  tse_tx_id: "11111111-2222-3333-4444-555555555555",
  payment_intent_id: "pi_1",
  order_number: null,
  n8n_posted: false,
  items: [
    { id: "c1", code: "c1", name: "Curry Huhn", quantity: 1, unit_price_cents: 1090, vat_rate: "REDUCED_1" },
    { id: "cola", name: "Cola", quantity: 2, unit_price_cents: 290, vat_rate: "NORMAL" },
  ],
};

// --- 1) Happy Path: FINISH ok, n8n ok → completed ---
{
  plan = {}; fetchLog = [];
  const supa = supabaseStub([{ data: [{ id: "fx-1" }], error: null }]);
  const r = await finalizeFiscalTransaction(supa as any, { ...baseRow } as any);
  check("happy: state completed", r.state === "completed");
  check("happy: orderNumber aus n8n", r.orderNumber === "55", `→ ${r.orderNumber}`);
  check("happy: updated true", r.updated === true);
  const upd = supa.calls[0];
  check("happy: State-Guard (id+state=finalizing)",
    JSON.stringify(upd.filters) === JSON.stringify([["eq", "id", "fx-1"], ["eq", "state", "finalizing"]]));
  check("happy: Signaturfelder im Update", upd.payload.tse_signature_value === "sig-val" && upd.payload.tse_tx_number === 7);
  check("happy: n8n_posted true", upd.payload.n8n_posted === true);
  check("happy: genau 1 FINISH, kein GET", fetchLog.filter((l) => l.startsWith("PUT")).length === 1 && !fetchLog.some((l) => l.startsWith("GET https://fiskaly")));
}

// --- 2) Nachholer: Tx schon FINISHED (Crash nach FINISH) → Daten lesen ---
{
  plan = { finishStatus: 400, getTxState: "FINISHED" }; fetchLog = [];
  const supa = supabaseStub([{ data: [{ id: "fx-1" }], error: null }]);
  const r = await finalizeFiscalTransaction(supa as any, { ...baseRow } as any);
  check("refinish: completed trotz FINISH-Fehler", r.state === "completed");
  check("refinish: Signatur aus GET übernommen", supa.calls[0].payload.tse_signature_value === "sig-val");
  check("refinish: GET wurde genutzt", fetchLog.some((l) => l.startsWith("GET https://fiskaly")));
}

// --- 3) TSE hart down: FINISH-Fehler + Tx nicht FINISHED → tse_error, n8n trotzdem ---
{
  plan = { finishStatus: 500, getTxState: "ACTIVE" }; fetchLog = [];
  const supa = supabaseStub([{ data: [{ id: "fx-1" }], error: null }]);
  const r = await finalizeFiscalTransaction(supa as any, { ...baseRow } as any);
  check("tse-down: state tse_error", r.state === "tse_error");
  check("tse-down: n8n trotzdem gepostet (Kunde HAT bezahlt)", fetchLog.some((l) => l.includes("n8n.test")));
  check("tse-down: orderNumber trotzdem da", r.orderNumber === "55");
  check("tse-down: Update auf tse_error", supa.calls[0].payload.state === "tse_error");
}

// --- 4) n8n down → completed, n8n_posted false (Cron-Retry holt nach) ---
{
  plan = { n8nStatus: 502 }; fetchLog = [];
  const supa = supabaseStub([{ data: [{ id: "fx-1" }], error: null }]);
  const r = await finalizeFiscalTransaction(supa as any, { ...baseRow } as any);
  check("n8n-down: completed", r.state === "completed");
  check("n8n-down: n8n_posted false im Update", supa.calls[0].payload.n8n_posted === false);
  check("n8n-down: orderNumber null", r.orderNumber === null);
}

// --- 5) Wiederholung nach teilweisem Erfolg: n8n_posted schon true → kein Doppel-Post ---
{
  plan = {}; fetchLog = [];
  const supa = supabaseStub([{ data: [{ id: "fx-1" }], error: null }]);
  const r = await finalizeFiscalTransaction(supa as any, { ...baseRow, n8n_posted: true, order_number: "77" } as any);
  check("idempotent: kein zweiter n8n-Post", !fetchLog.some((l) => l.includes("n8n.test")));
  check("idempotent: bestehende Nummer bleibt", r.orderNumber === "77");
}

// --- 6) Race: Update trifft 0 Zeilen (anderer Schreiber war fertig) → kein Retry ---
{
  plan = {}; fetchLog = [];
  const supa = supabaseStub([{ data: [], error: null }]);
  const r = await finalizeFiscalTransaction(supa as any, { ...baseRow } as any);
  check("race: updated false", r.updated === false);
  check("race: nur 1 Update-Versuch", supa.calls.length === 1);
}

// --- 7) Transienter DB-Fehler → Retry greift ---
{
  plan = {}; fetchLog = [];
  const supa = supabaseStub([
    { data: null, error: { message: "connection reset" } },
    { data: [{ id: "fx-1" }], error: null },
  ]);
  const r = await finalizeFiscalTransaction(supa as any, { ...baseRow } as any);
  check("retry: updated true nach 2. Versuch", r.updated === true);
  check("retry: 2 Update-Versuche", supa.calls.length === 2);
}

console.log(failures === 0 ? "\nALLE CHECKS GRÜN" : `\n${failures} CHECK(S) ROT`);
process.exit(failures === 0 ? 0 : 1);
