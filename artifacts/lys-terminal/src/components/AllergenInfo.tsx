import { useState } from "react";
import { Info } from "lucide-react";
import { AllergenDishModal } from "@/components/AllergenDishModal";
import { AllergenLegendModal } from "@/components/AllergenLegendModal";

/**
 * „i"-Pünktchen auf einem Bestellkärtchen. Tippen öffnet die Allergene dieses
 * Gerichts im Klartext; von dort kommt man in die große Legende.
 * `allergens`/`additives` werden Carb-bereinigt übergeben (Nudel → g).
 */
export function AllergenInfo({
  dishName,
  allergens,
  additives,
  testId,
}: {
  dishName: string;
  allergens: string[];
  additives: string[];
  testId?: string;
}) {
  const [view, setView] = useState<null | "dish" | "legend">(null);

  return (
    <>
      <button
        type="button"
        data-testid={testId}
        onClick={() => setView("dish")}
        aria-label={`Allergene: ${dishName}`}
        className="w-5 h-5 min-[1600px]:w-9 min-[1600px]:h-9 rounded-full border border-foreground/25 text-foreground/55 flex items-center justify-center hover:text-foreground hover:border-foreground/50 transition-colors active:scale-90 shrink-0"
      >
        <Info size={13} strokeWidth={2} className="min-[1600px]:w-5 min-[1600px]:h-5" />
      </button>
      {view === "dish" && (
        <AllergenDishModal
          dishName={dishName}
          allergens={allergens}
          additives={additives}
          onClose={() => setView(null)}
          onShowAll={() => setView("legend")}
        />
      )}
      {view === "legend" && <AllergenLegendModal onClose={() => setView(null)} />}
    </>
  );
}
