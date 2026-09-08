// artifacts/api-server/src/lib/orderItems.test.ts
// Lauf: node --experimental-strip-types src/lib/orderItems.test.ts
import { normalizeQuantity, parseLineItems } from "./orderItems.ts";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${name}\n  got:      ${a}\n  expected: ${e}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

check("Menge fehlt -> 1", normalizeQuantity(undefined), 1);
check("Menge 0 -> 1", normalizeQuantity(0), 1);
check("Menge 99 -> 20", normalizeQuantity(99), 20);
check("Menge 2.7 -> 2", normalizeQuantity(2.7), 2);

const ok = parseLineItems([
  { id: "GN1 Sojasoße", cartId: "GN1-Sojasoße", itemId: "GN1", sizeLabel: "Sojasoße", name: "Große Nudelbox - Gemüse · Sojasoße", price: 5, quantity: 2 },
]);
check("gueltiger Posten -> ok", ok.ok, true);
if (ok.ok) {
  check("Snapshot-Felder", ok.items[0].snapshot, {
    name: "Große Nudelbox - Gemüse · Sojasoße",
    priceEur: 5,
    quantity: 2,
    id: "GN1 Sojasoße",
    cartId: "GN1-Sojasoße",
    itemId: "GN1",
    sizeLabel: "Sojasoße",
  });
  check("unitCents", ok.items[0].unitCents, 500);
  check("totalEur", ok.totalEur, 10);
}

// Leere Optionalfelder tauchen im Snapshot gar nicht auf (wie bisher).
const minimal = parseLineItems([{ name: "Wasser", price: 2, quantity: 1 }]);
check("nur Pflichtfelder", minimal.ok && minimal.items[0].snapshot, {
  name: "Wasser",
  priceEur: 2,
  quantity: 1,
});

check("Name fehlt", parseLineItems([{ price: 5, quantity: 1 }]), {
  ok: false,
  error: "Ungültiger Artikel (Name/Preis).",
});
check("Preis ueber 999", parseLineItems([{ name: "X", price: 1000, quantity: 1 }]), {
  ok: false,
  error: "Ungültiger Artikel (Name/Preis).",
});
check("Preis unter 50 Cent", parseLineItems([{ name: "X", price: 0.4, quantity: 1 }]), {
  ok: false,
  error: "Betrag zu klein.",
});

console.log(failures === 0 ? "\nalle Tests grün" : `\n${failures} Test(s) fehlgeschlagen`);
process.exit(failures === 0 ? 0 : 1);
