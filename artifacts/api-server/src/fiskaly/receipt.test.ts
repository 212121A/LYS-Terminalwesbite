// artifacts/api-server/src/fiskaly/receipt.test.ts
// Lauf: node --experimental-strip-types src/fiskaly/receipt.test.ts
import {
  buildReceiptSchema,
  buildVatAmounts,
  centsToAmount,
  totalCents,
  type FiscalLineItem,
} from "./receipt.ts";

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

const curry: FiscalLineItem = { id: "c1-regular", name: "Gemüse Thai Curry", quantity: 1, unitPriceCents: 700, vatRate: "REDUCED_1" };
const matcha: FiscalLineItem = { id: "m-latte-regular", name: "Matcha Latte", quantity: 3, unitPriceCents: 450, vatRate: "NORMAL" };

// Cent → String
check("centsToAmount ganze Euro", centsToAmount(700), "7.00");
check("centsToAmount mit Cent", centsToAmount(1234), "12.34");
check("centsToAmount null", centsToAmount(0), "0.00");

// Summen
check("totalCents Mischkorb", totalCents([curry, matcha]), 700 + 3 * 450);

// USt-Aufteilung Mischkorb: 7,00 € Speise (7 %) + 13,50 € Getränk (19 %)
const vat = buildVatAmounts([curry, matcha]);
check("vat: zwei Sätze", vat.length, 2);
const reduced = vat.find((v) => v.vat_rate === "REDUCED_1");
const normal = vat.find((v) => v.vat_rate === "NORMAL");
check("vat 7% brutto", reduced?.incl_vat_cents, 700);
// 700 * 7/107 = 45.79… → 46
check("vat 7% anteil", reduced?.vat_cents, 46);
check("vat 19% brutto", normal?.incl_vat_cents, 1350);
// 1350 * 19/119 = 215.54… → 216
check("vat 19% anteil", normal?.vat_cents, 216);

// Nur Speisen → ein Satz
check("vat: nur Speisen ein Eintrag", buildVatAmounts([curry]).length, 1);

// Beleg-Schema
const schema = buildReceiptSchema([curry, matcha]);
check("schema receipt_type", schema.standard_v1.receipt.receipt_type, "RECEIPT");
check(
  "schema amounts_per_payment_type",
  schema.standard_v1.receipt.amounts_per_payment_type,
  [{ payment_type: "NON_CASH", amount: "20.50" }],
);
check(
  "schema amounts_per_vat_rate sortunabhängig (Summe)",
  schema.standard_v1.receipt.amounts_per_vat_rate
    .map((a) => Number(a.amount))
    .reduce((s, n) => s + n, 0)
    .toFixed(2),
  "20.50",
);

// Storno-Variante
const storno = buildReceiptSchema([curry], { receiptType: "CANCELLATION" });
check("storno receipt_type", storno.standard_v1.receipt.receipt_type, "CANCELLATION");

if (failures > 0) {
  console.error(`\n${failures} Fehler`);
  process.exit(1);
}
console.log("\nalle Tests grün");
