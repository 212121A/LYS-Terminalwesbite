import { X } from "lucide-react";
import { allergenLabel, additiveLabel } from "@/data/allergens";
import { useLang } from "@/i18n/LanguageContext";

/**
 * Zeigt die Allergene/Zusatzstoffe EINES Gerichts im Klartext (Code · Bezeichnung).
 * `allergens`/`additives` kommen schon Carb-bereinigt aus der Card (Nudel → g).
 * Unten ein Link in die große Legende.
 */
export function AllergenDishModal({
  dishName,
  allergens,
  additives,
  onClose,
  onShowAll,
}: {
  dishName: string;
  allergens: string[];
  additives: string[];
  onClose: () => void;
  onShowAll: () => void;
}) {
  const { tr } = useLang();
  const hasCodes = allergens.length > 0 || additives.length > 0;

  const groups = [
    { title: "Allergene", codes: allergens, labelFor: allergenLabel },
    { title: "Zusatzstoffe", codes: additives, labelFor: additiveLabel },
  ].filter((group) => group.codes.length > 0);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border gap-3">
          <h2 className="font-serif text-[20px] font-semibold text-foreground leading-tight min-w-0">
            {dishName}
          </h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="w-9 h-9 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto scrollbar-hide space-y-5">
          {!hasCodes && (
            <p className="text-[14px] text-muted-foreground leading-relaxed">{tr.allergenLegendIntro}</p>
          )}
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[12px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2.5">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.codes.map((code) => (
                  <li key={code} className="flex items-baseline gap-2.5 text-[14px]">
                    <span className="font-mono font-semibold text-primary w-7 shrink-0">{code}</span>
                    <span className="text-foreground">{group.labelFor(code) ?? code}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-border">
          <button
            onClick={onShowAll}
            className="text-[13px] font-medium text-primary hover:underline active:scale-95 transition-transform"
          >
            {tr.allergenInfo} →
          </button>
        </div>
      </div>
    </div>
  );
}
