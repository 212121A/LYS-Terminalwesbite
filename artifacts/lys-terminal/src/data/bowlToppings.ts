/** Optionale Toppings für Bowls. Labels sind deutsch und gehen sprachneutral
 *  als `sizeLabel` in den Warenkorb und auf den Küchen-Bon — wie die Soßen. */
export interface BowlTopping {
  id: string;
  label: string;
  priceDelta: number;
}

export const BOWL_TOPPINGS: BowlTopping[] = [
  { id: "honig",       label: "Honig",          priceDelta: 0.5 },
  { id: "agave",       label: "Agavendicksaft", priceDelta: 0.5 },
  { id: "matcha",      label: "Matcha",         priceDelta: 2.0 },
  { id: "granola",     label: "Granola",        priceDelta: 2.0 },
  { id: "schokoKokos", label: "Schoko/Kokos",   priceDelta: 1.0 },
];

/** Inklusive frische Früchte — als Beispiel-Liste im Modal (deutsch wie die
 *  Smoothie-Sorten, die ebenfalls sprachneutral angezeigt werden). */
export const BOWL_INCLUDED_FRUITS = "Banane, Erdbeere, Blaubeere, Himbeere, Mango";
