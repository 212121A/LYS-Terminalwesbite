import { isDiscountActive, discountedPrice, formatPrice } from "@/lib/discount";

interface PriceProps {
  /** Originalpreis (vor Rabatt). */
  value: number;
}

/**
 * Preis-Anzeige. Während der Eröffnungswoche steht der alte Preis durchgestrichen
 * links daneben, rechts der rabattierte Preis. Sonst nur der reguläre Preis. Der
 * neue Preis erbt Größe/Farbe/Gewicht vom umgebenden Element — sieht also aus wie
 * der bisherige Preis; der alte ist kleiner und gedämpft.
 */
export function Price({ value }: PriceProps) {
  if (!isDiscountActive()) return <>{formatPrice(value)}</>;
  return (
    <>
      <span className="line-through text-muted-foreground/60 font-normal text-[0.8em] mr-1.5">
        {formatPrice(value)}
      </span>
      {formatPrice(discountedPrice(value))}
    </>
  );
}
