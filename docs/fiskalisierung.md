# Fiskalisierung des LYS-Terminals (KassenSichV)

> Kartenzahlung direkt am Kiosk (Stripe Terminal) mit fiskaly Cloud-TSE,
> digitalem QR-Beleg (§6 KassenSichV) und DSFinV-K-Tagesabschluss.
> Stand: 2026-07-06.

## Die zwei Bezahlwege

| | An der Kasse (bestehend) | Karte am Terminal (neu) |
|---|---|---|
| Zahlung | orderbird-Kasse (eigene TSE) | Stripe Terminal Reader am Kiosk |
| Fiskalisierung | orderbird | **fiskaly Cloud-TSE (dieses Repo)** |
| Flow | Frontend → n8n direkt (`payment_status: unpaid`) | Frontend → `/api/terminal/*` → TSE + Stripe + n8n (`paid`) |
| Beleg | orderbird | QR auf Success-Seite → `/beleg/:id` |

⚠️ **Niemals** eine am Terminal bezahlte Bestellung zusätzlich in orderbird
eintippen — das wäre doppelt fiskalisierter Umsatz.

## Ablauf Kartenzahlung (server-driven, Polling)

```
PaymentModal („Jetzt mit Karte zahlen")
  → POST /api/terminal/checkout        Zeile fiscal_transactions (created)
                                       → TSE tx ACTIVE (fiskaly SIGN DE)
                                       → Stripe PaymentIntent (card_present)
                                       → Reader zeigt Betrag
  → GET  /api/terminal/status/:id      alle 1,5 s; bei succeeded:
     atomarer Claim waiting_payment→finalizing (genau EIN Finalizer)
                                       → TSE FINISH (RECEIPT, USt 7/19)
                                       → n8n order_made (payment_status: paid)
  → /success?order_no=…&receipt_id=…   QR → /beleg/:id (Pflichtangaben + TSE-QR)
  → POST /api/terminal/cancel/:id      Abbrechen: Reader + PI canceln,
                                       TSE tx als CANCELLATION beenden
```

### Zustände `fiscal_transactions.state`

`created → waiting_payment → finalizing → completed`
Abzweige: `canceled` (Abbruch/Reader busy), `payment_failed` (PI canceled),
`tse_error` (TSE-Ausfall — Zahlung ggf. trotzdem durch, siehe unten).

### Fehler-Semantik (bewusst so gebaut)

- **fiskaly down beim Checkout** → Kartenzahlung wird abgelehnt („bitte an der
  Kasse zahlen"). orderbird ist der konforme Fallback. Kein unsignierter Umsatz.
- **TSE-Ausfall NACH erfolgreicher Zahlung** → Bestellung geht trotzdem zur
  Küche (Kunde hat bezahlt), Zeile = `tse_error`, Beleg weist den Ausfall aus.
  **Pflicht:** Ausfallzeitraum + Grund dokumentieren (formlos, fürs Finanzamt)
  und bei längerem Ausfall Kartenzahlung am Terminal deaktivieren.
- **n8n down nach Zahlung** → Signatur bleibt, `n8n_posted=false`; der nächtliche
  Cron postet nach. Küche sieht die Zahlung notfalls im Stripe-Dashboard.
- **Kiosk stirbt mitten im Vorgang** → Sweeper (Cron) bricht Reader-Action, PI
  und TSE-Transaktion ab. Bezahlte-aber-nie-finalisierte Vorgänge werden als
  `tse_error` markiert und geloggt → manuell prüfen (Kunde zahlte, Küche weiß nichts!).

## Täglicher Cron (`/api/fiscal/closing`, 02:30 UTC)

Auth: `Authorization: Bearer $CRON_SECRET` (Vercel setzt das automatisch).
1. **Sweeper** — Vorgänge >30 min in `created`/`waiting_payment` abräumen +
   verwaiste ACTIVE-Transaktionen direkt auf der TSS beenden.
2. **n8n-Retry** für `n8n_posted=false`.
3. **DSFinV-K-Closing** des Vortags (Berlin-Geschäftstag, Tageswechsel 04:00);
   Closing-UUID deterministisch aus dem Datum → Wiederholung erzeugt kein Duplikat.

Manuell anstoßen: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/fiscal/closing`

## Export fürs Finanzamt / Steuerberater

```
GET /api/fiscal/export?from=2026-07-01&to=2026-07-31   (Bearer CRON_SECRET)
GET /api/fiscal/export/:id                              Status prüfen
```
Ergebnis ist das DSFinV-K-TAR aus der fiskaly-DSFinV-K-API (Download auch im
fiskaly-Dashboard). USt-Mapping: Speisen 7 % / Getränke 19 % — Quelle
`artifacts/api-server/src/lib/products.ts` (explizit pro Artikel).

## Setup / Betrieb

- **Einmalig pro Umgebung:** `node --env-file=.env scripts/fiskaly-setup.mjs`
  (TSS + Client) → IDs in Vercel-ENV; danach `scripts/fiskaly-smoke.mjs`
  (verifiziert die API-Feldnamen — nicht überspringen!).
- **E2E ohne Hardware:** `scripts/stripe-simulate-tap.mjs --create-reader`
  (simulierter Reader) und dann `scripts/stripe-simulate-tap.mjs [--decline]`
  während der Kiosk im Warte-Screen steht.
- **ENV-Inventar:** siehe `.env.example` (FISKALY_*, STRIPE_TERMINAL_READER_ID, CRON_SECRET).
- **DB:** `lib/db/supabase_fiscal_transactions.sql` (RLS an, keine Policies —
  nur service_role; Beleg-Zugriff läuft über `/api/receipt/:id`).
- **Firmendaten** (Name/Adresse/StNr für Beleg + Abschluss):
  `artifacts/api-server/src/fiskaly/config.ts` — **Steuernummer vor Go-Live eintragen!**
- **ELSTER-Kassenmeldung** (§146a(4) AO, binnen 1 Monat nach Inbetriebnahme):
  Datenblatt in `docs/ELSTER-Kassenmeldung.md`.

## Offene Punkte / bewusste Entscheidungen

- Preisautorität bleibt beim Frontend (bounds-checked) — wie im bestehenden
  pay-at-counter-Flow (Rabattwochen). Der Server ist Steuer-Autorität.
- Milchmischgetränke pauschal 19 % (Einzelfälle ggf. 7 % — Steuerberater fragen,
  Kommentar in `products.ts`).
- Refunds laufen über das Stripe-Dashboard + orderbird-Prozess, nicht über den Kiosk.
- DSFinV-K-Schema-Details (`buildCashPointClosing`) beim ersten Test-Closing
  gegen die fiskaly-Test-API verifizieren (wie SIGN-Smoke).
