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
      style={{ backgroundImage: `url(${ASSET}/landing.jpg)` }}
    >
      {/* Logo + Textur sind Teil des Hintergrundbilds; Button/Sprachwahl sitzen direkt unter dem Logo. */}
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
    </div>
  );
}
