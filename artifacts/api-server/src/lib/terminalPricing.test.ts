// artifacts/api-server/src/lib/terminalPricing.test.ts
// Lauf: node --experimental-strip-types src/lib/terminalPricing.test.ts
//
// Zwei Dinge:
// 1) CONTRACT-TEST: die generierte terminalCatalog.generated.ts stimmt exakt
//    mit dem überein, was live aus dem Frontend-menu.ts abgeleitet wird.
//    Schlägt fehl, wenn menu.ts geändert wurde, ohne den Katalog neu zu bauen
//    (npm run build) — fängt Preis-Drift vor dem Deploy ab.
// 2) FLOOR-LOGIK: terminalFloorCents akzeptiert legitime Preise (Basis + Auf-
//    schläge) und weist Unterbietung / unbekannte Artikel ab.

import { menuData, boxMenuItems } from "../../../lys-terminal/src/data/menu.ts";
import { deriveTerminalCatalog } from "../../scripts/deriveTerminalCatalog.mjs";
import { terminalFloorCents } from "./terminalPricing.ts";
import {
  TERMINAL_BASE_CENTS,
  TERMINAL_DISCOUNT_PERCENT,
} from "../data/terminalCatalog.generated.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.error(`FAIL ${name} ${detail}`);
  }
}

function pickFloor(item: Parameters<typeof terminalFloorCents>[0]): number | null {
  const f = terminalFloorCents(item);
  return f.known ? f.floorCents : null;
}

// ---- 1) Contract: generierter Katalog == live abgeleiteter Katalog ----
const live = deriveTerminalCatalog({ menuData, boxMenuItems });
const liveKeys = Object.keys(live).sort();
const genKeys = Object.keys(TERMINAL_BASE_CENTS).sort();

check(
  "Contract: gleiche Anzahl Keys",
  liveKeys.length === genKeys.length,
  `live=${liveKeys.length} gen=${genKeys.length}`,
);
const missingInGen = liveKeys.filter((k) => !(k in TERMINAL_BASE_CENTS));
const extraInGen = genKeys.filter((k) => !(k in live));
check("Contract: keine fehlenden Keys im generierten Katalog", missingInGen.length === 0, missingInGen.join(","));
check("Contract: keine Zusatz-Keys im generierten Katalog", extraInGen.length === 0, extraInGen.join(","));
const mismatched = liveKeys.filter((k) => live[k] !== TERMINAL_BASE_CENTS[k]);
check(
  "Contract: alle Preise identisch (sonst: build neu laufen lassen)",
  mismatched.length === 0,
  mismatched.map((k) => `${k}: live ${live[k]} vs gen ${TERMINAL_BASE_CENTS[k]}`).join("; "),
);

// ---- 2) Floor-Logik ----
// Bekannte Basispreise (aus menu.ts): c1=700, gn3=600 (Box), 01=450 (Matcha),
// gd2=200 (Wasser), 24=650 (Bowl).
check("bekannt: c1 Floor = 700", pickFloor({ itemId: "c1" }) === 700);
check("bekannt: Box GN3 (uppercase itemId) Floor = 600", pickFloor({ itemId: "GN3" }) === 600);
check("bekannt: Matcha 01 Floor = 450", pickFloor({ itemId: "01" }) === 450);
check("bekannt: Lookup über number statt itemId", pickFloor({ number: "C1" }) === 700);

// Legitimer Preis MIT Aufschlag (Matcha 01 + Hafer 0,50 + Frappe 1 = 6,00) ≥ Floor.
{
  const f = terminalFloorCents({ itemId: "01" });
  check("Matcha mit Aufschlägen (600¢) ≥ Floor(450¢)", f.known && 600 >= f.floorCents);
  check("Matcha genau Basis (450¢) ≥ Floor", f.known && 450 >= f.floorCents);
  check("Matcha unter Basis (1¢) < Floor → Unterbietung", f.known && 1 < f.floorCents);
}

// Unbekannter Artikel → known:false (Aufrufer lehnt ab).
{
  const f = terminalFloorCents({ itemId: "hack-999" });
  check("unbekannt: known=false", f.known === false);
  check("unbekannt: floorCents null", f.floorCents === null);
}
check("leere Position: known=false", terminalFloorCents({}).known === false);

// Rabatt aktuell 0 % → Floor == Basis.
check("Rabatt 0% → Floor==Basis", TERMINAL_DISCOUNT_PERCENT === 0 && pickFloor({ itemId: "gd2" }) === 200);

// Katalog-Sanity: Kernartikel vorhanden.
for (const id of ["1", "2", "c7", "s1", "m14", "a6", "gn7", "kr2", "32", "gd1", "23", "29"]) {
  check(`Katalog enthält "${id}"`, id in TERMINAL_BASE_CENTS);
}

console.log(failures === 0 ? "\nALLE CHECKS GRÜN" : `\n${failures} CHECK(S) ROT`);
process.exit(failures === 0 ? 0 : 1);
