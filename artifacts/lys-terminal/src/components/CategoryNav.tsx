import { useEffect, useRef } from "react";
import { MenuCategory } from "@/data/menu";

interface CategoryNavProps {
  categories: MenuCategory[];
  activeCategory: string;
  onSelect: (id: string) => void;
  getCategoryName: (id: string) => string;
}

type Tint = { bar: string; active: string };

/** Sanfte Pastell-/Beige-Töne pro Kategorie. `bar` tönt die Leiste,
 *  `active` das aktive Tab. Niedrige Sättigung → bleibt pastellig & warm. */
const CATEGORY_TINTS: Record<string, Tint> = {
  "matcha-getraenke": { bar: "hsl(135 32% 90%)", active: "hsl(135 30% 81%)" },
  "matcha-sosse": { bar: "hsl(135 32% 90%)", active: "hsl(135 30% 81%)" },
  soda: { bar: "hsl(198 38% 90%)", active: "hsl(198 34% 81%)" },
  softgetraenke: { bar: "hsl(205 36% 90%)", active: "hsl(205 32% 81%)" },
  "tra-eistee": { bar: "hsl(30 48% 90%)", active: "hsl(30 44% 81%)" },
  "thai-curry": { bar: "hsl(14 46% 90%)", active: "hsl(14 44% 82%)" },
  "mango-sosse": { bar: "hsl(44 55% 89%)", active: "hsl(44 52% 79%)" },
  "erdnuss-sosse": { bar: "hsl(28 38% 89%)", active: "hsl(28 34% 80%)" },
  "süss-sauer": { bar: "hsl(350 38% 91%)", active: "hsl(350 34% 84%)" },
  "soja-sosse": { bar: "hsl(25 28% 88%)", active: "hsl(25 26% 80%)" },
  "gebratener-reis": { bar: "hsl(40 36% 90%)", active: "hsl(40 32% 81%)" },
  "nudel-reisboxen": { bar: "hsl(33 34% 90%)", active: "hsl(33 30% 82%)" },
  "ca-phe": { bar: "hsl(24 30% 87%)", active: "hsl(24 28% 78%)" },
  smoothies: { bar: "hsl(330 40% 91%)", active: "hsl(330 36% 84%)" },
  bowls: { bar: "hsl(95 30% 90%)", active: "hsl(95 28% 81%)" },
  kem: { bar: "hsl(310 30% 92%)", active: "hsl(310 28% 85%)" },
  vorspeisen: { bar: "hsl(45 38% 90%)", active: "hsl(45 34% 81%)" },
  kids: { bar: "hsl(50 55% 90%)", active: "hsl(50 50% 80%)" },
};

const DEFAULT_TINT: Tint = { bar: "hsl(33 28% 91%)", active: "hsl(33 30% 82%)" };

export function CategoryNav({ categories, activeCategory, onSelect, getCategoryName }: CategoryNavProps) {
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tint = CATEGORY_TINTS[activeCategory] ?? DEFAULT_TINT;

  useEffect(() => {
    btnRefs.current[activeCategory]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeCategory]);

  return (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3 transition-colors duration-500 ease-out min-[1600px]:gap-4 min-[1600px]:px-8 min-[1600px]:py-5"
      style={{ backgroundColor: tint.bar }}
    >
      {categories.map((cat, i) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            ref={(el) => { btnRefs.current[cat.id] = el; }}
            data-testid={`button-category-${cat.id}`}
            onClick={() => onSelect(cat.id)}
            style={{
              animationDelay: `${Math.min(i, 12) * 35}ms`,
              backgroundColor: isActive ? tint.active : undefined,
            }}
            className={`shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ease-out active:scale-95 whitespace-nowrap animate-in fade-in slide-in-from-left-3 fill-mode-both min-[1600px]:px-7 min-[1600px]:py-4 min-[1600px]:text-[22px] min-[1600px]:rounded-2xl ${
              isActive
                ? "text-foreground shadow-md scale-105 border border-black/5"
                : "bg-card border border-card-border text-foreground hover:bg-muted"
            }`}
          >
            {getCategoryName(cat.id)}
          </button>
        );
      })}
    </div>
  );
}
