import { BOWL_ITEM_IDS } from "@/data/menu";
import type { Translations } from "@/i18n/translations";

/** Nur die string-wertigen Übersetzungs-Keys (keine Funktionen/Records) —
 *  damit `tr[key]` direkt als Text gerendert werden kann. */
type TranslationTextKey = {
  [K in keyof Translations]: Translations[K] extends string ? K : never;
}[keyof Translations];

/** Eine auswählbare Option (Topping, Frucht, Extra). Labels sind deutsch und
 *  gehen sprachneutral als `sizeLabel` in Warenkorb und Küchen-Bon — wie die
 *  Soßen. `priceDelta` 0 = inklusive. */
export interface ToppingOption {
  id: string;
  label: string;
  priceDelta: number;
}

/** Eine Auswahl-Gruppe im Modal. Mehrere Gruppen → je eine Überschrift. */
export interface ToppingGroup {
  id: string;
  /** Übersetzungs-Key der Sektions-Überschrift (nur bei mehreren Gruppen genutzt). */
  titleKey?: TranslationTextKey;
  options: ToppingOption[];
  /** Mindestauswahl, damit „Hinzufügen" aktiv wird. Default 0. */
  min?: number;
}

export interface ToppingConfig {
  /** Übersetzungs-Key für den Modal-Titel. */
  titleKey: TranslationTextKey;
  groups: ToppingGroup[];
  /** Optionaler Hinweis im Kopf (z. B. „Frische Früchte inklusive"). */
  noteKey?: TranslationTextKey;
  /** Beispiel-Zeile unter dem Hinweis (deutsch, sprachneutral). */
  noteExamples?: string;
}

const BOWL_TOPPINGS: ToppingOption[] = [
  { id: "honig",       label: "Honig",          priceDelta: 0.5 },
  { id: "agave",       label: "Agavendicksaft", priceDelta: 0.5 },
  { id: "matcha",      label: "Matcha",         priceDelta: 2.0 },
  { id: "granola",     label: "Granola",        priceDelta: 2.0 },
  { id: "schoko",      label: "Schoko",         priceDelta: 1.0 },
  { id: "kokos",       label: "Kokos",          priceDelta: 1.0 },
];

const SMOOTHIE_FRUITS: ToppingOption[] = [
  { id: "banane",    label: "Banane",    priceDelta: 0 },
  { id: "erdbeere",  label: "Erdbeere",  priceDelta: 0 },
  { id: "mango",     label: "Mango",     priceDelta: 0 },
  { id: "ananas",    label: "Ananas",    priceDelta: 0 },
  { id: "himbeere",  label: "Himbeere",  priceDelta: 0 },
  { id: "blaubeere", label: "Blaubeere", priceDelta: 0 },
];

const SMOOTHIE_EXTRAS: ToppingOption[] = [
  { id: "agave",           label: "Agavendicksaft",  priceDelta: 0.5 },
  { id: "honig",           label: "Honig",           priceDelta: 0.5 },
  { id: "proteinsmoothie", label: "Proteinsmoothie", priceDelta: 2.0 },
];

const BOWL_CONFIG: ToppingConfig = {
  titleKey: "toppingsTitle",
  groups: [{ id: "toppings", options: BOWL_TOPPINGS }],
  noteKey: "toppingsIncluded",
  noteExamples: "Banane, Erdbeere, Blaubeere, Himbeere, Mango",
};

const SMOOTHIE_CONFIG: ToppingConfig = {
  titleKey: "chooseOptions",
  groups: [
    { id: "frucht", titleKey: "fruitLabel",  options: SMOOTHIE_FRUITS, min: 1 },
    { id: "extras", titleKey: "extrasLabel", options: SMOOTHIE_EXTRAS },
  ],
};

/** „Smoothie nach Wahl" (Sinh Tố) — einziges Item mit Frucht-/Extra-Auswahl. */
const SMOOTHIE_ITEM_ID = "23";

const TOPPING_CONFIGS: Record<string, ToppingConfig> = (() => {
  const map: Record<string, ToppingConfig> = { [SMOOTHIE_ITEM_ID]: SMOOTHIE_CONFIG };
  for (const id of BOWL_ITEM_IDS) map[id] = BOWL_CONFIG;
  return map;
})();

/** Alle Items, die beim „+" das Topping-/Auswahl-Modal öffnen (Bowls + Smoothie). */
export const TOPPING_ITEM_IDS: ReadonlySet<string> = new Set(Object.keys(TOPPING_CONFIGS));

export function toppingsConfigFor(itemId: string): ToppingConfig | undefined {
  return TOPPING_CONFIGS[itemId];
}

/** Vorauswahl beim Bearbeiten: Option-IDs aus dem gespeicherten Label rekonstruieren.
 *  Label-Format: Gruppen mit " · " getrennt, Optionen innerhalb mit ", ". */
export function selectedIdsFromLabel(config: ToppingConfig, label: string | undefined): string[] {
  if (!label) return [];
  const tokens = label.split(" · ").flatMap((part) => part.split(", ")).map((s) => s.trim());
  return config.groups
    .flatMap((g) => g.options)
    .filter((o) => tokens.includes(o.label))
    .map((o) => o.id);
}
