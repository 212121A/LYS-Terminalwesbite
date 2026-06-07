# „Ausverkauft"-Schalter im Terminal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mitarbeiter markieren beliebige bestellbare Dinge (Gerichte, Getränke, Box-Basen, Soßen) im Terminal selbst als ausverkauft; alle Geräte grauen sie zentral aus, „heute aus" setzt sich über Nacht automatisch zurück.

**Architecture:** Zentrale Supabase-Tabelle `item_availability` (nur Einträge für ausgeschaltete Items). Frontend liest per Supabase-REST (anon, RLS nur SELECT) und pollt; Schreiben läuft ausschließlich über den Express-Server (`POST /api/availability`), der eine PIN serverseitig gegen `STAFF_PIN` prüft und mit dem Service-Role-Key schreibt. „Ausverkauft heute" gilt nur für den aktuellen Geschäftstag (Europe/Berlin, Cutoff 4:00) — der Reset passiert dadurch implizit ohne Cron-Job.

**Tech Stack:** React 19 + Vite + TailwindCSS (Frontend), Express 5 + @supabase/supabase-js (API), Supabase Postgres. Tests als reine Logik-Tests via `node --experimental-strip-types` (bestehendes Projektmuster, kein Vitest/Jest).

---

## Hinweise vor der Ausführung

- **Git/Commits (Auftraggeber-Regel):** Commits nur auf einem Branch und nur mit ausdrücklichem Go. Die `git commit`-Steps unten gehören zum TDD-Flow — bei der Ausführung bitte Go abwarten. Branch bleibt der aktuelle `claude/...`-Branch; Integration am Ende per PR.
- **PIN ist geheim:** Der PIN-Wert steht ausschließlich in ENV `STAFF_PIN` (lokal in der Repo-Root-`.env`, in Vercel als Secret). Niemals in Code, Spec, Plan oder Logs.
- **Kein Test-Runner:** Tests folgen exakt dem Muster aus `artifacts/lys-terminal/src/lib/kitchenOrder.test.ts` (eigene `check()`-Funktion, Lauf via `node --experimental-strip-types <datei>`). UI-Tasks werden per `npm run typecheck` + manueller Browser-Prüfung verifiziert (es gibt keine Komponenten-Test-Infrastruktur; eine einzuführen wäre für dieses Feature Over-Engineering).
- **Realtime vs. Polling:** Das Frontend nutzt bewusst keinen `supabase-js`-Client (nur REST-`fetch`, siehe `OrderSuccess.tsx`). Daher Sync per Polling (~15 s) + Refetch beim Tab-Fokus, statt Supabase Realtime. Das ist konsistent mit dem Code und vermeidet eine schwere Bundle-Abhängigkeit.

## File Structure

**Neu (Backend):**
- `artifacts/api-server/sql/item_availability.sql` — Migration (Tabelle + RLS), manuell im Supabase SQL-Editor auszuführen.
- `artifacts/api-server/src/lib/businessDay.ts` — `currentBusinessDay()` (Berlin, 4:00-Cutoff).
- `artifacts/api-server/src/lib/businessDay.test.ts` — Test dazu.
- `artifacts/api-server/src/routes/availability.ts` — `POST /api/availability` + `POST /api/availability/verify`.

**Geändert (Backend):**
- `artifacts/api-server/src/routes/index.ts` — neue Route registrieren.

**Neu (Frontend):**
- `artifacts/lys-terminal/src/lib/availability.ts` — reine Logik: `currentBusinessDay()`, `isSoldOut()`, ID-Helfer, Typen.
- `artifacts/lys-terminal/src/lib/availability.test.ts` — Test dazu.
- `artifacts/lys-terminal/src/availability/AvailabilityContext.tsx` — Provider + `useAvailability()`-Hook (Fetch + Polling).
- `artifacts/lys-terminal/src/components/StaffEditOverlay.tsx` — versteckter Bearbeiten-Modus (PIN-Gate + Item-Liste + Toggles).

**Geändert (Frontend):**
- `artifacts/lys-terminal/src/App.tsx` — `AvailabilityProvider` einhängen.
- `artifacts/lys-terminal/src/components/MenuItemCard.tsx` — Ausgrauen + Klick sperren.
- `artifacts/lys-terminal/src/components/BoxItemCard.tsx` — Ausgrauen + Klick sperren.
- `artifacts/lys-terminal/src/components/SauceModal.tsx` — ausverkaufte Soßen ausgrauen + nicht wählbar.
- `artifacts/lys-terminal/src/pages/Terminal.tsx` — Langdruck-Geste aufs Logo → `StaffEditOverlay`.

**Geändert (Root):**
- `.env.example` — `STAFF_PIN` ergänzen.

