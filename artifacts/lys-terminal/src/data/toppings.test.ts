/**
 * Lauf:  node --experimental-strip-types src/data/toppings.test.ts
 * (Kein Test-Runner im Frontend, siehe kitchenOrder.test.ts.)
 */
import { toppingsConfigFor, selectedIdsFromLabel } from "./toppings.ts";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures++;
    console.error(`FAIL ${name}\n  got:      ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

const acai = toppingsConfigFor("27")!;
const oats = toppingsConfigFor("24")!;

check("27 hat zwei Gruppen: chia + toppings", acai.groups.map((g) => g.id), ["chia", "toppings"]);
check("Chia-Gruppe ist Pflicht und exklusiv", [acai.groups[0].min, acai.groups[0].exclusive], [1, true]);
check(
  "Chia-Optionen 0 EUR",
  acai.groups[0].options.map((o) => [o.label, o.priceDelta]),
  [["Mit Chia Pudding", 0], ["Ohne Chia Pudding", 0]],
);
check("Schokogranola +2 in 27", acai.groups[1].options.find((o) => o.id === "schokogranola")?.priceDelta, 2);
check("Schokogranola +2 in 24", oats.groups[0].options.find((o) => o.id === "schokogranola")?.priceDelta, 2);
check("24 hat keine Chia-Gruppe", oats.groups.map((g) => g.id), ["toppings"]);
check(
  "Edit-Vorauswahl aus Label",
  selectedIdsFromLabel(acai, "Mit Chia Pudding · Honig, Schokogranola"),
  ["chia-mit", "honig", "schokogranola"],
);

if (failures) {
  console.error(`${failures} Fehler`);
  process.exit(1);
}
