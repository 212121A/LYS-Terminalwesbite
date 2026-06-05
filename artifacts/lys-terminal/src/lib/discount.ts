/**
 * Eröffnungswoche-Rabatt — 20 % auf alles.
 *
 * Aktion „Eröffnungswoche" 12.–14.06. Aktuell MANUELL geschaltet, also sofort
 * aktiv (nicht datumsgesteuert). Zum Beenden nach dem 14.06. einfach `ACTIVE`
 * auf `false` setzen: dann verschwinden überall die Streichpreise und es gilt
 * wieder der reguläre Preis — auf den Karten, im Warenkorb, an der Kasse und in
 * den Preisen, die ans Küchen-Backend (n8n) gesendet werden.
 */

/** Schalter für die Eröffnungswoche. Nach dem 14.06. auf `false` setzen. */
export const ACTIVE = true;

export const DISCOUNT_PERCENT = 20;

export function isDiscountActive(): boolean {
  return ACTIVE;
}

/** Preis mit Eröffnungsrabatt, auf den Cent gerundet. Ohne Aktion = Originalpreis. */
export function discountedPrice(price: number): number {
  if (!ACTIVE) return price;
  return Math.round(price * (1 - DISCOUNT_PERCENT / 100) * 100) / 100;
}

export function formatPrice(price: number): string {
  return price.toFixed(2).replace(".", ",") + " €";
}