**ID-Schema (überall identisch):** `dish:<MenuItem.id>`, `box:<BoxBaseItem.id>`, `sauce:<BoxSauce.id>`.

---

## Task 1: Supabase-Tabelle `item_availability`

**Files:**
- Create: `artifacts/api-server/sql/item_availability.sql`

- [ ] **Step 1: SQL-Migration schreiben**

```sql
-- artifacts/api-server/sql/item_availability.sql
-- Verfügbarkeits-Status je bestellbarem Item. Es existieren NUR Zeilen für
-- aktuell/zuletzt ausgeschaltete Items; keine Zeile = verfügbar.
create table if not exists public.item_availability (
  item_id       text primary key,                       -- z.B. dish:e1, box:box-tofu, sauce:erdnuss
  mode          text not null check (mode in ('today','permanent')),
  sold_out_date date,                                    -- Geschäftstag (nur relevant bei mode='today')
  updated_at    timestamptz not null default now()
);

alter table public.item_availability enable row level security;

-- Lesen für alle (Terminal/Online nutzen den anon-Key). Schreiben NUR über den
-- API-Server mit Service-Role-Key (umgeht RLS) — daher keine write-Policy.
create policy "item_availability read for anon"
  on public.item_availability
  for select
  to anon, authenticated
  using (true);
```

- [ ] **Step 2: Migration in Supabase ausführen**

Supabase Dashboard → SQL Editor → Inhalt der Datei einfügen → Run.
Erwartet: „Success. No rows returned."

- [ ] **Step 3: Verifizieren**

Im SQL-Editor:
```sql
select * from public.item_availability;
```
Erwartet: leere Tabelle, keine Fehler. Spalten `item_id, mode, sold_out_date, updated_at` vorhanden.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/sql/item_availability.sql
git commit -m "feat(api): item_availability-Tabelle + RLS für Verfügbarkeit

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Backend — `currentBusinessDay()` (Geschäftstag mit 4:00-Cutoff)

**Files:**
- Create: `artifacts/api-server/src/lib/businessDay.ts`
- Test: `artifacts/api-server/src/lib/businessDay.test.ts`

- [ ] **Step 1: Test schreiben (failing)**

```typescript
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
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `cd artifacts/api-server && node --experimental-strip-types src/lib/businessDay.test.ts`
Erwartet: FAIL — Modul `./businessDay.ts` existiert nicht (Import-Fehler).

- [ ] **Step 3: Implementierung schreiben**

```typescript
// artifacts/api-server/src/lib/businessDay.ts
/**
 * Aktueller „Geschäftstag" als YYYY-MM-DD in Europe/Berlin. Der Tag wechselt um
 * 04:00 (nicht Mitternacht), damit Nachtbetrieb noch zum Vortag zählt und
 * „heute ausverkauft"-Markierungen erst nach Betriebsschluss zurückgesetzt werden.
 *
 * Trick: 4 Stunden vom Zeitpunkt abziehen, dann in Berlin-Zeit formatieren —
 * funktioniert dank Intl auch über Sommer-/Winterzeit hinweg.
 */
export function currentBusinessDay(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}
```

- [ ] **Step 4: Test laufen lassen (muss grün sein)**

Run: `cd artifacts/api-server && node --experimental-strip-types src/lib/businessDay.test.ts`
Erwartet: „alle Tests grün", Exit 0.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/businessDay.ts artifacts/api-server/src/lib/businessDay.test.ts
git commit -m "feat(api): currentBusinessDay mit 4:00-Cutoff (Europe/Berlin)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Backend — Route `POST /api/availability` (+ `/verify`)

**Files:**
- Create: `artifacts/api-server/src/routes/availability.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`
- Modify: `.env.example`

- [ ] **Step 1: Route-Datei schreiben**

```typescript
// artifacts/api-server/src/routes/availability.ts
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import { currentBusinessDay } from "../lib/businessDay.js";

const router = Router();

// Schützt v.a. /verify gegen PIN-Brute-Force.
const availabilityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Zu viele Anfragen. Bitte warte kurz." },
});
router.use(availabilityLimiter);

function getSupabaseOptional() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

function pinOk(pin: unknown): boolean {
  const expected = process.env.STAFF_PIN;
  return typeof expected === "string" && expected.length > 0 && pin === expected;
}

type Action = "available" | "sold_out_today" | "sold_out_permanent";

// PIN prüfen, damit der versteckte Modus erst nach korrekter PIN aufgeht.
router.post("/verify", (req, res) => {
  if (!pinOk(req.body?.pin)) return res.status(401).json({ error: "Falsche PIN" });
  return res.json({ ok: true });
});

