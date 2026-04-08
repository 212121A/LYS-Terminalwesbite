import { useState } from "react";
import { X, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { CartItem } from "@/store/cart";
import { useLang } from "@/i18n/LanguageContext";

interface PaymentModalProps {
  items: CartItem[];
  total: number;
  onClose: () => void;
}

type PaymentMethod = "card" | "paypal" | "applepay" | null;

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",") + " €";
}

async function createCheckoutSession(items: CartItem[], method: PaymentMethod) {
  const baseUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");

  const lineItems = items.map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const response = await fetch("/api/checkout/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: lineItems,
      successUrl: `${baseUrl}/?payment=success`,
      cancelUrl: `${baseUrl}/?payment=cancel`,
      paymentMethod: method,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any;
    throw new Error(err.error || "Payment could not be started");
  }

  const data = await response.json() as { url: string };
  return data.url;
}

export function PaymentModal({ items, total, onClose }: PaymentModalProps) {
  const { tr } = useLang();
  const [selected, setSelected] = useState<PaymentMethod>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const url = await createCheckoutSession(items, selected);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Ein Fehler ist aufgetreten");
      setLoading(false);
    }
  };

  if (loading) {
    const methodLabel =
      selected === "paypal" ? "PayPal"
      : selected === "applepay" ? "Apple Pay"
      : tr.cardPayment;

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center text-center px-8">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-8">
          <Loader2 size={38} className="text-primary animate-spin" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-3xl font-semibold text-foreground mb-3">
          {tr.redirectingTo(methodLabel)}
        </h2>
        <p className="text-muted-foreground text-[15px]">
          {tr.redirectingSubtitle}
        </p>
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
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <button
              data-testid="button-pay-card"
              onClick={() => setSelected("card")}
              className={`w-full h-16 rounded-xl border-2 flex items-center justify-between px-5 transition-all duration-150 active:scale-[0.98] ${
                selected === "card"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selected === "card" ? "border-primary" : "border-muted-foreground/40"
                }`}>
                  {selected === "card" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={20} className="text-foreground" strokeWidth={1.5} />
                  <span className="text-[14px] font-semibold text-foreground">{tr.cardPayment}</span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <div className="w-8 h-5 bg-blue-600 rounded text-white text-[8px] font-bold flex items-center justify-center">VISA</div>
                <div className="w-8 h-5 bg-red-500 rounded text-white text-[7px] font-bold flex items-center justify-center leading-tight">MC</div>
              </div>
            </button>

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
              <span className="text-[13px] text-muted-foreground">{tr.onlinePayment}</span>
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
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selected === "applepay" ? "border-primary" : "border-muted-foreground/40"
                }`}>
                  {selected === "applepay" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
                <span className="text-[17px] font-semibold text-foreground tracking-tight"> Pay</span>
              </div>
              <span className="text-[13px] text-muted-foreground">{tr.nfcPayment}</span>
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
          </p>
        </div>
      </div>
    </div>
  );
}
