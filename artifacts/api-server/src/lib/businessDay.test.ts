// artifacts/api-server/src/lib/businessDay.test.ts
// Lauf: node --experimental-strip-types src/lib/businessDay.test.ts
import { currentBusinessDay } from "./businessDay.ts";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    failures++;
    console.error(`FAIL ${name}\n  got:      ${actual}\n  expected: ${expected}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// Sommerzeit (CEST, UTC+2): 03:30 Berlin -> vor Cutoff -> Vortag
check("Sommer 03:30 Berlin", currentBusinessDay(new Date("2026-06-07T01:30:00Z")), "2026-06-06");
// Sommer 04:30 Berlin -> ab Cutoff -> selber Tag
check("Sommer 04:30 Berlin", currentBusinessDay(new Date("2026-06-07T02:30:00Z")), "2026-06-07");
// Winter (CET, UTC+1): 03:30 Berlin -> Vortag
check("Winter 03:30 Berlin", currentBusinessDay(new Date("2026-01-15T02:30:00Z")), "2026-01-14");
// Winter 04:30 Berlin -> selber Tag
check("Winter 04:30 Berlin", currentBusinessDay(new Date("2026-01-15T03:30:00Z")), "2026-01-15");
// Mittagszeit -> selber Tag
check("Mittag", currentBusinessDay(new Date("2026-06-07T12:00:00Z")), "2026-06-07");

if (failures > 0) { console.error(`\n${failures} Fehler`); process.exit(1); }
console.log("\nalle Tests grün");
