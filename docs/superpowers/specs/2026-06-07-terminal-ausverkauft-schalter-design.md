# Spec: „Ausverkauft"-Schalter im Terminal

**Datum:** 2026-06-07
**Status:** Entwurf, vom Auftraggeber freigegeben (Konzept)

## Problem

Wenn im Laufe des Tages etwas ausgeht (z.B. Tofu, eine Soße, ein Getränk), soll
das im Bestell-Terminal ausgegraut und nicht mehr bestellbar sein. Aktuell ist das
Menü hartcodiert; eine Änderung der Verfügbarkeit erfordert einen Code-Deploy
durch die IT. Ziel: **Mitarbeiter schalten Verfügbarkeit selbst um, ohne IT.**

## Ziele

- Mitarbeiter markieren beliebige bestellbare Dinge als ausverkauft — Gerichte,
  Getränke, Box-Basen (z.B. Tofu) und Soßen (z.B. Erdnuss/Matcha/Mango).
- Markierung wirkt zentral auf allen Geräten (mehrere Terminals + Online-Seite).
- „Heute aus" setzt sich über Nacht automatisch zurück; „dauerhaft aus" bleibt.
- Kein Code-Deploy, kein IT-Eingriff für den Tagesbetrieb nötig.

## Nicht-Ziele (YAGNI)

- Kein vollständiges Admin-/User-System mit Login-Konten und Rollen.
- Keine Bestands-/Lagerverwaltung mit Stückzahlen — nur an/aus.
- Keine Historie/Audit-Log über Verfügbarkeits-Änderungen (kann später kommen).
- Keine Preis-/Menü-Bearbeitung über die Oberfläche.

## Kernentscheidungen (aus dem Brainstorming)

| Frage | Entscheidung |
|-------|--------------|
| Bedien-Weg | Versteckter Modus direkt im Terminal (Geste + PIN) |
| Speicherort | Zentral in Supabase, gilt für alle Geräte |
| Umfang | Alles Bestellbare: Gerichte, Getränke, Box-Basen, Soßen |
| Zurücksetzen | Auto-Reset über Nacht **und** manuell; Option „dauerhaft aus" |

## Architektur-Überblick

```
[Terminal A] [Terminal B] [Online-Seite]
      │            │             │
      │  lesen (Supabase anon + Realtime)
      └────────────┴─────────────┘
                   │
            [ Supabase: item_availability ]
                   ▲
                   │  schreiben (Service-Role)
            [ API-Server: POST /api/availability ]  ← PIN-Prüfung (ENV)
                   ▲
                   │  PIN + Toggle
            [ Versteckter Modus im Terminal ]
```

- **Lesen:** Frontend liest direkt per Supabase anon-Key (RLS: nur SELECT). Realtime-
  Subscription, damit Änderungen sofort auf allen Geräten ankommen.
- **Schreiben:** ausschließlich über den API-Server. PIN wird serverseitig geprüft,
  geschrieben wird mit dem Service-Role-Key. Die PIN ist nie im Frontend-Bundle.

## 1. Datenmodell (Supabase)

Neue Tabelle `item_availability`. Es existieren **nur Einträge für aktuell/zuletzt
ausgeschaltete Items**; kein Eintrag = verfügbar.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `item_id` | `text` PK | Einheitliche ID, siehe ID-Schema unten |
| `mode` | `text` | `today` oder `permanent` |
| `sold_out_date` | `date` | Geschäftstag, an dem ausgeschaltet wurde (nur relevant bei `today`) |
| `updated_at` | `timestamptz` | Zeitpunkt der letzten Änderung |

**ID-Schema** (einheitlicher Namespace über alle Kategorien, mit bestehenden IDs):

- Gerichte/Getränke: `dish:<MenuItem.id>` — z.B. `dish:e1`, `dish:30`
- Box-Basen: `box:<BoxBaseItem.id>` — z.B. `box:box-tofu`
- Soßen: `sauce:<BoxSauce.id>` — z.B. `sauce:erdnuss`, `sauce:matcha`

Alle drei IDs existieren bereits in den Datenquellen
(`artifacts/lys-terminal/src/data/menu.ts`, `.../boxSauces.ts`) und sind stabil.

**„Ist ausverkauft?"-Logik:**

```
istAusverkauft(item_id) =
  Eintrag existiert UND ( mode = 'permanent'
                          ODER sold_out_date == aktuellerGeschäftstag )
```

**Geschäftstag** = Datum in Zeitzone `Europe/Berlin` mit **Cutoff 4:00 Uhr**:
Vorgänge zwischen 00:00 und 03:59 zählen noch zum Vortag. Dadurch setzt der
Nachtbetrieb nichts ungewollt zurück, und ab 4:00 sind alle `today`-Einträge
automatisch „abgelaufen".

**Auto-Reset ohne Cron:** Der Reset passiert implizit — beim Tageswechsel passt
`sold_out_date` nicht mehr zum aktuellen Geschäftstag, also gilt das Item wieder
als verfügbar. Kein nächtlicher Job nötig (robuster: ein ausgefallener Cron kann
nichts kaputt machen). Optionaler späterer Cleanup-Job, der abgelaufene
`today`-Zeilen löscht, ist rein kosmetisch und kein Teil dieses Specs.

