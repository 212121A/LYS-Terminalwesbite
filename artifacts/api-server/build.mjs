import * as esbuild from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { deriveTerminalCatalog } from "./scripts/deriveTerminalCatalog.mjs";

/**
 * Schritt 1 (P1-1 Floor-Guard): Terminal-Preis-Katalog aus dem Frontend-Menü
 * generieren. menu.ts + discount.ts sind reine TS-Daten ohne Imports — via
 * esbuild in-memory laden (robust über Node-Versionen, kein --strip-types nötig)
 * und in eine flache generierte .ts schreiben, die der Server importiert. So
 * gibt es KEINEN zweiten hand-gepflegten Preis-Ort; Drift fängt der Contract-
 * Test (src/lib/terminalPricing.test.ts) ab. Läuft bei JEDEM Build → die
 * deployte Datei passt immer zu menu.ts + discount.ts.
 */
async function loadFrontendMenu() {
  const bundled = await esbuild.build({
    stdin: {
      contents: `
        export { menuData, boxMenuItems } from "../lys-terminal/src/data/menu.ts";
        export { ACTIVE, DISCOUNT_PERCENT } from "../lys-terminal/src/lib/discount.ts";
      `,
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
  });
  const dataUrl =
    "data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64");
  return import(dataUrl);
}

const { menuData, boxMenuItems, ACTIVE, DISCOUNT_PERCENT } = await loadFrontendMenu();
const prices = deriveTerminalCatalog({ menuData, boxMenuItems });
const discountPercent = ACTIVE ? DISCOUNT_PERCENT : 0;

const generated = `// artifacts/api-server/src/data/terminalCatalog.generated.ts
// AUTO-GENERIERT von build.mjs (deriveTerminalCatalog) aus
// ../lys-terminal/src/data/menu.ts + ../lys-terminal/src/lib/discount.ts.
// NICHT von Hand editieren — bei jedem \`npm run build\` neu erzeugt.
// Contract-Test: src/lib/terminalPricing.test.ts schlägt bei Drift fehl.

/** Eröffnungsrabatt in Prozent zum Build-Zeitpunkt (0 = inaktiv). */
export const TERMINAL_DISCOUNT_PERCENT = ${discountPercent};

/** itemId (lowercase) → BASIS-Preis in Cent (ungerabattet). */
export const TERMINAL_BASE_CENTS: Record<string, number> = ${JSON.stringify(prices, null, 2)};
`;

mkdirSync(new URL("./src/data/", import.meta.url), { recursive: true });
writeFileSync(new URL("./src/data/terminalCatalog.generated.ts", import.meta.url), generated);
console.log(
  `[gen] terminalCatalog.generated.ts: ${Object.keys(prices).length} Preise, Rabatt ${discountPercent}%`,
);

const entryPoints = ["src/index.ts", "src/serverless.ts"];

await esbuild.build({
  entryPoints,
  bundle: true,
  /** Vercel: vorgebündeltes ESM mit eingebetteten `node:*`-Shims → „Dynamic require of node:events“. */
  packages: "external",
  platform: "node",
  target: "node20",
  format: "esm",
  outdir: "dist",
  outExtension: { ".js": ".mjs" },
  sourcemap: true,
  logLevel: "info",
});
