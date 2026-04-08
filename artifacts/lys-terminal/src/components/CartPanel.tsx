import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { CartItem } from "@/store/cart";
import { useLang } from "@/i18n/LanguageContext";

interface CartPanelProps {
  items: CartItem[];
  total: number;
  onRemove: (cartId: string) => void;
  onAdd: (itemId: string, name: string, price: number, sizeLabel?: string) => void;
  onCheckout: () => void;
  onClear: () => void;
}

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",") + " €";
}

export function CartPanel({ items, total, onRemove, onAdd, onCheckout, onClear }: CartPanelProps) {
  const { tr } = useLang();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-foreground" strokeWidth={1.8} />
          <span className="font-medium text-[16px] text-foreground">{tr.cart}</span>
        </div>
        {items.length > 0 && (
          <button
            data-testid="button-clear-cart"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingCart size={28} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-foreground font-medium text-[15px] mb-1">{tr.emptyCartTitle}</p>
            <p className="text-muted-foreground text-[13px]">{tr.emptyCartSubtitle}</p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                data-testid={`cart-item-${item.id}`}
                className="bg-card border border-card-border rounded-xl p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-foreground leading-snug">{item.name}</p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">{formatPrice(item.price)} {tr.perPiece}</p>
                  </div>
                  <p className="text-[14px] font-semibold text-foreground tabular-nums shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    data-testid={`button-cart-remove-${item.id}`}
                    onClick={() => onRemove(item.id)}
                    className="w-8 h-8 rounded-full bg-secondary border border-card-border flex items-center justify-center active:scale-95 transition-transform duration-100"
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span
                    data-testid={`text-cart-qty-${item.id}`}
                    className="text-[15px] font-semibold text-foreground w-6 text-center tabular-nums"
                  >
                    {item.quantity}
                  </span>
                  <button
                    data-testid={`button-cart-add-${item.id}`}
                    onClick={() => onAdd(item.itemId, item.name, item.price, item.sizeLabel)}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform duration-100"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="px-4 pb-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-[15px] font-medium text-foreground">{tr.total}</span>
            <span
              data-testid="text-cart-total"
              className="text-[20px] font-semibold text-foreground tabular-nums"
            >
              {formatPrice(total)}
            </span>
          </div>
          <button
            data-testid="button-place-order"
            onClick={onCheckout}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground text-[16px] font-semibold active:scale-[0.98] transition-all duration-100 shadow-md flex items-center justify-center gap-2"
          >
            {tr.placeOrder}
          </button>
        </div>
      )}
    </div>
  );
}