**RLS:** anon darf `SELECT`. Kein `INSERT`/`UPDATE`/`DELETE` für anon — Schreiben
läuft nur über den API-Server mit Service-Role-Key.

## 2. Versteckter Bearbeiten-Modus (Frontend)

- **Aktivierung:** ~2 Sekunden langer Druck auf eine feste Stelle (Vorschlag: Logo
  oben links). Danach **4-stellige PIN**-Eingabe. Bei korrekter PIN öffnet sich das
  Bearbeiten-Overlay.
- **Liste:** alle Items, gruppiert nach Kategorie (Gerichte / Getränke / Box-Basen /
  Soßen). Pro Item ein Schalter (verfügbar / ausverkauft). Beim Ausschalten kurz
  wählbar: „heute aus" (Standard) oder „dauerhaft aus".
- **Verlassen:** Button „Fertig" oder automatisch nach Inaktivität (Timeout, damit
  der Modus nicht versehentlich offen bleibt).
- **Schreiben:** jede Änderung ruft `POST /api/availability` mit PIN + Item +
  gewünschtem Zustand. Optimistische UI-Aktualisierung, Bestätigung via Realtime.

## 3. Darstellung im Kunden-Terminal

- Ausverkaufte Items: **ausgegraut, nicht anklickbar**, mit Label „Heute leider aus".
- Soßen: in der Soßen-Auswahl (`SauceModal`) ausgegraut, nicht wählbar — konsistent
  zur bestehenden Soßen-Logik in `boxSauces.ts` (`extraSauceOptionsFor`), hier aber
  **ausgrauen statt ausblenden**.
- Reine Anzeige-Schicht: Die Card-Komponenten (`MenuItemCard`, `BoxItemCard`) und das
  Soßen-Modal bekommen den Verfügbarkeits-Status über einen zentralen Hook/Context.

## 4. Sync über alle Geräte

- Supabase **Realtime**-Subscription auf `item_availability` → Änderung erscheint
  innerhalb von Sekunden auf allen Terminals und der Online-Seite.
- **Fallback:** Polling alle ~30 Sekunden und Refetch beim Betreten der Menü-Seite,
  falls Realtime nicht verfügbar ist.

## 5. Backend / API

Neuer Endpunkt im bestehenden Express-Server (`artifacts/api-server`):

- `POST /api/availability`
  - Body: `{ pin, itemId, action }` mit `action` ∈ `{ "sold_out_today", "sold_out_permanent", "available" }`
  - Prüft `pin` serverseitig gegen ENV `STAFF_PIN`. Bei Fehler → 401.
  - `sold_out_*` → upsert Zeile mit passendem `mode` und `sold_out_date` = heutiger
    Geschäftstag. `available` → Zeile löschen.
  - Schreibt mit Service-Role-Key.

Lesen braucht keinen eigenen Endpunkt — das Frontend liest direkt per Supabase
anon-Client (siehe Sync). Optional kann `GET /api/availability` als Fallback dienen.

## 6. Sicherheit

- PIN nur serverseitig (`STAFF_PIN` als ENV, in Vercel + lokal `.env`). Nie im
  Frontend-Bundle.
- Schreibzugriff ausschließlich über API mit Service-Role; anon-Key nur Lesen (RLS).
- Kein neuer öffentlich beschreibbarer Pfad in die Datenbank.

## Betroffene / neue Dateien (Orientierung, finalisiert der Plan)

- **Neu:** Supabase-Migration für `item_availability` + RLS-Policy.
- **Neu:** `artifacts/api-server/src/routes/availability.ts` + Registrierung in `app.ts`.
- **Neu (Frontend):** Verfügbarkeits-Hook/Context (Lesen + Realtime), Bearbeiten-Overlay,
  PIN-Gate/Geste.
- **Geändert:** `MenuItemCard`, `BoxItemCard`, `SauceModal` (Ausgrauen + Klick sperren),
  Terminal-Einstieg (Geste).
- **Geändert:** `.env.example` (`STAFF_PIN`).

## Detail-Entscheidungen

- **PIN** — festgelegt (4-stellig). Wert liegt **ausschließlich in ENV `STAFF_PIN`**,
  nie im Repo/Spec/Frontend.
- **Geste/Stelle** — festgelegt: Logo oben links, langer Druck ~2 s.
- **Cutoff-Uhrzeit** — Default 4:00 `Europe/Berlin`; bei Bedarf anpassbar.
- **Texte/Label** — „Heute leider aus" als Default-Wording.

## Testplan

- Geschäftstag-/Cutoff-Logik als Unit-Test (Grenzfälle: 03:59 vs. 04:00 Berlin,
  Sommer-/Winterzeit).
- API: PIN korrekt/falsch, upsert + delete, mode `today` vs `permanent`.
- „Ist ausverkauft?"-Logik: kein Eintrag, `today` heute, `today` gestern (→ wieder
  verfügbar), `permanent`.
- Frontend: Card/Soße ausgegraut + nicht anklickbar; Realtime-Update kommt an.
- End-to-End: im versteckten Modus Tofu „heute aus" → auf zweitem Gerät ausgegraut →
  am nächsten Geschäftstag wieder verfügbar.
