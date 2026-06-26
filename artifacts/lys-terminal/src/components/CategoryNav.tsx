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

/** Untergruppen der Kategorieleiste (deutsch). Chips werden in beschriftete
 *  Cluster gebündelt → übersichtlicher. Reihenfolge folgt dem Menü-Scroll. */
const CATEGORY_GROUPS: { label: string; ids: string[] }[] = [
  { label: "Boxen", ids: ["nudel-reisboxen"] },
  { label: "Vorspeisen", ids: ["vorspeisen"] },
  { label: "Soßengerichte", ids: ["thai-curry", "süss-sauer", "soja-sosse", "erdnuss-sosse", "matcha-sosse", "mango-sosse"] },
  { label: "Reis", ids: ["gebratener-reis"] },
  { label: "Matcha & Kaffee", ids: ["matcha-getraenke", "ca-phe"] },
  { label: "Tee & Soda", ids: ["tra-eistee", "soda"] },
  { label: "Smoothies & Softdrinks", ids: ["smoothies", "softgetraenke"] },
];

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

  // Sichtbare Kategorien in die definierten Gruppen einsortieren (Reihenfolge
  // der Gruppe behält die `ids`-Sortierung). Unbekannte landen in „Weitere".
  const byId = new Map(categories.map((c) => [c.id, c]));
  const used = new Set<string>();
  const groups = CATEGORY_GROUPS.map((g) => ({
    label: g.label,
    cats: g.ids.map((id) => byId.get(id)).filter((c): c is MenuCategory => !!c),
  })).filter((g) => g.cats.length > 0);
  groups.forEach((g) => g.cats.forEach((c) => used.add(c.id)));
  const leftovers = categories.filter((c) => !used.has(c.id));
  if (leftovers.length) groups.push({ label: "Weitere", cats: leftovers });

  return (
    <div
      className="flex items-stretch gap-4 overflow-x-auto scrollbar-hide px-3 py-2.5 mx-3 mb-3 rounded-[28px] border border-card-border shadow-sm transition-colors duration-500 ease-out min-[1600px]:gap-7 min-[1600px]:px-5 min-[1600px]:py-4 min-[1600px]:mx-5 min-[1600px]:mb-5"
      style={{ backgroundColor: tint.bar }}
    >
      {groups.map((group, gi) => (
        <div key={group.label} className="flex items-stretch gap-4 shrink-0 min-[1600px]:gap-7">
          {gi > 0 && <div className="w-px self-stretch my-0.5 bg-foreground/10 shrink-0" />}
          <div className="flex flex-col gap-1.5 shrink-0 min-[1600px]:gap-2.5">
            <span className="px-2 text-[10px] min-[1600px]:text-[16px] font-semibold uppercase tracking-[0.12em] text-foreground/45 whitespace-nowrap">
              {group.label}
            </span>
            <div className="flex gap-2 min-[1600px]:gap-3">
              {group.cats.map((cat) => {
                const isActive = activeCategory === cat.id;
                // „Soße"-Suffix im Soßen-Cluster ist unter der Gruppen-Überschrift
                // redundant → für die Chip-Beschriftung entfernen.
                const name = getCategoryName(cat.id);
                const chipLabel = group.label === "Soßengerichte"
                  ? name.replace(/\s*soße$/i, "")
                  : name;
                return (
                  <button
                    key={cat.id}
                    ref={(el) => { btnRefs.current[cat.id] = el; }}
                    data-testid={`button-category-${cat.id}`}
                    onClick={() => onSelect(cat.id)}
                    style={{ backgroundColor: isActive ? tint.active : undefined }}
                    className={`shrink-0 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 ease-out active:scale-95 whitespace-nowrap min-[1600px]:px-9 min-[1600px]:py-4 min-[1600px]:text-[22px] ${
                      isActive
                        ? "text-foreground shadow-md scale-105 border border-black/5"
                        : "bg-card border border-card-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {chipLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
