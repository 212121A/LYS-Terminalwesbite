export interface MenuItem {
  id: string;
  number: string;
  name: string;
  description?: string;
  price: number;
  spicy?: boolean;
  sizeOptions?: { label: string; price: number }[];
  dishType?: string;
  requiresCarbChoice?: boolean;
  optionProfile?: "matcha" | "coffeeMilk";
  /** Allergen-Codes (1–16, inkl. 1a/1b) laut Betriebs-PDF. Carb-neutral —
   *  das Nudel-E621 (g) ergänzt die Anzeige bei Nudel-Wahl selbst. */
  allergens?: string[];
  /** Zusatzstoff-Codes (a–g) laut Betriebs-PDF. */
  additives?: string[];
}

/** Eine Nudel-/Reisbox als Basis-Gericht. Carb (Nudel/Reis) und Größe
 *  (Klein/Groß, optional) werden direkt auf der Card gewählt; das Mapping
 *  auf die ursprünglichen Warenkorb-IDs (GN1/KN1/GR1/KR1 …) bleibt erhalten,
 *  damit das Kitchen-Dashboard ohne Änderung weiter funktioniert. */
export interface BoxBaseItem {
  id: string;
  name: string;
  dishType?: string;
  carbs: {
    nudel: { klein?: string; gross: string };
    reis: { klein?: string; gross: string };
  };
  sizes: {
    klein?: number;
    gross: number;
  };
  /** Allergen-Codes (1–16, inkl. 1a/1b) laut Betriebs-PDF. Carb-neutral —
   *  das Nudel-E621 (g) ergänzt die Anzeige bei Nudel-Wahl selbst. */
  allergens?: string[];
  /** Zusatzstoff-Codes (a–g) laut Betriebs-PDF. */
  additives?: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
  /** Header-Bilder der Kategorie. Werden auf Desktop/Tablet links neben den
   *  Bestell-Kärtchen gerendert (bei 2 Bildern untereinander gestapelt). */
  images?: string[];
  /** Nur bei der Nudel-/Reisboxen-Sektion gesetzt. Wenn vorhanden, rendert
   *  das Terminal eine spezialisierte Box-Card mit Nudel/Reis-Toggle und
   *  Klein/Groß-Größenauswahl statt der Standard-`items`-Liste. */
  boxItems?: BoxBaseItem[];
}

export const boxMenuItems: BoxBaseItem[] = [
  {
    id: "box-gemuese",
    name: "Gemüse",
    dishType: "gemüse",
    carbs: {
      nudel: { klein: "KN1", gross: "GN1" },
      reis:  { klein: "KR1", gross: "GR1" },
    },
    sizes: { klein: 4.0, gross: 5.0 },
    allergens: [],
    additives: [],
  },
  {
    id: "box-haehnchen",
    name: "Hähnchen",
    dishType: "haehnchenBox",
    carbs: {
      nudel: { klein: "KN2", gross: "GN2" },
      reis:  { klein: "KR2", gross: "GR2" },
    },
    sizes: { klein: 4.5, gross: 6.0 },
    allergens: [],
    additives: [],
  },
  {
    id: "box-paniertes-haehnchen",
    name: "Paniertes Hähnchen",
    dishType: "paniertesHaehnchenBox",
    carbs: {
      nudel: { gross: "GN3" },
      reis:  { gross: "GR3" },
    },
    sizes: { gross: 6.0 },
    allergens: ["1", "1a"],
    additives: [],
  },
  {
    id: "box-fisch",
    name: "Fisch",
    dishType: "fischBox",
    carbs: {
      nudel: { gross: "GN4" },
      reis:  { gross: "GR4" },
    },
    sizes: { gross: 6.0 },
    allergens: ["1", "1a", "4"],
    additives: [],
  },
  {
    id: "box-veg-fruehling",
    name: "Vegetarische Frühlingsrollen",
    dishType: "vegFruehlingBox",
    carbs: {
      nudel: { gross: "GN5" },
      reis:  { gross: "GR5" },
    },
    sizes: { gross: 6.0 },
    allergens: ["1", "1a", "11"],
    additives: [],
  },
  {
    id: "box-tofu",
    name: "Tofu",
    dishType: "tofuBox",
    carbs: {
      nudel: { gross: "GN6" },
      reis:  { gross: "GR6" },
    },
    sizes: { gross: 8.0 },
    allergens: ["6"],
    additives: [],
  },
  {
    id: "box-garnelen",
    name: "Garnelen",
    dishType: "garnelenBox",
    carbs: {
      nudel: { gross: "GN7" },
      reis:  { gross: "GR7" },
    },
    sizes: { gross: 10.0 },
    allergens: ["4"],
    additives: [],
  },
];

