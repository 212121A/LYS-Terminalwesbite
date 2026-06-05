import { boxMenuItems } from "@/data/menu";

/** Feste Soßen-Auswahl für alle Nudel-/Reisboxen-Varianten. */
export interface BoxSauce {
  id: "soja" | "suessSauer" | "thaiCurryKokos" | "erdnuss" | "matcha" | "mango";
  /** Anzeigename und gleichzeitig „sizeLabel" im Warenkorb, damit jede Soße
   *  eine eigene Warenkorb-Zeile bekommt und mehrfach bestellbar bleibt. */
  label: string;
}

export const BOX_SAUCES: BoxSauce[] = [
  { id: "soja",            label: "Sojasoße" },
  { id: "suessSauer",      label: "Süßsauersoße" },
  { id: "thaiCurryKokos",  label: "Thaicurry mit Kokosmilch" },
  { id: "erdnuss",         label: "Erdnusssoße" },
  { id: "matcha",          label: "Matcha Soße" },
  { id: "mango",           label: "Mango Soße" },
];

/** Süße Gerichte (Bowls, Schoko Latte, Matcha-Latte mit Eis), bei denen in der
 *  optionalen Extra-Soßen-Auswahl die herzhaften Soßen Erdnuss/Matcha/Mango
 *  keinen Sinn ergeben und daher ausgeblendet werden. */
const SWEET_ITEM_IDS: ReadonlySet<string> = new Set([
  "24", "25", "26", // Bowls (Overnight Oats, Chia Pudding)
  "30", "31",       // Kem: Matcha Latte (mit Matcha-/Vanilleeis)
  "32",             // Kids: Schoko Latte
]);
const SWEET_HIDDEN_SAUCE_IDS: ReadonlySet<BoxSauce["id"]> = new Set([
  "erdnuss", "matcha", "mango",
]);

/** Soßen für das optionale Extra-Soßen-Modal eines Gerichts. Bei süßen Gerichten
 *  ohne die herzhaften Soßen Erdnuss/Matcha/Mango. */
export function extraSauceOptionsFor(itemId: string): BoxSauce[] {
  if (SWEET_ITEM_IDS.has(itemId)) {
    return BOX_SAUCES.filter((s) => !SWEET_HIDDEN_SAUCE_IDS.has(s.id));
  }
  return BOX_SAUCES;
}

/** Alle Warenkorb-Basis-IDs, die eine Soßen-Auswahl erzwingen (GN1–GN7, KN1/KN2,
 *  GR1–GR7, KR1/KR2). Wird in Terminal.tsx genutzt, um beim Klick auf „+"
 *  statt direkt in den Warenkorb das Soßen-Modal zu öffnen. */
export const BOX_ITEM_IDS: ReadonlySet<string> = (() => {
  const ids = new Set<string>();
  for (const box of boxMenuItems) {
    if (box.carbs.nudel.klein) ids.add(box.carbs.nudel.klein);
    ids.add(box.carbs.nudel.gross);
    if (box.carbs.reis.klein) ids.add(box.carbs.reis.klein);
    ids.add(box.carbs.reis.gross);
  }
  return ids;
})();
