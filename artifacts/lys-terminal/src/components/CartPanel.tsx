import { useEffect, useRef, useState } from "react";
import { ShoppingCart, Trash2, Plus, Minus, Pencil } from "lucide-react";
import { CartItem } from "@/store/cart";
import { useLang } from "@/i18n/LanguageContext";
import { Price } from "@/components/Price";

interface CartPanelProps {
  items: CartItem[];
  total: number;
  onRemove: (cartId: string) => void;
  onAdd: (itemId: string, name: string, price: number, sizeLabel?: string) => void;
  onEdit?: (cartId: string) => void;
  onRemoveLine?: (cartId: string) => void;
  onCheckout: () => void;
  onClear: () => void;
}

/** Sanftes Hochzählen des Gesamtpreises; respektiert prefers-reduced-motion. */
function useAnimatedNumber(value: number, duration = 450) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return display;
}

export function CartPanel({ items, total, onRemove, onAdd, onEdit, onRemoveLine, onCheckout, onClear }: CartPanelProps) {
  const { tr } = useLang();
  const animatedTotal = useAnimatedNumber(total);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-primary" strokeWidth={1.8} />
          <span className="font-medium text-[16px] text-primary">{tr.cart}</span>
        </div>
        {items.length > 0 && (
          <button
            data-testid="button-clear-cart"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10 active:scale-90"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4 animate-in fade-in duration-500">
            <div className="lys-float w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ShoppingCart size={28} className="text-primary/50" strokeWidth={1.5} />
            </div>
            <p className="text-primary font-medium text-[15px] mb-1">{tr.emptyCartTitle}</p>
            <p className="text-primary/50 text-[13px]">{tr.emptyCartSubtitle}</p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-2 pb-6">
            {items.map((item) => (
              <div
                key={item.id}
                data-testid={`cart-item-${item.id}`}
                className="bg-card border border-card-border rounded-xl p-3 shadow-sm animate-in fade-in slide-in-from-right-3 fill-mode-both"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] min-[1600px]:text-[22px] font-medium text-foreground leading-snug">{item.name}</p>
                    <p className="text-[13px] min-[1600px]:text-[18px] text-muted-foreground mt-0.5"><Price value={item.price} /> {tr.perPiece}</p>
                  </div>
                  <p
                    key={item.quantity}
                    className="lys-pop text-[14px] min-[1600px]:text-[22px] font-semibold text-foreground tabular-nums shrink-0"
                  >
                    <Price value={item.price * item.quantity} />
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    data-testid={`button-cart-remove-${item.id}`}
                    onClick={() => onRemove(item.id)}
                    className="w-8 h-8 min-[1600px]:w-12 min-[1600px]:h-12 rounded-full bg-secondary border border-card-border flex items-center justify-center active:scale-90 transition-transform duration-100"
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span
                    key={item.quantity}
                    data-testid={`text-cart-qty-${item.id}`}
                    className="lys-pop text-[15px] min-[1600px]:text-[24px] font-semibold text-foreground w-6 min-[1600px]:w-10 text-center tabular-nums"
                  >
                    {item.quantity}
                  </span>
                  <button
                    data-testid={`button-cart-add-${item.id}`}
                    onClick={() => onAdd(item.itemId, item.name, item.price, item.sizeLabel)}
                    className="w-8 h-8 min-[1600px]:w-12 min-[1600px]:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform duration-100"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                  <div className="ml-auto flex items-center gap-1">
                    {item.edit && onEdit && (
                      <button
                        data-testid={`button-cart-edit-${item.id}`}
                        onClick={() => onEdit(item.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] min-[1600px]:text-[18px] font-medium text-primary/80 hover:bg-muted active:scale-95 transition-all"
                      >
                        <Pencil size={13} strokeWidth={2} />
                        {tr.editItem}
                      </button>
                    )}
                    {onRemoveLine && (
                      <button
                        data-testid={`button-cart-delete-${item.id}`}
                        onClick={() => onRemoveLine(item.id)}
                        aria-label="Löschen"
                        className="flex items-center justify-center w-8 h-8 min-[1600px]:w-12 min-[1600px]:h-12 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                      >
                        <Trash2 className="w-4 h-4 min-[1600px]:w-6 min-[1600px]:h-6" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4 mt-2 border-t border-border animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[15px] min-[1600px]:text-[24px] font-medium text-primary">{tr.total}</span>
                <span
                  data-testid="text-cart-total"
                  className="text-[20px] min-[1600px]:text-[34px] font-semibold text-primary tabular-nums"
                >
                  <Price value={animatedTotal} />
                </span>
              </div>
              <button
                data-testid="button-place-order"
                onClick={onCheckout}
                className="w-full h-14 min-[1600px]:h-20 rounded-xl bg-primary text-primary-foreground text-[16px] min-[1600px]:text-[26px] font-semibold active:scale-[0.98] transition-all duration-150 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {tr.placeOrder}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
