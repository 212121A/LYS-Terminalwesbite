// artifacts/api-server/src/lib/products.test.ts
// Lauf: node --experimental-strip-types src/lib/products.test.ts
import { PRODUCTS, resolveVat, TERMINAL_DRINK_IDS } from "./products.ts";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures++;
    console.error(`FAIL ${name}\n  got:      ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// Die USt-Falle schlechthin: m1 = Speise (Matcha-Soße), m-latte = Getränk.
check("m1-regular ist Speise", PRODUCTS["m1-regular"].vat, "REDUCED_1");
check("m-latte-regular ist Getränk", PRODUCTS["m-latte-regular"].vat, "NORMAL");
check("m14-regular ist Speise", PRODUCTS["m14-regular"].vat, "REDUCED_1");

// Bowls sind Speisen, Kem-Latte ist Getränk.
check("bowl-oats1 Speise", PRODUCTS["bowl-oats1-regular"].vat, "REDUCED_1");
check("kem-matcha Getränk", PRODUCTS["kem-matcha-regular"].vat, "NORMAL");

// Jeder PRODUCTS-Eintrag hat einen expliziten vat-Satz.
check("alle Einträge haben vat", Object.values(PRODUCTS).every((p) => p.vat === "NORMAL" || p.vat === "REDUCED_1"), true);

// resolveVat: exakter Lookup (Website-/Stripe-IDs)
check("resolveVat c1-regular", resolveVat({ id: "c1-regular" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat kurz c1", resolveVat({ id: "c1" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat soda-chanh", resolveVat({ id: "soda-chanh" }), { vat: "NORMAL", unknown: false });

// Terminal-Menü-IDs: Getränke "01"–"23"/"30"–"32"/gd*, Bowls 24–29 + Vorspeisen "1"/"2" = Speise
check("resolveVat Matcha '01'", resolveVat({ itemId: "01" }), { vat: "NORMAL", unknown: false });
check("resolveVat Vorspeise '1'", resolveVat({ itemId: "1" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat Bowl '27'", resolveVat({ itemId: "27" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat gd1", resolveVat({ itemId: "gd1" }), { vat: "NORMAL", unknown: false });
check("resolveVat Kids '32'", resolveVat({ code: "32" }), { vat: "NORMAL", unknown: false });

// Box-Cart-IDs (Größe im Suffix) + Küchen-Kürzel
check("resolveVat box-gemuese-Klein", resolveVat({ id: "box-gemuese-Klein" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat GN3 (Kürzel)", resolveVat({ code: "GN3" }), { vat: "REDUCED_1", unknown: false });

// Unbekanntes → Speise + unknown-Flag (Aufrufer loggt)
check("resolveVat unbekannt", resolveVat({ id: "voellig-neu-xyz" }), { vat: "REDUCED_1", unknown: true });
check("resolveVat leer", resolveVat({}), { vat: "REDUCED_1", unknown: true });

// Getränke-Set deckt keine Bowls ab
check("kein Bowl im Drink-Set", ["24", "25", "26", "27", "28", "29"].some((id) => TERMINAL_DRINK_IDS.has(id)), false);

if (failures > 0) {
  console.error(`\n${failures} Fehler`);
  process.exit(1);
}
console.log("\nalle Tests grün");
