/**
 * Gemeinsame Prüfung der Bestellposten aus dem Terminal-Frontend, geteilt von
 * `/api/orders/pay-at-counter` und den Stripe-Checkout-Routen. Format:
 * `{ id?, cartId?, itemId?, sizeLabel?, name, price, quantity }` mit `price`
 * in Euro (wie im Menü).
 *
 * Nur die für beide Routen gemeinsamen Felder landen im Snapshot. Zusätzliche
 * Küchen-Felder (Menü-Code `number`, `box_option`) hängt die Counter-Route
 * selbst an — der Stripe-Snapshot bleibt dadurch unverändert.
 */

export function normalizeQuantity(value: unknown): number {
  const qty = Math.floor(Number(value));
  if (!Number.isFinite(qty)) return 1;
  return Math.min(20, Math.max(1, qty));
}

export interface ParsedLineItem {
  name: string;
  priceEur: number;
  quantity: number;
  /** Einzelpreis in Cent — für Stripe `unit_amount`. */
  unitCents: number;
  /** Eintrag für den `pending_orders`-Snapshot. */
  snapshot: Record<string, unknown>;
}

export type ParseLineItemsResult =
  | { ok: true; items: ParsedLineItem[]; totalEur: number }
  | { ok: false; error: string };

function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseLineItems(raw: unknown[]): ParseLineItemsResult {
  const items: ParsedLineItem[] = [];
  let totalEur = 0;

  for (const entry of raw) {
    const item = entry as Record<string, unknown>;
    const name = trimmedString(item?.name);
    const priceEur = Number(item?.price);
    const quantity = normalizeQuantity(item?.quantity);

    if (!name || !Number.isFinite(priceEur) || priceEur < 0 || priceEur > 999) {
      return { ok: false, error: "Ungültiger Artikel (Name/Preis)." };
    }

    const unitCents = Math.round(priceEur * 100);
    if (unitCents < 50) {
      return { ok: false, error: "Betrag zu klein." };
    }

    const snapshot: Record<string, unknown> = { name, priceEur, quantity };
    const id = trimmedString(item?.id);
    const cartId = trimmedString(item?.cartId);
    const itemId = trimmedString(item?.itemId);
    const sizeLabel = trimmedString(item?.sizeLabel);
    if (id) snapshot.id = id;
    if (cartId) snapshot.cartId = cartId;
    if (itemId) snapshot.itemId = itemId;
    if (sizeLabel) snapshot.sizeLabel = sizeLabel;

    items.push({ name, priceEur, quantity, unitCents, snapshot });
    totalEur += priceEur * quantity;
  }

  return { ok: true, items, totalEur };
}
