import { useState, memo } from "react";
import { Plus, Minus, Flame, Check } from "lucide-react";
import { MenuItem, DRINK_ITEM_IDS, DIRECT_ADD_ITEM_IDS } from "@/data/menu";
import { TOPPING_ITEM_IDS } from "@/data/toppings";
import { useLang } from "@/i18n/LanguageContext";
import t from "@/i18n/translations";
import { AllergenInfo } from "@/components/AllergenInfo";
import { additivesForCarb } from "@/data/allergens";
import { Price } from "@/components/Price";
import { ProductImage } from "@/components/ProductImage";
import { useAvailability } from "@/availability/AvailabilityContext";
import { dishAvailabilityId } from "@/lib/availability";

type Carb = "nudel" | "reis";

interface MenuItemCardProps {
  item: MenuItem;
  quantityInCart: (cartId: string) => number;
  onAdd: (itemId: string, name: string, price: number, sizeLabel?: string) => void;
  onRemove: (cartId: string) => void;
  index?: number;
  /** Fallback-Bild der Kategorie, falls das Item (noch) kein eigenes `image` hat. */
  categoryImage?: string;
}

/** Einheitliche Hochformat-Card: Bild oben randlos → Meta → Name → (Optionen)
 *  → Preis + „+". Eine Bildsprache für alle Produkte, fingerfreundliche Targets.
 *  Cart-State/Modal-Logik bleibt unverändert (läuft über `onAdd`/`onRemove`). */
