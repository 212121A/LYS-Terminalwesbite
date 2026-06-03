/**
 * Legende für Allergene & Zusatzstoffe (DACH / EU LMIV).
 * Die Codes werden pro Gericht in `menu.ts` (Felder `allergens` / `additives`)
 * vom Betreiber gepflegt. Diese Legende liefert nur die Bezeichnungen.
 * Bezeichnungen vorerst auf Deutsch; spätere Lokalisierung möglich.
 */
export interface LegendEntry {
  code: string;
  label: string;
}

/** Die 14 kennzeichnungspflichtigen Allergene (Buchstaben-Schema a–n). */
export const ALLERGENS: LegendEntry[] = [
  { code: "a", label: "Glutenhaltiges Getreide" },
  { code: "b", label: "Krebstiere" },
  { code: "c", label: "Eier" },
  { code: "d", label: "Fisch" },
  { code: "e", label: "Erdnüsse" },
  { code: "f", label: "Sojabohnen" },
  { code: "g", label: "Milch / Laktose" },
  { code: "h", label: "Schalenfrüchte (Nüsse)" },
  { code: "i", label: "Sellerie" },
  { code: "j", label: "Senf" },
  { code: "k", label: "Sesamsamen" },
  { code: "l", label: "Schwefeldioxid / Sulfite" },
  { code: "m", label: "Lupinen" },
  { code: "n", label: "Weichtiere" },
];

/** Gängige Zusatzstoffe (Nummern-Schema). Vom Betreiber bei Bedarf anpassbar. */
export const ADDITIVES: LegendEntry[] = [
  { code: "1", label: "mit Farbstoff" },
  { code: "2", label: "mit Konservierungsstoff" },
  { code: "3", label: "mit Antioxidationsmittel" },
  { code: "4", label: "mit Geschmacksverstärker" },
  { code: "5", label: "geschwefelt" },
  { code: "6", label: "geschwärzt" },
  { code: "7", label: "mit Phosphat" },
  { code: "8", label: "mit Süßungsmittel(n)" },
  { code: "9", label: "koffeinhaltig" },
];
