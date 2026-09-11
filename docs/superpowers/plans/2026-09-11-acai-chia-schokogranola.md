# Açaí Bowl 27: Chia-Pflichtwahl + Schokogranola — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bowl 27 verlangt auf Terminal und Website die Wahl „Mit/Ohne Chia Pudding" (0 €), alle Bowls bekommen das Topping „Schokogranola" (+2 €), und beides steht lesbar auf der Küchenkarte.

**Architecture:** Drei Repos, drei Commits. Terminal: Topping-Modal bekommt exklusive Pflichtgruppe (Config-getrieben, nur Item 27). Website: Bowl-Dialog + Cart-ID/Küchen-Code bekommen ein optionales Chia-Segment, der Stripe-Endpunkt akzeptiert es nur für bowl-acai. Kitchen: Trenner erkennt „-Mit Chia".

**Tech Stack:** React/Vite + TS (Terminal, Website), Node-Skripttests (`node --experimental-strip-types`), Vercel-Funktion JS (Stripe), Next.js + vitest (Kitchen).

Spec: `docs/superpowers/specs/2026-09-11-acai-chia-schokogranola-design.md`

---

### Task 1: Terminal — Topping-Config (Schokogranola, exklusive Chia-Gruppe für 27)

**Files:**
- Modify: `artifacts/lys-terminal/src/data/toppings.ts`
- Create: `artifacts/lys-terminal/src/data/toppings.test.ts`

- [ ] **Step 1: Test schreiben** (`src/data/toppings.test.ts`, Stil wie `src/lib/kitchenOrder.test.ts`)

```ts
/** Lauf:  node --experimental-strip-types src/data/toppings.test.ts */
import { toppingsConfigFor, selectedIdsFromLabel } from "./toppings.ts";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures++;
    console.error(`FAIL ${name}\n  got:      ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`);
  } else console.log(`ok   ${name}`);
}

const acai = toppingsConfigFor("27")!;
const oats = toppingsConfigFor("24")!;

check("27 hat zwei Gruppen: chia + toppings", acai.groups.map((g) => g.id), ["chia", "toppings"]);
check("Chia-Gruppe ist Pflicht und exklusiv", [acai.groups[0].min, acai.groups[0].exclusive], [1, true]);
check("Chia-Optionen 0 EUR", acai.groups[0].options.map((o) => [o.label, o.priceDelta]),
  [["Mit Chia Pudding", 0], ["Ohne Chia Pudding", 0]]);
check("Schokogranola +2 in 27", acai.groups[1].options.find((o) => o.id === "schokogranola")?.priceDelta, 2);
check("Schokogranola +2 in 24", oats.groups[0].options.find((o) => o.id === "schokogranola")?.priceDelta, 2);
check("24 hat keine Chia-Gruppe", oats.groups.map((g) => g.id), ["toppings"]);
check("Edit-Vorauswahl aus Label", selectedIdsFromLabel(acai, "Mit Chia Pudding · Honig, Schokogranola"),
  ["chia-mit", "honig", "schokogranola"]);

if (failures) { console.error(`${failures} Fehler`); process.exit(1); }
```

- [ ] **Step 2: Test laufen lassen, erwartet FAIL** — `cd artifacts/lys-terminal && node --experimental-strip-types src/data/toppings.test.ts` (Import `@/data/menu` nicht auflösbar bzw. Gruppen fehlen).

