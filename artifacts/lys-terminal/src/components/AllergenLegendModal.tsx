import { X } from "lucide-react";
import { ALLERGENS, ADDITIVES } from "@/data/allergens";
import { useLang } from "@/i18n/LanguageContext";

export function AllergenLegendModal({ onClose }: { onClose: () => void }) {
  const { tr } = useLang();

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-[22px] font-semibold text-foreground leading-tight">
              {tr.allergenInfo}
            </h2>
            <p className="text-muted-foreground text-[13px] mt-1 leading-snug">
              {tr.allergenLegendIntro}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="w-9 h-9 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto scrollbar-hide space-y-6">
          {[
            { title: "Allergene", entries: ALLERGENS },
            { title: "Zusatzstoffe", entries: ADDITIVES },
          ].map((group) => (
            <div key={group.title}>
              <h3 className="text-[12px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2.5">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.entries.map((e) => (
                  <li key={e.code}>
                    <div className="flex items-baseline gap-2.5 text-[14px]">
                      <span className="font-mono font-semibold text-primary w-7 shrink-0">{e.code}</span>
                      <span className="text-foreground">{e.label}</span>
                    </div>
                    {e.sub && (
                      <ul className="mt-1 ml-7 space-y-1">
                        {e.sub.map((s) => (
                          <li key={s.code} className="flex items-baseline gap-2.5 text-[13px]">
                            <span className="font-mono font-semibold text-primary/80 w-6 shrink-0">{s.code}</span>
                            <span className="text-muted-foreground">{s.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
