import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { menuData, DRINK_ITEM_IDS, DIRECT_ADD_ITEM_IDS, type MenuItem } from "@/data/menu";
import { BOX_ITEM_IDS, BOX_SAUCES, BOX_VEG_ITEM_IDS, NO_SAUCE_LABEL, NO_VEG_LABEL, type BoxSauce } from "@/data/boxSauces";
import { toppingsConfigFor, TOPPING_ITEM_IDS, selectedIdsFromLabel } from "@/data/toppings";
import { useCart, type CartItemEditMeta } from "@/store/cart";
import { MenuItemCard } from "@/components/MenuItemCard";
import { BoxItemCard } from "@/components/BoxItemCard";
import { CartPanel } from "@/components/CartPanel";
import { CategoryNav } from "@/components/CategoryNav";
import { PaymentModal } from "@/components/PaymentModal";
import { SauceModal } from "@/components/SauceModal";
import { ToppingsModal } from "@/components/ToppingsModal";
import { ItemOptionsModal } from "@/components/ItemOptionsModal";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AllergenLegendModal } from "@/components/AllergenLegendModal";
import { DiscountBadge } from "@/components/DiscountBadge";
import { StaffEditOverlay } from "@/components/StaffEditOverlay";
import { useLang } from "@/i18n/LanguageContext";
import { discountedPrice, formatPrice } from "@/lib/discount";
import { ShoppingCart, Home, Info } from "lucide-react";

interface PendingSauce {
  itemId: string;
  name: string;
  price: number;
  initialSauceId?: BoxSauce["id"];
  initialNoSauce?: boolean;
  initialNoVeg?: boolean;
}

interface PendingExtraSauce {
  itemId: string;
  baseName: string;
  basePrice: number;
  baseSizeLabel?: string;
  initialSauceId?: BoxSauce["id"];
  initialNoVeg?: boolean;
}

/** Soßen-Gericht (C/B/S/E/M) mit fester Soße: Modifier-Modal für „Keine Soße"
 *  und „Ohne Gemüse". Carb (Nudel/Reis) kommt schon von der Card mit. */
interface PendingSauceDish {
  itemId: string;
  /** Anzeigename inkl. Carb, ohne Modifikatoren (z. B. „Hähnchen … · Nudel"). */
  baseName: string;
  basePrice: number;
  /** Deutsches Carb-Label fürs `sizeLabel` (Küche): „Nudel" oder „Reis". */
  carbLabel: string;
  allowNoVeg: boolean;
  initialNoSauce?: boolean;
  initialNoVeg?: boolean;
}

interface PendingToppings {
  itemId: string;
  name: string;
  /** Basispreis ohne Toppings/Extras. */
  price: number;
  initialSelectedIds?: string[];
}

interface PendingItemOptions {
  itemId: string;
  name: string;
  price: number;
  profile: NonNullable<MenuItem["optionProfile"]>;
  initialPreparationId?: string;
  initialMilkId?: string;
}

const DRINK_CATEGORY_IDS = new Set([
  "matcha-getraenke", "ca-phe", "tra-eistee", "soda", "smoothies", "softgetraenke",
]);
const DRINK_CATEGORIES = menuData.filter((c) => DRINK_CATEGORY_IDS.has(c.id));
/** Speisen ohne Getränke; Nudel-/Reisboxen ganz nach vorne. */
const FOOD_CATEGORIES = (() => {
  const food = menuData.filter((c) => !DRINK_CATEGORY_IDS.has(c.id));
  return [
    ...food.filter((c) => c.id === "nudel-reisboxen"),
    ...food.filter((c) => c.id !== "nudel-reisboxen"),
  ];
})();
type MenuView = "food" | "drinks";

/** Zerlegt ein Soßen-`sizeLabel` (z. B. „Sojasoße · Ohne Gemüse") für den
 *  Edit-Restore in Soße, „Keine Soße" und „Ohne Gemüse". */
function parseSauceSizeLabel(sizeLabel?: string) {
  const parts = (sizeLabel ?? "").split(" · ").map((p) => p.trim()).filter(Boolean);
  return {
    sauce: BOX_SAUCES.find((s) => parts.includes(s.label)) ?? null,
    noSauce: parts.includes(NO_SAUCE_LABEL),
    withoutVeg: parts.includes(NO_VEG_LABEL),
  };
}