- [ ] **Step 3: Implementieren** in `toppings.ts`:
  - Import `BOWL_ITEM_IDS` von `"./menu"` statt `"@/data/menu"` (Node-Test kann Alias nicht auflösen; Vite akzeptiert beides).
  - `ToppingGroup` + `exclusive?: boolean` (Doc: „Einfachauswahl — genau eine Option, Klick ersetzt die vorherige").
  - `BOWL_TOPPINGS`: nach Granola `{ id: "schokogranola", label: "Schokogranola", priceDelta: 2.0 }`.
  - Neu:
```ts
const ACAI_CHIA: ToppingOption[] = [
  { id: "chia-mit",  label: "Mit Chia Pudding",  priceDelta: 0 },
  { id: "chia-ohne", label: "Ohne Chia Pudding", priceDelta: 0 },
];
/** Açaí Bowl (27): Pflichtwahl Chia Pudding vor den Toppings. */
const ACAI_CONFIG: ToppingConfig = {
  titleKey: "toppingsTitle",
  groups: [
    { id: "chia", titleKey: "chiaPuddingTitle", options: ACAI_CHIA, min: 1, exclusive: true },
    { id: "toppings", titleKey: "toppingsTitle", options: BOWL_TOPPINGS },
  ],
  noteKey: "toppingsIncluded",
  noteExamples: "Banane, Erdbeere, Blaubeere, Himbeere, Mango",
};
const ACAI_ITEM_ID = "27";
```
  - In `TOPPING_CONFIGS`: nach der Bowl-Schleife `map[ACAI_ITEM_ID] = ACAI_CONFIG;`.

- [ ] **Step 4: Test grün** — gleicher Befehl, Ausgabe nur `ok`-Zeilen.

### Task 2: Terminal — Modal (exklusive Gruppe) + i18n-Key

**Files:**
- Modify: `artifacts/lys-terminal/src/components/ToppingsModal.tsx` (Funktion `toggle`)
- Modify: `artifacts/lys-terminal/src/i18n/translations.ts` (Interface + 21 Sprachblöcke)

- [ ] **Step 1: `toggle` ersetzen**
```tsx
const toggle = (id: string) => {
  const group = config.groups.find((g) => g.options.some((o) => o.id === id));
  setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
      return next;
    }
    if (group?.exclusive) for (const o of group.options) next.delete(o.id);
    next.add(id);
    return next;
  });
};
```
- [ ] **Step 2: i18n** — Interface: `chiaPuddingTitle: string;` direkt nach `toppingsTitle: string;`. In jedem Sprachblock nach der `toppingsTitle:`-Zeile einfügen (Werte): de „Chia Pudding", vi „Chia pudding", en „Chia pudding", fr „Pudding de chia", es „Pudin de chía", it „Budino di chia", pt „Pudim de chia", pl „Pudding chia", ru „Чиа-пудинг", tr „Chia puding", ar „بودينغ الشيا", zh „奇亚籽布丁", ja „チアプディング", ko „치아 푸딩", nl „Chiapudding", ro „Budincă de chia", hu „Chia puding", cs „Chia pudink", el „Πουτίγκα chia", hi „चिया पुडिंग", uk „Чіа-пудинг". (Skript: Zeile `toppingsTitle:` je Block per Regex ergänzen, dann `grep -c chiaPuddingTitle` = 22.)
- [ ] **Step 3: Verifikation** — `npm run typecheck && npm run build` in `artifacts/lys-terminal`, Test aus Task 1 erneut.
- [ ] **Step 4: Commit** — `feat(terminal): Açaí Bowl 27 Chia-Pflichtwahl + Topping Schokogranola`.

### Task 3: Website — Frontend (Codes, Dialog, Texte)

**Files:**
- Modify: `artifacts/ly-restaurant/src/lib/orderItemCode.ts`
- Modify: `artifacts/ly-restaurant/src/pages/Order.tsx`
- Modify: `artifacts/ly-restaurant/src/i18n/menuTranslations.ts`
- Modify: `artifacts/ly-restaurant/src/data/allergens.ts`

- [ ] **Step 1: orderItemCode.ts**
  - `BowlTopping` um `"schokogranola"`; Label „Schokogranola", Surcharge 2, in `BOWL_TOPPINGS` nach `"granola"`.
  - Neu:
```ts
export type BowlChia = "mit" | "ohne";
export const BOWL_CHIA_LABEL: Record<BowlChia, string> = {
  mit: "Mit Chia Pudding",
  ohne: "Ohne Chia Pudding",
};
export const BOWL_CHIA_OPTIONS: BowlChia[] = ["mit", "ohne"];
/** Nur die Açaí Bowl fragt die Chia-Pudding-Wahl ab. */
export const BOWL_WITH_CHIA_CHOICE = "bowl-acai";
```
  - `bowlCode(itemNumber, fruits, toppings, chia?: BowlChia)`: `const chiaSuffix = chia ? `-${BOWL_CHIA_LABEL[chia]}` : "";` ans Ende.
  - `bowlDisplayName(itemName, fruits, toppings, chia?)`: `if (chia) parts.push(BOWL_CHIA_LABEL[chia]);`.
  - `bowlCartId(baseId, fruits, toppings, chia?)`: `const chiaKey = chia ? `-${chia}-chia` : "";` ans Ende.
- [ ] **Step 2: Order.tsx**
  - Imports: `BOWL_CHIA_LABEL, BOWL_CHIA_OPTIONS, BOWL_WITH_CHIA_CHOICE, type BowlChia`.
  - `CartItem` + `chia?: BowlChia;`. State `const [bowlChiaChoice, setBowlChiaChoice] = useState<BowlChia | null>(null);`, in `setPendingBowl`-Stelle, `confirmBowl`, `cancelBowl` zurücksetzen.
  - `addBowlToCart(item, fruits, toppings, chia?: BowlChia)` reicht `chia` an `bowlCode/bowlDisplayName/bowlCartId` durch und speichert `chia` im Cart-Item.
  - `const bowlNeedsChia = pendingBowl?.item.id === BOWL_WITH_CHIA_CHOICE;` `confirmBowl`: `if (bowlNeedsChia && !bowlChiaChoice) return;` und `addBowlToCart(..., bowlNeedsChia ? bowlChiaChoice! : undefined)`. Confirm-Button `disabled={bowlFruitChoice.length === 0 || (bowlNeedsChia && !bowlChiaChoice)}`.
  - Dialog: vor „Extra-Toppings" eine Sektion (nur `bowlNeedsChia`):
```tsx
{bowlNeedsChia && (
  <div className="pt-2">
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      Chia Pudding (bitte wählen)
    </p>
    <div className="grid grid-cols-2 gap-2">
      {BOWL_CHIA_OPTIONS.map((chia) => {
        const active = bowlChiaChoice === chia;
        return (
          <button key={chia} type="button" onClick={() => setBowlChiaChoice(chia)}
            aria-pressed={active} data-testid={`button-bowl-chia-${chia}`}
            className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>
            {BOWL_CHIA_LABEL[chia]}
          </button>
        );
      })}
    </div>
  </div>
)}
```
  - Cart-Detailanzeige (`item.toppings || …`): `|| item.chia` ergänzen, damit der Name mit Chia-Teil angezeigt wird.
- [ ] **Step 3: menuTranslations.ts** — in allen `bowlToppings:`-Zeilen `(+2) · <letztes Topping (+1)>` → `(+2) · Schokogranola (+2) · <letztes Topping (+1)>` (Regex `\(\+2\) · ([^·]*\(\+1\)")` → `(+2) · Schokogranola (+2) · \1`). Kontrolle: `grep -c "Schokogranola (+2)"` = 21.
- [ ] **Step 4: allergens.ts** — Eintrag 27: `note: "ggf. 1 (bei Granola/Schokogranola)"`.

### Task 4: Website — Stripe-Endpunkt + Contract-Test

**Files:**
- Modify: `api/stripe/create-checkout-session.js`
- Modify: `scripts/contract-menu-drift.mjs`

- [ ] **Step 1: Contract-Fälle zuerst** — in `VAT_CASES` ergänzen:
```js
["bowl-acai-banane-granola-schokogranola-mit-chia", 7],
["bowl-acai-banane-ohne-topping-ohne-chia", 7],
```
  und nach der VAT-Schleife einen Preis-/Code-Check:
```js
const BOWL_CASES = [
  ["bowl-acai-banane-granola-schokogranola-mit-chia", "27-Banane-Granola+Schokogranola-Mit Chia Pudding", 1050],
  ["bowl-acai-banane-ohne-topping-ohne-chia", "27-Banane-Ohne Chia Pudding", 650],
  ["bowl-acai-banane-ohne-topping", "27-Banane", 650],
];
for (const [cartId, number, cents] of BOWL_CASES) {
  const r = resolveProduct(cartId);
  expect(r && r.product.number === number, `Bowl: "${cartId}" → Code ${r?.product.number}, erwartet ${number}`);
  expect(r && r.product.price === cents, `Bowl: "${cartId}" → ${r?.product.price}¢, erwartet ${cents}`);
}
expect(resolveProduct("bowl-oats1-banane-ohne-topping-mit-chia") === null,
  "Bowl: Chia-Token darf nur bei bowl-acai auflösen");
```
  (Prüfen, ob `resolveProduct` `{product, baseId}` liefert; sonst Feldnamen anpassen.)
- [ ] **Step 2: Laufen lassen, erwartet FAIL** — `pnpm run test:contract`.
- [ ] **Step 3: Endpunkt**
  - `BOWL_TOPPINGS.schokogranola = "Schokogranola"`, `BOWL_TOPPING_PRICE.schokogranola = 200`.
  - `const BOWL_CHIA = { "mit-chia": "Mit Chia Pudding", "ohne-chia": "Ohne Chia Pudding" };` `const BOWL_WITH_CHIA_CHOICE = "bowl-acai";`
  - `bowlVocabKeys()`: `...BOWL_CHIA` ergänzen.
  - `parseBowlRest`: Chia-Token am Ende abtrennen:
```js
let chia = null;
if (tokens.length && BOWL_CHIA[tokens[tokens.length - 1]]) chia = tokens.pop();
if (tokens.some((t) => BOWL_CHIA[t])) return null; // Chia nur einmal, nur am Ende
```
  … Rückgabe `{ fruits, toppings, chia }`.
  - `resolveBowlProduct`: `if (parsed.chia && baseId !== BOWL_WITH_CHIA_CHOICE) return null;` `const chiaLabel = parsed.chia ? BOWL_CHIA[parsed.chia] : null;` `number` + `${chiaLabel ? `-${chiaLabel}` : ""}`, `name` + `${chiaLabel ? ` • ${chiaLabel}` : ""}`. Preis unverändert.
- [ ] **Step 4: Grün** — `pnpm run typecheck && pnpm run test:contract` (Root `lys-website`).
- [ ] **Step 5: Commit + Push** — `feat(order): Açaí Bowl Chia-Pflichtwahl + Topping Schokogranola` auf `main` (die vorhandene `.gitignore`-Änderung NICHT mit einchecken).

### Task 5: Kitchen — Trenner für „-Mit Chia"

**Files:**
- Modify: `lys-kitchen-dashboard/lib/kitchenAbbrev.ts`, `lib/kitchenAbbrev.test.ts`

- [ ] **Step 1: Test**
```ts
it("Bowl 27 (Website-Code) mit Chia-Wahl und Schokogranola: alle Teile sichtbar", () => {
  expect(abbreviateKitchenLine("1x 27-Banane+Erdbeere-Granola+Schokogranola-Mit Chia Pudding")).toBe(
    "1x 27 · Banane+Erdbeere · Granola+Schokogranola · Mit Chia Pudding · BOWL"
  );
  expect(abbreviateKitchenLine("1x 27-Banane-Ohne Chia Pudding")).toBe("1x 27 · Banane · Ohne Chia Pudding · BOWL");
});
```
- [ ] **Step 2: FAIL** — `npx vitest run lib/kitchenAbbrev.test.ts`.
- [ ] **Step 3: Regex** — `MODIFIER_SEPARATOR_RE` Lookahead um `granola|mit\s+chia` erweitern (Granola/Schokogranola-Segment und Chia-Segment werden dann als eigene Teile getrennt; „schoko" NICHT aufnehmen, sonst zerschneidet es Schokogranola-Toppings innerhalb von „+"-Ketten nicht, aber „-Schoko" bei Gerichten ohne Bedarf).
- [ ] **Step 4: Grün, Build, Commit, Push** — `npx vitest run && npm run build`, Commit `feat(kitchen): Bowl-Chia-Wahl und Granola-Segment auf der Karte trennen`, `git push origin main`.

### Task 6: Terminal ausrollen + Doku

- [ ] **Step 1:** Terminal-Worktree-Branch per Fast-Forward nach `main` mergen, `git push origin main` (Auto-Deploy).
- [ ] **Step 2:** `memory/LYS-Orderflow.md`: Eintrag in §8 (Datum, drei Commits, Konsistenzregel: Topping/Option an drei Stellen).
- [ ] **Step 3:** Vercel-Deploys prüfen (Terminal, Website, Kitchen READY).
