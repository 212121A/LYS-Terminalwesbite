export interface MenuItem {
  id: string;
  number: string;
  name: string;
  description?: string;
  price: number;
  spicy?: boolean;
  sizeOptions?: { label: string; price: number }[];
  dishType?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export const menuData: MenuCategory[] = [
  {
    id: "vorspeisen",
    name: "Vorspeisen",
    items: [
      { id: "v1", number: "V1", name: "Nem Ran", price: 4.00 },
      { id: "v2", number: "V2", name: "Mini Frühlingsrollen (vegan)", price: 2.00, dishType: "miniFruehling" },
    ],
  },
  {
    id: "thai-curry",
    name: "Thai Curry",
    items: [
      { id: "c1", number: "C1", name: "Gemüse", price: 7.00, spicy: true, dishType: "gemüse" },
      { id: "c2", number: "C2", name: "Hähnchenfleisch mit Gemüse", price: 9.00, spicy: true, dishType: "haehnchenGemüse" },
      { id: "c3", number: "C3", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, spicy: true, dishType: "paniertesHaehnchenGemüse" },
      { id: "c4", number: "C4", name: "Fisch mit Gemüse", price: 10.50, spicy: true, dishType: "fischGemüse" },
      { id: "c5", number: "C5", name: "Ente mit Gemüse", price: 11.50, spicy: true, dishType: "enteGemüse" },
      { id: "c6", number: "C6", name: "Garnelen mit Gemüse", price: 11.50, spicy: true, dishType: "garnelenGemüse" },
      { id: "c7", number: "C7", name: "Tofu mit Gemüse", price: 8.50, spicy: true, dishType: "tofuGemüse" },
    ],
  },
  {
    id: "süss-sauer",
    name: "Süß-Sauer Soße",
    items: [
      { id: "s1", number: "S1", name: "Gemüse", price: 7.00, dishType: "gemüse" },
      { id: "s2", number: "S2", name: "Hähnchenfleisch mit Gemüse & Ananas", price: 9.00, dishType: "haehnchenGemüseAnanas" },
      { id: "s3", number: "S3", name: "Paniertes Hähnchenfleisch mit Gemüse & Ananas", price: 10.50, dishType: "paniertesHaehnchenGemüseAnanas" },
      { id: "s4", number: "S4", name: "Fisch mit Gemüse", price: 10.50, dishType: "fischGemüse" },
      { id: "s5", number: "S5", name: "Ente mit Gemüse & Ananas", price: 11.50, dishType: "enteGemüseAnanas" },
      { id: "s6", number: "S6", name: "Garnelen mit Gemüse & Ananas", price: 11.50, dishType: "garnelenGemüseAnanas" },
      { id: "s7", number: "S7", name: "Tofu mit Gemüse & Ananas", price: 8.50, dishType: "tofuGemüseAnanas" },
    ],
  },
  {
    id: "soja-sosse",
    name: "Soja Soße",
    items: [
      { id: "b1", number: "B1", name: "Gemüse", price: 7.00, dishType: "gemüse" },
      { id: "b2", number: "B2", name: "Hähnchenfleisch mit Gemüse", price: 9.00, dishType: "haehnchenGemüse" },
      { id: "b3", number: "B3", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, dishType: "paniertesHaehnchenGemüse" },
      { id: "b4", number: "B4", name: "Fisch mit Gemüse", price: 10.50, dishType: "fischGemüse" },
      { id: "b5", number: "B5", name: "Ente mit Gemüse", price: 11.50, dishType: "enteGemüse" },
      { id: "b6", number: "B6", name: "Garnelen mit Gemüse", price: 11.50, dishType: "garnelenGemüse" },
      { id: "b7", number: "B7", name: "Tofu mit Gemüse", price: 8.50, dishType: "tofuGemüse" },
    ],
  },
  {
    id: "erdnuss-sosse",
    name: "Erdnusssoße",
    items: [
      { id: "e1", number: "E1", name: "Gemüse", price: 7.00, spicy: true, dishType: "gemüse" },
      { id: "e2", number: "E2", name: "Hähnchenfleisch mit Gemüse", price: 9.00, spicy: true, dishType: "haehnchenGemüse" },
      { id: "e3", number: "E3", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, spicy: true, dishType: "paniertesHaehnchenGemüse" },
      { id: "e4", number: "E4", name: "Fisch mit Gemüse", price: 10.50, spicy: true, dishType: "fischGemüse" },
      { id: "e5", number: "E5", name: "Ente mit Gemüse", price: 11.50, spicy: true, dishType: "enteGemüse" },
      { id: "e6", number: "E6", name: "Garnelen mit Gemüse", price: 11.50, spicy: true, dishType: "garnelenGemüse" },
      { id: "e7", number: "E7", name: "Tofu mit Gemüse", price: 8.50, spicy: true, dishType: "tofuGemüse" },
    ],
  },
  {
    id: "matcha-sosse",
    name: "Matcha Soße",
    items: [
      { id: "m1", number: "M1", name: "Gemüse", price: 7.00, dishType: "gemüse" },
      { id: "m2", number: "M2", name: "Hähnchenfleisch mit Gemüse", price: 9.00, dishType: "haehnchenGemüse" },
      { id: "m3", number: "M3", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, dishType: "paniertesHaehnchenGemüse" },
      { id: "m4", number: "M4", name: "Fisch mit Gemüse", price: 10.50, dishType: "fischGemüse" },
      { id: "m5", number: "M5", name: "Ente mit Gemüse", price: 11.50, dishType: "enteGemüse" },
      { id: "m6", number: "M6", name: "Garnelen mit Gemüse", price: 11.50, dishType: "garnelenGemüse" },
      { id: "m7", number: "M7", name: "Tofu mit Gemüse", price: 8.50, dishType: "tofuGemüse" },
    ],
  },
  {
    id: "mango-sosse",
    name: "Mango Soße",
    items: [
      { id: "m8",  number: "M8",  name: "Gemüse", price: 7.00, dishType: "gemüse" },
      { id: "m9",  number: "M9",  name: "Hähnchenfleisch mit Gemüse", price: 9.00, dishType: "haehnchenGemüse" },
      { id: "m10", number: "M10", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, dishType: "paniertesHaehnchenGemüse" },
      { id: "m11", number: "M11", name: "Fisch mit Gemüse", price: 10.50, dishType: "fischGemüse" },
      { id: "m12", number: "M12", name: "Ente mit Gemüse", price: 11.50, dishType: "enteGemüse" },
      { id: "m13", number: "M13", name: "Garnelen mit Gemüse", price: 11.50, dishType: "garnelenGemüse" },
      { id: "m14", number: "M14", name: "Tofu mit Gemüse", price: 8.50, dishType: "tofuGemüse" },
    ],
  },
  {
    id: "gebratener-reis",
    name: "Gebratener Reis",
    items: [
      { id: "a1", number: "A1", name: "Mit Ei & Gemüse", price: 7.00, dishType: "mitEiGemüse" },
      { id: "a2", number: "A2", name: "Hähnchenfleisch mit Gemüse", price: 8.50, dishType: "haehnchenGemüse" },
      { id: "a3", number: "A3", name: "Paniertes Hähnchenfleisch mit Gemüse", price: 10.50, dishType: "paniertesHaehnchenGemüse" },
      { id: "a4", number: "A4", name: "Fisch mit Gemüse", price: 10.50, dishType: "fischGemüse" },
      { id: "a5", number: "A5", name: "Ente mit Gemüse", price: 11.50, dishType: "enteGemüse" },
      { id: "a6", number: "A6", name: "Garnelen mit Gemüse", price: 10.00, dishType: "garnelenGemüse" },
      { id: "a7", number: "A7", name: "Tofu mit Gemüse", price: 8.50, dishType: "tofuGemüse" },
    ],
  },
  {
    id: "nudel-reisboxen",
    name: "Nudel- & Reisboxen",
    items: [
      {
        id: "nb1", number: "NB1", name: "Gemüse", price: 5.00, dishType: "gemüse",
        sizeOptions: [{ label: "Klein", price: 4.00 }, { label: "Groß", price: 5.00 }],
      },
      {
        id: "nb2", number: "NB2", name: "Hähnchenfleisch", price: 6.00, dishType: "haehnchenBox",
        sizeOptions: [{ label: "Klein", price: 4.50 }, { label: "Groß", price: 6.00 }],
      },
      { id: "nb3", number: "NB3", name: "Paniertes Hähnchenfleisch", price: 6.00, dishType: "paniertesHaehnchenBox" },
      { id: "nb4", number: "NB4", name: "Fisch", price: 6.00, dishType: "fischBox" },
      { id: "nb5", number: "NB5", name: "Vegetarische Frühlingsrollen", price: 6.00, dishType: "vegFruehlingBox" },
      { id: "nb6", number: "NB6", name: "Tofu", price: 8.00, dishType: "tofuBox" },
      { id: "nb7", number: "NB7", name: "Garnelen", price: 10.00, dishType: "garnelenBox" },
    ],
  },
  {
    id: "matcha-getraenke",
    name: "Matcha",
    items: [
      { id: "gm1", number: "GM1", name: "Matcha Latte (warm/kalt)", price: 4.50 },
      { id: "gm2", number: "GM2", name: "Matcha dâu (Erdbeere)", price: 5.00 },
      { id: "gm3", number: "GM3", name: "Matcha xoài (Mango)", price: 5.00 },
      { id: "gm4", number: "GM4", name: "Matcha Raspberry (Himbeere)", price: 5.00 },
      { id: "gm5", number: "GM5", name: "Matcha việt quất (Blaubeere)", price: 5.00 },
      { id: "gm6", number: "GM6", name: "Matcha dứa (Ananas)", price: 5.00 },
      { id: "gm7", number: "GM7", name: "Matcha vani (Vanille)", price: 5.00 },
      { id: "gm8", number: "GM8", name: "Matcha dừa (Coconut Cloud)", price: 5.50 },
    ],
  },
  {
    id: "ca-phe",
    name: "Cà Phê Việt Nam",
    items: [
      { id: "gc1", number: "GC1", name: "Cà phê đen (schwarzer Kaffee)", price: 4.50 },
      { id: "gc2", number: "GC2", name: "Cà phê sữa đá (Kaffee, Kondensmilch & Eis)", price: 5.00 },
      { id: "gc3", number: "GC3", name: "Cà phê đen đá (schwarzer Kaffee & Eis)", price: 4.50 },
      { id: "gc4", number: "GC4", name: "Cà phê nâu đá (Kaffee mit Milch & Eis)", price: 5.00 },
      { id: "gc5", number: "GC5", name: "Cà phê dừa (Kaffee mit Kokosmilch)", price: 5.00 },
      { id: "gc6", number: "GC6", name: "Bạc xỉu (Kaffee, Kondensmilch & Kokosmilch)", price: 6.00 },
    ],
  },
  {
    id: "tra-eistee",
    name: "Trà – Hausgemachter Eistee",
    items: [
      { id: "gt1", number: "GT1", name: "Chanh leo (Passionsfrucht)", price: 6.00 },
      { id: "gt2", number: "GT2", name: "Trà vải (Lychee, Zitrone & Orange)", price: 6.00 },
      { id: "gt3", number: "GT3", name: "Trà đào cam sả (Pfirsich, Orange & Zitronengras)", price: 6.00 },
      { id: "gt4", number: "GT4", name: "Trà chanh (Zitronentee)", price: 6.00 },
    ],
  },
  {
    id: "soda",
    name: "Soda",
    items: [
      { id: "gs1", number: "GS1", name: "Soda chanh (Zitrone)", price: 6.00 },
      { id: "gs2", number: "GS2", name: "Soda đào (Pfirsich)", price: 6.00 },
      { id: "gs3", number: "GS3", name: "Soda vải (Lychee)", price: 6.00 },
      { id: "gs4", number: "GS4", name: "Soda dứa (Ananas)", price: 6.00 },
    ],
  },
  {
    id: "smoothies",
    name: "Sinh Tố – Smoothies",
    items: [
      {
        id: "gst1", number: "ST", name: "Smoothie nach Wahl", price: 6.50,
        description: "Banane · Erdbeere · Mango · Ananas · Himbeere · Blaubeere",
        dishType: "alleSmoothies",
      },
    ],
  },
  {
    id: "bowls",
    name: "Bowls",
    items: [
      { id: "gbw1", number: "BW1", name: "Overnight Oats mit Haferflocken & Milch", price: 6.50, dishType: "overnightOatsMilch" },
      { id: "gbw2", number: "BW2", name: "Overnight Oats mit Haferflocken, Milch & Chiapudding", price: 6.50, dishType: "overnightOatsChia" },
      { id: "gbw3", number: "BW3", name: "Chia Pudding", price: 6.50, dishType: "chiaPudding" },
    ],
  },
  {
    id: "kem",
    name: "Kem – Eisspezialitäten",
    items: [
      { id: "gk1", number: "GK1", name: "Matcha Latte với kem Matcha", price: 6.50, dishType: "matchaLatteMatchaEis" },
      { id: "gk2", number: "GK2", name: "Matcha Latte với kem vani", price: 6.50, dishType: "matchaLatteVanilleeis" },
    ],
  },
  {
    id: "softgetraenke",
    name: "Softgetränke",
    items: [
      { id: "gd1", number: "GD1", name: "Softgetränke (inkl. Pfand)", price: 3.00, dishType: "softgetraenkeItem" },
      { id: "gd2", number: "GD2", name: "Wasser (inkl. Pfand)", price: 2.00, dishType: "wasserItem" },
    ],
  },
];
