// artifacts/api-server/src/lib/products.ts
/**
 * Produkt-Whitelist des Terminals — Preis- UND Steuer-Autorität des Servers.
 * Extrahiert aus routes/stripe.ts und um USt-Sätze erweitert (Fiskalisierung).
 *
 * USt (Stand ab 2026-01-01): Speisen 7 % (REDUCED_1, auch vor Ort),
 * Getränke 19 % (NORMAL). `vat` steht EXPLIZIT an jedem Eintrag — bewusst kein
 * Prefix-Matching: `m1-…m14-` sind Speisen (Matcha-/Mango-SOSSE), `m-latte-…`
 * sind Getränke. Wer hier rät, bucht falsche Steuern.
 *
 * Für den Steuerberater: Milchmischgetränke (>75 % Milch, z. B. Latte to-go)
 * KÖNNEN 7 % sein — bewusst pauschal 19 % gewählt; Einzelfälle hier umstellen.
 */

export type VatRate = "NORMAL" | "REDUCED_1";

export type Product = { name: string; price: number; vat: VatRate };

export const PRODUCTS: Record<string, Product> = {
  "v1-regular": { name: "Nem Ran", price: 400, vat: "REDUCED_1" },
  "v2-regular": { name: "Mini Frühlingsrollen (vegan)", price: 200, vat: "REDUCED_1" },

  "c1-regular": { name: "Gemüse Thai Curry", price: 700, vat: "REDUCED_1" },
  "c2-regular": { name: "Hähnchenfleisch Thai Curry", price: 900, vat: "REDUCED_1" },
  "c3-regular": { name: "Paniertes Hähnchenfleisch Thai Curry", price: 1050, vat: "REDUCED_1" },
  "c4-regular": { name: "Fisch Thai Curry", price: 1050, vat: "REDUCED_1" },
  "c5-regular": { name: "Ente Thai Curry", price: 1150, vat: "REDUCED_1" },
  "c6-regular": { name: "Garnelen Thai Curry", price: 1150, vat: "REDUCED_1" },
  "c7-regular": { name: "Tofu Thai Curry", price: 850, vat: "REDUCED_1" },

  "s1-regular": { name: "Gemüse Süß-Sauer", price: 700, vat: "REDUCED_1" },
  "s2-regular": { name: "Hähnchenfleisch Süß-Sauer", price: 900, vat: "REDUCED_1" },
  "s3-regular": { name: "Paniertes Hähnchenfleisch Süß-Sauer", price: 1050, vat: "REDUCED_1" },
  "s4-regular": { name: "Fisch Süß-Sauer", price: 1050, vat: "REDUCED_1" },
  "s5-regular": { name: "Ente Süß-Sauer", price: 1150, vat: "REDUCED_1" },
  "s6-regular": { name: "Garnelen Süß-Sauer", price: 1150, vat: "REDUCED_1" },
  "s7-regular": { name: "Tofu Süß-Sauer", price: 850, vat: "REDUCED_1" },

  "b1-regular": { name: "Gemüse Soja", price: 700, vat: "REDUCED_1" },
  "b2-regular": { name: "Hähnchenfleisch Soja", price: 900, vat: "REDUCED_1" },
  "b3-regular": { name: "Paniertes Hähnchenfleisch Soja", price: 1050, vat: "REDUCED_1" },
  "b4-regular": { name: "Fisch Soja", price: 1050, vat: "REDUCED_1" },
  "b5-regular": { name: "Ente Soja", price: 1150, vat: "REDUCED_1" },
  "b6-regular": { name: "Garnelen Soja", price: 1150, vat: "REDUCED_1" },
  "b7-regular": { name: "Tofu Soja", price: 850, vat: "REDUCED_1" },

  "e1-regular": { name: "Gemüse Erdnuss", price: 700, vat: "REDUCED_1" },
  "e2-regular": { name: "Hähnchenfleisch Erdnuss", price: 900, vat: "REDUCED_1" },
  "e3-regular": { name: "Paniertes Hähnchenfleisch Erdnuss", price: 1050, vat: "REDUCED_1" },
  "e4-regular": { name: "Fisch Erdnuss", price: 1050, vat: "REDUCED_1" },
  "e5-regular": { name: "Ente Erdnuss", price: 1150, vat: "REDUCED_1" },
  "e6-regular": { name: "Garnelen Erdnuss", price: 1150, vat: "REDUCED_1" },
  "e7-regular": { name: "Tofu Erdnuss", price: 850, vat: "REDUCED_1" },

  "m1-regular": { name: "Gemüse Matcha Soße", price: 700, vat: "REDUCED_1" },
  "m2-regular": { name: "Hähnchenfleisch Matcha Soße", price: 900, vat: "REDUCED_1" },
  "m3-regular": { name: "Paniertes Hähnchenfleisch Matcha Soße", price: 1050, vat: "REDUCED_1" },
  "m4-regular": { name: "Fisch Matcha Soße", price: 1050, vat: "REDUCED_1" },
  "m5-regular": { name: "Ente Matcha Soße", price: 1150, vat: "REDUCED_1" },
  "m6-regular": { name: "Garnelen Matcha Soße", price: 1150, vat: "REDUCED_1" },
  "m7-regular": { name: "Tofu Matcha Soße", price: 850, vat: "REDUCED_1" },

  "m8-regular": { name: "Gemüse Mango Soße", price: 700, vat: "REDUCED_1" },
  "m9-regular": { name: "Hähnchenfleisch Mango Soße", price: 900, vat: "REDUCED_1" },
  "m10-regular": { name: "Paniertes Hähnchenfleisch Mango Soße", price: 1050, vat: "REDUCED_1" },
  "m11-regular": { name: "Fisch Mango Soße", price: 1050, vat: "REDUCED_1" },
  "m12-regular": { name: "Ente Mango Soße", price: 1150, vat: "REDUCED_1" },
  "m13-regular": { name: "Garnelen Mango Soße", price: 1150, vat: "REDUCED_1" },
  "m14-regular": { name: "Tofu Mango Soße", price: 850, vat: "REDUCED_1" },

  "a1-regular": { name: "Gebratener Reis mit Ei & Gemüse", price: 700, vat: "REDUCED_1" },
  "a2-regular": { name: "Gebratener Reis Hähnchenfleisch", price: 850, vat: "REDUCED_1" },
  "a3-regular": { name: "Gebratener Reis Paniertes Hähnchenfleisch", price: 1050, vat: "REDUCED_1" },
  "a4-regular": { name: "Gebratener Reis Fisch", price: 1050, vat: "REDUCED_1" },
  "a5-regular": { name: "Gebratener Reis Ente", price: 1150, vat: "REDUCED_1" },
  "a6-regular": { name: "Gebratener Reis Garnelen", price: 1000, vat: "REDUCED_1" },
  "a7-regular": { name: "Gebratener Reis Tofu", price: 850, vat: "REDUCED_1" },

  "box-gemuse-small": { name: "Nudel-/Reisbox Gemüse (klein)", price: 400, vat: "REDUCED_1" },
  "box-gemuse-large": { name: "Nudel-/Reisbox Gemüse (groß)", price: 500, vat: "REDUCED_1" },
  "box-gemuse-regular": { name: "Nudel-/Reisbox Gemüse (groß)", price: 500, vat: "REDUCED_1" },
  "box-huehnchen-small": { name: "Nudel-/Reisbox Hähnchen (klein)", price: 450, vat: "REDUCED_1" },
  "box-huehnchen-large": { name: "Nudel-/Reisbox Hähnchen (groß)", price: 600, vat: "REDUCED_1" },
  "box-huehnchen-regular": { name: "Nudel-/Reisbox Hähnchen (groß)", price: 600, vat: "REDUCED_1" },
  "box-pan-huehnchen-regular": { name: "Nudel-/Reisbox Paniertes Hähnchen", price: 600, vat: "REDUCED_1" },
  "box-fisch-regular": { name: "Nudel-/Reisbox Fisch", price: 600, vat: "REDUCED_1" },
  "box-fruehlingsrollen-regular": { name: "Nudel-/Reisbox Frühlingsrollen", price: 600, vat: "REDUCED_1" },
  "box-tofu-regular": { name: "Nudel-/Reisbox Tofu", price: 800, vat: "REDUCED_1" },
  "box-garnelen-regular": { name: "Nudel-/Reisbox Garnelen", price: 1000, vat: "REDUCED_1" },

  "g-soft-regular": { name: "Softgetränke", price: 300, vat: "NORMAL" },
  "g-wasser-regular": { name: "Wasser", price: 200, vat: "NORMAL" },
  "m-latte-regular": { name: "Matcha Latte (warm/kalt)", price: 450, vat: "NORMAL" },
  "m-dau-regular": { name: "Matcha dâu (Erdbeere)", price: 500, vat: "NORMAL" },
  "m-xoai-regular": { name: "Matcha xoài (Mango)", price: 500, vat: "NORMAL" },
  "m-rasp-regular": { name: "Matcha Raspberry (Himbeere)", price: 500, vat: "NORMAL" },
  "m-vietquat-regular": { name: "Matcha việt quất (Blaubeere)", price: 500, vat: "NORMAL" },
  "m-dua-ananas-regular": { name: "Matcha dứa (Ananas)", price: 500, vat: "NORMAL" },
  "m-vani-regular": { name: "Matcha vani (Vanille)", price: 500, vat: "NORMAL" },
  "m-dua-cloud-regular": { name: "Matcha dừa (Coconut Cloud)", price: 550, vat: "NORMAL" },
  "cp-den-regular": { name: "Cà phê đen", price: 450, vat: "NORMAL" },
  "cp-sua-da-regular": { name: "Cà phê sữa đá", price: 500, vat: "NORMAL" },
  "cp-den-da-regular": { name: "Cà phê đen đá", price: 450, vat: "NORMAL" },
  "cp-nau-da-regular": { name: "Cà phê nâu đá", price: 500, vat: "NORMAL" },
  "cp-dua-regular": { name: "Cà phê dừa", price: 500, vat: "NORMAL" },
  "cp-bac-xiu-regular": { name: "Bạc xỉu", price: 600, vat: "NORMAL" },
  "t-chanh-leo-regular": { name: "Trà chanh leo", price: 600, vat: "NORMAL" },
  "t-vai-regular": { name: "Trà vải", price: 600, vat: "NORMAL" },
  "t-dao-regular": { name: "Trà đào cam sả", price: 600, vat: "NORMAL" },
  "t-chanh-simple-regular": { name: "Trà chanh", price: 600, vat: "NORMAL" },
  "soda-chanh-regular": { name: "Soda chanh", price: 600, vat: "NORMAL" },
  "soda-dao-regular": { name: "Soda đào", price: 600, vat: "NORMAL" },
  "soda-vai-regular": { name: "Soda vải", price: 600, vat: "NORMAL" },
  "soda-dua-regular": { name: "Soda dứa", price: 600, vat: "NORMAL" },
  "smoothie-all-regular": { name: "Smoothie", price: 650, vat: "NORMAL" },
  "bowl-oats1-regular": { name: "Overnight Oats", price: 650, vat: "REDUCED_1" },
  "bowl-oats2-regular": { name: "Overnight Oats mit Chia", price: 650, vat: "REDUCED_1" },
  "bowl-chia-regular": { name: "Chia Pudding", price: 650, vat: "REDUCED_1" },
  "kem-matcha-regular": { name: "Matcha Latte mit Matcha Eis", price: 650, vat: "NORMAL" },
  "kem-vani-regular": { name: "Matcha Latte mit Vanilleeis", price: 650, vat: "NORMAL" },
  "kids-schoko-regular": { name: "Schoko Latte", price: 450, vat: "NORMAL" },
};

