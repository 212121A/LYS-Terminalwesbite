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

/** Modifikatoren für Soßen-Gerichte. Sprachneutral-deutsch wie die Soßen-Labels,
 *  damit sie unverändert über das `sizeLabel` ans Küchen-Dashboard gehen. */
export const NO_SAUCE_LABEL = "Keine Soße";
export const NO_VEG_LABEL = "Ohne Gemüse";

/** Box-Codes, deren Gericht entfernbares Gemüse enthält → „Ohne Gemüse" sinnvoll.
 *  Ausgenommen: reine Gemüse-Box und Frühlingsrollen-Box (dort unsinnig). */
export const BOX_VEG_ITEM_IDS: ReadonlySet<string> = (() => {
  const ids = new Set<string>();
  for (const box of boxMenuItems) {
    if (box.dishType === "gemüse" || box.dishType === "vegFruehlingBox") continue;
    if (box.carbs.nudel.klein) ids.add(box.carbs.nudel.klein);
    ids.add(box.carbs.nudel.gross);
    if (box.carbs.reis.klein) ids.add(box.carbs.reis.klein);
    ids.add(box.carbs.reis.gross);
  }
  return ids;
})();

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