const withCarbChoice = (items: MenuItem[]): MenuItem[] =>
  items.map((item) => ({ ...item, requiresCarbChoice: true }));

const matchaOptionNote =
  "Milch wählbar: Kuhmilch inkl. · Soja/Hafer/Kokos +0,50 · als Frappe +1 · als Proteinmatcha +2";

const matchaDrink = (
  id: string,
  number: string,
  name: string,
  price: number,
  allergens: string[] = ["7"],
  additives: string[] = ["e"],
): MenuItem => ({
  id,
  number,
  name,
  price,
  description: matchaOptionNote,
  optionProfile: "matcha",
  allergens,
  additives,
});

export const menuData: MenuCategory[] = [
  {
    id: "vorspeisen",
    name: "Vorspeisen",
    images: ["menu-images/fruehlingsrollen.jpg"],
    items: [
      { id: "1", number: "1", name: "Nem Ran", price: 4.00, allergens: ["1", "1a", "3", "11"], additives: [] },
      { id: "2", number: "2", name: "Mini Frühlingsrollen (vegan)", price: 2.00, dishType: "miniFruehling", allergens: ["1", "1a", "11"], additives: [] },
    ],
  },
  {
    id: "thai-curry",
    name: "Thai Curry",
    images: ["menu-images/thai-curry-nudeln.jpg", "menu-images/thai-curry-reis.jpg"],
    items: withCarbChoice([
      { id: "c1", number: "C1", name: "Gemüse", price: 7.00, spicy: true, dishType: "gemüse", allergens: ["7", "15", "16"], additives: ["g"] },
      { id: "c2", number: "C2", name: "Hähnchenfleisch mit Gemüse", price: 9.00, spicy: true, dishType: "haehnchenGemüse", allergens: ["7", "15", "16"], additives: ["g"] },
      { id: "c3", number: "C3", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, spicy: true, dishType: "paniertesHaehnchenGemüse", allergens: ["1", "1a", "7", "15", "16"], additives: ["g"] },
      { id: "c4", number: "C4", name: "Fisch mit Gemüse", price: 10.50, spicy: true, dishType: "fischGemüse", allergens: ["1", "1a", "4", "7", "15", "16"], additives: ["g"] },
      { id: "c5", number: "C5", name: "Ente mit Gemüse", price: 11.50, spicy: true, dishType: "enteGemüse", allergens: ["1", "1a", "7", "15", "16"], additives: ["g"] },
      { id: "c6", number: "C6", name: "Garnelen mit Gemüse", price: 11.50, spicy: true, dishType: "garnelenGemüse", allergens: ["4", "7", "15", "16"], additives: ["g"] },
      { id: "c7", number: "C7", name: "Tofu mit Gemüse", price: 8.50, spicy: true, dishType: "tofuGemüse", allergens: ["6", "7", "15", "16"], additives: ["g"] },
    ]),
  },
  {
    id: "süss-sauer",
    name: "Süß-Sauer Soße",
    images: ["menu-images/suess-sauer-nudeln.jpg", "menu-images/suess-sauer-reis.jpg"],
    items: withCarbChoice([
      { id: "s1", number: "S1", name: "Gemüse", price: 7.00, dishType: "gemüse", allergens: [], additives: ["d"] },
      { id: "s2", number: "S2", name: "Hähnchenfleisch mit Gemüse & Ananas", price: 9.00, dishType: "haehnchenGemüseAnanas", allergens: [], additives: ["d"] },
      { id: "s3", number: "S3", name: "Paniertes Hähnchenfleisch mit Gemüse & Ananas", price: 10.50, dishType: "paniertesHaehnchenGemüseAnanas", allergens: ["1", "1a"], additives: ["d"] },
      { id: "s4", number: "S4", name: "Fisch mit Gemüse", price: 10.50, dishType: "fischGemüse", allergens: ["1", "1a", "4"], additives: ["d"] },
      { id: "s5", number: "S5", name: "Ente mit Gemüse & Ananas", price: 11.50, dishType: "enteGemüseAnanas", allergens: ["1", "1a"], additives: ["d"] },
      { id: "s6", number: "S6", name: "Garnelen mit Gemüse & Ananas", price: 11.50, dishType: "garnelenGemüseAnanas", allergens: ["4"], additives: ["d"] },
      { id: "s7", number: "S7", name: "Tofu mit Gemüse & Ananas", price: 8.50, dishType: "tofuGemüseAnanas", allergens: ["6"], additives: ["d"] },
    ]),
  },
  {
    id: "soja-sosse",
    name: "Soja Soße",
    images: ["menu-images/soja-1.jpg", "menu-images/soja-2.jpg"],
    items: withCarbChoice([
      { id: "b1", number: "B1", name: "Gemüse", price: 7.00, dishType: "gemüse", allergens: ["6"], additives: ["a", "g"] },
      { id: "b2", number: "B2", name: "Hähnchenfleisch mit Gemüse", price: 9.00, dishType: "haehnchenGemüse", allergens: ["6"], additives: ["a", "g"] },
      { id: "b3", number: "B3", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, dishType: "paniertesHaehnchenGemüse", allergens: ["1", "1a", "6"], additives: ["a", "g"] },
      { id: "b4", number: "B4", name: "Fisch mit Gemüse", price: 10.50, dishType: "fischGemüse", allergens: ["1", "1a", "4", "6"], additives: ["a", "g"] },
      { id: "b5", number: "B5", name: "Ente mit Gemüse", price: 11.50, dishType: "enteGemüse", allergens: ["1", "1a", "6"], additives: ["a", "g"] },
      { id: "b6", number: "B6", name: "Garnelen mit Gemüse", price: 11.50, dishType: "garnelenGemüse", allergens: ["4", "6"], additives: ["a", "g"] },
      { id: "b7", number: "B7", name: "Tofu mit Gemüse", price: 8.50, dishType: "tofuGemüse", allergens: ["6"], additives: ["a", "g"] },
    ]),
  },
  {
    id: "erdnuss-sosse",
    name: "Erdnusssoße",
    images: ["menu-images/erdnuss-nudeln.jpg", "menu-images/erdnuss-reis.jpg"],
    items: withCarbChoice([
      { id: "e1", number: "E1", name: "Gemüse", price: 7.00, spicy: true, dishType: "gemüse", allergens: ["5", "7", "15", "16"], additives: ["g"] },
      { id: "e2", number: "E2", name: "Hähnchenfleisch mit Gemüse", price: 9.00, spicy: true, dishType: "haehnchenGemüse", allergens: ["5", "7", "15", "16"], additives: ["g"] },
      { id: "e3", number: "E3", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, spicy: true, dishType: "paniertesHaehnchenGemüse", allergens: ["1", "1a", "5", "7", "15", "16"], additives: ["g"] },
      { id: "e4", number: "E4", name: "Fisch mit Gemüse", price: 10.50, spicy: true, dishType: "fischGemüse", allergens: ["1", "1a", "4", "5", "7", "15", "16"], additives: ["g"] },
      { id: "e5", number: "E5", name: "Ente mit Gemüse", price: 11.50, spicy: true, dishType: "enteGemüse", allergens: ["1", "1a", "5", "7", "15", "16"], additives: ["g"] },
      { id: "e6", number: "E6", name: "Garnelen mit Gemüse", price: 11.50, spicy: true, dishType: "garnelenGemüse", allergens: ["4", "5", "7", "15", "16"], additives: ["g"] },
      { id: "e7", number: "E7", name: "Tofu mit Gemüse", price: 8.50, spicy: true, dishType: "tofuGemüse", allergens: ["5", "6", "7", "15", "16"], additives: ["g"] },
    ]),
  },
  {
    id: "matcha-sosse",
    name: "Matcha Soße",
    images: ["menu-images/matchasosse-nudeln.jpg", "menu-images/matchasosse-reis.jpg"],
    items: withCarbChoice([
      { id: "m1", number: "M1", name: "Gemüse", price: 7.00, dishType: "gemüse", allergens: ["7", "15", "16"], additives: ["e", "g"] },
      { id: "m2", number: "M2", name: "Hähnchenfleisch mit Gemüse", price: 9.00, dishType: "haehnchenGemüse", allergens: ["7", "15", "16"], additives: ["e", "g"] },
      { id: "m3", number: "M3", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, dishType: "paniertesHaehnchenGemüse", allergens: ["1", "1a", "7", "15", "16"], additives: ["e", "g"] },
      { id: "m4", number: "M4", name: "Fisch mit Gemüse", price: 10.50, dishType: "fischGemüse", allergens: ["1", "1a", "4", "7", "15", "16"], additives: ["e", "g"] },
      { id: "m5", number: "M5", name: "Ente mit Gemüse", price: 11.50, dishType: "enteGemüse", allergens: ["1", "1a", "7", "15", "16"], additives: ["e", "g"] },
      { id: "m6", number: "M6", name: "Garnelen mit Gemüse", price: 11.50, dishType: "garnelenGemüse", allergens: ["4", "7", "15", "16"], additives: ["e", "g"] },
      { id: "m7", number: "M7", name: "Tofu mit Gemüse", price: 8.50, dishType: "tofuGemüse", allergens: ["6", "7", "15", "16"], additives: ["e", "g"] },
    ]),
  },
  {
    id: "mango-sosse",
    name: "Mango Soße",
    images: ["menu-images/mangososse-nudeln.jpg", "menu-images/mangososse-reis.jpg"],
    items: withCarbChoice([
      { id: "m8",  number: "M8",  name: "Gemüse", price: 7.00, dishType: "gemüse", allergens: ["7", "15", "16"], additives: ["g"] },
      { id: "m9",  number: "M9",  name: "Hähnchenfleisch mit Gemüse", price: 9.00, dishType: "haehnchenGemüse", allergens: ["7", "15", "16"], additives: ["g"] },
      { id: "m10", number: "M10", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, dishType: "paniertesHaehnchenGemüse", allergens: ["1", "1a", "7", "15", "16"], additives: ["g"] },
      { id: "m11", number: "M11", name: "Fisch mit Gemüse", price: 10.50, dishType: "fischGemüse", allergens: ["1", "1a", "4", "7", "15", "16"], additives: ["g"] },
      { id: "m12", number: "M12", name: "Ente mit Gemüse", price: 11.50, dishType: "enteGemüse", allergens: ["1", "1a", "7", "15", "16"], additives: ["g"] },
      { id: "m13", number: "M13", name: "Garnelen mit Gemüse", price: 11.50, dishType: "garnelenGemüse", allergens: ["4", "7", "15", "16"], additives: ["g"] },
      { id: "m14", number: "M14", name: "Tofu mit Gemüse", price: 8.50, dishType: "tofuGemüse", allergens: ["6", "7", "15", "16"], additives: ["g"] },
    ]),
  },
  {
    id: "gebratener-reis",
    name: "Gebratener Reis",
    images: ["menu-images/gebratener-reis.jpg"],
    items: [
      { id: "a1", number: "A1", name: "Mit Ei & Gemüse", price: 7.00, dishType: "mitEiGemüse", allergens: ["3"], additives: ["g"] },
      { id: "a2", number: "A2", name: "Hähnchenfleisch mit Gemüse", price: 8.50, dishType: "haehnchenGemüse", allergens: ["1", "1a", "3"], additives: ["g"] },
      { id: "a3", number: "A3", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, dishType: "paniertesHaehnchenGemüse", allergens: ["1", "1a", "3"], additives: ["g"] },
      { id: "a4", number: "A4", name: "Fisch mit Gemüse", price: 10.50, dishType: "fischGemüse", allergens: ["1", "1a", "3", "4"], additives: ["g"] },
      { id: "a5", number: "A5", name: "Ente mit Gemüse", price: 11.50, dishType: "enteGemüse", allergens: ["1", "1a", "3"], additives: ["g"] },
      { id: "a6", number: "A6", name: "Garnelen mit Gemüse", price: 10.00, dishType: "garnelenGemüse", allergens: ["3", "4"], additives: ["g"] },
      { id: "a7", number: "A7", name: "Tofu mit Gemüse", price: 8.50, dishType: "tofuGemüse", allergens: ["3", "6"], additives: ["g"] },
    ],
  },
  {
    id: "nudel-reisboxen",
    name: "Nudel- & Reisboxen",
    images: ["menu-images/nudelbox.jpg", "menu-images/reisbox-ente.jpg"],
    items: [],
    boxItems: boxMenuItems,
  },
  {
    id: "matcha-getraenke",
    name: "Matcha",
    images: ["menu-images/matcha.png"],
    items: [
      matchaDrink("01", "01", "Matcha Latte (warm/kalt)", 4.50),
      matchaDrink("02", "02", "Matcha dâu (Erdbeere)", 5.00),
      matchaDrink("03", "03", "Matcha xoài (Mango)", 5.00),
      matchaDrink("04", "04", "Matcha Raspberry (Himbeere)", 5.00),
      matchaDrink("05", "05", "Matcha việt quất (Blaubeere)", 5.00),
      matchaDrink("06", "06", "Matcha dứa (Ananas)", 5.00),
      matchaDrink("07", "07", "Matcha vani (Vanille)", 5.00),
      matchaDrink("08", "08", "Matcha dừa (Coconut Cloud)", 5.50, ["7", "15"]),
    ],
  },
  {
    id: "ca-phe",
    name: "Cà Phê Việt Nam",
    images: ["menu-images/ca-phe.png"],
    items: [
      { id: "09", number: "09", name: "Cà phê đen (schwarzer Kaffee)",                  price: 4.50, allergens: [], additives: ["e"] },
      { id: "10", number: "10", name: "Cà phê sữa đá (Kaffee, Kondensmilch & Eis)",     price: 5.00, allergens: ["7"], additives: ["e"] },
      { id: "11", number: "11", name: "Cà phê đen đá (schwarzer Kaffee & Eis)",         price: 4.50, allergens: [], additives: ["e"] },
      {
        id: "12",
        number: "12",
        name: "Cà phê nâu đá (Kaffee mit Milch & Eis)",
        price: 5.00,
        description: "Milch wählbar: Kuhmilch · Sojamilch · Hafermilch · Kokosmilch (ohne Aufpreis)",
        optionProfile: "coffeeMilk",
        allergens: ["7"],
        additives: ["e"],
      },
      { id: "13", number: "13", name: "Cà phê dừa (Kaffee mit Kokosmilch)",             price: 5.00, allergens: ["15"], additives: ["e"] },
      { id: "14", number: "14", name: "Bạc xỉu (Kaffee, Kondensmilch & Kokosmilch)",    price: 6.00, allergens: ["7", "15"], additives: ["e"] },
    ],
  },
  {
    id: "tra-eistee",
    name: "Trà – Hausgemachter Eistee",
    images: ["menu-images/eistee.png"],
    items: [
      { id: "15", number: "15", name: "Chanh leo (Passionsfrucht)",                     price: 6.00, allergens: [], additives: [] },
      { id: "16", number: "16", name: "Trà vải (Lychee, Zitrone & Orange)",             price: 6.00, allergens: [], additives: [] },
      { id: "17", number: "17", name: "Trà đào cam sả (Pfirsich, Orange & Zitronengras)", price: 6.00, allergens: [], additives: [] },
      { id: "18", number: "18", name: "Trà chanh (Zitronentee)",                        price: 6.00, allergens: [], additives: [] },
    ],
  },
  {
    id: "soda",
    name: "Soda",
    images: ["menu-images/soda.png"],
    items: [
      { id: "19", number: "19", name: "Soda chanh (Zitrone)", price: 6.00, allergens: [], additives: [] },
      { id: "20", number: "20", name: "Soda đào (Pfirsich)",  price: 6.00, allergens: [], additives: [] },
      { id: "21", number: "21", name: "Soda vải (Lychee)",    price: 6.00, allergens: [], additives: [] },
      { id: "22", number: "22", name: "Soda dứa (Ananas)",    price: 6.00, allergens: [], additives: [] },
    ],
  },
  {
    id: "smoothies",
    name: "Sinh Tố – Smoothies",
    images: ["menu-images/smoothie.png"],
    items: [
      {
        id: "23", number: "23", name: "Smoothie nach Wahl", price: 6.50,
        description: "Banane · Erdbeere · Mango · Ananas · Himbeere · Blaubeere",
        dishType: "alleSmoothies",
        allergens: [],
        additives: [],
      },
    ],
  },
  {
    id: "bowls",
    name: "Bowls",
    images: ["menu-images/bowl.png"],
    items: [
      { id: "24", number: "24", name: "Overnight Oats mit Haferflocken & Milch", price: 6.50, dishType: "overnightOatsMilch", description: "Frische saisonale Früchte inklusive (Banane, Erdbeere, Blaubeere, Himbeere, Mango)", allergens: ["1", "7"], additives: [] },
      { id: "25", number: "25", name: "Joghurt Bowl",   price: 6.50, dishType: "joghurtBowl",  description: "Frische saisonale Früchte inklusive (Banane, Erdbeere, Blaubeere, Himbeere, Mango)", allergens: ["7"], additives: [] },
      { id: "26", number: "26", name: "Protein Bowl",   price: 6.50, dishType: "proteinBowl",  description: "Frische saisonale Früchte inklusive (Banane, Erdbeere, Blaubeere, Himbeere, Mango)", allergens: ["7"], additives: [] },
      { id: "27", number: "27", name: "Açaí Bowl",      price: 6.50, dishType: "acaiBowl",     description: "Frische saisonale Früchte inklusive (Banane, Erdbeere, Blaubeere, Himbeere, Mango)", allergens: [], additives: [] },
      { id: "28", number: "28", name: "Smoothie Bowl",  price: 6.50, dishType: "smoothieBowl", description: "Frische saisonale Früchte inklusive (Banane, Erdbeere, Blaubeere, Himbeere, Mango)", allergens: [], additives: [] },
      { id: "29", number: "29", name: "Chia Pudding",   price: 6.50, dishType: "chiaPudding",  description: "Frische saisonale Früchte inklusive (Banane, Erdbeere, Blaubeere, Himbeere, Mango)", allergens: ["7"], additives: [] },
    ],
  },
  {
    id: "kem",
    name: "Kem – Eisspezialitäten",
    images: ["menu-images/kem.png"],
    items: [
      { id: "30", number: "30", name: "Matcha Latte với kem Matcha", price: 6.50, dishType: "matchaLatteMatchaEis", allergens: ["7"], additives: ["e"] },
      { id: "31", number: "31", name: "Matcha Latte với kem vani",   price: 6.50, dishType: "matchaLatteVanilleeis", allergens: ["7"], additives: ["e"] },
    ],
  },
  {
    id: "kids",
    name: "Kids",
    images: ["menu-images/kids.png"],
    items: [
      { id: "32", number: "32", name: "Schoko Latte (Kids)", price: 4.50, dishType: "kidsSchokoLatte", allergens: ["7"], additives: [] },
    ],
  },
  {
    id: "softgetraenke",
    name: "Softgetränke",
    images: ["menu-images/softgetraenke.jpg"],
    items: [
      { id: "gd1", number: "GD1", name: "Softgetränke (inkl. Pfand)", price: 3.00, dishType: "softgetraenkeItem" },
      { id: "gd2", number: "GD2", name: "Wasser (inkl. Pfand)",       price: 2.00, dishType: "wasserItem" },
    ],
  },
];

