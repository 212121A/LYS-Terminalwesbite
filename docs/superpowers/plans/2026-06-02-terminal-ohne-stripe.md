# Terminal ohne Stripe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Terminal-Bestellungen direkt und atomar in die Küchen-DB schreiben — ohne Stripe, ohne n8n. Zahlung an der Kasse über bestehende Küchen-Logik.

**Architecture:** Neue Express-Route `POST /api/order` im `@workspace/api-server` ruft die bereits existierende Postgres-Funktion `public.create_order(items jsonb, source text)` über den vorhandenen `getPool()` aus `@workspace/db` auf. Das Terminal-Frontend (`PaymentModal.tsx`) ruft statt Stripe-Checkout diese Route und zeigt die zurückgegebene Bestellnummer an („Bestellung #X — bitte an der Kasse zahlen"). Stripe-Code/Routen/Webhook bleiben unangetastet (Rollback = Frontend-Diff zurückrollen).

**Tech Stack:** Node 22 / Express 5 (`artifacts/api-server`, ESM-Build via esbuild auf Vercel), `pg` Pool aus `lib/db/src/index.ts` (Drizzle nicht nötig — Raw-SQL via `pool.query`), Vite/React 18 + Tailwind (`artifacts/lys-terminal`), pnpm-Workspaces, `express-rate-limit`.

**Spec:** `docs/superpowers/specs/2026-06-02-terminal-ohne-stripe-design.md`
**Handoff:** `docs/superpowers/specs/2026-06-02-terminal-ohne-stripe-HANDOFF.md`

**Was bereits in der DB existiert (Order-DB `jandskwzlzyjsvpmdhls`, NICHT mehr anlegen):**

```sql
public.create_order(
  p_items jsonb,
  p_source text default 'terminal',
  p_payment_status text default null,
  p_stripe_session_id text default null,
  p_customer_name text default '',
  p_phone text default ''
) returns table(order_number integer, order_id uuid)
```

RLS auf `orders`/`order_counter` ist AN, 0 Policies — Insert läuft nur über die in `DATABASE_URL` konfigurierte Service-/Postgres-Rolle (heute schon der Fall für `stripe_orders`-Insert in `webhookHandlers.ts`).

**No-Test-Disziplin (begründet):** Das Repo hat keine Test-Suite und kein Vitest-Setup (verifiziert: `find . -name "*.test.ts"` leer, `package.json` ohne Test-Skript). Eine Test-Infrastruktur nur für diese eine Route aufzubauen wäre Over-Engineering. Verifikation läuft daher über **konkrete cURL-Calls gegen den lokal laufenden api-server** und eine **DB-Spot-Check-Query** — exakt das, was die Spec unter „Verifikation" verlangt.

---

## File Structure

**Neu:**
- `artifacts/api-server/src/routes/order.ts` — neue Route `POST /api/order` (Rate-Limit + Validation + RPC-Call)

**Geändert:**
- `artifacts/api-server/src/routes/index.ts` — Router-Registrierung
- `artifacts/lys-terminal/src/components/PaymentModal.tsx` — Bestellen-Pfad: `POST /api/order` statt Stripe-Checkout + Bestätigungsanzeige
- `artifacts/lys-terminal/src/pages/Terminal.tsx` — neue Prop `onOrderPlaced` an `PaymentModal` reichen → ruft `clearCart()`
- `artifacts/lys-terminal/src/i18n/translations.ts` — neue Übersetzungs-Keys `orderConfirmTitle(n: number)` und `orderConfirmSubtitle` für alle 21 Sprachen

**Bewusst unangetastet (Rollback):**
- `artifacts/api-server/src/routes/checkout.ts`, `webhookHandlers.ts`, `stripeClient.ts`, `app.ts` (Webhook-Mount)
- `lib/db/src/schema/stripe_orders.ts`

---

## Task 1: Backend — Neue Route `POST /api/order`

**Files:**
- Create: `artifacts/api-server/src/routes/order.ts`

- [ ] **Step 1: Datei `artifacts/api-server/src/routes/order.ts` anlegen**

```ts
import { type Request, type Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getPool, isDatabaseConfigured } from '@workspace/db';

const router = Router();

/** Analog `checkoutSessionLimiter` in routes/checkout.ts (20 req/min/IP). */
const orderLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte kurz.' },
});

type OrderItem = {
  id?: string;
  name: string;
  price: number;
  quantity: number;
};

function isValidItem(x: unknown): x is OrderItem {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.name === 'string' &&
    o.name.length > 0 &&
    typeof o.price === 'number' &&
    Number.isFinite(o.price) &&
    o.price >= 0 &&
    typeof o.quantity === 'number' &&
    Number.isInteger(o.quantity) &&
    o.quantity > 0 &&
    (o.id === undefined || typeof o.id === 'string')
  );
}

async function createOrderHandler(req: Request, res: Response) {
  const body = req.body as { items?: unknown };
  const items = Array.isArray(body?.items) ? body.items : [];

  if (items.length === 0 || !items.every(isValidItem)) {
    return res.status(400).json({ error: 'No items provided' });
  }

  if (!isDatabaseConfigured()) {
    return res.status(500).json({
      error:
        'DATABASE_URL fehlt auf dem Server. In Vercel Environment Variables setzen und Redeploy.',
    });
  }

  try {
    const pool = getPool();
    const result = await pool.query<{ order_number: number; order_id: string }>(
      'select order_number, order_id from public.create_order($1::jsonb, $2::text)',
      [JSON.stringify(items), 'terminal'],
    );

    const row = result.rows[0];
    if (!row || typeof row.order_number !== 'number') {
      return res.status(500).json({
        error: 'create_order hat keine Bestellnummer zurückgegeben.',
      });
    }

    return res.json({ order_number: row.order_number, order_id: row.order_id });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Bestellung konnte nicht angelegt werden.';
    req.log?.error?.({ err }, 'create_order failed');
    return res.status(500).json({ error: message });
  }
}

router.post('/order', orderLimiter, createOrderHandler);

export default router;
```

- [ ] **Step 2: Verifizieren, dass `getPool` + `isDatabaseConfigured` aus `@workspace/db` reexportiert sind**

Run: `grep -n "getPool\|isDatabaseConfigured" lib/db/src/index.ts`
Expected: beide Exports sichtbar (Zeilen ~28 und ~45) — keine Änderung an `lib/db` nötig.

- [ ] **Step 3: Commit (noch ohne Routerregistrierung — Route ist isoliert testbar)**

```bash
git add artifacts/api-server/src/routes/order.ts
git commit -m "feat(api-server): add POST /api/order route hitting create_order RPC"
```

---

## Task 2: Backend — Route im Router registrieren

**Files:**
- Modify: `artifacts/api-server/src/routes/index.ts`

- [ ] **Step 1: Import + `router.use()` ergänzen**

Aktueller Inhalt:

```ts
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import checkoutRouter from "./checkout";

const router: IRouter = Router();

router.use(healthRouter);
router.use(checkoutRouter);

export default router;
```

Neuer Inhalt:

```ts
import { Router, type IRouter } from "express";
import healthRouter from "./health";
import checkoutRouter from "./checkout";
import orderRouter from "./order";

const router: IRouter = Router();

router.use(healthRouter);
router.use(checkoutRouter);
router.use(orderRouter);

export default router;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @workspace/api-server typecheck`
Expected: `tsc` ohne Fehler (Exit 0).

- [ ] **Step 3: Build**

Run: `pnpm --filter @workspace/api-server build`
Expected: `dist/index.mjs` aktualisiert, kein esbuild-Error.

- [ ] **Step 4: Commit**

```bash
git add artifacts/api-server/src/routes/index.ts
git commit -m "feat(api-server): register order route in main router"
```

---

## Task 3: Backend — Manueller Smoke-Test gegen lokalen Dev-Server

**Files:** (keine — reine Verifikation)

- [ ] **Step 1: `.env` mit `DATABASE_URL` der Order-DB `jandskwzlzyjsvpmdhls` vorbereiten**

Run: `grep -l "DATABASE_URL" .env .env.local 2>/dev/null`
Erwartung: mindestens eine Datei enthält `DATABASE_URL=postgresql://…@db.jandskwzlzyjsvpmdhls.supabase.co:5432/postgres`.
Falls nicht: aus `.env.example` Zeile 30 ableiten und in `.env.local` setzen. **Nie committen.**

- [ ] **Step 2: api-server lokal starten**

Run: `pnpm --filter @workspace/api-server dev`
Expected: Pino-Log „server listening" auf Port 3000 (oder dem im `index.ts` definierten Port).

- [ ] **Step 3: cURL-Smoke — leerer Body → 400**

Run:
```bash
curl -s -o /dev/stderr -w "%{http_code}\n" \
  -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"items":[]}'
```
Expected: HTTP `400`, Body `{"error":"No items provided"}`.

- [ ] **Step 4: cURL-Smoke — gültige Order → 200 + Bestellnummer**

Run:
```bash
curl -s -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"smoke-1","name":"Smoke Test Box","price":9.90,"quantity":1}]}'
```
Expected: JSON `{"order_number":<int 1..100>,"order_id":"<uuid>"}`. Bestellnummer ist die nächste nach `order_counter.current_number` (Stand Handoff: 57).

- [ ] **Step 5: DB-Spot-Check — Order existiert mit `source=terminal`**

Run (Supabase MCP Tool `execute_sql` auf Projekt `jandskwzlzyjsvpmdhls`):
```sql
select order_number, source, status, items
from public.orders
where id = '<order_id aus Step 4>';
```
Expected: 1 Zeile, `source='terminal'`, `status='neu'` (oder dem Default der RPC), `items` enthält den Smoke-Eintrag.

- [ ] **Step 6: Parallel-Test — Eindeutige Nummern**

Run:
```bash
for i in $(seq 1 10); do
  curl -s -X POST http://localhost:3000/api/order \
    -H "Content-Type: application/json" \
    -d '{"items":[{"name":"Parallel '"$i"'","price":1.00,"quantity":1}]}' &
done
wait
```
Erwartung-Check (Supabase MCP):
```sql
select count(*), count(distinct order_number)
from public.orders
where source = 'terminal'
  and created_at > now() - interval '2 minutes';
```
Expected: `count = count(distinct order_number)` (keine Duplikate). Schon vom Nutzer mit 30 parallel verifiziert — dieser Step ist Regressions-Check.

- [ ] **Step 7: Smoke-Orders aufräumen (optional, sonst belegen sie Nummern)**

Run (Supabase MCP):
```sql
delete from public.orders
where source = 'terminal'
  and (items::text like '%Smoke Test Box%' or items::text like '%Parallel %');
```

- [ ] **Step 8: Kein Commit nötig (reine Verifikation).**

---

## Task 4: Frontend — i18n-Keys für die Bestellbestätigung

**Files:**
- Modify: `artifacts/lys-terminal/src/i18n/translations.ts`

- [ ] **Step 1: Interface `Translations` erweitern**

In `translations.ts` Zeile 37–66 (Interface-Definition), nach `cancelBanner: string;` (Zeile 57) folgende Zeilen einfügen:

```ts
  orderConfirmTitle: (n: number) => string;
  orderConfirmSubtitle: string;
  orderConfirmClose: string;
  orderFailedTitle: string;
```

- [ ] **Step 2: Für jede der 21 Sprachen die vier Keys ergänzen**

Direkt **nach** dem jeweiligen `cancelBanner`-Eintrag im Sprach-Block einfügen. Beispiel `de` (Block beginnt bei Zeile 69, `cancelBanner` Zeile 89):

```ts
    orderConfirmTitle: (n) => `Bestellung #${n}`,
    orderConfirmSubtitle: "Bitte an der Kasse zahlen.",
    orderConfirmClose: "Fertig",
    orderFailedTitle: "Bestellung konnte nicht angelegt werden",
```

Übersetzungen für alle Sprachen (in der Reihenfolge wie im File):

| Code | Title-Template | Subtitle | Close | FailedTitle |
|---|---|---|---|---|
| `de` | `Bestellung #${n}` | `Bitte an der Kasse zahlen.` | `Fertig` | `Bestellung konnte nicht angelegt werden` |
| `vi` | `Đơn hàng #${n}` | `Vui lòng thanh toán tại quầy.` | `Xong` | `Không thể tạo đơn hàng` |
| `en` | `Order #${n}` | `Please pay at the counter.` | `Done` | `Could not place order` |
| `fr` | `Commande n° ${n}` | `Veuillez régler à la caisse.` | `Terminé` | `Impossible de créer la commande` |
| `es` | `Pedido n.º ${n}` | `Pague en la caja, por favor.` | `Listo` | `No se pudo crear el pedido` |
| `it` | `Ordine n. ${n}` | `Si prega di pagare alla cassa.` | `Fatto` | `Impossibile creare l'ordine` |
| `pt` | `Pedido n.º ${n}` | `Pague no balcão, por favor.` | `Concluído` | `Não foi possível criar o pedido` |
| `pl` | `Zamówienie nr ${n}` | `Prosimy o zapłatę przy kasie.` | `Gotowe` | `Nie udało się złożyć zamówienia` |
| `ru` | `Заказ №${n}` | `Пожалуйста, оплатите на кассе.` | `Готово` | `Не удалось создать заказ` |
| `tr` | `Sipariş #${n}` | `Lütfen kasada ödeyin.` | `Tamam` | `Sipariş oluşturulamadı` |
| `ar` | `طلب رقم ${n}` | `يرجى الدفع عند الصندوق.` | `تم` | `تعذّر إنشاء الطلب` |
| `zh` | `订单 #${n}` | `请到收银台付款。` | `完成` | `无法创建订单` |
| `ja` | `注文 #${n}` | `レジでお支払いください。` | `完了` | `注文を作成できませんでした` |
| `ko` | `주문 #${n}` | `카운터에서 결제해 주세요.` | `완료` | `주문을 생성할 수 없습니다` |
| `nl` | `Bestelling #${n}` | `Betaal alstublieft aan de kassa.` | `Klaar` | `Bestelling kon niet worden geplaatst` |
| `ro` | `Comanda nr. ${n}` | `Vă rugăm să plătiți la casă.` | `Gata` | `Comanda nu a putut fi creată` |
| `hu` | `Rendelés #${n}` | `Kérjük, fizessen a pénztárnál.` | `Kész` | `Nem sikerült létrehozni a rendelést` |
| `cs` | `Objednávka č. ${n}` | `Zaplaťte prosím u pokladny.` | `Hotovo` | `Objednávku se nepodařilo vytvořit` |
| `el` | `Παραγγελία #${n}` | `Παρακαλώ πληρώστε στο ταμείο.` | `Έτοιμο` | `Η παραγγελία δεν δημιουργήθηκε` |
| `hi` | `ऑर्डर #${n}` | `कृपया काउंटर पर भुगतान करें।` | `पूर्ण` | `ऑर्डर नहीं बनाया जा सका` |
| `uk` | `Замовлення №${n}` | `Будь ласка, сплатіть на касі.` | `Готово` | `Не вдалося створити замовлення` |

Code-Block-Form (für jeden Block ist die Einfügung syntaktisch identisch — nur die Strings ändern sich). Beispiel für `en` (nach `cancelBanner`):

```ts
    orderConfirmTitle: (n) => `Order #${n}`,
    orderConfirmSubtitle: "Please pay at the counter.",
    orderConfirmClose: "Done",
    orderFailedTitle: "Could not place order",
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @workspace/lys-terminal typecheck`
Expected: `tsc` ohne Fehler. Falls eine Sprache fehlt, meldet TS: „Property 'orderConfirmTitle' is missing in type … but required in type 'Translations'." — dann die fehlende Sprache nachtragen.

- [ ] **Step 4: Commit**

```bash
git add artifacts/lys-terminal/src/i18n/translations.ts
git commit -m "feat(terminal-i18n): add order confirmation strings for all 21 languages"
```

---

## Task 5: Frontend — `PaymentModal` auf `/api/order` umstellen

**Files:**
- Modify: `artifacts/lys-terminal/src/components/PaymentModal.tsx`

Diese Änderung ersetzt den Stripe-Aufruf vollständig. Die drei Payment-Buttons (PayPal / EC-Karte / Apple Pay) bleiben — sie sind Auswahl-Hinweis für den Kassierer und werden mit der Bestellung nicht mehr an Stripe geschickt. Der Klick auf „Sicher zahlen" startet jetzt die Bestellung in der Küchen-DB und zeigt die Bestellnummer an.

- [ ] **Step 1: Datei komplett ersetzen**

Schreibe den **kompletten** neuen Datei-Inhalt (überschreibt `artifacts/lys-terminal/src/components/PaymentModal.tsx`):

```tsx
import { useState } from "react";
import { X, CreditCard, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { CartItem } from "@/store/cart";
import { useLang } from "@/i18n/LanguageContext";

interface PaymentModalProps {
  items: CartItem[];
  total: number;
  onClose: () => void;
  onOrderPlaced: (orderNumber: number) => void;
}

type PaymentMethod = "paypal" | "eckarte" | "applepay" | null;

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",") + " €";
}