/**
 * Getränke-Item-IDs des Terminal-Frontends (artifacts/lys-terminal/src/data/menu.ts,
 * DRINK_ITEM_IDS + Kem/Kids/GD): Matcha 01–08, Cà phê 09–14, Eistee 15–18,
 * Soda 19–22, Smoothie 23, Kem 30–31, Kids 32, Softgetränke gd1/gd2.
 * Bowls 24–29 sind SPEISEN. Vorspeisen "1"/"2" (ohne führende Null) ≠ "01"/"02".
 */
export const TERMINAL_DRINK_IDS: ReadonlySet<string> = new Set([
  "01", "02", "03", "04", "05", "06", "07", "08",
  "09", "10", "11", "12", "13", "14",
  "15", "16", "17", "18",
  "19", "20", "21", "22",
  "23",
  "30", "31", "32",
  "gd1", "gd2",
]);

/**
 * USt-Satz für eine Warenkorb-Position des Terminals.
 * Reihenfolge: exakte PRODUCTS-Lookups (id, id-regular, itemId-regular),
 * dann Terminal-Menü-IDs (Getränke-Set; alle übrigen numerischen IDs = Speise,
 * z. B. Vorspeisen 1/2 und Bowls 24–29), dann Box-/Gericht-Kürzel.
 * `unknown: true` = keine sichere Zuordnung — Aufrufer loggt; Default Speise.
 */
export function resolveVat(item: {
  id?: string;
  itemId?: string;
  code?: string;
}): { vat: VatRate; unknown: boolean } {
  const candidates = [item.id, item.itemId, item.code]
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .map((v) => v.trim().toLowerCase());

  for (const candidate of candidates) {
    const product = PRODUCTS[candidate] ?? PRODUCTS[`${candidate}-regular`];
    if (product) return { vat: product.vat, unknown: false };
  }

  for (const candidate of candidates) {
    if (TERMINAL_DRINK_IDS.has(candidate)) return { vat: "NORMAL", unknown: false };
    // Numerische Terminal-IDs, die kein Getränk sind (1, 2, 24–29): Speise.
    if (/^\d{1,2}$/.test(candidate)) return { vat: "REDUCED_1", unknown: false };
    // Box-Cart-IDs ("box-gemuese-Klein") und Küchen-Kürzel ("c1", "gn3", "kr4"): Speise.
    if (/^box-/.test(candidate) || /^(gn|kn|gr|kr|[csbeavm])\d{1,2}$/.test(candidate)) {
      return { vat: "REDUCED_1", unknown: false };
    }
  }

  return { vat: "REDUCED_1", unknown: true };
}
