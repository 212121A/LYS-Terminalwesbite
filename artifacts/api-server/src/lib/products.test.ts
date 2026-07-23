// artifacts/api-server/src/lib/products.test.ts
// Lauf: node --experimental-strip-types src/lib/products.test.ts
import { PRODUCTS, resolveVat, TERMINAL_STANDARD_RATE_IDS } from "./products.ts";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures++;
    console.error(`FAIL ${name}\n  got:      ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// Regelsatz gilt AUSSCHLIESSLICH fuer GD1/GD2 — alles andere 7 %.
check("g-soft ist Regelsatz", PRODUCTS["g-soft-regular"].vat, "NORMAL");
check("g-wasser ist Regelsatz", PRODUCTS["g-wasser-regular"].vat, "NORMAL");
check(
  "genau 2 Artikel mit Regelsatz",
  Object.entries(PRODUCTS).filter(([, p]) => p.vat === "NORMAL").map(([k]) => k).sort(),
  ["g-soft-regular", "g-wasser-regular"],
);

// Frueher 19 %, seit 2026-07-24 ermaessigt.
check("m-latte-regular ermaessigt", PRODUCTS["m-latte-regular"].vat, "REDUCED_1");
check("kem-matcha ermaessigt", PRODUCTS["kem-matcha-regular"].vat, "REDUCED_1");
check("smoothie ermaessigt", PRODUCTS["smoothie-all-regular"].vat, "REDUCED_1");
check("kids-schoko ermaessigt", PRODUCTS["kids-schoko-regular"].vat, "REDUCED_1");

// Speisen unveraendert (m1 = Matcha-SOSSE, nicht Matcha-Getraenk).
check("m1-regular ist Speise", PRODUCTS["m1-regular"].vat, "REDUCED_1");
check("m14-regular ist Speise", PRODUCTS["m14-regular"].vat, "REDUCED_1");
check("bowl-oats1 Speise", PRODUCTS["bowl-oats1-regular"].vat, "REDUCED_1");

// Jeder PRODUCTS-Eintrag hat einen expliziten vat-Satz.
check("alle Einträge haben vat", Object.values(PRODUCTS).every((p) => p.vat === "NORMAL" || p.vat === "REDUCED_1"), true);

// resolveVat: exakter Lookup (Website-/Stripe-IDs)
check("resolveVat c1-regular", resolveVat({ id: "c1-regular" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat kurz c1", resolveVat({ id: "c1" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat soda-chanh", resolveVat({ id: "soda-chanh" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat g-soft", resolveVat({ id: "g-soft" }), { vat: "NORMAL", unknown: false });

// Terminal-Menü-IDs: Regelsatz nur gd1/gd2, alle numerischen IDs ermaessigt
check("resolveVat Matcha '01'", resolveVat({ itemId: "01" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat Vorspeise '1'", resolveVat({ itemId: "1" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat Bowl '27'", resolveVat({ itemId: "27" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat Kids '32'", resolveVat({ code: "32" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat gd1", resolveVat({ itemId: "gd1" }), { vat: "NORMAL", unknown: false });
check("resolveVat gd2", resolveVat({ itemId: "gd2" }), { vat: "NORMAL", unknown: false });

// Box-Cart-IDs (Größe im Suffix) + Küchen-Kürzel
check("resolveVat box-gemuese-Klein", resolveVat({ id: "box-gemuese-Klein" }), { vat: "REDUCED_1", unknown: false });
check("resolveVat GN3 (Kürzel)", resolveVat({ code: "GN3" }), { vat: "REDUCED_1", unknown: false });

// Unbekanntes → Speise + unknown-Flag (Aufrufer loggt)
check("resolveVat unbekannt", resolveVat({ id: "voellig-neu-xyz" }), { vat: "REDUCED_1", unknown: true });
check("resolveVat leer", resolveVat({}), { vat: "REDUCED_1", unknown: true });

// Regelsatz-Set enthaelt ausschliesslich gd1/gd2
check("Regelsatz-Set = {gd1,gd2}", [...TERMINAL_STANDARD_RATE_IDS].sort(), ["gd1", "gd2"]);

if (failures > 0) {
  console.error(`\n${failures} Fehler`);
  process.exit(1);
}
console.log("\nalle Tests grün");
