// artifacts/api-server/scripts/deriveTerminalCatalog.mjs
/**
 * Leitet die BASIS-Preise (ungerabattet, in Cent) je Terminal-`itemId` aus den
 * Frontend-Menüdaten ab — die einzige Preis-Wahrheit des Terminals. Reine
 * Funktion ohne Imports, damit sie sowohl der Generator (build.mjs, lädt
 * menu.ts via esbuild) als auch der Contract-Test nutzen kann.
 *
 * Zweck: Floor-Guard (P1-1). Der Server erzwingt Client-Preis ≥ Basispreis.
 * Da jeder Modifikator (Milch/Frappe/Protein, Soßen, Toppings) nur AUFSCHLÄGT
 * (verifiziert: keine negativen priceDeltas, keine sizeOptions), liegt ein
 * legitimer Preis nie unter der Basis — kein False-400 möglich.
 */

/** EUR-Float → Cent (ganzzahlig). */
function eurToCents(eur) {
  return Math.round(Number(eur) * 100);
}

/**
 * @param {{ menuData: any[], boxMenuItems: any[] }} sources
 * @returns {Record<string, number>} itemId (lowercase) → Basispreis in Cent, sortiert.
 */
export function deriveTerminalCatalog({ menuData, boxMenuItems }) {
  const prices = {};

  const put = (rawKey, cents) => {
    if (typeof rawKey !== "string" || rawKey.trim() === "") return;
    const key = rawKey.trim().toLowerCase();
    if (!Number.isFinite(cents) || cents < 0) {
      throw new Error(`deriveTerminalCatalog: ungültiger Preis für "${rawKey}": ${cents}`);
    }
    if (prices[key] !== undefined && prices[key] !== cents) {
      throw new Error(
        `deriveTerminalCatalog: Preis-Kollision für "${key}": ${prices[key]} vs ${cents} — Menü inkonsistent.`,
      );
    }
    prices[key] = cents;
  };

  for (const category of menuData ?? []) {
    for (const item of category.items ?? []) {
      // Kleinstmöglicher legitimer Preis: Basispreis, ggf. günstigste Größe.
      const sizePrices = Array.isArray(item.sizeOptions)
        ? item.sizeOptions.map((s) => Number(s.price)).filter(Number.isFinite)
        : [];
      const minEur = Math.min(Number(item.price), ...(sizePrices.length ? sizePrices : [Number(item.price)]));
      put(item.id, eurToCents(minEur));
      put(item.number, eurToCents(minEur)); // number == id für Drinks/Codes; robust gegen beide Keys
    }
  }

  for (const box of boxMenuItems ?? []) {
    for (const carb of ["nudel", "reis"]) {
      const variants = box.carbs?.[carb];
      if (!variants) continue;
      for (const size of ["klein", "gross"]) {
        const code = variants[size];
        const priceEur = box.sizes?.[size];
        if (!code || priceEur == null) continue;
        put(code, eurToCents(priceEur));
      }
    }
  }

  // Stabil sortiert → deterministische generierte Datei + saubere Git-Diffs.
  return Object.fromEntries(Object.entries(prices).sort(([a], [b]) => a.localeCompare(b)));
}
