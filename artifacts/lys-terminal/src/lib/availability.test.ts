// artifacts/lys-terminal/src/lib/availability.test.ts
// Lauf: node --experimental-strip-types src/lib/availability.test.ts
import { currentBusinessDay, isSoldOut, type AvailabilityRow } from "./availability.ts";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    failures++;
    console.error(`FAIL ${name}\n  got:      ${actual}\n  expected: ${expected}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// currentBusinessDay: 4:00-Cutoff Europe/Berlin (gleiche Logik wie Backend)
check("Sommer 03:30 Berlin", currentBusinessDay(new Date("2026-06-07T01:30:00Z")), "2026-06-06");
check("Sommer 04:30 Berlin", currentBusinessDay(new Date("2026-06-07T02:30:00Z")), "2026-06-07");
check("Winter 03:30 Berlin", currentBusinessDay(new Date("2026-01-15T02:30:00Z")), "2026-01-14");

// isSoldOut
const today = "2026-06-07";
check("keine Zeile -> verfügbar", isSoldOut(undefined, today), false);
check("permanent -> aus", isSoldOut({ item_id: "x", mode: "permanent", sold_out_date: null }, today), true);
check("today heute -> aus", isSoldOut({ item_id: "x", mode: "today", sold_out_date: today }, today), true);
check("today gestern -> verfügbar", isSoldOut({ item_id: "x", mode: "today", sold_out_date: "2026-06-06" }, today), false);

if (failures > 0) { console.error(`\n${failures} Fehler`); process.exit(1); }
console.log("\nalle Tests grün");
