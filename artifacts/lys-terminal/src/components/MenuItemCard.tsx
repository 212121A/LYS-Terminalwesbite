import { Plus, Minus, Flame } from "lucide-react";
import { MenuItem } from "@/data/menu";

interface MenuItemCardProps {
  item: MenuItem;
  quantityInCart: (cartId: string) => number;
  onAdd: (itemId: string, name: string, price: number, sizeLabel?: string) => void;
  onRemove: (cartId: string) => void;
}

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",") + " €";
}

export function MenuItemCard({ item, quantityInCart, onAdd, onRemove }: MenuItemCardProps) {
  if (item.sizeOptions && item.sizeOptions.length > 0) {
    return (
      <div
        className="bg-card border border-card-border rounded-xl p-4 transition-all duration-150"
        data-testid={`card-menuitem-${item.id}`}
      >
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium text-foreground/60 border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 rounded font-mono">
              {item.number}
            </span>
            {item.spicy && <Flame size={14} className="text-orange-500" />}
          </div>
          <h3 className="font-medium text-foreground text-[15px] leading-snug">{item.name}</h3>
          {item.description && (
            <p className="text-muted-foreground text-[13px] mt-1 leading-relaxed">{item.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {item.sizeOptions.map((size) => {
            const cartId = `${item.id}-${size.label}`;
            const qty = quantityInCart(cartId);
            return (
              <div key={size.label} className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">{size.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-medium text-foreground tabular-nums">
                    {formatPrice(size.price)}
                  </span>
                  {qty === 0 ? (
                    <button
                      data-testid={`button-add-${item.id}-${size.label}`}
                      onClick={() => onAdd(item.id, `${item.name} (${size.label})`, size.price, size.label)}
                      className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform duration-100 shadow-sm"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        data-testid={`button-remove-${item.id}-${size.label}`}
                        onClick={() => onRemove(cartId)}
                        className="w-9 h-9 rounded-full bg-secondary border border-card-border text-foreground flex items-center justify-center active:scale-95 transition-transform duration-100"
                      >
                        <Minus size={16} strokeWidth={2.5} />
                      </button>
                      <span
                        data-testid={`text-qty-${item.id}-${size.label}`}
                        className="text-[15px] font-semibold text-foreground w-5 text-center tabular-nums"
                      >
                        {qty}
                      </span>
                      <button
                        data-testid={`button-add-more-${item.id}-${size.label}`}
                        onClick={() => onAdd(item.id, `${item.name} (${size.label})`, size.price, size.label)}
                        className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform duration-100 shadow-sm"
                      >
                        <Plus size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const qty = quantityInCart(item.id);

  return (
    <div
      className="bg-card border border-card-border rounded-xl p-4 flex items-center justify-between gap-4 transition-all duration-150"
      data-testid={`card-menuitem-${item.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-medium text-foreground/60 border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 rounded font-mono">
            {item.number}
          </span>
          {item.spicy && <Flame size={14} className="text-orange-500" />}
        </div>
        <h3 className="font-medium text-foreground text-[15px] leading-snug">{item.name}</h3>
        {item.description && (
          <p className="text-muted-foreground text-[13px] mt-0.5">{item.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[15px] font-medium text-foreground tabular-nums">
          {formatPrice(item.price)}
        </span>

        {qty === 0 ? (
          <button
            data-testid={`button-add-${item.id}`}
            onClick={() => onAdd(item.id, item.name, item.price)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform duration-100 shadow-sm"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              data-testid={`button-remove-${item.id}`}
              onClick={() => onRemove(item.id)}
              className="w-10 h-10 rounded-full bg-secondary border border-card-border text-foreground flex items-center justify-center active:scale-95 transition-transform duration-100"
            >
              <Minus size={18} strokeWidth={2.5} />
            </button>
            <span
              data-testid={`text-qty-${item.id}`}
              className="text-[16px] font-semibold text-foreground w-6 text-center tabular-nums"
            >
              {qty}
            </span>
            <button
              data-testid={`button-add-more-${item.id}`}
              onClick={() => onAdd(item.id, item.name, item.price)}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform duration-100 shadow-sm"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
