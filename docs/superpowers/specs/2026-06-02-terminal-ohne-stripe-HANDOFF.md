# Handoff für nächste Session — Implementierung „Terminal ohne Stripe"

**Datum:** 2026-06-02
**Nächster Schritt:** Implementierungsplan (writing-plans-Skill) → umsetzen.
**Design freigegeben.** Spec: `docs/superpowers/specs/2026-06-02-terminal-ohne-stripe-design.md`

---

## Ziel der nächsten Session
Terminal-Bestellungen **direkt** in die Küchen-DB schreiben (ohne Stripe, ohne n8n),
Zahlung an der Kasse. Minimal + reversibel. Website + Voice bleiben unverändert.

## Was bereits ERLEDIGT ist (nicht nochmal bauen)
- ✅ **`public.create_order(p_items jsonb, p_source text default 'terminal', p_payment_status, p_stripe_session_id, p_customer_name, p_phone)`**
  in der Order-DB `jandskwzlzyjsvpmdhls` — vergibt Nummer **atomar**, fügt Order ein,
  setzt `source` explizit, gibt `{order_number, order_id}` zurück. Getestet.
- ✅ **`public.next_order_number()`** — atomarer Zähler (Race-Condition behoben + verifiziert: 30 parallel → eindeutig).
- ✅ n8n-BNR-Pfad ruft den atomaren RPC bereits auf (vom Nutzer im n8n-Editor umgestellt).
- ✅ Hub-Kanal-Klassifizierung terminal/voice/website per Items-Format (`ORDER_CHANNEL_SQL` im Hub) — gefixt.
- ℹ️ `order_counter` (Tabelle, id=1, `current_number`, zyklisch 1–100) steht auf **57**.

## Was zu IMPLEMENTIEREN ist
1. **Terminal-api-server: neue Route `POST /api/order`** (Express)
   - Body `{ items: Array<{id?, name, price, quantity}> }`; leer → 400; Rate-Limiter wie `checkoutSessionLimiter` (20/min).
   - Ruft via bestehender `getDb`-Verbindung: `select * from create_order($items::jsonb, 'terminal')`.
   - Antwort `{ order_number }`. DB-Fehler → 500 mit Klartext.
   - Muster/Registrierung: `artifacts/api-server/src/routes/checkout.ts` (Vorlage) + Route in `artifacts/api-server/src/app.ts` registrieren.
2. **Terminal-Frontend „Bestellen"**
   - Statt `POST /api/stripe/create-checkout-session` + Stripe-Redirect → `POST /api/order`.
   - Bestätigung anzeigen: **„Bestellung #X — bitte an der Kasse zahlen"** (kein Redirect).
   - Frontend-Datei für den „Bestellen"-Button noch lokalisieren (Plan-Schritt).
3. **Stripe NICHT entfernen** — Checkout-Route/Webhook/Client bleiben inaktiv liegen (Rollback = Frontend wieder auf Stripe).

## Zu VERIFIZIEREN im Plan
- `api-server` `DATABASE_URL` verbindet mit RLS-Bypass-Rolle (wie heute beim `stripe_orders`-Insert) → `create_order` läuft darüber. (RLS auf `orders`/`order_counter` ist AN, 0 Policies → nur service_role/postgres dürfen schreiben.)

## Test / Rollout
- Staging/lokal: „Bestellen" → Order in Küche mit `source=terminal`, korrekte Nummer, kein Stripe-Redirect.
- Mehrere gleichzeitig → eindeutige Nummern.
- Gestaffelt: erst Staging/ein Terminal, dann live. n8n/Stripe bleibt als Fallback.
- Rollback getestet (Frontend zurück auf Stripe).

## Wichtige Pfade / IDs
- Terminal-Repo: `/Users/alex/revenueflowsystems/Kunden/LYS/LYS-Terminal-Bestellseite`
- api-server: `artifacts/api-server/src/` (`checkout.ts`, `webhookHandlers.ts`, `app.ts`, `stripeClient.ts`)
- Order-DB (Supabase): `jandskwzlzyjsvpmdhls` · RPC: `POST /rest/v1/rpc/create_order`
- n8n-Workflow (Voice bleibt): `DSOzo9VXO9zzsAlZ` (Base `https://feal.app.n8n.cloud/`)
- Health-Hub (separat, schon live, dunkles „Control Room"-Design): `lys-health-hub.vercel.app`

## Git-Regeln (Nutzer)
- **Keine Commits ohne explizite Freigabe.** Nie direkt auf `main` — immer Branch + PR.
- Spec + dieses Handoff sind **noch nicht committet**.

## Gesamt-Kontext (Stand dieser Session)
- Health-Hub: Redesign live (warm-dunkel, Fraunces/Hanken), Mobile-Fixes (kein Zoom/Swipe), Incidents nach Projekt sortiert, Orbit-Detail mit Pfeilen, Digest stündlich 10–23 Uhr inkl. n8n-Zeile (`X/10.000 Exec`).
- Monitore grün; Küchen-Heartbeat aktiv; Race-Condition gefixt + per Lasttest bestätigt (50 sequ-Orders 50/50 ok, 30 parallel eindeutig).
- **Produktionsreife für HOHES Volumen:** Terminal-ohne-Stripe (diese Aufgabe) ist der Concurrency-Fix für Terminal. Offen danach: Website-Pfad (Stripe→n8n) ebenfalls entkoppeln, Reconcile „bezahlt→Essen" scharf (braucht Stripe-Restricted-Key), Webhook-Last-Monitor im Hub.
