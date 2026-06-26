import { useState, memo } from "react";
import { Plus, Minus, Flame, Check } from "lucide-react";
import { MenuItem, DRINK_ITEM_IDS, DIRECT_ADD_ITEM_IDS } from "@/data/menu";
import { TOPPING_ITEM_IDS } from "@/data/toppings";
import { useLang } from "@/i18n/LanguageContext";
import t from "@/i18n/translations";
import { AllergenInfo } from "@/components/AllergenInfo";
import { additivesForCarb } from "@/data/allergens";
import { Price } from "@/components/Price";
import { useAvailability } from "@/availability/AvailabilityContext";
import { dishAvailabilityId } from "@/lib/availability";

type Carb = "nudel" | "reis";

/** Transparentes Produkt-/Frucht-Bild je Getränk-Item (Dateien in public/fruits). */
const FRUIT_IMAGE: Record<string, string> = {
  "02": "erdbeere", "03": "mango", "04": "himbeere", "05": "blaubeere", "06": "ananas", "07": "vanille", "08": "kokos",
  "09": "kaffee",
  "15": "passionsfrucht", "16": "lychee", "17": "pfirsich", "18": "zitrone",
  "19": "zitrone", "20": "pfirsich", "21": "lychee", "22": "ananas",
};

/** Items, die mehrere Früchte zeigen (Name nennt mehrere Früchte). */
const FRUIT_MULTI: Record<string, string[]> = {
  "10": ["kaffee", "eis"],
  "11": ["kaffee", "eis"],
  "12": ["kaffee", "eis"],
  "13": ["kaffee", "kokos"],
  "14": ["kaffee", "kokos"],
  "16": ["lychee", "zitrone", "orange"],
  "17": ["pfirsich", "orange"],
  "23": ["banane", "erdbeere", "mango", "ananas", "himbeere", "blaubeere"],
};

interface MenuItemCardProps {
  item: MenuItem;
  quantityInCart: (cartId: string) => number;
  onAdd: (itemId: string, name: string, price: number, sizeLabel?: string) => void;
  onRemove: (cartId: string) => void;
  index?: number;
  /** Quadratische Kachel-Variante (Getränke-Ansicht, große Frucht). */
  tile?: boolean;
}

