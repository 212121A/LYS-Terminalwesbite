import { useState } from "react";
import { X, CreditCard, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { CartItem } from "@/store/cart";
import { useLang } from "@/i18n/LanguageContext";

interface PaymentModalProps {
  items: CartItem[];
  total: number;
  onClose: () => void;
  onOrderPlaced: (orderNumber: number) => void;
}

type PaymentMethod = "paypal" | "eckarte" | "applepay" | null;

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",") + " €";
}

/** Apple logo (silhouette, currentColor) — beside "Apple Pay" label */
function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 384 512"
      aria-hidden
      focusable="false"
      fill="currentColor"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6 0 91.4-87.5 107.2-125.2 0 0-84.1-35.7-84.1-147.1zm-30.4-211.6c21.3-26.1 35.7-63.1 31.7-100.1-30.5.1-62.1 20.5-81.9 46.5-19.7 25.1-35.7 63.1-31.2 99.9 32.6.1 64.6-19.5 85.4-46.3z" />
    </svg>
  );
}

function resolveApiUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const rel = path.replace(/^\//, "");
  return new URL(rel, `${window.location.origin}${base.endsWith("/") ? base : `${base}/`}`).href;
}

/** Wie LYS Website: optional absolute API-Root (VITE_API_BASE_URL), sonst gleiche Origin wie die App. */
function orderUrl(): string {
  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  if (apiBase) return `${apiBase}/api/order`;
  return resolveApiUrl("/api/order");
}

/** Verhindert „endloses" Laden, wenn API/Netzwerk nicht antwortet (z. B. langsamer Cold Start). */
async function fetchWithTimeout(
  input: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const ac = new AbortController();
  const t = window.setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ac.signal });
  } catch (e: unknown) {
    const aborted =
      (e instanceof DOMException && e.name === "AbortError") ||
      (e instanceof Error && e.name === "AbortError");
    if (aborted) {
      throw new Error(
        `Zeitüberschreitung nach ${Math.round(timeoutMs / 1000)}s: Server antwortet nicht.`,
      );
    }
    throw e;
  } finally {
    window.clearTimeout(t);
  }
}

async function placeOrder(items: CartItem[]): Promise<number> {
  const lineItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const response = await fetchWithTimeout(
    orderUrl(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lineItems }),
    },
    30_000,
  );

  const raw = await response.text();
  let data: { order_number?: number; error?: string };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error(
      raw?.trim()
        ? raw.slice(0, 400)
        : `Bestellung fehlgeschlagen (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(data.error || `Bestellung fehlgeschlagen (HTTP ${response.status}).`);
  }

  if (typeof data.order_number !== "number") {
    throw new Error("Keine Bestellnummer von der API erhalten.");
  }
  return data.order_number;
}

export function PaymentModal({ items, total, onClose, onOrderPlaced }: PaymentModalProps) {
  const { tr } = useLang();
  const [selected, setSelected] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  const handlePay = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const num = await placeOrder(items);
      setOrderNumber(num);
      onOrderPlaced(num);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ein Fehler ist aufgetreten.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center text-center px-8">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-8">
          <Loader2 size={38} className="text-primary animate-spin" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-3xl font-semibold text-foreground mb-3">
          {tr.placeOrder}…
        </h2>
        <p className="text-muted-foreground text-[15px]">
          {tr.redirectingSubtitle}
        </p>
      </div>
    );
  }

  if (orderNumber !== null) {
    return (
      <div
        className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center text-center px-8"
        data-testid="order-confirmation"
      >
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
          <CheckCircle size={42} className="text-primary" strokeWidth={1.5} />
        </div>
        <h2
          className="font-serif text-4xl font-semibold text-foreground mb-3"
          data-testid="text-order-number"
        >
          {tr.orderConfirmTitle(orderNumber)}
        </h2>
        <p className="text-muted-foreground text-[17px] mb-10">
          {tr.orderConfirmSubtitle}
        </p>
        <button
          data-testid="button-order-close"
          onClick={onClose}
          className="px-8 h-14 rounded-xl bg-primary text-primary-foreground text-[16px] font-semibold shadow-md active:scale-[0.98] transition-transform"
        >
          {tr.orderConfirmClose}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        data-testid="payment-modal"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="font-serif text-[24px] font-semibold text-foreground">{tr.paymentTitle}</h2>
            <p className="text-muted-foreground text-[13px] mt-0.5">{tr.paymentSubtitle}</p>
          </div>
          <button
            data-testid="button-close-payment"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-xl mb-5">
            <span className="text-[15px] text-muted-foreground font-medium">{tr.totalAmount}</span>
            <span
              data-testid="text-payment-total"
              className="text-[22px] font-semibold text-foreground tabular-nums"
            >
              {formatPrice(total)}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl mb-4 text-destructive text-[13px]">
              <AlertCircle size={16} />
              <span>{tr.orderFailedTitle}: {error}</span>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <button
              data-testid="button-pay-paypal"
              onClick={() => setSelected("paypal")}
              className={`w-full h-16 rounded-xl border-2 flex items-center justify-between px-5 transition-all duration-150 active:scale-[0.98] ${
                selected === "paypal"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selected === "paypal" ? "border-primary" : "border-muted-foreground/40"
                }`}>
                  {selected === "paypal" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="text-[19px] font-bold tracking-tight">
                  <span className="text-[#003087]">Pay</span><span className="text-[#009cde]">Pal</span>
                </span>
              </div>
            </button>

            <button
              data-testid="button-pay-eckarte"
              onClick={() => setSelected("eckarte")}
              className={`w-full h-16 rounded-xl border-2 flex items-center justify-between px-5 transition-all duration-150 active:scale-[0.98] ${
                selected === "eckarte"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selected === "eckarte" ? "border-primary" : "border-muted-foreground/40"
                }`}>
                  {selected === "eckarte" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={20} className="text-foreground" strokeWidth={1.5} />
                  <span className="text-[14px] font-semibold text-foreground">{tr.cardPayment}</span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <div className="min-w-[2rem] px-1 h-5 bg-[#003399] rounded text-white text-[7px] font-bold flex items-center justify-center">
                  EC
                </div>
                <div className="min-w-[2rem] px-1 h-5 bg-slate-700 rounded text-white text-[6px] font-bold flex items-center justify-center leading-tight">
                  Giro
                </div>
              </div>
            </button>

            <button
              data-testid="button-pay-applepay"
              onClick={() => setSelected("applepay")}
              className={`w-full h-16 rounded-xl border-2 flex items-center justify-between px-5 transition-all duration-150 active:scale-[0.98] ${
                selected === "applepay"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                  selected === "applepay" ? "border-primary" : "border-muted-foreground/40"
                }`}>
                  {selected === "applepay" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <AppleLogo className="w-[18px] h-[22px] shrink-0 text-foreground" />
                  <span className="text-[17px] font-semibold text-foreground tracking-tight leading-none">
                    {tr.applePayPayment}
                  </span>
                </div>
              </div>
            </button>
          </div>

          <button
            data-testid="button-confirm-payment"
            onClick={handlePay}
            disabled={!selected}
            className={`w-full h-14 rounded-xl text-[16px] font-semibold transition-all duration-150 mb-5 ${
              selected
                ? "bg-primary text-primary-foreground shadow-md active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {selected
              ? tr.paySecurely(formatPrice(total))
              : tr.selectPaymentMethod}
          </button>

          <p className="text-center text-[11px] text-muted-foreground pb-4">
            {tr.encryptedPayment}
            <span className="block mt-1 text-[9px] opacity-40 tabular-nums select-none" title="Build">
              {__APP_BUILD_ID__}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
