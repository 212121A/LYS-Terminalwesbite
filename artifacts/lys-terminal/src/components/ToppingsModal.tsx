import { useState } from "react";
import { X, Check } from "lucide-react";
import { BOWL_TOPPINGS, BOWL_INCLUDED_FRUITS, type BowlTopping } from "@/data/bowlToppings";
import { useLang } from "@/i18n/LanguageContext";
import { Price } from "@/components/Price";

interface ToppingsModalProps {
  /** Name der Bowl, zu der die Toppings gewählt werden. */
  dishName: string;
  basePrice: number;
  /** Vorauswahl beim Bearbeiten einer bestehenden Warenkorb-Zeile. */
  initialToppingIds?: string[];
  onClose: () => void;
  onConfirm: (toppings: BowlTopping[], totalPrice: number) => void;
}

function formatPriceDelta(delta: number) {
  return "+" + delta.toFixed(2).replace(".", ",") + " €";
}

export function ToppingsModal({ dishName, basePrice, initialToppingIds, onClose, onConfirm }: ToppingsModalProps) {
  const { tr } = useLang();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialToppingIds ?? []),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chosen = BOWL_TOPPINGS.filter((topping) => selected.has(topping.id));
  const totalPrice = chosen.reduce((sum, topping) => sum + topping.priceDelta, basePrice);

  const handleConfirm = () => onConfirm(chosen, totalPrice);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        data-testid="toppings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-border gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-[28px] font-semibold text-foreground leading-tight">
              {tr.toppingsTitle}
            </h2>
            <p className="text-muted-foreground text-[15px] mt-1 leading-snug">
              {tr.toppingsIncluded}
            </p>
            <p className="text-muted-foreground/80 text-[13px] mt-0.5 leading-snug">
              {BOWL_INCLUDED_FRUITS}
            </p>
            <p className="text-primary/90 text-[15px] mt-3 font-semibold leading-snug truncate">
              {dishName}
            </p>
          </div>
          <button
            data-testid="button-close-toppings"
            onClick={onClose}
            className="w-10 h-10 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-7 pt-6 pb-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2.5">
            {BOWL_TOPPINGS.map((topping) => {
              const isSelected = selected.has(topping.id);
              return (
                <button
                  key={topping.id}
                  data-testid={`button-topping-${topping.id}`}
                  onClick={() => toggle(topping.id)}
                  className={`w-full min-h-14 rounded-xl border flex items-center justify-between gap-4 px-5 py-3 text-left transition-all duration-150 active:scale-[0.99] ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]"
                      : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
                  }`}
                >
                  <span className="flex items-center gap-4 min-w-0">
                    <span
                      className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </span>
                    <span className="text-[18px] font-semibold text-foreground">
                      {topping.label}
                    </span>
                  </span>
                  <span className="text-[14px] text-muted-foreground tabular-nums">
                    {formatPriceDelta(topping.priceDelta)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between px-7 py-3 border-t border-border">
          <span className="text-[15px] font-medium text-muted-foreground">{tr.total}</span>
          <span className="text-[20px] font-semibold text-foreground tabular-nums">
            <Price value={totalPrice} />
          </span>
        </div>

        <div className="grid grid-cols-2 border-t border-border">
          <button
            data-testid="button-toppings-cancel"
            onClick={onClose}
            className="h-16 text-[17px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            {tr.sauceSelectCancel}
          </button>
          <button
            data-testid="button-toppings-confirm"
            onClick={handleConfirm}
            className="h-16 text-[17px] font-semibold border-l border-border bg-primary text-primary-foreground active:scale-[0.99] transition-all duration-150"
          >
            {tr.sauceSelectConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