function MenuItemCardBase({ item, quantityInCart, onAdd, onRemove, index = 0, categoryImage }: MenuItemCardProps) {
  const { tr } = useLang();
  const { isItemSoldOut } = useAvailability();
  const soldOut = isItemSoldOut(dishAvailabilityId(item));
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

  // Nudeln bringen E621 (g) mit, Reis nicht — bei Soßen-Gerichten je Carb-Wahl.
  const allergenList = item.allergens ?? [];
  const additiveList = item.requiresCarbChoice
    ? additivesForCarb(item.additives, carb)
    : item.additives ?? [];

  /** 64×64 „+"-Button mit Tap-Scale + grünem Check-Flash. */
  const addButton = (cartId: string, onClick: () => void, testId: string) => (
    <button
      data-testid={testId}
      onClick={() => { onClick(); flash(cartId); }}
      className={`w-24 h-24 min-[1600px]:w-32 min-[1600px]:h-32 rounded-full flex items-center justify-center shrink-0 shadow-sm active:scale-90 transition-all duration-150 ${
        flashKey === cartId ? "bg-emerald-700 text-white" : "bg-emerald-600 text-white"
      }`}
    >
      {flashKey === cartId
        ? <Check size={40} strokeWidth={3} className="lys-pop min-[1600px]:w-16 min-[1600px]:h-16" />
        : <Plus size={40} strokeWidth={2.5} className="min-[1600px]:w-16 min-[1600px]:h-16" />}
    </button>
  );

  /** Minus / Menge / Plus — wenn schon im Warenkorb. */
  const stepper = (cartId: string, qty: number, onAddClick: () => void, suffix = "") => (
    <div className="flex items-center gap-2 shrink-0">
      <button
        data-testid={`button-remove-${item.id}${suffix}`}
        onClick={() => onRemove(cartId)}
        className="w-16 h-16 min-[1600px]:w-20 min-[1600px]:h-20 rounded-full bg-secondary border border-card-border text-foreground flex items-center justify-center active:scale-95 transition-transform duration-100"
      >
        <Minus size={22} strokeWidth={2.5} className="min-[1600px]:w-9 min-[1600px]:h-9" />
      </button>
      <span
        data-testid={`text-qty-${item.id}${suffix}`}
        className="text-[18px] min-[1600px]:text-[28px] font-semibold text-foreground w-7 min-[1600px]:w-12 text-center tabular-nums"
      >
        {qty}
      </span>
      {addButton(cartId, onAddClick, `button-add-more-${item.id}${suffix}`)}
    </div>
  );

  if (soldOut) {
    return (
      <div
        data-testid={`card-menuitem-${item.id}`}
        aria-disabled="true"
        className="bg-card border border-card-border rounded-3xl overflow-hidden flex flex-col opacity-55 pointer-events-none select-none"
      >
        <div className="relative">
          <ProductImage src={item.image ?? categoryImage} alt={displayName} className="grayscale" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-foreground/80 text-background text-[13px] font-semibold">
              {tr.soldOut}
            </span>
          </span>
        </div>
        <div className="p-4 min-[1600px]:p-6">
          <h3 className="font-medium text-foreground text-[16px] min-[1600px]:text-[28px] line-through leading-snug">{displayName}</h3>
          <span className="text-[14px] min-[1600px]:text-[22px] font-medium text-muted-foreground tabular-nums">
            <Price value={item.price} />
          </span>
        </div>
      </div>
    );
  }

  // Items, die beim „+" ein Modal öffnen (Extra-Soße, Bowl-Toppings, Smoothie-
  // Auswahl, Milch-Optionen, Soßen-Gerichte). Diese bekommen keinen Inline-
  // Zähler, sondern nur einen „+"-Button. Vorspeisen/Kem/Kids: direkter Zähler.
  const needsModal =
    item.optionProfile != null ||
    TOPPING_ITEM_IDS.has(item.id) ||
    (!DRINK_ITEM_IDS.has(item.id) && !DIRECT_ADD_ITEM_IDS.has(item.id));

  const carbLabel = carb === "nudel" ? tr.carbNudel : tr.carbReis;
  // Die Variante, die in den Warenkorb und an die Küche geht, ist IMMER deutsch
  // — das Dashboard zeigt „Nudel"/„Reis" sprachunabhängig. Die Anzeige im
  // Warenkorb bleibt über `addName` in der gewählten Sprache.
  const carbKitchen = carb === "nudel" ? t.de.carbNudel : t.de.carbReis;
  const variantLabel = item.requiresCarbChoice ? carbKitchen : undefined;
  const singleCartId = variantLabel ? `${item.id}-${variantLabel}` : item.id;
  const addName = item.requiresCarbChoice ? `${displayName} · ${carbLabel}` : displayName;

  const metaRow = (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-[12px] min-[1600px]:text-[18px] font-medium text-foreground/60 border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 min-[1600px]:px-3 min-[1600px]:py-1 rounded font-mono">
        {item.number}
      </span>
      {item.spicy && <Flame size={15} className="text-orange-500" />}
      <AllergenInfo dishName={displayName} allergens={allergenList} additives={additiveList} testId={`button-allergen-${item.id}`} />
    </div>
  );

  const carbToggle = item.requiresCarbChoice ? (
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
              selected ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70"
            }`}
          >
            <span className="text-[19px] min-[1600px]:text-[30px] leading-none">{symbol}</span>
            {label}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div
      style={{ animationDelay: `${cardDelay}ms` }}
      className="bg-card border border-card-border rounded-3xl overflow-hidden flex flex-col lys-card animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      data-testid={`card-menuitem-${item.id}`}
    >
      <ProductImage src={item.image ?? categoryImage} alt={displayName} />

      <div className="flex flex-col gap-2 p-3 min-[1600px]:p-5 flex-1">
        {metaRow}
        <h3 className="font-medium text-foreground text-[17px] min-[1600px]:text-[30px] leading-snug">{displayName}</h3>
        {item.description && !item.optionProfile && (
          <p className="text-muted-foreground text-[13px] min-[1600px]:text-[20px] leading-relaxed line-clamp-2">{item.description}</p>
        )}

        <div className="flex-1" />

        {carbToggle}

        {item.sizeOptions && item.sizeOptions.length > 0 ? (
          <div className="flex flex-col gap-2.5 pt-1">
            {item.sizeOptions.map((size) => {
              const cartId = `${item.id}-${size.label}`;
              const qty = quantityInCart(cartId);
              const translatedLabel = getSizeLabel(size.label);
              const doAdd = () => onAdd(item.id, `${displayName} (${translatedLabel})`, size.price, size.label);
              return (
                <div key={size.label} className="flex items-center justify-between gap-2">
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-[14px] min-[1600px]:text-[22px] text-muted-foreground">{translatedLabel}</span>
                    <span className="text-[17px] min-[1600px]:text-[28px] font-semibold text-foreground tabular-nums">
                      <Price value={size.price} />
                    </span>
                  </div>
                  {qty === 0
                    ? addButton(cartId, doAdd, `button-add-${item.id}-${size.label}`)
                    : stepper(cartId, qty, doAdd, `-${size.label}`)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[19px] min-[1600px]:text-[30px] font-semibold text-foreground tabular-nums">
              <Price value={item.price} />
            </span>
            {(() => {
              const qty = needsModal ? 0 : quantityInCart(singleCartId);
              const doAdd = () => onAdd(item.id, addName, item.price, variantLabel);
              return qty === 0
                ? addButton(singleCartId, doAdd, `button-add-${item.id}`)
                : stepper(singleCartId, qty, doAdd);
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

export const MenuItemCard = memo(MenuItemCardBase);
