# Terminal ohne Stripe — Direkte Bestellannahme

**Datum:** 2026-06-02
**Status:** Design freigegeben (Brainstorming)

## Kontext

Das Terminal (Kiosk, `lys-terminal-bestellseite`) leitet Bestellungen aktuell
über **Stripe-Checkout** (Online-Kartenzahlung) → Stripe-Webhook → **n8n** erzeugt
die Küchen-Order. Das passt nicht zum Betrieb: am Terminal wählt der Kunde Artikel,
bestellt und **zahlt an der Kasse** — keine Online-Zahlung nötig.

Folgen des heutigen Wegs:
- Stripe + n8n sind im Terminal-Pfad unnötiger Aufwand.
- n8n ist der **Concurrency-Flaschenhals** (Lasttest: bei ~20 gleichzeitigen
  Bestellungen ~80 % abgewiesen).

Website (eigenes Repo) behält Stripe; Voice-Agent behält n8n (AI-Parsing, geringe
Gleichzeitigkeit).

## Ziel

Terminal-Bestellungen **direkt und atomar** in die Küchen-DB schreiben — ohne
Stripe, ohne n8n. Zahlung an der Kasse über die bestehende Küchen-Logik.
Änderung **minimal und reversibel**.

## Voraussetzung (bereits erledigt)

Postgres-Funktion in der Order-DB (`jandskwzlzyjsvpmdhls`):

```sql
create_order(p_items jsonb, p_source text default 'terminal',
             p_payment_status text default null, p_stripe_session_id text default null,
             p_customer_name text default '', p_phone text default '')
returns table(order_number integer, order_id uuid)
```

Vergibt die Bestellnummer **atomar** (`next_order_number()`, Race-Condition-frei),
fügt die Order ein, setzt `source` explizit, gibt Nummer + ID zurück. Getestet.

## Design (Ansatz A — api-server + bestehende DB-Verbindung)

1. **Neue Route `POST /api/order`** im Terminal-`api-server` (Express):
   - Body: `{ items: Array<{ id?, name, price, quantity }> }` (gleiche Item-Form
     wie der heutige Checkout).
   - Validierung: `items` nicht leer (400 sonst). Rate-Limiter analog
     `checkoutSessionLimiter` (20/min).
   - Ruft `create_order` über die **bestehende** `getDb`-Verbindung auf:
     `select * from create_order($items::jsonb, 'terminal')`.
   - Antwort: `{ order_number }` (optional `order_id`).
   - DB-Fehler → 500 mit Klartext-Meldung.
2. **Frontend „Bestellen"**: statt `POST /api/stripe/create-checkout-session` +
   Stripe-Redirect → `POST /api/order` → Bestätigungsanzeige
   **„Bestellung #X — bitte an der Kasse zahlen"**. Kein Redirect.
3. **Stripe bleibt unverändert/inaktiv** (Checkout-Routen, Webhook-Handler,
   Stripe-Client). Rollback = Frontend wieder auf den Checkout zeigen.

## Datenfluss (neu)

Kiosk „Bestellen" → `POST /api/order` (api-server) → `create_order()` (Postgres,
atomar) → Zeile in `orders` (`source=terminal`, `status=neu`) → Küchen-Dashboard
zeigt sie sofort (Supabase-Realtime). Bestellnummer geht **synchron** ans Kiosk
zurück.

## Was sich NICHT ändert

- Website (eigenes Repo), Voice-Agent (n8n).
- Bezahl-/Status-Logik der Küche: `neu` = „Nicht bezahlt", `in_zubereitung` =
  „Bezahlt" (Kassierer kassiert → Personal schiebt die Karte).
- Stripe-`stripe_orders`-Aufzeichnung bleibt im Code; feuert fürs Terminal nur
  nicht mehr (keine Terminal-Stripe-Sessions mehr).

## Fehlerfälle

- Leere `items` → 400.
- DB/Funktion nicht erreichbar → 500; Kiosk zeigt „Bestellung konnte nicht
  angelegt werden — bitte erneut versuchen / an der Kasse melden".
- Keine doppelten Nummern (atomarer Counter, verifiziert: 30 parallel → eindeutig).

## Rollback

Frontend-„Bestellen" wieder auf `/api/stripe/create-checkout-session` zeigen →
exakt der heutige Zustand. `create_order` bleibt additiv liegen. n8n/Stripe-Pfad
unangetastet.

## Verifikation

- Staging/lokal: „Bestellen" → Order erscheint in der Küche mit `source=terminal`,
  korrekte Nummer, **kein** Stripe-Redirect.
- Parallel-Test (mehrere gleichzeitig) → eindeutige Nummern.
- Fallback testen (Frontend zurück auf Stripe).
- Gestaffelt ausrollen: erst ein Terminal/Staging, dann live; n8n/Stripe als
  Fallback bleibt aktiv.

## Annahmen

- `api-server` `DATABASE_URL` verbindet als Rolle mit RLS-Bypass (wie heute beim
  `stripe_orders`-Insert), sodass `create_order` darüber läuft.
- Die genaue Frontend-Datei für „Bestellen" wird im Implementierungsplan
  lokalisiert.
