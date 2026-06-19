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
/** „Doppelt"-Option je Box-Typ: Label + Aufpreis je Größe. Hähnchen: kleine Box
 *  +1 €, große +2 €. Paniertes Hähnchen & Fisch: pauschal +3 €. Übrige Boxen
 *  (Gemüse, Tofu, Garnelen, Frühlingsrollen) ohne Option. */
interface DoubleOptionRule {
  label: string;
  klein: number;
  gross: number;
}
const DOUBLE_OPTION_BY_DISHTYPE: Record<string, DoubleOptionRule> = {
  haehnchenBox:          { label: "Doppelt Fleisch", klein: 1, gross: 2 },
  paniertesHaehnchenBox: { label: "Doppelt Fleisch", klein: 3, gross: 3 },
  fischBox:              { label: "Doppelt Fisch",   klein: 3, gross: 3 },
};

export interface BoxDoubleOption {
  /** Deutsches Label (sprachneutral) für Toggle, Warenkorb und Küchen-Dashboard. */
  label: string;
  /** Aufpreis in Euro für diese konkrete Box-Größe. */
  surcharge: number;
}

/** Box-Code → „Doppelt"-Option (Label + Aufpreis). Nur Boxen mit Eintrag in
 *  `DOUBLE_OPTION_BY_DISHTYPE`; Größe steckt im Code (K… = klein, G… = groß). */
export const BOX_DOUBLE_OPTION: ReadonlyMap<string, BoxDoubleOption> = (() => {
  const map = new Map<string, BoxDoubleOption>();
  for (const box of boxMenuItems) {
    const rule = DOUBLE_OPTION_BY_DISHTYPE[box.dishType ?? ""];
    if (!rule) continue;
    const add = (code: string | undefined, size: "klein" | "gross") => {
      if (code) map.set(code, { label: rule.label, surcharge: rule[size] });
    };
    add(box.carbs.nudel.klein, "klein");
    add(box.carbs.nudel.gross, "gross");
    add(box.carbs.reis.klein, "klein");
    add(box.carbs.reis.gross, "gross");
  }
  return map;
})();

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
