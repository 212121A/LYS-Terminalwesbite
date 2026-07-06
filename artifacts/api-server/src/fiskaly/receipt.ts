// artifacts/api-server/src/fiskaly/receipt.ts
/**
 * Baut das fiskaly-Beleg-Schema (SIGN DE v2, schema.standard_v1.receipt).
 * Rechnung komplett in Cent; Dezimal-Strings ("12.34") entstehen erst am Rand —
 * fiskaly erwartet Beträge als String mit 2 Nachkommastellen.
 *
 * ⚠️ Feldnamen/Enums gegen die echte Test-API verifiziert via
 * scripts/fiskaly-smoke.mjs — bei Abweichungen dort zuerst schauen.
 */

export type VatRate = "NORMAL" | "REDUCED_1";
export type PaymentType = "CASH" | "NON_CASH";
export type ReceiptType = "RECEIPT" | "CANCELLATION";

export const VAT_RATE_PERCENT: Record<VatRate, number> = {
  NORMAL: 19, // Getränke
  REDUCED_1: 7, // Speisen (auch vor Ort, Stand ab 2026-01-01)
};

export type FiscalLineItem = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  vatRate: VatRate;
};

export type VatAmount = {
  vat_rate: VatRate;
  incl_vat_cents: number;
  vat_cents: number;
};

export type ReceiptSchema = {
  standard_v1: {
    receipt: {
      receipt_type: ReceiptType;
      amounts_per_vat_rate: { vat_rate: VatRate; amount: string }[];
      amounts_per_payment_type: { payment_type: PaymentType; amount: string }[];
    };
  };
};

export function centsToAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function lineTotalCents(item: FiscalLineItem): number {
  return item.unitPriceCents * item.quantity;
}

export function totalCents(items: FiscalLineItem[]): number {
  return items.reduce((sum, item) => sum + lineTotalCents(item), 0);
}

/**
 * Brutto- und USt-Anteil je Steuersatz. USt aus Brutto herausgerechnet
 * (Kiosk-Preise sind Endpreise): vat = brutto * satz / (100 + satz), gerundet.
 */
export function buildVatAmounts(items: FiscalLineItem[]): VatAmount[] {
  const grossByRate = new Map<VatRate, number>();
  for (const item of items) {
    grossByRate.set(item.vatRate, (grossByRate.get(item.vatRate) ?? 0) + lineTotalCents(item));
  }

  return [...grossByRate.entries()].map(([vatRate, gross]) => ({
    vat_rate: vatRate,
    incl_vat_cents: gross,
    vat_cents: Math.round((gross * VAT_RATE_PERCENT[vatRate]) / (100 + VAT_RATE_PERCENT[vatRate])),
  }));
}

export function buildReceiptSchema(
  items: FiscalLineItem[],
  opts: { receiptType?: ReceiptType; paymentType?: PaymentType } = {},
): ReceiptSchema {
  const receiptType = opts.receiptType ?? "RECEIPT";
  const paymentType = opts.paymentType ?? "NON_CASH";

  return {
    standard_v1: {
      receipt: {
        receipt_type: receiptType,
        amounts_per_vat_rate: buildVatAmounts(items).map(({ vat_rate, incl_vat_cents }) => ({
          vat_rate,
          amount: centsToAmount(incl_vat_cents),
        })),
        amounts_per_payment_type: [
          { payment_type: paymentType, amount: centsToAmount(totalCents(items)) },
        ],
      },
    },
  };
}
