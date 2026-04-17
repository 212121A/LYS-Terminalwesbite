import { useState } from "react";
import { X, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { CartItem } from "@/store/cart";
import { useLang } from "@/i18n/LanguageContext";

interface PaymentModalProps {
  items: CartItem[];
  total: number;
  onClose: () => void;
}

type PaymentMethod = "paypal" | "eckarte" | "applepay" | null;

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",") + " €";
}

/** Apple logo (silhouette, currentColor) — beside “Apple Pay” label */
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

const PAYMENT_START_FAILED_DE =
  "Zahlung konnte nicht gestartet werden. Prüfen: (1) STRIPE_SECRET_KEY und STRIPE_PUBLISHABLE_KEY in Vercel (Environment: Production), (2) nach Änderungen Redeploy, (3) Zahlungsarten im Stripe-Dashboard (Karte/PayPal) und Test-/Live-Keys nicht mischen. Danach Seite mit Strg+F5 neu laden.";

/** Text aus Error, String oder verschachtelten API-Antworten (z. B. Stripe) lesen. */
function extractErrorText(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (raw instanceof Error) return raw.message ?? "";
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.error === "string") return o.error;
    if (o.error && typeof o.error === "object") {
      const inner = o.error as Record<string, unknown>;
      if (typeof inner.message === "string") return inner.message;
    }
  }
  try {
    return String(raw);
  } catch {
    return "";
  }
}

/** Englische Stripe/Browser-Meldungen → deutsche Hinweise (auch bei Sonderzeichen / altem Bundle). */
function normalizePaymentError(raw: unknown): string {
  const msg = extractErrorText(raw);
  const m = msg
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!m) return "Ein Fehler ist aufgetreten.";
  // Stripe-Varianten: "Payment could not be started", "The payment could not be started", Apostroph-Varianten
  if (
    /(?:the\s+)?payment\s+could\s+not\s+be\s+started/i.test(m) ||
    /payment\s+couldn['']?t\s+be\s+started/i.test(m) ||
    (/could\s+not\s+be\s+started/i.test(m) && /payment/i.test(m))
  ) {
    return PAYMENT_START_FAILED_DE;
  }
  if (/failed to fetch|load failed|networkerror/i.test(m)) {
    return "Netzwerkfehler: Verbindung prüfen und die Seite über die aktuelle Vercel-URL öffnen.";
  }
  return msg;
}

async function createCheckoutSession(items: CartItem[], method: PaymentMethod) {
  const baseUrl = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");

  const statusRes = await fetch(resolveApiUrl("/api/stripe/status"));
  const statusText = await statusRes.text();
  type StripeStatusResponse = {
    stripeKeysPresent?: boolean;
    modesMatch?: boolean;
  };
  let stripeStatus: StripeStatusResponse | null = null;
  try {
    stripeStatus = JSON.parse(statusText) as StripeStatusResponse;
  } catch {
    /* kein JSON */
  }
  if (!statusRes.ok) {
    throw new Error(
      `API nicht erreichbar (HTTP ${statusRes.status}). Prüfen: gleiche Domain wie die Seite, /api/healthz und Deploy (api/index.mjs + Rewrite in vercel.json).`,
    );
  }
  if (!stripeStatus || typeof stripeStatus.stripeKeysPresent !== "boolean") {
    throw new Error(
      "API /api/stripe/status liefert kein gültiges JSON (z. B. HTML-Login durch Vercel Deployment Protection, oder falsche Domain). Im Vercel-Projekt: Production-Deployment ohne Schutz testen oder öffentliche Production-Domain nutzen.",
    );
  }
  if (stripeStatus.stripeKeysPresent === false) {
    throw new Error(
      "Stripe-Keys fehlen auf dem Server. In Vercel: Project → Settings → Environment Variables → STRIPE_SECRET_KEY und STRIPE_PUBLISHABLE_KEY setzen, dann Redeploy.",
    );
  }
  if (stripeStatus?.stripeKeysPresent === true && stripeStatus?.modesMatch === false) {
    throw new Error(
      "Stripe: Secret-Key und Publishable-Key passen nicht zusammen (Test vs. Live). Beide Keys aus demselben Modus im Dashboard kopieren (entweder nur Test: sk_test_… + pk_test_… oder nur Live: sk_live_… + pk_live_…).",
    );
  }

  const lineItems = items.map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const response = await fetch(resolveApiUrl("/api/checkout/session"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: lineItems,
      successUrl: `${baseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/?payment=cancel`,
      paymentMethod: method,
    }),
  });

  const raw = await response.text();
  let data: {
    url?: string;
    error?: string;
    message?: string;
    stripeCode?: string;
    stripeType?: string;
  };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error(
      raw?.trim()
        ? raw.slice(0, 400)
        : `Zahlung nicht gestartet (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    const base = data.error || data.message || `Zahlung nicht gestartet (HTTP ${response.status}).`;
    const detail = [data.stripeCode, data.stripeType].filter(Boolean).join(" · ");
    const msg = detail ? `${base} (${detail})` : base;
    throw new Error(normalizePaymentError(msg));
  }

  if (!data.url) {
    throw new Error("Keine Checkout-URL von der API erhalten.");
  }
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
    } catch (err: unknown) {
      setError(normalizePaymentError(err));
      setLoading(false);
    }
  };

  if (loading) {
    const methodLabel =
      selected === "paypal" ? tr.paypalPayment
      : selected === "applepay" ? tr.applePayPayment
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
              <span>{normalizePaymentError(error)}</span>
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
