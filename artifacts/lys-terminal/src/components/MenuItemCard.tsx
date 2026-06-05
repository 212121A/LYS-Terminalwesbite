import { useState, memo } from "react";
import { Plus, Minus, Flame, Check } from "lucide-react";
import { MenuItem, DRINK_ITEM_IDS } from "@/data/menu";
import { useLang } from "@/i18n/LanguageContext";
import t from "@/i18n/translations";
import { AllergenCodes } from "@/components/AllergenCodes";

type Carb = "nudel" | "reis";

interface MenuItemCardProps {
  item: MenuItem;
  quantityInCart: (cartId: string) => number;
  onAdd: (itemId: string, name: string, price: number, sizeLabel?: string) => void;
  onRemove: (cartId: string) => void;
  index?: number;
}

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",") + " €";
}

function MenuItemCardBase({ item, quantityInCart, onAdd, onRemove, index = 0 }: MenuItemCardProps) {
  const { tr } = useLang();
  const [carb, setCarb] = useState<Carb>("nudel");
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const cardDelay = Math.min(index, 10) * 40;

  const flash = (key: string) => {
    setFlashKey(key);
    window.setTimeout(() => setFlashKey((current) => (current === key ? null : current)), 900);
  };

  const displayName =
    item.dishType && tr.dishNames[item.dishType] ? tr.dishNames[item.dishType] : item.name;

  const getSizeLabel = (label: string) => {
    if (label === "Klein") return tr.sizeSmall;
    if (label === "Groß") return tr.sizeLarge;
    return label;
  };

  if (item.sizeOptions && item.sizeOptions.length > 0) {
    return (
      <div
        style={{ animationDelay: `${cardDelay}ms` }}
        className="bg-card border border-card-border rounded-xl p-4 min-[1600px]:p-8 shadow-[0_6px_20px_rgba(96,77,65,0.18)] hover:shadow-[0_10px_28px_rgba(96,77,65,0.26)] transition-shadow duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
        data-testid={`card-menuitem-${item.id}`}
      >
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] min-[1600px]:text-[18px] font-medium text-foreground/60 border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 min-[1600px]:px-3 min-[1600px]:py-1 rounded font-mono">
              {item.number}
            </span>
            {item.spicy && <Flame size={14} className="text-orange-500" />}
          </div>
          <h3 className="font-medium text-foreground text-[15px] min-[1600px]:text-[32px] leading-snug">{displayName}</h3>
          {item.description && (
            <p className="text-muted-foreground text-[13px] min-[1600px]:text-[22px] mt-1 leading-relaxed">{item.description}</p>
          )}
          <AllergenCodes allergens={item.allergens} additives={item.additives} />
        </div>
        <div className="flex flex-col gap-2">
          {item.sizeOptions.map((size) => {
            const cartId = `${item.id}-${size.label}`;
            const qty = quantityInCart(cartId);
            const translatedLabel = getSizeLabel(size.label);
            return (
              <div key={size.label} className="flex items-center justify-between">
                <span className="text-[13px] min-[1600px]:text-[24px] text-muted-foreground">{translatedLabel}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] min-[1600px]:text-[28px] font-medium text-foreground tabular-nums">
                    {formatPrice(size.price)}
                  </span>
                  {qty === 0 ? (
                    <button
                      data-testid={`button-add-${item.id}-${size.label}`}
                      onClick={() => { onAdd(item.id, `${displayName} (${translatedLabel})`, size.price, size.label); flash(cartId); }}
                      className={`w-9 h-9 min-[1600px]:w-16 min-[1600px]:h-16 rounded-full flex items-center justify-center active:scale-90 transition-all duration-150 shadow-sm ${flashKey === cartId ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground"}`}
                    >
                      {flashKey === cartId ? <Check size={18} strokeWidth={3} className="lys-pop min-[1600px]:w-8 min-[1600px]:h-8" /> : <Plus size={18} strokeWidth={2.5} className="min-[1600px]:w-8 min-[1600px]:h-8" />}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        data-testid={`button-remove-${item.id}-${size.label}`}
                        onClick={() => onRemove(cartId)}
                        className="w-9 h-9 min-[1600px]:w-16 min-[1600px]:h-16 rounded-full bg-secondary border border-card-border text-foreground flex items-center justify-center active:scale-95 transition-transform duration-100"
                      >
                        <Minus size={16} strokeWidth={2.5} />
                      </button>
                      <span
                        data-testid={`text-qty-${item.id}-${size.label}`}
                        className="text-[15px] min-[1600px]:text-[26px] font-semibold text-foreground w-5 min-[1600px]:w-10 text-center tabular-nums"
                      >
                        {qty}
                      </span>
                      <button
                        data-testid={`button-add-more-${item.id}-${size.label}`}
                        onClick={() => { onAdd(item.id, `${displayName} (${translatedLabel})`, size.price, size.label); flash(cartId); }}
                        className={`w-9 h-9 min-[1600px]:w-16 min-[1600px]:h-16 rounded-full flex items-center justify-center active:scale-90 transition-all duration-150 shadow-sm ${flashKey === cartId ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground"}`}
                      >
                        {flashKey === cartId ? <Check size={18} strokeWidth={3} className="lys-pop min-[1600px]:w-8 min-[1600px]:h-8" /> : <Plus size={18} strokeWidth={2.5} className="min-[1600px]:w-8 min-[1600px]:h-8" />}
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

  const carbLabel = carb === "nudel" ? tr.carbNudel : tr.carbReis;
  // Die Variante, die in den Warenkorb und damit an die Küche geht, ist IMMER
  // deutsch — das Dashboard zeigt „Nudel"/„Reis" sprachunabhängig. Die Anzeige
  // im Warenkorb bleibt über `addName` in der gewählten Sprache.
  const carbKitchen = carb === "nudel" ? t.de.carbNudel : t.de.carbReis;
  const variantLabel = item.requiresCarbChoice ? carbKitchen : undefined;
  const cartId = variantLabel ? `${item.id}-${variantLabel}` : item.id;
  // Speisen ohne eigene Soßen-Kategorie öffnen beim „+" das (optionale) Soßen-Modal;
  // daher kein Inline-Zähler, sondern nur ein „+"-Button (qty = 0). Soßen-Gerichte
  // mit Nudel/Reis-Wahl (requiresCarbChoice) bringen ihre Soße schon mit → normaler Zähler.
  const needsModal =
    item.optionProfile != null || (!DRINK_ITEM_IDS.has(item.id) && !item.requiresCarbChoice);
  const qty = needsModal ? 0 : quantityInCart(cartId);
  const addName = item.requiresCarbChoice ? `${displayName} · ${carbLabel}` : displayName;
  const handleAdd = () => onAdd(item.id, addName, item.price, variantLabel);
  const handleAddFlash = () => {
    handleAdd();
    if (!needsModal) flash(cartId);
  };

  return (
    <div
      style={{ animationDelay: `${cardDelay}ms` }}
      className="bg-card border border-card-border rounded-xl p-4 min-[1600px]:p-8 flex items-center justify-between gap-4 min-[1600px]:gap-8 shadow-[0_6px_20px_rgba(96,77,65,0.18)] hover:shadow-[0_10px_28px_rgba(96,77,65,0.26)] transition-shadow duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      data-testid={`card-menuitem-${item.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] min-[1600px]:text-[18px] font-medium text-foreground/60 border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 min-[1600px]:px-3 min-[1600px]:py-1 rounded font-mono">
            {item.number}
          </span>
          {item.spicy && <Flame size={14} className="text-orange-500" />}
        </div>
        <h3 className="font-medium text-foreground text-[15px] min-[1600px]:text-[32px] leading-snug">{displayName}</h3>
        {item.description && (
          <p className="text-muted-foreground text-[13px] min-[1600px]:text-[22px] mt-0.5 leading-relaxed">{item.description}</p>
        )}
        <AllergenCodes allergens={item.allergens} additives={item.additives} />
        {item.requiresCarbChoice && (
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
                  className={`px-4 py-1.5 min-[1600px]:px-8 min-[1600px]:py-3 rounded-full text-[13px] min-[1600px]:text-[24px] font-medium transition-all duration-150 ${
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
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[15px] min-[1600px]:text-[28px] font-medium text-foreground tabular-nums">
          {formatPrice(item.price)}
        </span>

        {qty === 0 ? (
          <button
            data-testid={`button-add-${item.id}`}
            onClick={handleAddFlash}
            className={`w-10 h-10 min-[1600px]:w-20 min-[1600px]:h-20 rounded-full flex items-center justify-center active:scale-90 transition-all duration-150 shadow-sm ${flashKey === cartId ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground"}`}
          >
            {flashKey === cartId ? <Check size={20} strokeWidth={3} className="lys-pop min-[1600px]:w-10 min-[1600px]:h-10" /> : <Plus size={20} strokeWidth={2.5} className="min-[1600px]:w-10 min-[1600px]:h-10" />}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              data-testid={`button-remove-${item.id}`}
              onClick={() => onRemove(cartId)}
              className="w-10 h-10 min-[1600px]:w-20 min-[1600px]:h-20 rounded-full bg-secondary border border-card-border text-foreground flex items-center justify-center active:scale-95 transition-transform duration-100"
            >
              <Minus size={18} strokeWidth={2.5} className="min-[1600px]:w-9 min-[1600px]:h-9" />
            </button>
            <span
              data-testid={`text-qty-${item.id}`}
              className="text-[16px] min-[1600px]:text-[28px] font-semibold text-foreground w-6 min-[1600px]:w-12 text-center tabular-nums"
            >
              {qty}
            </span>
            <button
              data-testid={`button-add-more-${item.id}`}
              onClick={handleAddFlash}
              className={`w-10 h-10 min-[1600px]:w-20 min-[1600px]:h-20 rounded-full flex items-center justify-center active:scale-90 transition-all duration-150 shadow-sm ${flashKey === cartId ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground"}`}
            >
              {flashKey === cartId ? <Check size={20} strokeWidth={3} className="lys-pop min-[1600px]:w-10 min-[1600px]:h-10" /> : <Plus size={20} strokeWidth={2.5} className="min-[1600px]:w-10 min-[1600px]:h-10" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const MenuItemCard = memo(MenuItemCardBase);
