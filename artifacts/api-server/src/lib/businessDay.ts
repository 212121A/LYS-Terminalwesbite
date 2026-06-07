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
