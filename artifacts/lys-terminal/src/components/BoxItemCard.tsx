import { useState, memo } from "react";
import { Plus } from "lucide-react";
import { type BoxBaseItem } from "@/data/menu";
import { useLang } from "@/i18n/LanguageContext";
import { AllergenInfo } from "@/components/AllergenInfo";
import { additivesForCarb } from "@/data/allergens";
import { Price } from "@/components/Price";
import { ProductImage } from "@/components/ProductImage";
import { useAvailability } from "@/availability/AvailabilityContext";
import { boxAvailabilityId } from "@/lib/availability";

type Carb = "nudel" | "reis";
type Size = "klein" | "gross";

interface BoxItemCardProps {
  item: BoxBaseItem;
  /** Wird mit der Warenkorb-ID (z. B. „GN1"), dem Anzeige-Namen
   *  („Gemüse · Nudel Klein") und dem Preis aufgerufen. sizeLabel ist
   *  bewusst NICHT gesetzt, damit das Soßen-Modal in Terminal.tsx öffnet. */
  onAdd: (itemId: string, name: string, price: number) => void;
  index?: number;
  /** Fallback-Bild der Kategorie, falls die Box (noch) kein eigenes `image` hat. */
  categoryImage?: string;
}

/** Nudel-/Reisbox als einheitliche Hochformat-Card: Bild oben → Name →
 *  Nudel/Reis-Toggle → Klein/Groß-Buttons (bzw. ein „+"). */
function BoxItemCardBase({ item, onAdd, index = 0, categoryImage }: BoxItemCardProps) {
  const { tr } = useLang();
  const { isItemSoldOut } = useAvailability();
  const soldOut = isItemSoldOut(boxAvailabilityId(item));
  const [carb, setCarb] = useState<Carb>("nudel");
  const cardDelay = Math.min(index, 10) * 40;

  const baseName =
    item.dishType && tr.dishNames[item.dishType]
      ? tr.dishNames[item.dishType]
      : item.name;

  // Nudeln bringen E621 (g) mit, Reis nicht.
  const allergenList = item.allergens ?? [];
  const additiveList = additivesForCarb(item.additives, carb);

  if (soldOut) {
    return (
      <div
        data-testid={`card-box-${item.id}`}
        aria-disabled="true"
        className="bg-card border border-card-border rounded-3xl overflow-hidden flex flex-col opacity-55 pointer-events-none select-none"
      >
        <div className="relative">
          <ProductImage src={item.image ?? categoryImage} alt={baseName} className="grayscale" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-foreground/80 text-background text-[13px] font-semibold">
              {tr.soldOut}
            </span>
          </span>
        </div>
        <div className="p-4 min-[1600px]:p-6">
          <h3 className="font-medium text-foreground text-[16px] min-[1600px]:text-[28px] line-through leading-snug">{baseName}</h3>
          <span className="text-[14px] min-[1600px]:text-[22px] font-medium text-muted-foreground tabular-nums">
            <Price value={item.sizes.gross} />
          </span>
        </div>
      </div>
    );
  }

  const carbLabel = carb === "nudel" ? tr.carbNudel : tr.carbReis;
  const current = item.carbs[carb];
  const hasKlein = current.klein !== undefined && item.sizes.klein !== undefined;

  const handleAdd = (size: Size) => {
    const itemId = size === "klein" ? current.klein : current.gross;
    const price = size === "klein" ? item.sizes.klein : item.sizes.gross;
    if (!itemId || price === undefined) return;
    const sizeLabel = size === "klein" ? tr.sizeSmall : tr.sizeLarge;
    onAdd(itemId, `${baseName} · ${carbLabel} ${sizeLabel}`, price);
  };

  /** Große Größen-Pille (Klein/Groß) — Label links, Preis + „+" rechts. */
  const sizePill = (size: Size, price: number, testId: string) => (
    <button
      data-testid={testId}
      onClick={() => handleAdd(size)}
      className="w-full h-20 min-[1600px]:h-28 pl-5 pr-2 min-[1600px]:pl-8 rounded-full bg-secondary border border-card-border text-foreground flex items-center justify-between gap-2 active:scale-[0.98] transition-transform duration-100 hover:bg-muted"
    >
      <span className="text-[15px] min-[1600px]:text-[24px] font-medium">
        {size === "klein" ? tr.sizeSmall : tr.sizeLarge}
      </span>
      <span className="flex items-center gap-2 min-[1600px]:gap-3">
        <span className="text-[16px] min-[1600px]:text-[26px] font-semibold tabular-nums"><Price value={price} /></span>
        <span className="flex items-center justify-center w-16 h-16 min-[1600px]:w-24 min-[1600px]:h-24 rounded-full bg-emerald-600 text-white shrink-0">
          <Plus size={32} strokeWidth={2.5} className="min-[1600px]:w-12 min-[1600px]:h-12" />
        </span>
      </span>
    </button>
  );

  return (
    <div
      style={{ animationDelay: `${cardDelay}ms` }}
      className="bg-card border border-card-border rounded-3xl overflow-hidden flex flex-col lys-card animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      data-testid={`card-box-${item.id}`}
    >
      <ProductImage src={item.image ?? categoryImage} alt={baseName} />

      <div className="flex flex-col gap-3 p-3 min-[1600px]:p-5 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground text-[17px] min-[1600px]:text-[30px] leading-snug">{baseName}</h3>
          <AllergenInfo dishName={baseName} allergens={allergenList} additives={additiveList} testId={`button-allergen-box-${item.id}`} />
        </div>

        <div
          role="radiogroup"
          aria-label={tr.carbNudel + " / " + tr.carbReis}
          className="inline-flex items-center self-start rounded-full bg-muted/70 p-1 min-[1600px]:p-1.5 border border-card-border"
        >
          {(["nudel", "reis"] as Carb[]).map((option) => {
            const selected = option === carb;
            const label = option === "nudel" ? tr.carbNudel : tr.carbReis;
            const symbol = option === "nudel" ? "🍜" : "🍚";
            return (
              <button
                key={option}
                role="radio"
                aria-checked={selected}
                title={label}
                data-testid={`button-carb-${item.id}-${option}`}
                onClick={() => setCarb(option)}
                className={`flex items-center gap-1.5 min-[1600px]:gap-2.5 h-12 min-[1600px]:h-14 px-4 min-[1600px]:px-7 rounded-full text-[14px] min-[1600px]:text-[22px] font-medium transition-all duration-150 ${
                  selected ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 hover:text-foreground"
                }`}
              >
                <span className="text-[19px] min-[1600px]:text-[30px] leading-none">{symbol}</span>
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {hasKlein ? (
          <div className="flex flex-col gap-2.5">
            {sizePill("klein", item.sizes.klein!, `button-box-add-${item.id}-${carb}-klein`)}
            {sizePill("gross", item.sizes.gross, `button-box-add-${item.id}-${carb}-gross`)}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[19px] min-[1600px]:text-[30px] font-semibold text-foreground tabular-nums">
              <Price value={item.sizes.gross} />
            </span>
            <button
              data-testid={`button-box-add-${item.id}-${carb}-gross`}
              onClick={() => handleAdd("gross")}
              className="w-24 h-24 min-[1600px]:w-32 min-[1600px]:h-32 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform duration-100"
            >
              <Plus size={40} strokeWidth={2.5} className="min-[1600px]:w-16 min-[1600px]:h-16" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const BoxItemCard = memo(BoxItemCardBase);