const DRINK_CATEGORY_IDS_FOR_ITEMS = new Set([
  "matcha-getraenke", "ca-phe", "tra-eistee", "soda", "smoothies", "softgetraenke",
]);
/** Item-IDs aller Getränke — zur Unterscheidung Speise/Getränk (z. B. Extra-Soße im Checkout). */
export const DRINK_ITEM_IDS: ReadonlySet<string> = new Set(
  menuData
    .filter((c) => DRINK_CATEGORY_IDS_FOR_ITEMS.has(c.id))
    .flatMap((c) => (c.items ?? []).map((i) => i.id)),
);

const itemIdsOfCategory = (categoryId: string): string[] =>
  menuData.find((c) => c.id === categoryId)?.items.map((i) => i.id) ?? [];

/** Items ohne Auswahl-Modal — gehen direkt in den Warenkorb: Vorspeisen sowie
 *  die süßen Kem-/Kids-Artikel, bei denen eine Extra-Soße keinen Sinn ergibt. */
export const DIRECT_ADD_ITEM_IDS: ReadonlySet<string> = new Set([
  ...itemIdsOfCategory("vorspeisen"),
  ...itemIdsOfCategory("kem"),
  ...itemIdsOfCategory("kids"),
]);
/** Bowls öffnen statt einer Soße das Topping-Modal (Früchte inkl. + Aufpreis-Toppings). */
export const BOWL_ITEM_IDS: ReadonlySet<string> = new Set(itemIdsOfCategory("bowls"));
