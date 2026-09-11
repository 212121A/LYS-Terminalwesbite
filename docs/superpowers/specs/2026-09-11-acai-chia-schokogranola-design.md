# Açaí Bowl 27: Pflichtwahl „Chia Pudding" + Topping „Schokogranola"

Stand: 2026-09-11 · Freigabe: Alex (Chat 10./11.09.2026)

## Ziel

1. Bei der Açaí Bowl (Code 27) muss der Gast **verpflichtend** wählen: **Mit Chia Pudding** oder **Ohne Chia Pudding**. Preis inklusive (+0 €). Gilt **nur** für 27, nicht für 24/25/26.
2. Bowl-Toppings bekommen zusätzlich **Schokogranola** mit Aufpreis **+2,00 €** (wie Granola). Gilt für alle Bowls mit Topping-Auswahl.
3. Beides kommt sichtbar im Küchen-Dashboard an, für Terminal- und Website-Bestellungen.

Nicht enthalten: Voice-Agent (Prompt-Pflichtfrage wäre ein separater Schritt; Extras werden heute schon als Freitext durchgereicht).

## Terminal (`lys-terminal/artifacts/lys-terminal`)

- `src/data/toppings.ts`
  - `ToppingGroup` bekommt `exclusive?: boolean` (Einfachauswahl).
  - `BOWL_TOPPINGS` + `{ id: "schokogranola", label: "Schokogranola", priceDelta: 2.0 }` (nach Granola).
  - Neue `ACAI_CONFIG` nur für Item-ID `"27"`: Gruppe `chia` (titleKey `chiaPuddingTitle`, exclusive, min 1, Optionen `Mit Chia Pudding` / `Ohne Chia Pudding`, je 0 €) + Gruppe `toppings` (titleKey `toppingsTitle`). Übrige Bowls behalten `BOWL_CONFIG`.
- `src/components/ToppingsModal.tsx`: `toggle` ersetzt in einer exclusive-Gruppe die bisherige Auswahl statt zu ergänzen. Rendering sonst unverändert.
- `src/i18n/translations.ts`: neuer Key `chiaPuddingTitle` in allen Sprachen (de „Chia Pudding", en „Chia pudding", …).
- Warenkorb-/Küchenzeile entsteht wie heute aus dem Label: `Açaí Bowl · Mit Chia Pudding · Honig, Schokogranola`. Bearbeiten-Vorauswahl über bestehendes `selectedIdsFromLabel`.
- Küchen-Item (`counterOrder`/`kitchenOrder.ts`): unverändert, `sizeLabel` trägt das Label.

## Website (`lys-website`)

- `artifacts/ly-restaurant/src/lib/orderItemCode.ts`
  - `BowlTopping` + `"schokogranola"`, Label „Schokogranola", Surcharge 2, in `BOWL_TOPPINGS` nach `granola`.
  - Neuer Typ `BowlChia = "mit" | "ohne"`, Labels `Mit Chia Pudding` / `Ohne Chia Pudding`.
  - `bowlCode`, `bowlDisplayName`, `bowlCartId` bekommen optionalen Parameter `chia?: BowlChia`:
    - Code: `27-<Früchte>-<Toppings>-Mit Chia Pudding` (Chia-Suffix nur, wenn gesetzt).
    - Name: `… • Mit Chia Pudding`.
    - Cart-ID: `bowl-acai-<fruits>-<toppings>-mit-chia` bzw. `-ohne-chia`.
- `artifacts/ly-restaurant/src/pages/Order.tsx`: Bowl-Dialog zeigt für `bowl-acai` eine dritte Sektion „Chia Pudding" als Pflicht-Radio (`bowlChiaChoice`), `confirmBowl` verlangt bei `bowl-acai` eine Auswahl. Cart-Item speichert `chia` für die Anzeige.
- `artifacts/ly-restaurant/src/i18n/menuTranslations.ts`: `bowlToppings`-Texte um „Schokogranola (+2)" ergänzen; neuer Key `bowlChiaChoice` (Überschrift) mit Labels je Sprache.
- `artifacts/ly-restaurant/src/data/allergens.ts`: Hinweis 27 „ggf. 1 (bei Granola/Schokogranola)".
- `api/stripe/create-checkout-session.js`
  - `BOWL_TOPPINGS.schokogranola = "Schokogranola"`, `BOWL_TOPPING_PRICE.schokogranola = 200`.
  - Bowl-Tokenizer: Vokabular + `mit-chia`, `ohne-chia`. `parseBowlRest` akzeptiert optional genau ein Chia-Token am Ende; `resolveBowlProduct` erlaubt es nur für `bowl-acai` (sonst `null` = Artikel unbekannt) und hängt Code-/Namens-Suffix an. Preis +0.
  - Alte Warenkörbe ohne Chia-Token bleiben gültig (Kompatibilität für localStorage).

## Küche (`lys-kitchen-dashboard`)

- `lib/kitchenAbbrev.ts`: `MODIFIER_SEPARATOR_RE` trennt zusätzlich vor `mit chia`. Ergebnis Website: `1x 27 · Banane+Erdbeere · Granola+Schokogranola · Mit Chia Pudding · BOWL`; Terminal-Zeilen kommen bereits mit „·".
- Kein Kürzel für Chia/Schokogranola (Bowls werden bewusst nicht gekürzt).

## Tests / Verifikation

- Terminal: vitest für `toppings.ts` (Config 27 hat exclusive-Gruppe, Schokogranola 2,00) + Modal-Verhalten (Einfachauswahl, `canConfirm` erst mit Chia-Wahl); `typecheck`, `build`.
- Website: `pnpm typecheck`, `test:contract`; manuelle Prüfung: Endpunkt löst `bowl-acai-banane-granola-schokogranola-mit-chia` zu Code `27-Banane-Granola+Schokogranola-Mit Chia Pudding`, Preis 6,50 + 4,00 auf; `bowl-oats1-…-mit-chia` wird abgelehnt.
- Kitchen: Regressionstest der Kartenzeile für beide Varianten.
- Deploy: je Repo Push auf `main` (Vercel Auto-Deploy). Danach je Kanal eine Test-Bestellung 27 mit Chia + Schokogranola und Kontrolle im Dashboard.

## Konsistenz (Master-Doku §9.4)

Topping-/Optionsänderung an drei Stellen: Terminal `toppings.ts`, Website `orderItemCode.ts` + `create-checkout-session.js`, Kitchen `kitchenAbbrev.ts`. Nach Umsetzung `memory/LYS-Orderflow.md` nachziehen.
