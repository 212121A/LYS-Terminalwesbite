import { MenuCategory } from "@/data/menu";

interface CategoryNavProps {
  categories: MenuCategory[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export function CategoryNav({ categories, activeCategory, onSelect }: CategoryNavProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
      {categories.map((cat) => (
        <button
          key={cat.id}
          data-testid={`button-category-${cat.id}`}
          onClick={() => onSelect(cat.id)}
          className={`shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 active:scale-95 whitespace-nowrap ${
            activeCategory === cat.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-card-border text-foreground hover:bg-muted"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
