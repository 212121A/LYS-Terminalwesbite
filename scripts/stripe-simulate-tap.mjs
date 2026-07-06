// scripts/stripe-simulate-tap.mjs
// Simuliert das Karten-Tippen am (simulierten) Stripe-Terminal-Reader im
// Test-Mode — für den E2E-Test des Terminal-Bezahlflows ohne Hardware.
//
// Vorbereitung (einmalig, Test-Mode): Location + simulierten Reader anlegen:
//   node --env-file=.env scripts/stripe-simulate-tap.mjs --create-reader
// Karten-Tap auslösen (während der Kiosk im Warte-Screen steht):
//   node --env-file=.env scripts/stripe-simulate-tap.mjs
//   node --env-file=.env scripts/stripe-simulate-tap.mjs --decline   (Ablehnung)
//
// Nötige ENV: STRIPE_SECRET_KEY (sk_test_…), STRIPE_TERMINAL_READER_ID (außer bei --create-reader)

const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET?.startsWith("sk_test_")) {
  console.error("STRIPE_SECRET_KEY (sk_test_…) nötig — dieses Script ist NUR für den Test-Mode.");
  process.exit(1);
}

async function stripeRequest(method, path, form) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const json = await response.json();
  if (!response.ok) {
    console.error(`✗ ${method} ${path}:`, JSON.stringify(json.error ?? json, null, 2));
    process.exit(1);
  }
  return json;
}

if (process.argv.includes("--create-reader")) {
  const location = await stripeRequest("POST", "/v1/terminal/locations", {
    display_name: "LYS Test-Laden",
    "address[line1]": "Kappelgasse 2",
    "address[postal_code]": "73525",
    "address[city]": "Schwäbisch Gmünd",
    "address[country]": "DE",
  });
  const reader = await stripeRequest("POST", "/v1/terminal/readers", {
    registration_code: "simulated-wpe",
    location: location.id,
  });
  console.log(`✓ Simulierter Reader angelegt.\n\nSTRIPE_TERMINAL_READER_ID=${reader.id}\n(Location: ${location.id})`);
  process.exit(0);
}

const readerId = process.argv[2]?.startsWith("tmr_")
  ? process.argv[2]
  : process.env.STRIPE_TERMINAL_READER_ID;
if (!readerId) {
  console.error("STRIPE_TERMINAL_READER_ID fehlt (oder als Argument tmr_… übergeben).");
  process.exit(1);
}

// Decline-Testkarte: 4000 0000 0000 0002 → card_declined am Reader.
const form = process.argv.includes("--decline")
  ? { type: "card_present", "card_present[number]": "4000000000000002" }
  : {};

const result = await stripeRequest(
  "POST",
  `/v1/test_helpers/terminal/readers/${readerId}/present_payment_method`,
  form,
);
console.log(`✓ Karte präsentiert (Reader ${readerId}, action: ${result.action?.status ?? "?"})`);
