import { useLocation } from "wouter";
import { useLang } from "@/i18n/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

const ASSET = import.meta.env.BASE_URL.replace(/\/$/, "");

export function StartScreen() {
  const [, setLocation] = useLocation();
  const { tr } = useLang();

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-contain bg-center bg-no-repeat bg-[#b8aea2]"
      style={{ backgroundImage: `url(${ASSET}/landing-clean.jpg)` }}
    >
      {/* Echter Foto-Smoke (Logo herausgerechnet) als Hintergrund; scharfe LYS-Wortmarke (4K-Upscale) als transparentes Overlay. */}
      <img
        src={`${ASSET}/logo-hires.png`}
        alt="LYS — Noodles & Rice"
        className="pointer-events-none absolute left-1/2 top-[46%] z-10 w-[62vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2 select-none animate-in fade-in duration-1000 min-[1600px]:max-w-[860px]"
      />

      {/* Button/Sprachwahl sitzen unter dem Logo. */}
      <div className="absolute left-0 right-0 top-[60%] z-10 flex flex-col items-center gap-8 px-6 min-[1600px]:gap-14">
        <button
          data-testid="button-start-order"
          onClick={() => setLocation("/order")}
          className="lys-invite h-20 px-16 sm:px-24 rounded-full bg-primary text-primary-foreground text-2xl sm:text-3xl font-semibold tracking-tight active:scale-[0.97] transition-transform animate-in fade-in zoom-in-95 duration-500 min-[1600px]:h-32 min-[1600px]:px-32 min-[1600px]:text-5xl"
        >
          {tr.order}
        </button>

        <div className="flex flex-col items-center gap-2 animate-in fade-in duration-1000">
          <span className="px-3 py-1 rounded-full bg-background/60 backdrop-blur-sm text-primary/80 text-[12px] uppercase tracking-[0.16em] min-[1600px]:text-[16px]">
            {tr.languageLabel}
          </span>
          <LanguageSelector />
        </div>
      </div>

      {/* Orderflow-Marke unten links (transparent, ohne Schrift). */}
      <img
        src={`${ASSET}/orderflow-mark-white.png`}
        alt="Orderflow"
        className="pointer-events-none absolute bottom-6 left-6 z-10 h-6 w-auto opacity-70 animate-in fade-in duration-1000 min-[1600px]:bottom-12 min-[1600px]:left-12 min-[1600px]:h-10"
      />
    </div>
  );
}