// Verfügbarkeit setzen/entfernen.
router.post("/", async (req, res) => {
  const body = req.body ?? {};
  const pin = body.pin as unknown;
  const itemId = body.itemId as unknown;
  const action = body.action as Action;

  if (!pinOk(pin)) return res.status(401).json({ error: "Falsche PIN" });
  if (typeof itemId !== "string" || itemId.length === 0) {
    return res.status(400).json({ error: "itemId fehlt" });
  }

  const supabase = getSupabaseOptional();
  if (!supabase) {
    return res.status(503).json({ error: "Bestellservice nicht konfiguriert." });
  }

  if (action === "available") {
    const { error } = await supabase.from("item_availability").delete().eq("item_id", itemId);
    if (error) return res.status(500).json({ error: "Speichern fehlgeschlagen." });
    return res.json({ ok: true });
  }

  if (action === "sold_out_today" || action === "sold_out_permanent") {
    const mode = action === "sold_out_permanent" ? "permanent" : "today";
    const { error } = await supabase.from("item_availability").upsert(
      {
        item_id: itemId,
        mode,
        sold_out_date: mode === "today" ? currentBusinessDay() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "item_id" },
    );
    if (error) return res.status(500).json({ error: "Speichern fehlgeschlagen." });
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: "Ungültige action" });
});

export default router;
```

- [ ] **Step 2: Route registrieren**

In `artifacts/api-server/src/routes/index.ts` den Import und das Mount ergänzen:

```typescript
import { Router, type IRouter } from "express";
import stripeRouter from "./stripe.js";
import counterOrderRouter from "./counterOrder.js";
import availabilityRouter from "./availability.js";

const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.use("/orders", counterOrderRouter);
router.use("/stripe", stripeRouter);
router.use("/availability", availabilityRouter);

export default router;
```

- [ ] **Step 3: `.env.example` ergänzen**

In `.env.example` nach dem Supabase-Server-Block einfügen:

```bash
# --- Personal/Staff: PIN für versteckten "Ausverkauft"-Modus im Terminal ---
# 4-stellig. Nur hier (Server-ENV), niemals im Frontend-Bundle.
STAFF_PIN=0000
```

- [ ] **Step 4: Typecheck**

Run: `cd artifacts/api-server && npm run typecheck`
Erwartet: keine Fehler.

- [ ] **Step 5: Lokal manuell verifizieren**

Server bauen + starten:
```bash
cd artifacts/api-server && npm run build && STAFF_PIN=1234 SUPABASE_URL=$SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY npm start
```
In zweitem Terminal (Server auf Port aus `.env`/`PORT`, lokal i.d.R. 3000):
```bash
# Falsche PIN -> 401
curl -s -X POST localhost:3000/api/availability/verify -H 'Content-Type: application/json' -d '{"pin":"0000"}'
# Richtige PIN -> {"ok":true}
curl -s -X POST localhost:3000/api/availability/verify -H 'Content-Type: application/json' -d '{"pin":"1234"}'
# Tofu heute aus -> {"ok":true}
curl -s -X POST localhost:3000/api/availability -H 'Content-Type: application/json' -d '{"pin":"1234","itemId":"box:box-tofu","action":"sold_out_today"}'
# wieder verfügbar -> {"ok":true}
curl -s -X POST localhost:3000/api/availability -H 'Content-Type: application/json' -d '{"pin":"1234","itemId":"box:box-tofu","action":"available"}'
```
Erwartet: 401 bei falscher PIN, sonst `{"ok":true}`. In Supabase: nach „sold_out_today" eine Zeile `box:box-tofu` mit `mode=today` und heutigem `sold_out_date`; nach „available" wieder weg.

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/routes/availability.ts artifacts/api-server/src/routes/index.ts .env.example
git commit -m "feat(api): POST /api/availability + /verify (PIN-geschützt)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Frontend — reine Verfügbarkeits-Logik + ID-Helfer

**Files:**
- Create: `artifacts/lys-terminal/src/lib/availability.ts`
- Test: `artifacts/lys-terminal/src/lib/availability.test.ts`

- [ ] **Step 1: Test schreiben (failing)**

```typescript
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
```

- [ ] **Step 2: Test laufen lassen (muss fehlschlagen)**

Run: `cd artifacts/lys-terminal && node --experimental-strip-types src/lib/availability.test.ts`
Erwartet: FAIL — Modul `./availability.ts` existiert nicht.

- [ ] **Step 3: Implementierung schreiben**

```typescript
// artifacts/lys-terminal/src/lib/availability.ts
import type { MenuItem, BoxBaseItem } from "@/data/menu";
import type { BoxSauce } from "@/data/boxSauces";

export interface AvailabilityRow {
  item_id: string;
  mode: "today" | "permanent";
  sold_out_date: string | null;
}

