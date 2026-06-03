import { useMemo, useState } from "react";
import { X, Plus, AlertCircle, Loader2, ChevronLeft, Check, Package, PackageOpen } from "lucide-react";
import { CartItem } from "@/store/cart";
import { menuData, type MenuItem } from "@/data/menu";
import { BOX_ITEM_IDS } from "@/data/boxSauces";
import { useLang } from "@/i18n/LanguageContext";

interface PaymentModalProps {
  items: CartItem[];
  total: number;
  onClose: () => void;
  onOrderPlaced?: () => void;
  onAddItem: (itemId: string, name: string, price: number) => void;
}

type UpsellStep = "categories" | "drinks" | "checkout";

type BoxOption = "open" | "closed";

interface UpsellCategory {
  id: string;
  label: string;
  tagline: string;
  image: string;
}

const ASSET_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const UPSELL_CATEGORIES: UpsellCategory[] = [
  {
    id: "matcha-getraenke",
    label: "Matcha",
    tagline: "Cremig · auf Wunsch als Frappe",
    image: `${ASSET_BASE}/upsell/matcha.png`,
  },
  {
    id: "soda",
    label: "Soda",
    tagline: "Spritzig & fruchtig",
    image: `${ASSET_BASE}/upsell/soda.png`,
  },
  {
    id: "tra-eistee",
    label: "Eistee",
    tagline: "Hausgemacht & frisch",
    image: `${ASSET_BASE}/upsell/eistee.png`,
  },
];

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",") + " €";
}

const N8N_TERMINAL_WEBHOOK_URL = "https://feal.app.n8n.cloud/webhook/order_made";

async function fetchWithTimeout(input: string, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  const ac = new AbortController();
  const t = window.setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ac.signal });
  } finally {
    window.clearTimeout(t);
  }
}

type PayAtCounterResponse = {
  successUrl: string;
  orderNumber: string;
};

function kitchenItemId(item: CartItem) {
  return item.sizeLabel ? `${item.itemId} ${item.sizeLabel}` : item.itemId;
}

async function submitPayAtCounter(items: CartItem[], boxOption: BoxOption | null): Promise<PayAtCounterResponse> {
  const baseUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
  const lineItems = items.map((item) => ({
    id: kitchenItemId(item),
    cartId: item.id,
    itemId: item.itemId,
    name: item.name,
    sizeLabel: item.sizeLabel,
    price: item.price,
    quantity: item.quantity,
    // Box-Zustand (offen/zu) am Box-Artikel mitschicken, damit das Küchen-
    // Dashboard ihn aus dem items-JSON lesen kann (n8n speichert items 1:1).
    ...(BOX_ITEM_IDS.has(item.itemId) && boxOption ? { box_option: boxOption } : {}),
  }));

  const response = await fetchWithTimeout(
    N8N_TERMINAL_WEBHOOK_URL,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: window.location.origin,
        source: "terminal",
        payment_status: "unpaid",
        box_option: boxOption,
        items: lineItems,
      }),
    },
    65_000,
  );

  const data = (await response.json()) as {
    success?: boolean;
    sessionId?: string;
    order_number?: number | string | null;
    error?: string;
    message?: string;
  };
  console.log("n8n response:", data);
  if (!response.ok) throw new Error(data.error || data.message || `Bestellung fehlgeschlagen (HTTP ${response.status}).`);
  if (!data.success) throw new Error(data.error || data.message || "No success flag returned from n8n.");
  if (data.order_number === null || data.order_number === undefined || String(data.order_number).trim() === "") {
    throw new Error("No order number returned from n8n");
  }
  const params = new URLSearchParams();
  if (data.sessionId && String(data.sessionId).trim()) {
    params.set("session_id", String(data.sessionId));
  }
  const orderNumber = String(data.order_number);
  params.set("order_no", orderNumber);
  return {
    successUrl: `${baseUrl}/success?${params.toString()}`,
    orderNumber,
  };
}

