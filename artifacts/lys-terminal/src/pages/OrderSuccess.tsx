import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Check, AlertCircle } from "lucide-react";
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

  /** Kiosk-Reset: nach 20 s automatisch zurück zur Startseite für den nächsten Gast. */
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-end px-4 py-3 shrink-0">
        <LanguageSelector />
      </header>

      <main className="flex-1 flex items-center justify-center p-6 pb-16">
        <div
          className="w-full max-w-2xl min-[1600px]:max-w-5xl rounded-2xl bg-card text-card-foreground shadow-lg border border-card-border px-8 py-10 min-[1600px]:px-16 min-[1600px]:py-16 text-center"
          data-testid="order-success-card"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-[#28C76F] flex items-center justify-center shadow-md">
                  <Check className="w-8 h-8 text-white stroke-[2.5]" aria-hidden />
                </div>
              </div>
            </div>
          </div>

          <h1 className="font-serif text-[26px] sm:text-[30px] min-[1600px]:text-[52px] font-semibold text-primary leading-tight mb-3">
            {tr.orderSuccessTitle}
          </h1>
          <p className="text-[14px] sm:text-[15px] min-[1600px]:text-[26px] text-muted-foreground leading-relaxed mb-8 max-w-sm min-[1600px]:max-w-2xl mx-auto">
            {tr.orderSuccessSubtitle}
          </p>

          <div className="rounded-2xl bg-secondary/80 border border-border px-5 py-8 min-[1600px]:py-14">
            <p className="text-[13px] sm:text-[15px] min-[1600px]:text-[28px] font-medium text-muted-foreground mb-2">{tr.orderSuccessNumberLabel}</p>
            <p
              className="font-serif font-bold text-primary tabular-nums leading-none tracking-tight text-[110px] sm:text-[150px] min-[1600px]:text-[320px]"
              data-testid="order-success-number"
            >
              {orderNo}
            </p>
            {orderNo !== "…" && orderNo !== "—" && orderNo.trim() !== "" && (
              <p className="mt-5 min-[1600px]:mt-10 inline-flex items-center gap-2 min-[1600px]:gap-3 rounded-full bg-destructive/10 border border-destructive/25 text-destructive font-semibold px-4 py-2 min-[1600px]:px-8 min-[1600px]:py-4 text-[15px] sm:text-[18px] min-[1600px]:text-[30px]">
                <AlertCircle className="w-4 h-4 min-[1600px]:w-8 min-[1600px]:h-8 shrink-0" />
                {tr.orderSuccessRememberHint.replace("{nr}", orderNo)}
              </p>
            )}

            {orderNo !== "…" && orderNo !== "—" && orderNo.trim() !== "" && (
              <div className="mt-6 min-[1600px]:mt-12 flex flex-col items-center gap-3 min-[1600px]:gap-5">
                <div className="rounded-2xl bg-white p-3 min-[1600px]:p-6 shadow-sm border border-border">
                  <QRCodeSVG
                    value={`https://order.lysnoodleandrice.com/nr/${encodeURIComponent(orderNo)}`}
                    level="L"
                    bgColor="#ffffff"
                    fgColor="#4A443F"
                    size={360}
                    className="w-[180px] h-[180px] min-[1600px]:w-[360px] min-[1600px]:h-[360px]"
                  />
                </div>
                <p className="text-[13px] sm:text-[15px] min-[1600px]:text-[24px] text-muted-foreground max-w-xs min-[1600px]:max-w-2xl leading-relaxed">
                  {tr.orderSuccessScanHint}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
