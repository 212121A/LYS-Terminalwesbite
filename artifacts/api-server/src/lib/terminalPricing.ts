// artifacts/api-server/src/lib/terminalPricing.ts
/**
 * Preis-Untergrenze (Floor-Guard, P1-1) für Karten-Zahlungen am Terminal.
 * Der Server ist die Preis-Autorität: Er erzwingt Client-Preis ≥ Basispreis
 * je Artikel. Die Basispreise stammen aus dem generierten Terminal-Katalog
 * (aus dem Frontend-menu.ts abgeleitet — einzige Preis-Wahrheit, kein zweiter
 * Pflege-Ort). Modifikatoren (Milch/Frappe/Protein, Soßen, Toppings) schlagen
 * nur auf, daher liegt ein legitimer Preis nie unter der Basis.
 */
import {
  TERMINAL_BASE_CENTS,
  TERMINAL_DISCOUNT_PERCENT,
} from "../data/terminalCatalog.generated.ts";

export type FloorResult =
  | { known: true; floorCents: number }
  | { known: false; floorCents: null };

/** Basispreis (Cent) für eine Terminal-Position, oder null wenn unbekannt. */
function baseCentsFor(item: { id?: string; itemId?: string; number?: string; code?: string }): number | null {
  const candidates = [item.itemId, item.number, item.id, item.code]
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .map((v) => v.trim().toLowerCase());
  for (const candidate of candidates) {
    const cents = TERMINAL_BASE_CENTS[candidate];
    if (typeof cents === "number") return cents;
  }
  return null;
}

/**
 * Untergrenze (Cent) für den Einzelpreis dieser Position. `known: false`, wenn
 * die itemId nicht im Katalog steht (→ Aufrufer lehnt als ungültigen Artikel ab).
 * Der Eröffnungsrabatt wird identisch zum Frontend auf die Basis angewandt.
 */
export function terminalFloorCents(item: {
  id?: string;
  itemId?: string;
  number?: string;
  code?: string;
}): FloorResult {
  const base = baseCentsFor(item);
  if (base === null) return { known: false, floorCents: null };
  const floorCents = Math.round((base * (100 - TERMINAL_DISCOUNT_PERCENT)) / 100);
  return { known: true, floorCents };
}