export function PaymentModal({ items, total, onClose, onOrderPlaced, onAddItem }: PaymentModalProps) {
  const { tr } = useLang();
  const [step, setStep] = useState<UpsellStep>("categories");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [boxOption, setBoxOption] = useState<BoxOption | null>(null);

  const drinksByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const category of UPSELL_CATEGORIES) {
      const items = menuData.find((c) => c.id === category.id)?.items ?? [];
      map.set(category.id, items);
    }
    return map;
  }, []);

  const activeCategory = useMemo(
    () => UPSELL_CATEGORIES.find((c) => c.id === activeCategoryId) ?? null,
    [activeCategoryId],
  );
  const activeDrinks = activeCategoryId ? drinksByCategory.get(activeCategoryId) ?? [] : [];
  const hasBox = items.some((i) => BOX_ITEM_IDS.has(i.itemId));

  const catLabel = (c: UpsellCategory) => (c.id === "tra-eistee" ? tr.drinkIcedTea : c.label);
  const catTagline = (c: UpsellCategory) =>
    c.id === "matcha-getraenke"
      ? tr.upsellTaglineMatcha
      : c.id === "soda"
        ? tr.upsellTaglineSoda
        : tr.upsellTaglineEistee;

  const handleSelectCategory = (id: string) => {
    setActiveCategoryId(id);
    setStep("drinks");
  };

  const handlePickDrink = (item: MenuItem) => {
    onAddItem(item.id, item.name, item.price);
    if (item.optionProfile) {
      return;
    }
    setJustAddedId(item.id);
    window.setTimeout(() => {
      setJustAddedId((current) => (current === item.id ? null : current));
    }, 1200);
  };

  const handlePlaceOrder = async () => {
    if (submitting || (hasBox && !boxOption)) return;
    setSubmitting(true);
    setError(null);
    try {
      const { successUrl, orderNumber: nextOrderNumber } = await submitPayAtCounter(items, hasBox ? boxOption : null);
      setOrderNumber(nextOrderNumber);
      onOrderPlaced?.();
      window.location.href = successUrl;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr.genericError);
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center text-center px-8">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-8">
          <Loader2 size={38} className="text-primary animate-spin" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-3xl font-semibold text-foreground mb-3">{tr.submittingTitle}</h2>
        <p className="text-muted-foreground text-[15px]">
          {orderNumber ? tr.submittingPrepareNo.replace("{n}", orderNumber) : tr.submittingHint}
        </p>
      </div>
    );
  }

  const isWideStep = step === "categories" || step === "drinks";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div
        className={`bg-background rounded-2xl shadow-2xl w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${
          isWideStep ? "max-w-3xl" : "max-w-md"
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            {step === "drinks" && (
              <button
                onClick={() => {
                  setStep("categories");
                  setActiveCategoryId(null);
                }}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                aria-label={tr.ariaBack}
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="font-serif text-[24px] font-semibold text-foreground truncate">
                {step === "drinks" && activeCategory ? catLabel(activeCategory) : tr.orderTitle}
              </h2>
              <p className="text-muted-foreground text-[13px] mt-0.5">{tr.total}: {formatPrice(total)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
            aria-label={tr.ariaClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-5 pb-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl mb-4 text-destructive text-[13px]">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {step === "categories" && (
            <div>
              <p className="font-serif text-[22px] leading-snug text-foreground mb-1">
                {tr.upsellHeading}
              </p>
              <p className="text-muted-foreground text-[13px] mb-5">
                {tr.upsellHint}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {UPSELL_CATEGORIES.map((category, index) => (
                  <button
                    key={category.id}
                    onClick={() => handleSelectCategory(category.id)}
                    style={{ animationDelay: `${index * 90}ms` }}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-transform duration-200 ease-out active:scale-[0.96] animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
                    aria-label={tr.selectAria.replace("{label}", catLabel(category))}
                  >
                    <div className="aspect-[3/4] overflow-hidden">
                      <img
                        src={category.image}
                        alt={category.label}
                        style={{ animationDelay: `${index * -1800}ms` }}
                        className="upsell-kenburns w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pt-10 pb-4 text-left">
                      <p className="font-serif text-[20px] font-semibold text-white leading-tight">
                        {catLabel(category)}
                      </p>
                      <p className="text-white/80 text-[12px] mt-0.5">{catTagline(category)}</p>
                    </div>
                    <span
                      aria-hidden
                      style={{ animationDelay: `${index * 700}ms` }}
                      className="upsell-ring-pulse pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-primary/50"
                    />
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep("checkout")}
                className="mt-5 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold active:scale-[0.99] transition-transform"
              >
                {tr.upsellSkip}
              </button>
            </div>
          )}

          {step === "drinks" && activeCategory && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-border">
                  <img
                    src={activeCategory.image}
                    alt={activeCategory.label}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-[18px] text-foreground leading-tight">{catLabel(activeCategory)}</p>
                  <p className="text-muted-foreground text-[13px]">{catTagline(activeCategory)}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4 max-h-[55vh] overflow-auto pr-1">
                {activeDrinks.map((item, index) => {
                  const wasAdded = justAddedId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handlePickDrink(item)}
                      style={{ animationDelay: `${index * 55}ms` }}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card text-left transition-transform duration-150 active:scale-[0.97] active:bg-muted/40 active:border-primary/40 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                    >
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {formatPrice(item.price)}
                          {item.optionProfile ? ` · ${tr.chooseOptions}` : ""}
                        </p>
                        {item.description && (
                          <p className="text-[11px] text-muted-foreground/80 mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                          wasAdded
                            ? "bg-emerald-600 text-white"
                            : "bg-primary text-primary-foreground"
                        }`}
                        aria-hidden
                      >
                        {wasAdded ? <Check size={16} /> : <Plus size={16} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setStep("categories");
                    setActiveCategoryId(null);
                  }}
                  className="h-12 rounded-xl bg-card border border-border text-foreground font-medium hover:bg-muted/40 transition-colors"
                >
                  {tr.upsellMoreDrinks}
                </button>
                <button
                  onClick={() => setStep("checkout")}
                  className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold active:scale-[0.99]"
                >
                  {tr.upsellToCheckout}
                </button>
              </div>
            </div>
          )}

          {step === "checkout" && (
            <div>
              {hasBox && (
                <>
                  <p className="font-serif text-[20px] leading-snug text-foreground mb-3">
                    {tr.boxOptionQuestion}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {([
                      { opt: "open" as const, label: tr.boxOptionOpen, Icon: PackageOpen },
                      { opt: "closed" as const, label: tr.boxOptionClosed, Icon: Package },
                    ]).map(({ opt, label, Icon }) => {
                      const active = boxOption === opt;
                      return (
                        <button
                          key={opt}
                          data-testid={`button-box-${opt}`}
                          onClick={() => setBoxOption(opt)}
                          className={`flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2 transition-all duration-150 active:scale-[0.98] ${
                            active
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-card text-foreground"
                          }`}
                        >
                          <Icon size={26} strokeWidth={1.8} />
                          <span className="text-[15px] font-semibold">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <p className="text-[13px] font-medium text-muted-foreground mb-2">{tr.cart}</p>
              <div className="rounded-xl border border-border bg-card divide-y divide-border mb-4 max-h-[45vh] overflow-auto">
                {items.map((item) => (
                  <div key={item.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] text-foreground min-w-0">
                        <span className="font-semibold tabular-nums">{item.quantity}× </span>
                        {item.name}
                      </span>
                      <span className="text-[14px] font-medium text-foreground tabular-nums shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-1 mb-5">
                <span className="text-[15px] font-medium text-primary">{tr.total}</span>
                <span className="text-[20px] font-semibold text-primary tabular-nums">{formatPrice(total)}</span>
              </div>

              <button
                onClick={() => void handlePlaceOrder()}
                disabled={(hasBox && !boxOption) || submitting}
                className={`w-full h-14 rounded-xl text-[16px] font-semibold transition-all duration-150 ${
                  (!hasBox || boxOption) && !submitting
                    ? "bg-primary text-primary-foreground shadow-md active:scale-[0.98]"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {tr.placeOrderCounter}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
