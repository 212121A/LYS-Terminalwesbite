import { useState, memo } from "react";
import { Plus } from "lucide-react";
import { type BoxBaseItem } from "@/data/menu";
import { useLang } from "@/i18n/LanguageContext";
import { AllergenCodes } from "@/components/AllergenCodes";
import { Price } from "@/components/Price";

type Carb = "nudel" | "reis";
type Size = "klein" | "gross";

interface BoxItemCardProps {
  item: BoxBaseItem;
  /** Wird mit der Warenkorb-ID (z. B. „GN1"), dem Anzeige-Namen
   *  („Gemüse · Nudel Klein") und dem Preis aufgerufen. sizeLabel ist
   *  bewusst NICHT gesetzt, damit das Soßen-Modal in Terminal.tsx öffnet. */
  onAdd: (itemId: string, name: string, price: number) => void;
  index?: number;
}

function BoxItemCardBase({ item, onAdd, index = 0 }: BoxItemCardProps) {
  const { tr } = useLang();
  const [carb, setCarb] = useState<Carb>("nudel");
  const cardDelay = Math.min(index, 10) * 40;

  const baseName =
    item.dishType && tr.dishNames[item.dishType]
      ? tr.dishNames[item.dishType]
      : item.name;

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

  return (
    <div
      style={{ animationDelay: `${cardDelay}ms` }}
      className="bg-card border border-card-border rounded-xl p-4 min-[1600px]:p-8 flex items-start justify-between gap-4 min-[1600px]:gap-8 shadow-[0_6px_20px_rgba(96,77,65,0.18)] hover:shadow-[0_10px_28px_rgba(96,77,65,0.26)] transition-shadow duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      data-testid={`card-box-${item.id}`}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground text-[15px] min-[1600px]:text-[32px] leading-snug">
          {baseName}
        </h3>
        <AllergenCodes allergens={item.allergens} additives={item.additives} />
        <div
          role="radiogroup"
          aria-label={tr.carbNudel + " / " + tr.carbReis}
          className="mt-3 min-[1600px]:mt-6 inline-flex items-center rounded-full bg-muted/70 p-1 min-[1600px]:p-1.5 border border-card-border"
        >
          {(["nudel", "reis"] as Carb[]).map((option) => {
            const selected = option === carb;
            const label = option === "nudel" ? tr.carbNudel : tr.carbReis;
            return (
              <button
                key={option}
                role="radio"
                aria-checked={selected}
                data-testid={`button-carb-${item.id}-${option}`}
                onClick={() => setCarb(option)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 min-[1600px]:px-8 min-[1600px]:py-3 min-[1600px]:text-[24px] ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        {hasKlein ? (
          <>
            <button
              data-testid={`button-box-add-${item.id}-${carb}-klein`}
              onClick={() => handleAdd("klein")}
              className="h-9 pl-2.5 pr-3.5 rounded-full bg-secondary border border-card-border text-foreground flex items-center gap-1.5 text-[13px] font-medium tabular-nums active:scale-95 transition-transform duration-100 hover:bg-muted min-[1600px]:h-16 min-[1600px]:pl-6 min-[1600px]:pr-8 min-[1600px]:text-[24px] min-[1600px]:gap-3"
            >
              <Plus size={14} strokeWidth={2.5} className="min-[1600px]:w-7 min-[1600px]:h-7" />
              <span>{tr.sizeSmall}</span>
              <span className="text-foreground/80"><Price value={item.sizes.klein!} /></span>
            </button>
            <button
              data-testid={`button-box-add-${item.id}-${carb}-gross`}
              onClick={() => handleAdd("gross")}
              className="h-9 pl-2.5 pr-3.5 rounded-full bg-secondary border border-card-border text-foreground flex items-center gap-1.5 text-[13px] font-medium tabular-nums active:scale-95 transition-transform duration-100 hover:bg-muted min-[1600px]:h-16 min-[1600px]:pl-6 min-[1600px]:pr-8 min-[1600px]:text-[24px] min-[1600px]:gap-3"
            >
              <Plus size={14} strokeWidth={2.5} className="min-[1600px]:w-7 min-[1600px]:h-7" />
              <span>{tr.sizeLarge}</span>
              <span className="text-foreground/80"><Price value={item.sizes.gross} /></span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-[15px] min-[1600px]:text-[28px] font-medium text-foreground tabular-nums">
              <Price value={item.sizes.gross} />
            </span>
            <button
              data-testid={`button-box-add-${item.id}-${carb}-gross`}
              onClick={() => handleAdd("gross")}
              className="w-10 h-10 min-[1600px]:w-20 min-[1600px]:h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform duration-100 shadow-sm"
            >
              <Plus size={20} strokeWidth={2.5} className="min-[1600px]:w-10 min-[1600px]:h-10" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const BoxItemCard = memo(BoxItemCardBase);