/** Aktueller Geschäftstag als YYYY-MM-DD in Europe/Berlin, Tageswechsel um 04:00.
 *  Identische Logik wie im Backend (artifacts/api-server/src/lib/businessDay.ts);
 *  bewusst dupliziert, da Frontend und API kein gemeinsames Paket teilen. */
export function currentBusinessDay(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

export function isSoldOut(row: AvailabilityRow | undefined, businessDay: string): boolean {
  if (!row) return false;
  if (row.mode === "permanent") return true;
  return row.sold_out_date === businessDay;
}

export function dishAvailabilityId(item: Pick<MenuItem, "id">): string {
  return `dish:${item.id}`;
}
export function boxAvailabilityId(item: Pick<BoxBaseItem, "id">): string {
  return `box:${item.id}`;
}
export function sauceAvailabilityId(sauce: Pick<BoxSauce, "id">): string {
  return `sauce:${sauce.id}`;
}
```

- [ ] **Step 4: Test laufen lassen (muss grün sein)**

Run: `cd artifacts/lys-terminal && node --experimental-strip-types src/lib/availability.test.ts`
Erwartet: „alle Tests grün", Exit 0.
(Hinweis: `import type`-Zeilen werden von `--experimental-strip-types` entfernt, der `@/`-Alias stört den Testlauf daher nicht.)

- [ ] **Step 5: Commit**

```bash
git add artifacts/lys-terminal/src/lib/availability.ts artifacts/lys-terminal/src/lib/availability.test.ts
git commit -m "feat(terminal): Verfügbarkeits-Logik (isSoldOut, Geschäftstag, ID-Helfer)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Frontend — `AvailabilityProvider` + `useAvailability()`

**Files:**
- Create: `artifacts/lys-terminal/src/availability/AvailabilityContext.tsx`
- Modify: `artifacts/lys-terminal/src/App.tsx`

- [ ] **Step 1: Provider + Hook schreiben**

```tsx
// artifacts/lys-terminal/src/availability/AvailabilityContext.tsx
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { currentBusinessDay, isSoldOut, type AvailabilityRow } from "@/lib/availability";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const POLL_MS = 15_000;

async function fetchAvailability(): Promise<AvailabilityRow[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
  const url =
    `${SUPABASE_URL}/rest/v1/item_availability` +
    `?select=item_id,mode,sold_out_date`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as AvailabilityRow[];
  return Array.isArray(rows) ? rows : [];
}

interface AvailabilityContextValue {
  isItemSoldOut: (availabilityId: string) => boolean;
  refetch: () => Promise<void>;
}

const AvailabilityContext = createContext<AvailabilityContextValue | null>(null);

export function AvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<Map<string, AvailabilityRow>>(new Map());
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    const next = await fetchAvailability();
    if (!mounted.current) return;
    setRows(new Map(next.map((r) => [r.item_id, r])));
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refetch();
    const interval = window.setInterval(() => void refetch(), POLL_MS);
    const onFocus = () => void refetch();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refetch]);

  const isItemSoldOut = useCallback(
    (availabilityId: string) => isSoldOut(rows.get(availabilityId), currentBusinessDay()),
    [rows],
  );

  const value = useMemo<AvailabilityContextValue>(
    () => ({ isItemSoldOut, refetch }),
    [isItemSoldOut, refetch],
  );

  return <AvailabilityContext.Provider value={value}>{children}</AvailabilityContext.Provider>;
}

export function useAvailability(): AvailabilityContextValue {
  const ctx = useContext(AvailabilityContext);
  if (!ctx) throw new Error("useAvailability muss innerhalb von AvailabilityProvider verwendet werden");
  return ctx;
}
```

- [ ] **Step 2: Provider in `App.tsx` einhängen**

In `artifacts/lys-terminal/src/App.tsx` den Import ergänzen und `<WouterRouter>…</WouterRouter>` umschließen:

```tsx
import { AvailabilityProvider } from "@/availability/AvailabilityContext";
```

und im JSX (innerhalb `<TooltipProvider>`):

```tsx
        <TooltipProvider>
          <AvailabilityProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ErrorBoundary>
                <Router />
              </ErrorBoundary>
            </WouterRouter>
          </AvailabilityProvider>
          <Toaster />
        </TooltipProvider>
```

- [ ] **Step 3: Typecheck**

Run: `cd artifacts/lys-terminal && npm run typecheck`
Erwartet: keine Fehler.

- [ ] **Step 4: Manuell verifizieren**

`npm run dev`, App im Browser öffnen (`/order`). In den DevTools → Network: alle ~15 s ein `GET …/rest/v1/item_availability`. Beim Tab-Wechsel/Fokus zusätzlich ein Request. Keine Konsolen-Fehler.

- [ ] **Step 5: Commit**

```bash
git add artifacts/lys-terminal/src/availability/AvailabilityContext.tsx artifacts/lys-terminal/src/App.tsx
git commit -m "feat(terminal): AvailabilityProvider mit Polling der Verfügbarkeit

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Frontend — Ausgrauen in `MenuItemCard`

**Files:**
- Modify: `artifacts/lys-terminal/src/components/MenuItemCard.tsx`

- [ ] **Step 1: Verfügbarkeit einlesen**

Oben in `MenuItemCardBase` (nach `const { tr } = useLang();`):

```tsx
import { useAvailability } from "@/availability/AvailabilityContext";
import { dishAvailabilityId } from "@/lib/availability";
```

```tsx
const { isItemSoldOut } = useAvailability();
const soldOut = isItemSoldOut(dishAvailabilityId(item));
```

- [ ] **Step 2: Frühe Render-Variante für ausverkauft (beide Render-Pfade abdecken)**

Direkt vor dem `if (item.sizeOptions …)`-Block einen gemeinsamen Ausverkauft-Render einsetzen, damit sowohl Größen- als auch Standard-Items abgedeckt sind:

```tsx
if (soldOut) {
  return (
    <div
      data-testid={`card-menuitem-${item.id}`}
      aria-disabled="true"
      className="bg-card border border-card-border rounded-xl p-4 flex items-center justify-between gap-4 opacity-50 pointer-events-none select-none"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground text-[15px] line-through">{displayName}</h3>
        <span className="text-[12px] font-medium text-muted-foreground">{tr.soldOut}</span>
      </div>
      <span className="text-[15px] font-medium text-muted-foreground tabular-nums">
        <Price value={item.price} />
      </span>
    </div>
  );
}
```

(`displayName` ist bereits oberhalb definiert; diesen Block nach der `displayName`-Zuweisung platzieren.)

- [ ] **Step 3: i18n-Key `soldOut` ergänzen**

In `artifacts/lys-terminal/src/i18n/translations.ts` für jede Sprache den Key `soldOut` hinzufügen (deutscher Wert: `"Heute leider aus"`). Falls die Übersetzungs-Struktur typisiert ist, in allen Sprach-Objekten ergänzen, z.B. Englisch `"Sold out today"`, Vietnamesisch sinngemäß. Mindestens `de` muss gesetzt sein.

- [ ] **Step 4: Typecheck**

Run: `cd artifacts/lys-terminal && npm run typecheck`
Erwartet: keine Fehler (insb. `tr.soldOut` aufgelöst).

- [ ] **Step 5: Manuell verifizieren**

In Supabase eine Zeile `dish:<eine-echte-id>` mit `mode=permanent` anlegen (oder per curl aus Task 3). Im Terminal: das Gericht ist ausgegraut, durchgestrichen, „Heute leider aus", kein „+"-Button, nicht klickbar. Andere Gerichte normal.

- [ ] **Step 6: Commit**

```bash
git add artifacts/lys-terminal/src/components/MenuItemCard.tsx artifacts/lys-terminal/src/i18n/translations.ts
git commit -m "feat(terminal): ausverkaufte Gerichte ausgrauen (MenuItemCard)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Frontend — Ausgrauen in `BoxItemCard`

**Files:**
- Modify: `artifacts/lys-terminal/src/components/BoxItemCard.tsx`

- [ ] **Step 1: Verfügbarkeit einlesen**

Imports ergänzen:

```tsx
import { useAvailability } from "@/availability/AvailabilityContext";
import { boxAvailabilityId } from "@/lib/availability";
```

In `BoxItemCardBase` nach `const { tr } = useLang();`:

```tsx
const { isItemSoldOut } = useAvailability();
const soldOut = isItemSoldOut(boxAvailabilityId(item));
```

- [ ] **Step 2: Ausverkauft-Render einsetzen**

Nach der `baseName`-Zuweisung, vor dem `return`:

```tsx
if (soldOut) {
  return (
    <div
      data-testid={`card-box-${item.id}`}
      aria-disabled="true"
      className="bg-card border border-card-border rounded-xl p-4 flex items-center justify-between gap-4 opacity-50 pointer-events-none select-none"
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground text-[15px] line-through">{baseName}</h3>
        <span className="text-[12px] font-medium text-muted-foreground">{tr.soldOut}</span>
      </div>
      <span className="text-[15px] font-medium text-muted-foreground tabular-nums">
        <Price value={item.sizes.gross} />
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd artifacts/lys-terminal && npm run typecheck`
Erwartet: keine Fehler.

- [ ] **Step 4: Manuell verifizieren**

Per curl `box:box-tofu` auf `sold_out_today` setzen. Im Terminal in der Nudel-/Reisbox-Sektion: „Tofu" ausgegraut, durchgestrichen, „Heute leider aus", keine Buttons. Übrige Box-Basen normal.

- [ ] **Step 5: Commit**

```bash
git add artifacts/lys-terminal/src/components/BoxItemCard.tsx
git commit -m "feat(terminal): ausverkaufte Box-Basen ausgrauen (BoxItemCard)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Frontend — Ausverkaufte Soßen ausgrauen (`SauceModal`)

**Files:**
- Modify: `artifacts/lys-terminal/src/components/SauceModal.tsx`

- [ ] **Step 1: Verfügbarkeit einlesen**

Imports ergänzen:

```tsx
import { useAvailability } from "@/availability/AvailabilityContext";
import { sauceAvailabilityId } from "@/lib/availability";
```

In der Komponente nach `const { tr } = useLang();`:

```tsx
const { isItemSoldOut } = useAvailability();
```

- [ ] **Step 2: Soßen-Button bei Ausverkauf sperren**

Im `options.map((sauce) => …)`-Block. Die „Keine Soße"-Option (`id === NONE`) ist nie ausverkauft. Pro Soße `soldOut` berechnen und Button entsprechend rendern:

```tsx
{options.map((sauce) => {
  const isSelected = selectedId === sauce.id;
  const soldOut = sauce.id !== NONE && isItemSoldOut(sauceAvailabilityId(sauce));
  return (
    <button
      key={sauce.id}
      data-testid={`button-sauce-${sauce.id}`}
      disabled={soldOut}
      onClick={() => { if (!soldOut) setSelectedId(sauce.id); }}
      className={`w-full min-h-14 rounded-xl border-2 flex items-center gap-3 px-5 py-3 text-left transition-all duration-150 ${
        soldOut
          ? "border-border bg-muted opacity-50 cursor-not-allowed"
          : isSelected
            ? "border-primary bg-primary/5 active:scale-[0.99]"
            : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40 active:scale-[0.99]"
      }`}
    >
      <div
        className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
          isSelected ? "border-primary" : "border-muted-foreground/40"
        }`}
      >
        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
      </div>
      <span className={`text-[15px] font-medium ${soldOut ? "text-muted-foreground line-through" : "text-foreground"}`}>
        {sauce.label}
      </span>
      {soldOut && (
        <span className="ml-auto text-[12px] font-medium text-muted-foreground">{tr.soldOut}</span>
      )}
    </button>
  );
})}
```

- [ ] **Step 3: Typecheck**

Run: `cd artifacts/lys-terminal && npm run typecheck`
Erwartet: keine Fehler.

- [ ] **Step 4: Manuell verifizieren**

Per curl `sauce:erdnuss` auf `sold_out_today` setzen. Im Terminal eine Box hinzufügen → Soßen-Modal: „Erdnusssoße" ausgegraut, durchgestrichen, „Heute leider aus", nicht auswählbar. Andere Soßen normal wählbar.

- [ ] **Step 5: Commit**

```bash
git add artifacts/lys-terminal/src/components/SauceModal.tsx
git commit -m "feat(terminal): ausverkaufte Soßen ausgrauen (SauceModal)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Frontend — Versteckter Bearbeiten-Modus (Geste + PIN + Overlay)

**Files:**
- Create: `artifacts/lys-terminal/src/components/StaffEditOverlay.tsx`
- Modify: `artifacts/lys-terminal/src/pages/Terminal.tsx`

- [ ] **Step 1: Overlay-Komponente schreiben**

```tsx
// artifacts/lys-terminal/src/components/StaffEditOverlay.tsx
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { menuData, boxMenuItems } from "@/data/menu";
import { BOX_SAUCES } from "@/data/boxSauces";
import {
  dishAvailabilityId,
  boxAvailabilityId,
  sauceAvailabilityId,
} from "@/lib/availability";
import { useAvailability } from "@/availability/AvailabilityContext";

type Action = "available" | "sold_out_today" | "sold_out_permanent";

interface Entry {
  availabilityId: string;
  label: string;
}
interface Group {
  title: string;
  entries: Entry[];
}

function buildGroups(): Group[] {
  const groups: Group[] = [];
  for (const category of menuData) {
    if (category.boxItems) {
      groups.push({
        title: category.name,
        entries: category.boxItems.map((b) => ({
          availabilityId: boxAvailabilityId(b),
          label: b.name,
        })),
      });
    } else {
      groups.push({
        title: category.name,
        entries: category.items.map((i) => ({
          availabilityId: dishAvailabilityId(i),
          label: `${i.number} ${i.name}`,
        })),
      });
    }
  }
  groups.push({
    title: "Soßen",
    entries: BOX_SAUCES.map((s) => ({
      availabilityId: sauceAvailabilityId(s),
      label: s.label,
    })),
  });
  return groups;
}

export function StaffEditOverlay({ onClose }: { onClose: () => void }) {
  const { isItemSoldOut, refetch } = useAvailability();
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const groups = useMemo(buildGroups, []);

  async function verifyPin() {
    setError(null);
    const res = await fetch("/api/availability/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) setAuthed(true);
    else setError("Falsche PIN");
  }

  async function setAvailability(availabilityId: string, action: Action) {
    setBusy(availabilityId);
    setError(null);
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, itemId: availabilityId, action }),
    });
    if (!res.ok) setError("Speichern fehlgeschlagen");
    await refetch();
    setBusy(null);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-[20px] font-semibold text-foreground">Verfügbarkeit bearbeiten</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground active:scale-95">
            <X size={18} />
          </button>
        </div>

        {!authed ? (
          <div className="p-6 flex flex-col gap-4">
            <label className="text-[14px] text-muted-foreground">PIN eingeben</label>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void verifyPin(); }}
              className="h-12 rounded-xl border-2 border-border bg-card px-4 text-[18px] tracking-widest text-foreground"
            />
            {error && <p className="text-[13px] text-red-600">{error}</p>}
            <button onClick={() => void verifyPin()} className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold active:scale-[0.98]">
              Weiter
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto px-6 py-4">
            {error && <p className="text-[13px] text-red-600 mb-3">{error}</p>}
            {groups.map((group) => (
              <div key={group.title} className="mb-6">
                <h3 className="font-serif text-[16px] font-semibold text-primary mb-2">{group.title}</h3>
                <div className="space-y-1.5">
                  {group.entries.map((entry) => {
                    const soldOut = isItemSoldOut(entry.availabilityId);
                    const isBusy = busy === entry.availabilityId;
                    return (
                      <div key={entry.availabilityId} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                        <span className={`text-[14px] ${soldOut ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {entry.label}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {soldOut ? (
                            <button
                              disabled={isBusy}
                              onClick={() => void setAvailability(entry.availabilityId, "available")}
                              className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[13px] font-medium active:scale-95 disabled:opacity-50"
                            >
                              Verfügbar
                            </button>
                          ) : (
                            <button
                              disabled={isBusy}
                              onClick={() => void setAvailability(entry.availabilityId, "sold_out_today")}
                              className="h-8 px-3 rounded-lg bg-muted text-foreground text-[13px] font-medium active:scale-95 disabled:opacity-50"
                            >
                              Heute aus
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

(Hinweis: „dauerhaft aus" wird hier bewusst nicht als eigener Button gezeigt, um die Liste schlank zu halten — `sold_out_today` deckt den Alltag ab. Falls gewünscht, später einen zweiten Button mit `action: "sold_out_permanent"` ergänzen; das Backend unterstützt es bereits.)

- [ ] **Step 2: Langdruck-Geste aufs Logo in `Terminal.tsx`**

State + Overlay einbinden. Import oben:

```tsx
import { StaffEditOverlay } from "@/components/StaffEditOverlay";
```

In der `Terminal`-Komponente bei den übrigen `useState`-Hooks:

```tsx
const [staffOpen, setStaffOpen] = useState(false);
const staffTimer = useRef<number | null>(null);

const startStaffPress = () => {
  staffTimer.current = window.setTimeout(() => setStaffOpen(true), 2000);
};
const cancelStaffPress = () => {
  if (staffTimer.current) { window.clearTimeout(staffTimer.current); staffTimer.current = null; }
};
```

(Falls `useRef`/`useState` noch nicht importiert sind, den React-Import entsprechend ergänzen.)

Das Logo-`<img>` (aktuell ~Zeile 349) in einen Button-Wrapper mit Press-Handlern fassen:

```tsx
<button
  type="button"
  aria-label="Personal: Verfügbarkeit bearbeiten"
  onPointerDown={startStaffPress}
  onPointerUp={cancelStaffPress}
  onPointerLeave={cancelStaffPress}
  onContextMenu={(e) => e.preventDefault()}
  className="shrink-0 cursor-default"
>
  <img
    src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.png`}
    alt="LYS Noodles & Rice"
    className="h-10 md:h-12 w-auto object-contain shrink-0 min-[1600px]:h-20 pointer-events-none select-none"
    draggable={false}
  />
</button>
```

Am Ende des Render-Baums (neben den anderen Modals, z.B. nahe dem `SauceModal`-Block) einsetzen:

```tsx
{staffOpen && <StaffEditOverlay onClose={() => setStaffOpen(false)} />}
```

- [ ] **Step 3: Typecheck**

Run: `cd artifacts/lys-terminal && npm run typecheck`
Erwartet: keine Fehler.

- [ ] **Step 4: Manuell verifizieren**

`npm run dev`. Auf `/order` das Logo ~2 s gedrückt halten → Overlay öffnet. Falsche PIN → „Falsche PIN". Richtige PIN (= `STAFF_PIN`, lokal gesetzt) → Item-Liste. „Heute aus" bei Tofu → Eintrag wird durchgestrichen, Button wechselt zu „Verfügbar"; Overlay schließen → Tofu im Menü ausgegraut. „Verfügbar" → wieder normal. Kurzer Klick aufs Logo (ohne Halten) öffnet NICHTS.

- [ ] **Step 5: Commit**

```bash
git add artifacts/lys-terminal/src/components/StaffEditOverlay.tsx artifacts/lys-terminal/src/pages/Terminal.tsx
git commit -m "feat(terminal): versteckter Personal-Modus zum Ausverkauft-Schalten

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: End-to-End-Verifikation (zwei Geräte + Tageswechsel)

**Files:** keine (manuelle Prüfung)

- [ ] **Step 1: Voraussetzungen**

`STAFF_PIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` lokal in `.env` gesetzt. Backend (`npm start` in `artifacts/api-server`) und Frontend (`npm run dev`) laufen.

- [ ] **Step 2: Mehrgeräte-Sync**

Zwei Browser-Tabs auf `/order`. In Tab A via Logo-Langdruck + PIN „Tofu → Heute aus". Innerhalb ~15 s ist Tofu in Tab B ausgegraut.

- [ ] **Step 3: Auto-Reset-Logik (ohne echtes Warten)**

In Supabase die `sold_out_date` der Tofu-Zeile auf gestern setzen:
```sql
update public.item_availability set sold_out_date = current_date - 1 where item_id = 'box:box-tofu';
```
Im Terminal nach Refetch (Tab-Fokus oder ~15 s): Tofu ist wieder verfügbar — bestätigt den nächtlichen Auto-Reset.

- [ ] **Step 4: „dauerhaft" bleibt**

```sql
update public.item_availability set mode = 'permanent', sold_out_date = null where item_id = 'box:box-tofu';
```
Tofu bleibt ausgegraut (kein Datum nötig). Danach im Overlay „Verfügbar" → Zeile gelöscht, Tofu normal.

- [ ] **Step 5: Gesamt-Typecheck + alle Logik-Tests**

```bash
cd artifacts/api-server && npm run typecheck && node --experimental-strip-types src/lib/businessDay.test.ts
cd ../lys-terminal && npm run typecheck && node --experimental-strip-types src/lib/availability.test.ts
```
Erwartet: keine Typfehler, beide Testläufe „alle Tests grün".

---

## Self-Review (vom Plan-Autor durchgeführt)

**Spec-Abdeckung:**
- Mitarbeiter schalten selbst (kein IT/Deploy) → Task 9 (Overlay + Geste + PIN). ✅
- Alles Bestellbare (Gerichte/Getränke/Box-Basen/Soßen) → ID-Helfer (Task 4), Tasks 6/7/8, Overlay-Gruppen (Task 9). ✅
- Zentral über mehrere Geräte → Supabase (Task 1) + Provider-Polling (Task 5), E2E Task 10/Step 2. ✅
- „Heute aus" + Auto-Reset über Nacht → Geschäftstag-Logik (Tasks 2/4), E2E Task 10/Step 3. ✅
- „Dauerhaft aus" → Backend `sold_out_permanent` (Task 3), `isSoldOut` permanent (Task 4), E2E Task 10/Step 4. ✅ (UI-Button optional, siehe Hinweis Task 9.)
- Ausgrauen statt ausblenden → Tasks 6/7/8. ✅
- Sicherheit (PIN serverseitig, anon nur lesen) → Task 1 RLS, Task 3 `pinOk` + Rate-Limit. ✅

**Platzhalter-Scan:** keine TBD/TODO; alle Code-Schritte vollständig.

**Typ-Konsistenz:** `AvailabilityRow` (item_id/mode/sold_out_date) einheitlich in Tasks 3/4/5; `isItemSoldOut(availabilityId)` und `refetch` konsistent in Tasks 5–9; ID-Helfer-Namen (`dish/box/sauceAvailabilityId`) konsistent in Tasks 4/6/7/8/9; Action-Strings (`available`/`sold_out_today`/`sold_out_permanent`) identisch in Tasks 3/9.

**Offen (bewusst, klein gehalten):**
- `tr.soldOut`-Übersetzungen für Nicht-DE-Sprachen sinngemäß (Task 6/Step 3) — `de` ist verbindlich.
- „Dauerhaft aus" hat noch keinen eigenen UI-Button (Backend bereit).
