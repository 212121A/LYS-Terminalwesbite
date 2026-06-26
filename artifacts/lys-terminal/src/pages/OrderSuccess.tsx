import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Check, CreditCard } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useLang } from "@/i18n/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15;

type OrderRow = { order_number: number | string | null };

async function fetchOrderNumber(sessionId: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const url =
    `${SUPABASE_URL}/rest/v1/orders` +
    `?stripe_session_id=eq.${encodeURIComponent(sessionId)}` +
    `&select=order_number` +
    `&limit=1`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;

  const rows = (await res.json()) as OrderRow[];
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row || row.order_number === null || row.order_number === undefined) return null;
  return String(row.order_number);
}

export function OrderSuccess() {
  const { tr } = useLang();
  const [, setLocation] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  /** Kiosk-Reset: nach 40 s automatisch zurück zur Startseite für den nächsten Gast. */
  useEffect(() => {
    const timer = window.setTimeout(() => setLocation("/"), 40_000);
    return () => window.clearTimeout(timer);
  }, [setLocation]);
  const sessionId = params.get("session_id");
  const orderNoFromQuery = params.get("order_no");
  const [orderNo, setOrderNo] = useState<string>(orderNoFromQuery ? String(orderNoFromQuery) : "…");

  useEffect(() => {
    if (orderNoFromQuery) {
      setOrderNo(String(orderNoFromQuery));
      return;
    }

    if (!sessionId) {
      setOrderNo("—");
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      try {
        const number = await fetchOrderNumber(sessionId);
        if (cancelled) return;
        if (number !== null) {
          setOrderNo(number);
          return;
        }
      } catch {
        // Netzwerkfehler ignorieren, weiterpollen
      }
      if (cancelled) return;
      if (attempts >= POLL_MAX_ATTEMPTS) {
        setOrderNo("—");
        return;
      }
      window.setTimeout(tick, POLL_INTERVAL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [sessionId, orderNoFromQuery]);

  const hasNumber = orderNo !== "…" && orderNo !== "—" && orderNo.trim() !== "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-end px-4 py-3 shrink-0">
        <LanguageSelector />
      </header>

      <main className="flex-1 flex items-center justify-center p-6 pb-16">
        <div
          className="w-full max-w-md min-[1600px]:max-w-3xl rounded-3xl bg-card text-card-foreground shadow-lg border border-card-border px-7 py-9 min-[1600px]:px-16 min-[1600px]:py-16 text-center"
          data-testid="order-success-card"
        >
          {/* Erfolg */}
          <div className="flex justify-center mb-5 min-[1600px]:mb-8">
            <div className="w-[72px] h-[72px] min-[1600px]:w-32 min-[1600px]:h-32 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <div className="w-14 h-14 min-[1600px]:w-24 min-[1600px]:h-24 rounded-full bg-[#28C76F] flex items-center justify-center shadow-md">
                <Check className="w-8 h-8 min-[1600px]:w-14 min-[1600px]:h-14 text-white stroke-[2.5]" aria-hidden />
              </div>
            </div>
          </div>

          <h1 className="font-serif text-[26px] sm:text-[30px] min-[1600px]:text-[52px] font-semibold text-primary leading-tight mb-2 min-[1600px]:mb-4">
            {tr.orderSuccessTitle}
          </h1>
          <p className="text-[14px] sm:text-[15px] min-[1600px]:text-[26px] text-muted-foreground leading-relaxed mb-7 min-[1600px]:mb-12 max-w-sm min-[1600px]:max-w-2xl mx-auto">
            {tr.orderSuccessSubtitle}
          </p>

          {/* Bestellnummer — der Hero, klar lesbar (Sans, Tabularziffern) */}
          <div className="rounded-2xl min-[1600px]:rounded-3xl bg-secondary/80 border border-border px-5 py-7 min-[1600px]:py-12">
            <p className="text-[13px] sm:text-[15px] min-[1600px]:text-[28px] font-medium text-muted-foreground">
              {tr.orderSuccessNumberLabel}
            </p>
            <p
              className="font-sans font-bold text-primary tabular-nums leading-none tracking-tight text-[100px] sm:text-[140px] min-[1600px]:text-[280px] mt-1"
              data-testid="order-success-number"
            >
              {orderNo}
            </p>
          </div>

          {hasNumber && (
            <>
              {/* So geht's weiter — zwei klare Schritte */}
              <div className="mt-6 min-[1600px]:mt-10 flex flex-col gap-3 min-[1600px]:gap-5 text-left">
                <div className="flex items-center gap-3.5 min-[1600px]:gap-6 rounded-2xl bg-secondary/60 border border-border px-4 py-3.5 min-[1600px]:px-8 min-[1600px]:py-7">
                  <span className="w-8 h-8 min-[1600px]:w-14 min-[1600px]:h-14 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold text-[15px] min-[1600px]:text-[26px] tabular-nums">1</span>
                  <span className="text-[15px] sm:text-[16px] min-[1600px]:text-[28px] font-medium text-foreground leading-snug">
                    {tr.orderSuccessStepShow}
                  </span>
                </div>
                <div className="flex items-center gap-3.5 min-[1600px]:gap-6 rounded-2xl bg-primary/10 border border-primary/30 px-4 py-3.5 min-[1600px]:px-8 min-[1600px]:py-7">
                  <span className="w-8 h-8 min-[1600px]:w-14 min-[1600px]:h-14 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold text-[15px] min-[1600px]:text-[26px] tabular-nums">2</span>
                  <span className="text-[15px] sm:text-[16px] min-[1600px]:text-[28px] font-semibold text-foreground leading-snug">
                    {tr.orderSuccessStepPay}
                  </span>
                </div>
              </div>

              {/* QR-Komfort: Nummer aufs Handy */}
              <div className="mt-6 min-[1600px]:mt-12 flex flex-col items-center gap-3 min-[1600px]:gap-5">
                <div className="rounded-2xl bg-white p-3 min-[1600px]:p-6 shadow-sm border border-border">
                  <QRCodeSVG
                    value={`https://order.lysnoodleandrice.com/nr/${encodeURIComponent(orderNo)}`}
                    level="L"
                    bgColor="#ffffff"
                    fgColor="#4A443F"
                    size={360}
                    className="w-[160px] h-[160px] min-[1600px]:w-[360px] min-[1600px]:h-[360px]"
                  />
                </div>
                <p className="text-[13px] sm:text-[15px] min-[1600px]:text-[24px] text-muted-foreground max-w-xs min-[1600px]:max-w-2xl leading-relaxed">
                  {tr.orderSuccessScanHint}
                </p>
              </div>

              {/* Ausblick: Kartenzahlung am Terminal */}
              <div className="mt-7 min-[1600px]:mt-12 flex items-center justify-center gap-2 min-[1600px]:gap-3 text-muted-foreground/80">
                <CreditCard className="w-4 h-4 min-[1600px]:w-7 min-[1600px]:h-7 shrink-0" aria-hidden />
                <span className="text-[12.5px] sm:text-[13px] min-[1600px]:text-[22px] leading-snug">
                  {tr.orderSuccessCardSoon}
                </span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
