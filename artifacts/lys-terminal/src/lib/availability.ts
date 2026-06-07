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
