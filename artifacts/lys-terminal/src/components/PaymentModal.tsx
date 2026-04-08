import { useState } from "react";
import { X, CreditCard, Loader2, CheckCircle } from "lucide-react";

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onConfirm: () => void;
}

type PaymentMethod = "paypal" | "applepay" | "ec" | null;
type PaymentState = "select" | "processing" | "done";

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",") + " €";
}

function PayPalLogo() {
  return (
    <svg viewBox="0 0 100 28" className="h-7 w-auto" aria-label="PayPal">
      <text
        x="0"
        y="22"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fontSize="22"
        fill="#003087"
      >
        Pay
      </text>
      <text
        x="40"
        y="22"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fontSize="22"
        fill="#009cde"
      >
        Pal
      </text>
    </svg>
  );
}

function ApplePayLogo() {
  return (
    <svg viewBox="0 0 80 24" className="h-7 w-auto" aria-label="Apple Pay">
      <text
        x="0"
        y="20"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif"
        fontWeight="600"
        fontSize="18"
        fill="currentColor"
        letterSpacing="-0.5"
      >
        &#xf8ff; Pay
      </text>
    </svg>
  );
}

function ECCardLogo() {
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-auto" aria-label="EC Karte">
      <rect width="48" height="32" rx="4" fill="#1a1a2e" />
      <text
        x="7"
        y="22"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fontSize="16"
        fill="#e8c547"
      >
        ec
      </text>
    </svg>
  );
}

export function PaymentModal({ total, onClose, onConfirm }: PaymentModalProps) {
  const [selected, setSelected] = useState<PaymentMethod>(null);
  const [state, setState] = useState<PaymentState>("select");

  const handleSelect = (method: PaymentMethod) => {
    setSelected(method);
  };

  const handlePay = () => {
    if (!selected) return;
    setState("processing");
    setTimeout(() => {
      setState("done");
      setTimeout(() => {
        onConfirm();
      }, 2000);
    }, 2500);
  };

  if (state === "done") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center text-center px-8">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 animate-in zoom-in duration-300">
          <CheckCircle size={52} className="text-primary" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-4xl font-semibold text-foreground mb-3">Zahlung erfolgreich!</h2>
        <p className="text-muted-foreground text-[16px] leading-relaxed mb-2">
          Ihre Bestellung wird jetzt zubereitet.
        </p>
        <p className="text-muted-foreground text-[14px]">Bitte warten Sie an der Kasse.</p>
      </div>
    );
  }

  if (state === "processing") {
    const methodLabel =
      selected === "paypal" ? "PayPal"
      : selected === "applepay" ? "Apple Pay"
      : "EC-Karte";

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center text-center px-8">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-8">
          <Loader2 size={38} className="text-primary animate-spin" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-3xl font-semibold text-foreground mb-3">
          Zahlung wird verarbeitet…
        </h2>
        <p className="text-muted-foreground text-[15px]">
          Bitte folgen Sie den Anweisungen am {methodLabel}-Terminal.
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
            <h2 className="font-serif text-[24px] font-semibold text-foreground">Zahlungsart</h2>
            <p className="text-muted-foreground text-[13px] mt-0.5">Wählen Sie Ihre bevorzugte Zahlungsart</p>
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
            <span className="text-[15px] text-muted-foreground font-medium">Gesamtbetrag</span>
            <span
              data-testid="text-payment-total"
              className="text-[22px] font-semibold text-foreground tabular-nums"
            >
              {formatPrice(total)}
            </span>
          </div>

          <div className="space-y-3 mb-6">
            <button
              data-testid="button-pay-paypal"
              onClick={() => handleSelect("paypal")}
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
                  {selected === "paypal" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <PayPalLogo />
              </div>
              <span className="text-[13px] text-muted-foreground">Online-Zahlung</span>
            </button>

            <button
              data-testid="button-pay-applepay"
              onClick={() => handleSelect("applepay")}
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
                  {selected === "applepay" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-[17px] font-semibold text-foreground tracking-tight">Apple Pay</span>
              </div>
              <span className="text-[13px] text-muted-foreground">NFC / iPhone</span>
            </button>

            <button
              data-testid="button-pay-ec"
              onClick={() => handleSelect("ec")}
              className={`w-full h-16 rounded-xl border-2 flex items-center justify-between px-5 transition-all duration-150 active:scale-[0.98] ${
                selected === "ec"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selected === "ec" ? "border-primary" : "border-muted-foreground/40"
                }`}>
                  {selected === "ec" && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <ECCardLogo />
                <span className="text-[15px] font-medium text-foreground">EC-Karte</span>
              </div>
              <CreditCard size={18} className="text-muted-foreground" strokeWidth={1.5} />
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
              ? `Jetzt zahlen · ${formatPrice(total)}`
              : "Zahlungsart auswählen"}
          </button>
        </div>
      </div>
    </div>
  );
}