export function Terminal() {
  const [, setLocation] = useLocation();
  const { items, addItem, removeItem, removeLine, clearCart, total, itemCount } = useCart();
  const { tr } = useLang();
  const [view, setView] = useState<MenuView>("food");
  const [activeCategory, setActiveCategory] = useState(FOOD_CATEGORIES[0]?.id ?? menuData[0].id);
  const visibleCategories = view === "drinks" ? DRINK_CATEGORIES : FOOD_CATEGORIES;
  const [showPayment, setShowPayment] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);
  const [pendingSauce, setPendingSauce] = useState<PendingSauce | null>(null);
  const [pendingExtraSauce, setPendingExtraSauce] = useState<PendingExtraSauce | null>(null);
  const [pendingSauceDish, setPendingSauceDish] = useState<PendingSauceDish | null>(null);
  const [pendingToppings, setPendingToppings] = useState<PendingToppings | null>(null);
  const [pendingItemOptions, setPendingItemOptions] = useState<PendingItemOptions | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showAllergens, setShowAllergens] = useState(false);
  const [editingCartId, setEditingCartId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState(1);
  const [staffOpen, setStaffOpen] = useState(false);
  const staffTimer = useRef<number | null>(null);

  const startStaffPress = () => {
    staffTimer.current = window.setTimeout(() => setStaffOpen(true), 2000);
  };
  const cancelStaffPress = () => {
    if (staffTimer.current) { window.clearTimeout(staffTimer.current); staffTimer.current = null; }
  };
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  /** Zeitstempel, bis zu dem der Scroll-Spy gesperrt ist (programmatisches Scrollen). */
  const navLockRef = useRef(0);

  const menuItemById = useMemo(() => {
    const entries = menuData.flatMap((category) =>
      category.items.map((item) => [item.id, item] as const),
    );
    return new Map<string, MenuItem>(entries);
  }, []);

  /** Alte URLs `/?payment=success` → dedizierte Erfolgsseite wie LYS Website. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      clearCart();
      const sid = params.get("session_id");
      const next = sid
        ? `/success?session_id=${encodeURIComponent(sid)}`
        : "/success";
      setLocation(next);
      return;
    }
    if (payment === "cancel") {
      setLocation("/cancel");
    }
  }, [clearCart, setLocation]);

  const quantityInCart = useCallback((cartId: string) => {
    const item = items.find((i) => i.id === cartId);
    return item ? item.quantity : 0;
  }, [items]);

  /** Fängt Klicks auf „+" bei Nudel-/Reisboxen ab und öffnet die Soßen-Auswahl.
   *  Für alle anderen Items – und beim erneuten „+" aus dem Warenkorb (mit bereits
   *  gesetztem `sizeLabel` = Soßenname) – geht es direkt in den Warenkorb. */
  const handleAdd = useCallback((
    itemId: string,
    name: string,
    price: number,
    sizeLabel?: string,
  ) => {
    const menuItem = menuItemById.get(itemId);
    if (!sizeLabel && menuItem?.optionProfile) {
      setPendingItemOptions({
        itemId,
        name,
        price,
        profile: menuItem.optionProfile,
      });
      return;
    }

    if (!sizeLabel && BOX_ITEM_IDS.has(itemId)) {
      setPendingSauce({ itemId, name, price });
      return;
    }

    // Bowls & Smoothie: statt einer Soße ein Auswahl-Modal (Toppings bzw.
    // Frucht + Extras mit Aufpreis).
    if (!sizeLabel && TOPPING_ITEM_IDS.has(itemId)) {
      setPendingToppings({ itemId, name, price });
      return;
    }

    // Soßen-Gerichte (C/B/S/E/M) mit Carb-Wahl: feste Soße aus der Kategorie,
    // aber „Keine Soße" und „Ohne Gemüse" wählbar. Die Card liefert den Carb
    // (Nudel/Reis) bereits als deutsches `sizeLabel`. Mehrfach-„+" aus dem
    // Warenkorb ruft addItem direkt und landet daher nicht hier.
    if (menuItem?.requiresCarbChoice && sizeLabel) {
      setPendingSauceDish({
        itemId,
        baseName: name,
        basePrice: price,
        carbLabel: sizeLabel,
        allowNoVeg: menuItem.dishType !== "gemüse",
      });
      return;
    }

    // Übrige Speisen ohne eigene Soßen-Kategorie: optionale Extra-Soße
    // (aktuell nur noch Gebratener Reis). Ausgenommen: Soßen-Gerichte mit
    // Nudel/Reis-Wahl (bringen ihre Soße mit), Items mit Topping-Modal sowie
    // Vorspeisen/Kem/Kids (gehen direkt in den Warenkorb).
    if (
      !DRINK_ITEM_IDS.has(itemId) &&
      !BOX_ITEM_IDS.has(itemId) &&
      !TOPPING_ITEM_IDS.has(itemId) &&
      !DIRECT_ADD_ITEM_IDS.has(itemId) &&
      !menuItem?.requiresCarbChoice
    ) {
      setPendingExtraSauce({ itemId, baseName: name, basePrice: price, baseSizeLabel: sizeLabel });
      return;
    }

    addItem(itemId, name, price, sizeLabel);
  }, [menuItemById, addItem]);

  /** Fügt hinzu — bzw. ersetzt beim Bearbeiten die alte Zeile unter Erhalt der Menge. */
  const commitItem = (
    itemId: string,
    name: string,
    price: number,
    sizeLabel: string | undefined,
    edit: CartItemEditMeta,
  ) => {
    const times = editingCartId ? editingQty : 1;
    if (editingCartId) removeLine(editingCartId);
    for (let i = 0; i < times; i++) addItem(itemId, name, price, sizeLabel, edit);
    setEditingCartId(null);
    setEditingQty(1);
  };

  const handleSauceConfirm = (sauce: BoxSauce | null, withoutVeg: boolean) => {
    if (!pendingSauce) return;
    const parts = [sauce ? sauce.label : NO_SAUCE_LABEL, withoutVeg ? NO_VEG_LABEL : null]
      .filter(Boolean) as string[];
    const sizeLabel = parts.join(" · ");
    commitItem(
      pendingSauce.itemId,
      `${pendingSauce.name} · ${sizeLabel}`,
      pendingSauce.price,
      sizeLabel,
      { kind: "sauce", baseName: pendingSauce.name, basePrice: pendingSauce.price },
    );
    setPendingSauce(null);
  };

  const handleExtraSauceConfirm = (sauce: BoxSauce | null, withoutVeg: boolean) => {
    if (!pendingExtraSauce) return;
    const { itemId, baseName, basePrice, baseSizeLabel } = pendingExtraSauce;
    const edit: CartItemEditMeta = { kind: "extraSauce", baseName, basePrice, baseSizeLabel };
    const extraParts = [sauce ? sauce.label : null, withoutVeg ? NO_VEG_LABEL : null]
      .filter(Boolean) as string[];
    if (extraParts.length === 0) {
      commitItem(itemId, baseName, basePrice, baseSizeLabel, edit);
    } else {
      const newSizeLabel = [baseSizeLabel, ...extraParts].filter(Boolean).join(" · ");
      const newName = [baseName, ...extraParts].join(" · ");
      commitItem(itemId, newName, basePrice, newSizeLabel, edit);
    }
    setPendingExtraSauce(null);
  };

  const handleSauceDishConfirm = (_sauce: BoxSauce | null, withoutVeg: boolean, noSauce: boolean) => {
    if (!pendingSauceDish) return;
    const { itemId, baseName, basePrice, carbLabel } = pendingSauceDish;
    const mods = [noSauce ? NO_SAUCE_LABEL : null, withoutVeg ? NO_VEG_LABEL : null]
      .filter(Boolean) as string[];
    const sizeLabel = [carbLabel, ...mods].join(" · ");
    const name = [baseName, ...mods].join(" · ");
    commitItem(itemId, name, basePrice, sizeLabel, {
      kind: "sauceDish",
      baseName,
      basePrice,
      baseSizeLabel: carbLabel,
    });
    setPendingSauceDish(null);
  };

  const handleToppingsConfirm = (label: string, totalPrice: number) => {
    if (!pendingToppings) return;
    const { itemId, name, price } = pendingToppings;
    const edit: CartItemEditMeta = { kind: "toppings", baseName: name, basePrice: price };
    commitItem(itemId, label ? `${name} · ${label}` : name, totalPrice, label || undefined, edit);
    setPendingToppings(null);
  };

  const handleItemOptionsConfirm = (selectionLabel: string, totalPrice: number) => {
    if (!pendingItemOptions) return;
    commitItem(
      pendingItemOptions.itemId,
      `${pendingItemOptions.name} · ${selectionLabel}`,
      totalPrice,
      selectionLabel,
      {
        kind: "options",
        baseName: pendingItemOptions.name,
        basePrice: pendingItemOptions.price,
        profile: pendingItemOptions.profile,
      },
    );
    setPendingItemOptions(null);
  };

  /** Öffnet das passende Modal mit Vorauswahl, um eine Warenkorb-Zeile zu ändern. */
  const handleEditItem = (cartId: string) => {
    const item = items.find((i) => i.id === cartId);
    if (!item?.edit) return;
    setEditingCartId(cartId);
    setEditingQty(item.quantity);
    if (item.edit.kind === "sauce") {
      const parsed = parseSauceSizeLabel(item.sizeLabel);
      setPendingSauce({
        itemId: item.itemId,
        name: item.edit.baseName,
        price: item.edit.basePrice,
        initialSauceId: parsed.sauce?.id,
        initialNoSauce: parsed.noSauce,
        initialNoVeg: parsed.withoutVeg,
      });
    } else if (item.edit.kind === "options" && item.edit.profile) {
      const parts = (item.sizeLabel ?? "").split(" · ");
      const [prepLabel, milkLabel] =
        item.edit.profile === "matcha" ? parts : [undefined, parts[0]];
      setPendingItemOptions({
        itemId: item.itemId,
        name: item.edit.baseName,
        price: item.edit.basePrice,
        profile: item.edit.profile,
        initialPreparationId: prepLabel?.toLowerCase(),
        initialMilkId: milkLabel?.toLowerCase(),
      });
    } else if (item.edit.kind === "extraSauce") {
      const parsed = parseSauceSizeLabel(item.sizeLabel);
      setPendingExtraSauce({
        itemId: item.itemId,
        baseName: item.edit.baseName,
        basePrice: item.edit.basePrice,
        baseSizeLabel: item.edit.baseSizeLabel,
        initialSauceId: parsed.sauce?.id,
        initialNoVeg: parsed.withoutVeg,
      });
    } else if (item.edit.kind === "sauceDish") {
      const parsed = parseSauceSizeLabel(item.sizeLabel);
      setPendingSauceDish({
        itemId: item.itemId,
        baseName: item.edit.baseName,
        basePrice: item.edit.basePrice,
        carbLabel: item.edit.baseSizeLabel ?? "",
        allowNoVeg: menuItemById.get(item.itemId)?.dishType !== "gemüse",
        initialNoSauce: parsed.noSauce,
        initialNoVeg: parsed.withoutVeg,
      });
    } else if (item.edit.kind === "toppings") {
      const config = toppingsConfigFor(item.itemId);
      setPendingToppings({
        itemId: item.itemId,
        name: item.edit.baseName,
        price: item.edit.basePrice,
        initialSelectedIds: config ? selectedIdsFromLabel(config, item.sizeLabel) : [],
      });
    }
  };

  const cancelPendingSauce = () => {
    setPendingSauce(null);
    setEditingCartId(null);
  };

  const cancelPendingExtraSauce = () => {
    setPendingExtraSauce(null);
    setEditingCartId(null);
  };

  const cancelPendingSauceDish = () => {
    setPendingSauceDish(null);
    setEditingCartId(null);
  };

  const cancelPendingToppings = () => {
    setPendingToppings(null);
    setEditingCartId(null);
  };

  const cancelPendingOptions = () => {
    setPendingItemOptions(null);
    setEditingCartId(null);
  };

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    // Scroll-Spy kurz sperren, damit das programmatische Scrollen nicht
    // eine Nachbarkategorie aktiviert ("springt eins weiter").
    navLockRef.current = Date.now() + 1500;
    const el = categoryRefs.current[categoryId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleView = (next: MenuView) => {
    if (next === view) return;
    const list = next === "drinks" ? DRINK_CATEGORIES : FOOD_CATEGORIES;
    setView(next);
    setActiveCategory(list[0]?.id ?? "");
    navLockRef.current = Date.now() + 1500;
    menuRef.current?.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const menuEl = menuRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < navLockRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-category-id");
            if (id) setActiveCategory(id);
          }
        }
      },
      {
        root: menuEl,
        threshold: 0.3,
      }
    );

    for (const el of Object.values(categoryRefs.current)) {
      if (el) observer.observe(el);
    }

    // Sobald das (programmatische) Scrollen endet, Scroll-Spy sofort freigeben.
    const onScrollEnd = () => { navLockRef.current = 0; };
    menuEl?.addEventListener("scrollend", onScrollEnd);

    return () => {
      observer.disconnect();
      menuEl?.removeEventListener("scrollend", onScrollEnd);
    };
  }, [view]);

  /** Kiosk-Idle-Reset: nach 90s ohne Interaktion Warenkorb leeren und zur Startseite. */
  useEffect(() => {
    const IDLE_MS = 90_000;
    let timer = window.setTimeout(reset, IDLE_MS);
    function reset() {
      clearCart();
      setLocation("/");
    }
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(reset, IDLE_MS);
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, bump, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, bump);
    };
  }, [clearCart, setLocation]);

  const handleCancelOrder = () => {
    if (itemCount > 0) {
      setShowCancelConfirm(true);
    } else {
      setLocation("/");
    }
  };

  const getCategoryName = (categoryId: string) => {
    const key = categoryId as keyof typeof tr.categories;
    return tr.categories[key] ?? categoryId;
  };

  return (
    <div className="relative flex flex-col h-screen bg-background overflow-hidden animate-in fade-in duration-500">
      <header className="lys-smoke-bg overflow-hidden relative z-10 flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-background min-[1600px]:px-10 min-[1600px]:py-7">
        <button
          type="button"
          aria-label="Personal: Verfügbarkeit bearbeiten"
          onPointerDown={startStaffPress}
          onPointerUp={cancelStaffPress}
          onPointerLeave={cancelStaffPress}
          onContextMenu={(e) => e.preventDefault()}
          className="shrink-0 cursor-default"
        >
          <img
            src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.png`}
            alt="LYS Noodles & Rice"
            className="h-10 md:h-12 w-auto object-contain shrink-0 min-[1600px]:h-20 pointer-events-none select-none"
            draggable={false}
          />
        </button>

        <div className="hidden md:block">
          <h1 className="font-serif text-[22px] font-medium text-primary tracking-wide min-[1600px]:text-[36px]">{tr.order}</h1>
        </div>

        <div className="flex items-center gap-2 min-[1600px]:gap-4">
          <button
            data-testid="button-cancel-order"
            onClick={handleCancelOrder}
            className="flex items-center gap-1.5 h-11 px-3 rounded-xl bg-card border border-card-border text-foreground text-[13px] font-medium active:scale-95 transition-transform min-[1600px]:h-16 min-[1600px]:px-5 min-[1600px]:text-[20px] min-[1600px]:rounded-2xl"
          >
            <Home strokeWidth={1.9} className="w-4 h-4 min-[1600px]:w-7 min-[1600px]:h-7" />
            <span className="hidden sm:inline">{tr.cancelOrder}</span>
          </button>

          <button
            data-testid="button-allergens"
            onClick={() => setShowAllergens(true)}
            className="flex items-center gap-1.5 h-11 px-3 rounded-xl bg-card border border-card-border text-foreground text-[13px] font-medium active:scale-95 transition-transform min-[1600px]:h-16 min-[1600px]:px-5 min-[1600px]:text-[20px] min-[1600px]:rounded-2xl"
          >
            <Info strokeWidth={1.9} className="w-4 h-4 min-[1600px]:w-7 min-[1600px]:h-7" />
            <span className="hidden lg:inline">{tr.allergenInfo}</span>
          </button>

          <LanguageSelector />
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="relative z-10 border-b border-border bg-background shrink-0">
            <div className="flex flex-wrap justify-center items-center gap-2 px-4 pt-3 pb-1 min-[1600px]:gap-4 min-[1600px]:pt-6 min-[1600px]:pb-2">
              {([["food", tr.menuFood], ["drinks", tr.menuDrinks]] as const).map(([v, label]) => (
                <button
                  key={v}
                  data-testid={`button-view-${v}`}
                  onClick={() => handleView(v)}
                  className={`px-6 py-2.5 rounded-full text-[15px] font-semibold transition-all duration-200 active:scale-95 min-[1600px]:px-14 min-[1600px]:py-4 min-[1600px]:text-[26px] ${
                    view === v
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card border border-card-border text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
              <DiscountBadge />
            </div>
            <CategoryNav
              categories={visibleCategories}
              getCategoryName={getCategoryName}
              activeCategory={activeCategory}
              onSelect={handleCategorySelect}
            />
          </div>

          <div
            ref={menuRef}
            className="flex-1 overflow-y-auto scrollbar-hide px-4 pt-2 pb-8"
          >
            {visibleCategories.map((category) => {
              const assetBase = import.meta.env.BASE_URL.replace(/\/$/, "");
              const categoryImages = (category.images ?? []).map(
                (src) => `${assetBase}/${src.replace(/^\//, "")}`,
              );
              return (
                <div
                  key={category.id}
                  data-category-id={category.id}
                  ref={(el) => { categoryRefs.current[category.id] = el; }}
                  className="mb-10 lys-cv-section"
                >
                  <div className="flex items-center gap-3 mb-4 pt-2">
                    <h2 className="font-serif text-[22px] font-semibold text-primary min-[1600px]:text-[112px]">
                      {getCategoryName(category.id)}
                    </h2>
                    <div className="flex-1 h-px bg-primary/20" />
                  </div>

                  <div className="flex flex-col lg:flex-row gap-4 min-[1600px]:gap-10 lg:items-start">
                    {categoryImages.length > 0 && (
                      <div className="hidden lg:flex lg:flex-col gap-4 min-[1600px]:gap-6 shrink-0 w-52 min-[1600px]:w-[42rem] min-[1600px]:sticky min-[1600px]:top-2">
                        {categoryImages.map((src) => (
                          <img
                            key={src}
                            src={src}
                            alt={getCategoryName(category.id)}
                            loading="lazy"
                            decoding="async"
                            className="w-full aspect-[2/3] object-cover rounded-2xl border border-border shadow-md"
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {category.id === "nudel-reisboxen" && (
                        <div className="mb-4 px-4 py-3 bg-muted/60 border border-border rounded-xl text-[13px] text-muted-foreground min-[1600px]:text-[20px] min-[1600px]:px-6 min-[1600px]:py-4">
                          {tr.noodleBoxNote}
                        </div>
                      )}
                      <div className="space-y-2 min-[1600px]:space-y-4 min-[1600px]:max-w-[48rem] min-[1600px]:mx-auto">
                        {category.boxItems
                          ? category.boxItems.map((box, i) => (
                              <BoxItemCard
                                key={box.id}
                                item={box}
                                onAdd={handleAdd}
                                index={i}
                              />
                            ))
                          : category.items.map((item, i) => (
                              <MenuItemCard
                                key={item.id}
                                item={item}
                                quantityInCart={quantityInCart}
                                onAdd={handleAdd}
                                onRemove={removeItem}
                                index={i}
                              />
                            ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {itemCount > 0 && (
          <button
            data-testid="button-open-cart"
            onClick={() => setShowCartMobile(true)}
            aria-label={`${tr.articles(itemCount)} · ${formatPrice(discountedPrice(total))}`}
            className="md:hidden shrink-0 w-20 border-l border-black/10 bg-primary text-primary-foreground flex flex-col items-center justify-center gap-5 active:scale-[0.99] transition-transform shadow-lg"
          >
            <ShoppingCart strokeWidth={2} className="w-7 h-7" />
            <span className="text-[20px] font-bold tabular-nums">{itemCount}</span>
            <span className="text-[15px] font-semibold tabular-nums">{formatPrice(discountedPrice(total))}</span>
          </button>
        )}

        <div className="relative z-10 hidden md:flex w-80 min-[1600px]:w-[34rem] shrink-0 border-l border-border bg-background flex-col">
          <CartPanel
            items={items}
            total={total}
            onAdd={addItem}
            onRemove={removeItem}
            onRemoveLine={removeLine}
            onEdit={handleEditItem}
            onCheckout={() => setShowPayment(true)}
            onClear={clearCart}
          />
        </div>
      </div>

      {showCartMobile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCartMobile(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-background rounded-2xl max-h-[85vh] w-full max-w-2xl min-[1600px]:max-w-[1100px] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 overflow-hidden flex flex-col">
              <CartPanel
                items={items}
                total={total}
                onAdd={addItem}
                onRemove={removeItem}
                onRemoveLine={removeLine}
                onEdit={handleEditItem}
                onCheckout={() => { setShowCartMobile(false); setShowPayment(true); }}
                onClear={clearCart}
              />
            </div>
          </div>
        </div>
      )}

      {showAllergens && <AllergenLegendModal onClose={() => setShowAllergens(false)} />}

      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-[22px] font-semibold text-foreground mb-5">
              {tr.cancelOrderConfirm}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="h-12 rounded-xl bg-muted text-foreground font-medium active:scale-[0.98] transition-transform"
              >
                {tr.cancelOrderKeep}
              </button>
              <button
                data-testid="button-cancel-order-confirm"
                onClick={() => {
                  clearCart();
                  setShowCancelConfirm(false);
                  setLocation("/");
                }}
                className="h-12 rounded-xl bg-destructive text-destructive-foreground font-semibold active:scale-[0.98] transition-transform"
              >
                {tr.cancelOrder}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingSauce && (
        <SauceModal
          dishName={pendingSauce.name}
          initialSauceId={pendingSauce.initialSauceId}
          initialNoSauce={pendingSauce.initialNoSauce}
          initialNoVeg={pendingSauce.initialNoVeg}
          allowNoSauce
          allowNoVeg={BOX_VEG_ITEM_IDS.has(pendingSauce.itemId)}
          onClose={cancelPendingSauce}
          onConfirm={handleSauceConfirm}
        />
      )}

      {pendingExtraSauce && (
        <SauceModal
          dishName={pendingExtraSauce.baseName}
          initialSauceId={pendingExtraSauce.initialSauceId}
          initialNoVeg={pendingExtraSauce.initialNoVeg}
          optional
          allowNoVeg
          onClose={cancelPendingExtraSauce}
          onConfirm={handleExtraSauceConfirm}
        />
      )}

      {pendingSauceDish && (
        <SauceModal
          dishName={pendingSauceDish.baseName}
          modifiersOnly
          allowNoSauce
          allowNoVeg={pendingSauceDish.allowNoVeg}
          initialNoSauce={pendingSauceDish.initialNoSauce}
          initialNoVeg={pendingSauceDish.initialNoVeg}
          onClose={cancelPendingSauceDish}
          onConfirm={handleSauceDishConfirm}
        />
      )}

      {pendingToppings && toppingsConfigFor(pendingToppings.itemId) && (
        <ToppingsModal
          dishName={pendingToppings.name}
          basePrice={pendingToppings.price}
          config={toppingsConfigFor(pendingToppings.itemId)!}
          initialSelectedIds={pendingToppings.initialSelectedIds}
          onClose={cancelPendingToppings}
          onConfirm={handleToppingsConfirm}
        />
      )}

      {pendingItemOptions && (
        <ItemOptionsModal
          itemName={pendingItemOptions.name}
          basePrice={pendingItemOptions.price}
          profile={pendingItemOptions.profile}
          initialPreparationId={pendingItemOptions.initialPreparationId}
          initialMilkId={pendingItemOptions.initialMilkId}
          onClose={cancelPendingOptions}
          onConfirm={handleItemOptionsConfirm}
        />
      )}

      {showPayment && (
        <PaymentModal
          items={items}
          total={total}
          onClose={() => setShowPayment(false)}
          onOrderPlaced={clearCart}
          onAddItem={handleAdd}
        />
      )}

      {staffOpen && <StaffEditOverlay onClose={() => setStaffOpen(false)} />}
    </div>
  );
}
