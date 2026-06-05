import { Sparkles } from "lucide-react";
import { isDiscountActive, DISCOUNT_PERCENT } from "@/lib/discount";
import { useLang } from "@/i18n/LanguageContext";
import type { LangCode } from "@/i18n/translations";

/** „auf alles" je Sprache — promo-spezifisch, hier lokal gehalten, damit der
 *  ganze Aktions-Code mit dem Badge entfernt werden kann (kein i18n-Ballast). */
const ON_EVERYTHING: Record<LangCode, string> = {
  de: "auf alles",
  vi: "cho tất cả",
  en: "on everything",
  fr: "sur tout",
  es: "en todo",
  it: "su tutto",
  pt: "em tudo",
  pl: "na wszystko",
  ru: "на всё",
  tr: "her şeye",
  ar: "على كل شيء",
  zh: "全部商品",
  ja: "全品対象",
  ko: "전 품목",
  nl: "op alles",
  ro: "la tot",
  hu: "mindenre",
  cs: "na vše",
  el: "σε όλα",
  hi: "हर चीज़ पर",
  uk: "на все",
};

/**
 * Eröffnungswoche-Badge neben den Speise-/Getränkekarte-Tabs. Festliches Gold
 * mit Lichtschimmer; erscheint nur, solange die Aktion aktiv ist (discount.ts).
 */
export function DiscountBadge() {
  const { lang } = useLang();
  if (!isDiscountActive()) return null;

  const percent = `−${DISCOUNT_PERCENT}%`;
  const label = ON_EVERYTHING[lang];

  return (
    <div
      role="status"
      aria-label={`${percent} ${label}`}
      className="lys-promo-shimmer lys-promo-glow relative overflow-hidden select-none flex items-center gap-2 min-[1600px]:gap-3.5 rounded-full border border-white/45 pl-3 pr-3.5 py-1.5 min-[1600px]:pl-6 min-[1600px]:pr-7 min-[1600px]:py-3 animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
      style={{
        background:
          "linear-gradient(135deg, #F2D188 0%, #E2B052 45%, #CE9433 100%)",
      }}
    >
      <Sparkles
        className="w-4 h-4 min-[1600px]:w-7 min-[1600px]:h-7 shrink-0"
        strokeWidth={2.2}
        style={{ color: "#5A3A18" }}
        aria-hidden
      />
      <span
        dir="ltr"
        className="font-serif font-bold leading-none text-[19px] min-[1600px]:text-[34px] tracking-tight"
        style={{ color: "#43290F", textShadow: "0 1px 0 rgba(255,255,255,0.35)" }}
      >
        {percent}
      </span>
      <span
        className="leading-none font-semibold uppercase tracking-[0.16em] text-[10px] min-[1600px]:text-[17px]"
        style={{ color: "#6E4A22" }}
      >
        {label}
      </span>
    </div>
  );
}