function MenuItemCardBase({ item, quantityInCart, onAdd, onRemove, index = 0, tile = false }: MenuItemCardProps) {
  const { tr } = useLang();
  const { isItemSoldOut } = useAvailability();
  const soldOut = isItemSoldOut(dishAvailabilityId(item));
  const [carb, setCarb] = useState<Carb>("nudel");
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const cardDelay = Math.min(index, 10) * 40;
  const ASSET = import.meta.env.BASE_URL.replace(/\/$/, "");
  const fruitFile = FRUIT_IMAGE[item.id];
  const fruitSrc = fruitFile ? `${ASSET}/fruits/${fruitFile}.png` : null;
  const mediaFiles = FRUIT_MULTI[item.id] ?? (fruitFile ? [fruitFile] : []);
  const mediaSrcs = mediaFiles.map((f) => `${ASSET}/fruits/${f}.png`);

  const flash = (key: string) => {
    setFlashKey(key);
    window.setTimeout(() => setFlashKey((current) => (current === key ? null : current)), 900);
  };

  const displayName =
    item.dishType && tr.dishNames[item.dishType] ? tr.dishNames[item.dishType] : item.name;

  if (soldOut) {
    return (
      <div
        data-testid={`card-menuitem-${item.id}`}
        aria-disabled="true"
        className="bg-card border border-card-border rounded-xl p-4 flex items-center justify-between gap-4 opacity-50 pointer-events-none select-none"
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground text-[15px] line-through">{displayName}</h3>
          <span className="text-[12px] font-medium text-muted-foreground">{tr.soldOut}</span>
        </div>
        <span className="text-[15px] font-medium text-muted-foreground tabular-nums">
          <Price value={item.price} />
        </span>
      </div>
    );
  }

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

  if (item.sizeOptions && item.sizeOptions.length > 0) {
    return (
      <div
        style={{ animationDelay: `${cardDelay}ms` }}
        className="bg-card border border-card-border rounded-xl p-4 min-[1600px]:p-8 lys-card animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
        data-testid={`card-menuitem-${item.id}`}
      >
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] min-[1600px]:text-[18px] font-medium text-foreground/60 border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 min-[1600px]:px-3 min-[1600px]:py-1 rounded font-mono">
              {item.number}
            </span>
            {item.spicy && <Flame size={14} className="text-orange-500" />}
            <AllergenInfo dishName={displayName} allergens={allergenList} additives={additiveList} testId={`button-allergen-${item.id}`} />
          </div>
          <div className="flex items-center gap-2 min-[1600px]:gap-4">
          <h3 className="font-medium text-foreground text-[15px] min-[1600px]:text-[32px] leading-snug">{displayName}</h3>
          {fruitSrc && (
            <img
              src={fruitSrc}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="w-9 h-9 min-[1600px]:w-20 min-[1600px]:h-20 object-contain shrink-0 drop-shadow-sm"
            />
          )}
        </div>
          {item.description && !item.optionProfile && (
            <p className="text-muted-foreground text-[13px] min-[1600px]:text-[22px] mt-1 leading-relaxed">{item.description}</p>
          )}
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
                    <Price value={size.price} />
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
  // Items, die beim „+" ein Modal öffnen (Extra-Soße, Bowl-Toppings, Smoothie-
  // Auswahl, Milch-Optionen, Soßen-Gerichte mit „Keine Soße"/„Ohne Gemüse"),
  // bekommen keinen Inline-Zähler, sondern nur einen „+"-Button (qty = 0).
  // Vorspeisen/Kem/Kids haben keine Auswahl → normaler Zähler.
  const needsModal =
    item.optionProfile != null ||
    TOPPING_ITEM_IDS.has(item.id) ||
    (!DRINK_ITEM_IDS.has(item.id) && !DIRECT_ADD_ITEM_IDS.has(item.id));
  const qty = needsModal ? 0 : quantityInCart(cartId);
  const addName = item.requiresCarbChoice ? `${displayName} · ${carbLabel}` : displayName;
  const handleAdd = () => onAdd(item.id, addName, item.price, variantLabel);
  const handleAddFlash = () => {
    handleAdd();
    if (!needsModal) flash(cartId);
  };

  const addButton = (extra = "") =>
    qty === 0 ? (
      <button
        data-testid={`button-add-${item.id}`}
        onClick={handleAddFlash}
        className={`w-11 h-11 min-[1600px]:w-20 min-[1600px]:h-20 rounded-full flex items-center justify-center active:scale-90 transition-all duration-150 shadow-sm shrink-0 ${extra} ${flashKey === cartId ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground"}`}
      >
        {flashKey === cartId ? <Check size={20} strokeWidth={3} className="lys-pop min-[1600px]:w-10 min-[1600px]:h-10" /> : <Plus size={20} strokeWidth={2.5} className="min-[1600px]:w-10 min-[1600px]:h-10" />}
      </button>
    ) : (
      <div className="flex items-center gap-2 shrink-0">
        <button
          data-testid={`button-remove-${item.id}`}
          onClick={() => onRemove(cartId)}
          className="w-11 h-11 min-[1600px]:w-20 min-[1600px]:h-20 rounded-full bg-secondary border border-card-border text-foreground flex items-center justify-center active:scale-95 transition-transform duration-100"
        >
          <Minus size={18} strokeWidth={2.5} className="min-[1600px]:w-9 min-[1600px]:h-9" />
        </button>
        <span data-testid={`text-qty-${item.id}`} className="text-[16px] min-[1600px]:text-[28px] font-semibold text-foreground w-6 min-[1600px]:w-12 text-center tabular-nums">{qty}</span>
        <button
          data-testid={`button-add-more-${item.id}`}
          onClick={handleAddFlash}
          className={`w-11 h-11 min-[1600px]:w-20 min-[1600px]:h-20 rounded-full flex items-center justify-center active:scale-90 transition-all duration-150 shadow-sm ${flashKey === cartId ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground"}`}
        >
          {flashKey === cartId ? <Check size={20} strokeWidth={3} className="lys-pop min-[1600px]:w-10 min-[1600px]:h-10" /> : <Plus size={20} strokeWidth={2.5} className="min-[1600px]:w-10 min-[1600px]:h-10" />}
        </button>
      </div>
    );

  if (tile) {
    const hasMedia = mediaSrcs.length > 0;
    const single = mediaSrcs.length === 1;
    const carbToggle = item.requiresCarbChoice ? (
      <div
        role="radiogroup"
        aria-label={tr.carbNudel + " / " + tr.carbReis}
        className="inline-flex items-center self-start rounded-full bg-muted/70 p-1 min-[1600px]:p-1.5 border border-card-border"
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
              className={`px-3.5 py-1 min-[1600px]:px-6 min-[1600px]:py-2 rounded-full text-[12px] min-[1600px]:text-[20px] font-medium transition-all duration-150 ${
                selected ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    ) : null;

    return (
      <div
        style={{ animationDelay: `${cardDelay}ms` }}
        className="bg-card border border-card-border rounded-3xl p-4 min-[1600px]:p-7 aspect-square flex flex-col lys-card animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
        data-testid={`card-menuitem-${item.id}`}
      >
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] min-[1600px]:text-[18px] font-medium text-foreground/60 border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 min-[1600px]:px-3 min-[1600px]:py-1 rounded font-mono">
            {item.number}
          </span>
          {item.spicy && <Flame size={14} className="text-orange-500" />}
          <AllergenInfo dishName={displayName} allergens={allergenList} additives={additiveList} testId={`button-allergen-${item.id}`} />
        </div>

        {hasMedia ? (
          <>
            <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center py-2">
              {single ? (
                <img
                  src={mediaSrcs[0]}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="max-h-full max-w-[78%] object-contain drop-shadow-md"
                />
              ) : (
                <div className="flex flex-wrap items-center justify-center content-center gap-1.5 min-[1600px]:gap-3 max-h-full w-full">
                  {mediaSrcs.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                      className={`object-contain drop-shadow-sm ${
                        mediaSrcs.length <= 2 ? "w-[42%]" : mediaSrcs.length === 3 ? "w-[30%] max-h-[82%]" : "w-[29%] max-h-[46%]"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            <h3 className="font-medium text-foreground text-[14px] min-[1600px]:text-[24px] leading-snug">{displayName}</h3>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-[16px] min-[1600px]:text-[28px] font-semibold text-foreground tabular-nums">
                <Price value={item.price} />
              </span>
              {addButton()}
            </div>
          </>
        ) : (
          <>
            <h3 className="mt-2.5 min-[1600px]:mt-4 font-medium text-foreground text-[16px] min-[1600px]:text-[30px] leading-snug">{displayName}</h3>
            <div className="flex-1" />
            {carbToggle}
            <div className="mt-3 min-[1600px]:mt-5 flex items-center justify-between gap-2">
              <span className="text-[16px] min-[1600px]:text-[28px] font-semibold text-foreground tabular-nums">
                <Price value={item.price} />
              </span>
              {addButton()}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ animationDelay: `${cardDelay}ms` }}
      className="bg-card border border-card-border rounded-xl p-4 min-[1600px]:p-8 flex items-center justify-between gap-4 min-[1600px]:gap-8 lys-card animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      data-testid={`card-menuitem-${item.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] min-[1600px]:text-[18px] font-medium text-foreground/60 border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 min-[1600px]:px-3 min-[1600px]:py-1 rounded font-mono">
            {item.number}
          </span>
          {item.spicy && <Flame size={14} className="text-orange-500" />}
          <AllergenInfo dishName={displayName} allergens={allergenList} additives={additiveList} testId={`button-allergen-${item.id}`} />
        </div>
        <div className="flex items-center gap-2 min-[1600px]:gap-4">
          <h3 className="font-medium text-foreground text-[15px] min-[1600px]:text-[32px] leading-snug">{displayName}</h3>
          {fruitSrc && (
            <img
              src={fruitSrc}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="w-9 h-9 min-[1600px]:w-20 min-[1600px]:h-20 object-contain shrink-0 drop-shadow-sm"
            />
          )}
        </div>
        {item.description && !item.optionProfile && (
          <p className="text-muted-foreground text-[13px] min-[1600px]:text-[22px] mt-0.5 leading-relaxed">{item.description}</p>
        )}
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
          <Price value={item.price} />
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
