# ELSTER-Kassenmeldung — LYS Terminal (§ 146a Abs. 4 AO)

> Meldung des elektronischen Aufzeichnungssystems ans Finanzamt über
> **www.elster.de → Formulare → „Mitteilung über elektronische Aufzeichnungssysteme"**.
> **Frist: 1 Monat nach Inbetriebnahme** der Kartenzahlung am Terminal.
> Ausfüllen kann Alex oder der Steuerberater; alle Werte unten.

## 1. Steuerpflichtiger / Betrieb

| Feld | Wert |
|---|---|
| Name des Betriebs | LYS Noodles & Rice <!-- ggf. offiziellen Firmennamen prüfen --> |
| Inhaber | <!-- FILL: Inhaber lt. Gewerbeanmeldung --> |
| Steuernummer | <!-- FILL: vom Steuerberater --> |
| Betriebsstätte (Aufstellort der Kasse) | Kappelgasse 2, 73525 Schwäbisch Gmünd |

## 2. Elektronisches Aufzeichnungssystem (die Kasse)

| Feld | Wert |
|---|---|
| Art des Systems | Computergestütztes/PC-Kassensystem |
| Bezeichnung | LYS Terminal — Kiosk-Bestellterminal (Eigenentwicklung) |
| Software / Version | LYS Terminal 1.0 |
| Seriennummer des Systems | <!-- FILL: FISKALY_CLIENT_ID nach Prod-Setup (Ausgabe fiskaly-setup.mjs) --> |
| Anschaffungs-/Inbetriebnahmedatum | <!-- FILL: Datum des Prod-Go-Live der Kartenzahlung --> |
| Anzahl der eingesetzten Systeme an der Betriebsstätte | 1 |

## 3. Technische Sicherheitseinrichtung (TSE)

| Feld | Wert |
|---|---|
| Art der TSE | Cloud-TSE |
| Hersteller | fiskaly GmbH |
| BSI-Zertifizierungs-ID | <!-- FILL: aus fiskaly-Dashboard → TSS-Details (z. B. BSI-K-TR-xxxx-xxxx) --> |
| Seriennummer der TSE | <!-- FILL: tss_serial_number aus fiskaly-smoke.mjs-Output gegen PROD --> |
| Inbetriebnahmedatum der TSE | <!-- FILL: Datum von scripts/fiskaly-setup.mjs gegen PROD --> |

## 4. Hinweise

- Die **orderbird-Kasse ist separat** zu melden (falls noch nicht geschehen —
  orderbird bietet dafür i. d. R. eine eigene Übersicht/Unterstützung).
- Bei **Außerbetriebnahme** (Kasse oder TSE-Wechsel) ist ebenfalls binnen
  1 Monat zu melden.
- Werte mit `<!-- FILL -->` nach dem Production-Setup eintragen
  (Quelle: Ausgabe von `scripts/fiskaly-setup.mjs` + fiskaly-Dashboard).
