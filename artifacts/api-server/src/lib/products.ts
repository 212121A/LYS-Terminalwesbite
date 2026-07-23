// artifacts/api-server/src/lib/products.ts
/**
 * Produkt-Whitelist des Terminals — Preis- UND Steuer-Autorität des Servers.
 * Extrahiert aus routes/stripe.ts und um USt-Sätze erweitert (Fiskalisierung).
 *
 * USt-Regel (Vorgabe Alex 2026-07-24): **NUR `g-soft` (GD1 Softgetränke) und
 * `g-wasser` (GD2 Wasser) = 19 % (NORMAL)**, die komplette restliche Karte
 * = 7 % (REDUCED_1) — inkl. Matcha, Cà phê, Trà, Soda, Smoothie, Kem, Kids.
 *
 * Identisch zur Website-Autorität `STANDARD_RATE_IDS` in
 * lys-website/api/stripe/create-checkout-session.js. Beide Kanäle rechnen über
 * denselben Stripe-Account ab — derselbe Artikel MUSS gleich besteuert werden.
 * Wer hier etwas ändert, ändert es dort mit.
 *
 * `vat` steht EXPLIZIT an jedem Eintrag, bewusst kein Prefix-Matching.
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

  // Einzige beiden Artikel mit Regelsatz — siehe Kopfkommentar.
  "g-soft-regular": { name: "Softgetränke", price: 300, vat: "NORMAL" },
  "g-wasser-regular": { name: "Wasser", price: 200, vat: "NORMAL" },
  "m-latte-regular": { name: "Matcha Latte (warm/kalt)", price: 450, vat: "REDUCED_1" },
  "m-dau-regular": { name: "Matcha dâu (Erdbeere)", price: 500, vat: "REDUCED_1" },
  "m-xoai-regular": { name: "Matcha xoài (Mango)", price: 500, vat: "REDUCED_1" },
  "m-rasp-regular": { name: "Matcha Raspberry (Himbeere)", price: 500, vat: "REDUCED_1" },
  "m-vietquat-regular": { name: "Matcha việt quất (Blaubeere)", price: 500, vat: "REDUCED_1" },
  "m-dua-ananas-regular": { name: "Matcha dứa (Ananas)", price: 500, vat: "REDUCED_1" },
  "m-vani-regular": { name: "Matcha vani (Vanille)", price: 500, vat: "REDUCED_1" },
  "m-dua-cloud-regular": { name: "Matcha dừa (Coconut Cloud)", price: 550, vat: "REDUCED_1" },
  "cp-den-regular": { name: "Cà phê đen", price: 450, vat: "REDUCED_1" },
  "cp-sua-da-regular": { name: "Cà phê sữa đá", price: 500, vat: "REDUCED_1" },
  "cp-den-da-regular": { name: "Cà phê đen đá", price: 450, vat: "REDUCED_1" },
  "cp-nau-da-regular": { name: "Cà phê nâu đá", price: 500, vat: "REDUCED_1" },
  "cp-dua-regular": { name: "Cà phê dừa", price: 500, vat: "REDUCED_1" },
  "cp-bac-xiu-regular": { name: "Bạc xỉu", price: 600, vat: "REDUCED_1" },
  "t-chanh-leo-regular": { name: "Trà chanh leo", price: 600, vat: "REDUCED_1" },
  "t-vai-regular": { name: "Trà vải", price: 600, vat: "REDUCED_1" },
  "t-dao-regular": { name: "Trà đào cam sả", price: 600, vat: "REDUCED_1" },
  "t-chanh-simple-regular": { name: "Trà chanh", price: 600, vat: "REDUCED_1" },
  "soda-chanh-regular": { name: "Soda chanh", price: 600, vat: "REDUCED_1" },
  "soda-dao-regular": { name: "Soda đào", price: 600, vat: "REDUCED_1" },
  "soda-vai-regular": { name: "Soda vải", price: 600, vat: "REDUCED_1" },
  "soda-dua-regular": { name: "Soda dứa", price: 600, vat: "REDUCED_1" },
  "smoothie-all-regular": { name: "Smoothie", price: 650, vat: "REDUCED_1" },
  "bowl-oats1-regular": { name: "Overnight Oats", price: 650, vat: "REDUCED_1" },
  "bowl-oats2-regular": { name: "Overnight Oats mit Chia", price: 650, vat: "REDUCED_1" },
  "bowl-chia-regular": { name: "Chia Pudding", price: 650, vat: "REDUCED_1" },
  "kem-matcha-regular": { name: "Matcha Latte mit Matcha Eis", price: 650, vat: "REDUCED_1" },
  "kem-vani-regular": { name: "Matcha Latte mit Vanilleeis", price: 650, vat: "REDUCED_1" },
  "kids-schoko-regular": { name: "Schoko Latte", price: 450, vat: "REDUCED_1" },
};

/**
 * Terminal-Menü-IDs mit Regelsatz (artifacts/lys-terminal/src/data/menu.ts):
 * ausschliesslich die Softgetränke gd1 und gd2. Alle uebrigen Terminal-IDs —
 * Matcha 01–08, Cà phê 09–14, Eistee 15–18, Soda 19–22, Smoothie 23,
 * Bowls 24–29, Kem 30–31, Kids 32, Vorspeisen 1/2 — laufen mit 7 %.
 */
export const TERMINAL_STANDARD_RATE_IDS: ReadonlySet<string> = new Set([
  "gd1",
  "gd2",
]);

/**
 * USt-Satz für eine Warenkorb-Position des Terminals.
 * Reihenfolge: exakte PRODUCTS-Lookups (id, id-regular, itemId-regular),
 * dann Terminal-Menü-IDs (Regelsatz nur gd1/gd2; alle uebrigen numerischen IDs
 * ermaessigt), dann Box-/Gericht-Kürzel.
 * `unknown: true` = keine sichere Zuordnung — Aufrufer loggt; Default 7 %.
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
    if (TERMINAL_STANDARD_RATE_IDS.has(candidate)) {
      return { vat: "NORMAL", unknown: false };
    }
    // Alle numerischen Terminal-IDs (1, 2, 01–32): ermaessigt.
    if (/^\d{1,2}$/.test(candidate)) return { vat: "REDUCED_1", unknown: false };
    // Box-Cart-IDs ("box-gemuese-Klein") und Küchen-Kürzel ("c1", "gn3", "kr4"): Speise.
    if (/^box-/.test(candidate) || /^(gn|kn|gr|kr|[csbeavm])\d{1,2}$/.test(candidate)) {
      return { vat: "REDUCED_1", unknown: false };
    }
  }

  return { vat: "REDUCED_1", unknown: true };
}