/** Apple logo (silhouette, currentColor) — beside "Apple Pay" label */
function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 384 512"
      aria-hidden
      focusable="false"
      fill="currentColor"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6 0 91.4-87.5 107.2-125.2 0 0-84.1-35.7-84.1-147.1zm-30.4-211.6c21.3-26.1 35.7-63.1 31.7-100.1-30.5.1-62.1 20.5-81.9 46.5-19.7 25.1-35.7 63.1-31.2 99.9 32.6.1 64.6-19.5 85.4-46.3z" />
    </svg>
  );
}

function resolveApiUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const rel = path.replace(/^\//, "");
  return new URL(rel, `${window.location.origin}${base.endsWith("/") ? base : `${base}/`}`).href;
}

/** Wie LYS Website: optional absolute API-Root (VITE_API_BASE_URL), sonst gleiche Origin wie die App. */
function orderUrl(): string {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  if (apiBase) return `${apiBase}/api/order`;
  return resolveApiUrl("/api/order");
}

/** Verhindert „endloses" Laden, wenn API/Netzwerk nicht antwortet (z. B. langsamer Cold Start). */
async function fetchWithTimeout(
  input: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const ac = new AbortController();
  const t = window.setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ac.signal });
  } catch (e: unknown) {
    const aborted =
      (e instanceof DOMException && e.name === "AbortError") ||
      (e instanceof Error && e.name === "AbortError");
    if (aborted) {
      throw new Error(
        `Zeitüberschreitung nach ${Math.round(timeoutMs / 1000)}s: Server antwortet nicht.`,
      );
    }
    throw e;
  } finally {
    window.clearTimeout(t);
  }
}

