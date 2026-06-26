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
  "matcha-getraenke": { bar: "hsl(135 15% 93%)", active: "hsl(135 18% 85%)" },
  "matcha-sosse": { bar: "hsl(135 15% 93%)", active: "hsl(135 18% 85%)" },
  soda: { bar: "hsl(200 16% 93%)", active: "hsl(200 20% 85%)" },
  softgetraenke: { bar: "hsl(205 16% 93%)", active: "hsl(205 20% 85%)" },
  "tra-eistee": { bar: "hsl(32 20% 93%)", active: "hsl(32 24% 85%)" },
  "thai-curry": { bar: "hsl(16 22% 93%)", active: "hsl(16 26% 85%)" },
  "mango-sosse": { bar: "hsl(42 24% 92%)", active: "hsl(42 28% 84%)" },
  "erdnuss-sosse": { bar: "hsl(28 18% 92%)", active: "hsl(28 22% 84%)" },
  "süss-sauer": { bar: "hsl(350 18% 93%)", active: "hsl(350 20% 86%)" },
  "soja-sosse": { bar: "hsl(25 15% 92%)", active: "hsl(25 18% 84%)" },
  "gebratener-reis": { bar: "hsl(40 18% 93%)", active: "hsl(40 22% 85%)" },
  "nudel-reisboxen": { bar: "hsl(33 18% 93%)", active: "hsl(33 22% 85%)" },
  "ca-phe": { bar: "hsl(24 16% 91%)", active: "hsl(24 20% 83%)" },
  smoothies: { bar: "hsl(335 18% 93%)", active: "hsl(335 20% 86%)" },
  bowls: { bar: "hsl(100 15% 93%)", active: "hsl(100 18% 85%)" },
  kem: { bar: "hsl(312 15% 93%)", active: "hsl(312 17% 87%)" },
  vorspeisen: { bar: "hsl(45 20% 93%)", active: "hsl(45 24% 85%)" },
  kids: { bar: "hsl(50 22% 92%)", active: "hsl(50 26% 84%)" },
};

const DEFAULT_TINT: Tint = { bar: "hsl(33 16% 93%)", active: "hsl(33 20% 85%)" };

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
      className="flex gap-2 overflow-x-auto scrollbar-hide px-3 py-2.5 mx-3 mb-3 rounded-full border border-card-border shadow-sm transition-colors duration-500 ease-out min-[1600px]:gap-4 min-[1600px]:px-5 min-[1600px]:py-4 min-[1600px]:mx-5 min-[1600px]:mb-5"
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
            className={`shrink-0 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 ease-out active:scale-95 whitespace-nowrap animate-in fade-in slide-in-from-left-3 fill-mode-both min-[1600px]:px-9 min-[1600px]:py-4 min-[1600px]:text-[22px] min-[1600px]:rounded-full ${
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
