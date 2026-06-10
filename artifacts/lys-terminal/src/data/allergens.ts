/**
 * Legende für Allergene & Zusatzstoffe — Schema laut Betriebs-PDF von LYS.
 * Allergene: Zahlen 1–16 (mit Untercodes 1a Weizen / 1b Gerste).
 * Zusatzstoffe: Buchstaben a–g.
 * Die Codes pro Gericht stehen in `menu.ts` (Felder `allergens` / `additives`).
 * Bezeichnungen auf Deutsch (wie auf der Karte). Stand laut Betriebs-PDF —
 * bei Rezepturänderung hier UND in menu.ts pflegen.
 */
export interface LegendEntry {
  code: string;
  label: string;
  sub?: LegendEntry[];
}

/** Allergene 1–16 (mit Untercodes beim Gluten). Wortlaut wie auf der Website. */
export const ALLERGENS: LegendEntry[] = [
  {
    code: "1",
    label: "Glutenhaltiges Getreide und daraus gewonnene Erzeugnisse",
    sub: [
      { code: "1a", label: "Weizen" },
      { code: "1b", label: "Gerste" },
    ],
  },
  { code: "2", label: "Krebstiere und daraus gewonnene Erzeugnisse" },
  { code: "3", label: "Eier von Geflügel und daraus gewonnene Erzeugnisse" },
  { code: "4", label: "Fisch und daraus gewonnene Erzeugnisse (außer Fischgelatine)" },
  { code: "5", label: "Erdnüsse und daraus gewonnene Erzeugnisse" },
  { code: "6", label: "Sojabohnen und daraus gewonnene Erzeugnisse" },
  { code: "7", label: "Milch von Säugetieren und Milcherzeugnisse" },
  { code: "8", label: "Schalenfrüchte und daraus gewonnene Erzeugnisse" },
  { code: "9", label: "Sellerie und daraus gewonnene Erzeugnisse" },
  { code: "10", label: "Senf und daraus gewonnene Erzeugnisse" },
  { code: "11", label: "Sesamsamen und daraus gewonnene Erzeugnisse" },
  { code: "12", label: "Schwefeldioxid und Sulfite" },
  { code: "13", label: "Lupinen und daraus gewonnene Erzeugnisse" },
  { code: "14", label: "Weichtiere (z.B. Schnecken, Muscheln, Tintenfische) und daraus gewonnene Erzeugnisse" },
  { code: "15", label: "Laktose" },
  { code: "16", label: "Chili und Zitronengras" },
];

/** Zusatzstoffe a–g. Wortlaut wie auf der Website. */
export const ADDITIVES: LegendEntry[] = [
  { code: "a", label: "Mit Farbstoff" },
  { code: "b", label: "Mit Konservierungsstoff" },
  { code: "c", label: "Mit Antioxidationsmittel" },
  { code: "d", label: "Mit Süßungsmitteln" },
  { code: "e", label: "Coffeinhaltig" },
  { code: "f", label: "Chininhaltig" },
  { code: "g", label: "Mit Geschmacksverstärker" },
];

// Flache Lookups (inkl. Untercodes) für die Klartext-Anzeige pro Gericht.
const ALLERGEN_LABELS: Record<string, string> = {};
for (const entry of ALLERGENS) {
  ALLERGEN_LABELS[entry.code] = entry.label;
  for (const sub of entry.sub ?? []) ALLERGEN_LABELS[sub.code] = sub.label;
}
const ADDITIVE_LABELS: Record<string, string> = Object.fromEntries(
  ADDITIVES.map((entry) => [entry.code, entry.label]),
);

export const allergenLabel = (code: string): string | undefined => ALLERGEN_LABELS[code];
export const additiveLabel = (code: string): string | undefined => ADDITIVE_LABELS[code];

/**
 * Nudeln enthalten laut PDF E621 (Code g), Reis nicht. Fügt g bei Nudel-Wahl
 * hinzu — wird nur für Gerichte/Boxen mit Nudel-/Reis-Auswahl aufgerufen.
 */
export function additivesForCarb(
  additives: string[] | undefined,
  carb: "nudel" | "reis",
): string[] {
  const base = additives ?? [];
  return carb === "nudel" && !base.includes("g") ? [...base, "g"] : base;
}