async function placeOrder(items: CartItem[]): Promise<number> {
  const lineItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const response = await fetchWithTimeout(
    orderUrl(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lineItems }),
    },
    30_000,
  );

  const raw = await response.text();
  let data: { order_number?: number; error?: string };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error(
      raw?.trim()
        ? raw.slice(0, 400)
        : `Bestellung fehlgeschlagen (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(data.error || `Bestellung fehlgeschlagen (HTTP ${response.status}).`);
  }

  if (typeof data.order_number !== "number") {
    throw new Error("Keine Bestellnummer von der API erhalten.");
  }
  return data.order_number;
}

export function PaymentModal({ items, total, onClose, onOrderPlaced }: PaymentModalProps) {
  const { tr } = useLang();
  const [selected, setSelected] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  const handlePay = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const num = await placeOrder(items);
      setOrderNumber(num);
      onOrderPlaced(num);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center text-center px-8">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-8">
          <Loader2 size={38} className="text-primary animate-spin" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-3xl font-semibold text-foreground mb-3">
          {tr.placeOrder}…
        </h2>
        <p className="text-muted-foreground text-[15px]">
          {tr.redirectingSubtitle}
        </p>
      </div>
    );
  }

  if (orderNumber !== null) {
    return (
      <div
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center text-center px-8"
        data-testid="order-confirmation"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
          <CheckCircle size={42} className="text-primary" strokeWidth={1.5} />
        </div>
        <h2
          className="font-serif text-4xl font-semibold text-foreground mb-3"
          data-testid="text-order-number"
        >
          {tr.orderConfirmTitle(orderNumber)}
        </h2>
        <p className="text-muted-foreground text-[17px] mb-10">
          {tr.orderConfirmSubtitle}
        </p>
        <button
          data-testid="button-order-close"
          onClick={onClose}
          className="px-8 h-14 rounded-xl bg-primary text-primary-foreground text-[16px] font-semibold shadow-md active:scale-[0.98] transition-transform"
        >
          {tr.orderConfirmClose}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        data-testid="payment-modal"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="font-serif text-[24px] font-semibold text-foreground">{tr.paymentTitle}</h2>
            <p className="text-muted-foreground text-[13px] mt-0.5">{tr.paymentSubtitle}</p>
          </div>
          <button
            data-testid="button-close-payment"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-xl mb-5">
            <span className="text-[15px] text-muted-foreground font-medium">{tr.totalAmount}</span>
            <span
              data-testid="text-payment-total"
              className="text-[22px] font-semibold text-foreground tabular-nums"
            >
              {formatPrice(total)}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl mb-4 text-destructive text-[13px]">
              <AlertCircle size={16} />
              <span>{tr.orderFailedTitle}: {error}</span>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <button
              data-testid="button-pay-paypal"
              onClick={() => setSelected("paypal")}
              className={`w-full h-16 rounded-xl border-2 flex items-center justify-between px-5 transition-all duration-150 active:scale-[0.98] ${
                selected === "paypal"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selected === "paypal" ? "border-primary" : "border-muted-foreground/40"
                }`}>
                  {selected === "paypal" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="text-[19px] font-bold tracking-tight">
                  <span className="text-[#003087]">Pay</span><span className="text-[#009cde]">Pal</span>
                </span>
              </div>
            </button>

            <button
              data-testid="button-pay-eckarte"
              onClick={() => setSelected("eckarte")}
              className={`w-full h-16 rounded-xl border-2 flex items-center justify-between px-5 transition-all duration-150 active:scale-[0.98] ${
                selected === "eckarte"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selected === "eckarte" ? "border-primary" : "border-muted-foreground/40"
                }`}>
                  {selected === "eckarte" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={20} className="text-foreground" strokeWidth={1.5} />
                  <span className="text-[14px] font-semibold text-foreground">{tr.cardPayment}</span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <div className="min-w-[2rem] px-1 h-5 bg-[#003399] rounded text-white text-[7px] font-bold flex items-center justify-center">
                  EC
                </div>
                <div className="min-w-[2rem] px-1 h-5 bg-slate-700 rounded text-white text-[6px] font-bold flex items-center justify-center leading-tight">
                  Giro
                </div>
              </div>
            </button>

            <button
              data-testid="button-pay-applepay"
              onClick={() => setSelected("applepay")}
              className={`w-full h-16 rounded-xl border-2 flex items-center justify-between px-5 transition-all duration-150 active:scale-[0.98] ${
                selected === "applepay"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                  selected === "applepay" ? "border-primary" : "border-muted-foreground/40"
                }`}>
                  {selected === "applepay" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <AppleLogo className="w-[18px] h-[22px] shrink-0 text-foreground" />
                  <span className="text-[17px] font-semibold text-foreground tracking-tight leading-none">
                    {tr.applePayPayment}
                  </span>
                </div>
              </div>
            </button>
          </div>

          <button
            data-testid="button-confirm-payment"
            onClick={handlePay}
            disabled={!selected}
            className={`w-full h-14 rounded-xl text-[16px] font-semibold transition-all duration-150 mb-5 ${
              selected
                ? "bg-primary text-primary-foreground shadow-md active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {selected
              ? tr.paySecurely(formatPrice(total))
              : tr.selectPaymentMethod}
          </button>

          <p className="text-center text-[11px] text-muted-foreground pb-4">
            {tr.encryptedPayment}
            <span className="block mt-1 text-[9px] opacity-40 tabular-nums select-none" title="Build">
              {__APP_BUILD_ID__}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Hinweise zur Diff-Logik (was sich gegenüber dem alten File geändert hat):**
- `createCheckoutSession()` und alle Stripe-Error-Normalisierungs-Hilfsfunktionen (`PAYMENT_START_FAILED_DE`, `extractErrorText`, `compactPaymentStartFailureMatch`, `normalizePaymentError`, `stripeCreateCheckoutUrl`) **entfernt** — kein Stripe-Pfad mehr im Terminal.
- Neu: `placeOrder()`, `orderUrl()`, lokaler State `orderNumber`, dritte Render-Branch „Bestätigung".
- Neue Pflicht-Prop `onOrderPlaced(orderNumber)` — Aufrufer (Terminal.tsx) hängt darin `clearCart()` ein. **Wichtig:** `useCart()` aus `@/store/cart` ist ein lokaler `useState`-Hook, kein globaler Store — ein zweiter Aufruf in PaymentModal würde einen separaten leeren Cart erzeugen, deshalb läuft Cart-Reset über Callback (siehe Task 6).
- Der `payment=success`-useEffect-Branch in `Terminal.tsx` bleibt funktionslos liegen (kein Redirect mehr, also feuert er einfach nicht). Bewusst nicht angefasst, um den Diff minimal/rollback-freundlich zu halten.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @workspace/lys-terminal typecheck`
Expected: `tsc` ohne Fehler.

- [ ] **Step 3: Build**

Run: `pnpm --filter @workspace/lys-terminal build`
Expected: Vite-Build erfolgreich, `dist/` aktualisiert.

- [ ] **Step 4: Commit**

```bash
git add artifacts/lys-terminal/src/components/PaymentModal.tsx
git commit -m "feat(terminal): place orders directly via /api/order, drop Stripe checkout from kiosk"
```

---

## Task 6: Frontend — `Terminal.tsx` Callback durchreichen

**Files:**
- Modify: `artifacts/lys-terminal/src/pages/Terminal.tsx`

- [ ] **Step 1: Beide `<PaymentModal>`-Aufrufe um `onOrderPlaced` erweitern**

Aktuell gibt es nur einen Mount-Punkt für `<PaymentModal>` (Zeilen 232–238). Ersetze diesen Block:

```tsx
      {showPayment && (
        <PaymentModal
          items={items}
          total={total}
          onClose={() => setShowPayment(false)}
        />
      )}
```

durch:

```tsx
      {showPayment && (
        <PaymentModal
          items={items}
          total={total}
          onClose={() => setShowPayment(false)}
          onOrderPlaced={() => clearCart()}
        />
      )}
```

`clearCart` ist bereits im Scope (Destructuring aus `useCart()` auf Zeile 17).

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @workspace/lys-terminal typecheck`
Expected: `tsc` ohne Fehler (Pflicht-Prop ist jetzt gesetzt).

- [ ] **Step 3: Commit**

```bash
git add artifacts/lys-terminal/src/pages/Terminal.tsx
git commit -m "feat(terminal): wire clearCart into PaymentModal onOrderPlaced callback"
```

---

## Task 7: End-to-End-Verifikation lokal (api-server + Vite Dev parallel)

**Files:** (keine — reine Verifikation, exakt die Spec-Verifikationsschritte)

- [ ] **Step 1: Beide Dev-Server starten**

Run (Terminal A): `pnpm --filter @workspace/api-server dev`
Run (Terminal B): `pnpm --filter @workspace/lys-terminal dev`
Expected: Vite-Server startet (URL aus Console), api-server lauscht auf seinem Port. Falls Vite den api-server nicht proxyt: in Terminal B `VITE_API_BASE_URL=http://localhost:3000` als Env setzen.

- [ ] **Step 2: Browser — Happy Path**

Öffne die Vite-URL im Browser. Lege 2–3 Items in den Warenkorb, klicke „Bestellen" → Zahlungsart auswählen → „Sicher zahlen".
Expected: Loader → Bestätigungs-Screen mit „Bestellung #<n>" und „Bitte an der Kasse zahlen.". **Kein** Redirect zu `checkout.stripe.com`. Cart ist leer nach Schließen.

- [ ] **Step 3: Browser — Fehlerpfad (api-server gestoppt)**

Stoppe `api-server` (Strg+C in Terminal A). Lege wieder einen Artikel in den Cart, klicke „Sicher zahlen".
Expected: Error-Banner „Bestellung konnte nicht angelegt werden: …" (oder Timeout-Meldung). Kein Crash. Modal bleibt geöffnet.

- [ ] **Step 4: DB-Spot-Check — Order ist da, `source=terminal`**

Run (Supabase MCP `execute_sql` auf Projekt `jandskwzlzyjsvpmdhls`):
```sql
select order_number, source, status, created_at
from public.orders
where source = 'terminal'
order by created_at desc
limit 5;
```
Expected: die Test-Order(s) aus Step 2 mit `source='terminal'` und korrekter Bestellnummer.

- [ ] **Step 5: Küchen-Dashboard / Health-Hub Sichtprüfung (falls verfügbar)**

Wenn lokales/Staging-Küchen-Dashboard erreichbar: Order erscheint dort als „terminal"-Channel mit Status „neu". (Spec: Realtime via Supabase.)

- [ ] **Step 6: Smoke-Orders aufräumen**

Run (Supabase MCP):
```sql
delete from public.orders
where source = 'terminal'
  and created_at > now() - interval '30 minutes';
```

- [ ] **Step 7: Rollback-Test trocken**

Run: `git revert --no-commit <commit-hash von Task 5 Step 4> <commit-hash von Task 6 Step 3>` (nur lokal testen, danach `git reset HEAD --` und Working-Tree säubern). Bestätigt, dass der Rollback zwei Revert-Commits sind (PaymentModal + Terminal-Glue).

- [ ] **Step 8: Kein Commit nötig.**

---

## Task 8: Staging-Rollout (Vercel Preview)

**Files:** (keine — Deploy)

- [ ] **Step 1: PR öffnen (Branch ist `claude/sad-johnson-7a6f1d`)**

Run:
```bash
git push -u origin claude/sad-johnson-7a6f1d
gh pr create --title "feat: Terminal-Bestellungen direkt in Küchen-DB (ohne Stripe)" --body "$(cat <<'EOF'
## Summary
- Neue Route `POST /api/order` (api-server) ruft atomar `public.create_order(items, 'terminal')` auf
- Terminal-Kiosk geht statt zu Stripe direkt auf `/api/order` und zeigt „Bestellung #X — bitte an der Kasse zahlen"
- Stripe-Route, Webhook, Client bleiben unverändert (Rollback = diesen PR revert-en)

## Test plan
- [ ] Vercel-Preview-URL: Bestellung erscheint in Küche mit `source=terminal`
- [ ] Mehrere parallel: eindeutige Nummern
- [ ] api-server down: deutsche Fehlermeldung im Kiosk, kein Crash
- [ ] Rollback: `git revert` auf den PaymentModal-Commit, alles zurück auf Stripe

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: PR-URL erscheint, Vercel-Bot kommentiert Preview-Deployment-Links für api-server und lys-terminal.

- [ ] **Step 2: Vercel-Env-Variable `DATABASE_URL` prüfen**

In Vercel-Dashboard → Project `api-server` → Settings → Environment Variables: `DATABASE_URL` muss für Preview gesetzt sein. Falls nur Production gesetzt: Variable auf Preview erweitern, Redeploy auslösen.

- [ ] **Step 3: Auf der Preview-URL die E2E-Schritte aus Task 6 Steps 2–4 wiederholen.**

- [ ] **Step 4: Production-Merge erst nach explizitem Go vom Nutzer.**

Run (nach Freigabe): `gh pr merge --squash` (oder im UI, je nach Nutzerpräferenz).

---

## Was bewusst NICHT im Plan ist (YAGNI)

- **Stripe-Code löschen / DB-Tabelle `stripe_orders` droppen** — bleibt liegen als Rollback-Pfad, wie in der Spec gefordert.
- **Frontend-Tests / Vitest-Setup** — Repo hat keine Test-Infrastruktur; eine einzurichten nur für diese Route ist Over-Engineering. Verifikation läuft über die konkreten cURL/Browser-Schritte in Task 3 + Task 6.
- **Zahlungsart in der DB speichern** — die User-Auswahl (PayPal/EC/Apple Pay) ist nur ein Hinweis für den Kassierer am Terminal; sie wird nicht an `create_order` übergeben. Falls später gewünscht: zusätzliches Feld an RPC + Schemafeld auf `orders`.
- **n8n abklemmen / Voice-Pfad ändern** — explizit out-of-scope (Voice behält n8n).
