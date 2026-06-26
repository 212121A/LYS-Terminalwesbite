import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { type MenuItem } from "@/data/menu";
import { useLang } from "@/i18n/LanguageContext";

type OptionProfile = NonNullable<MenuItem["optionProfile"]>;

interface OptionChoice {
  id: string;
  label: string;
  priceDelta: number;
}

interface ItemOptionsModalProps {
  itemName: string;
  basePrice: number;
  profile: OptionProfile;
  /** Vorauswahl beim Bearbeiten einer bestehenden Warenkorb-Zeile. */
  initialPreparationId?: string;
  initialMilkId?: string;
  onClose: () => void;
  onConfirm: (selectionLabel: string, totalPrice: number) => void;
}

const PREPARATIONS: OptionChoice[] = [
  { id: "classic", label: "Classic", priceDelta: 0 },
  { id: "frappe", label: "Frappe", priceDelta: 1 },
  { id: "proteinmatcha", label: "Proteinmatcha", priceDelta: 2 },
];

const MILK_LABELS = ["Kuhmilch", "Sojamilch", "Hafermilch", "Kokosmilch"];

function formatPriceDelta(price: number, inclusiveLabel: string) {
  if (price === 0) return inclusiveLabel;
  return "+" + price.toFixed(2).replace(".", ",") + " €";
}

function optionButtonClass(selected: boolean) {
  return `w-full min-h-14 rounded-xl border flex items-center justify-between gap-4 px-5 py-3 text-left transition-all duration-150 active:scale-[0.99] ${
    selected
      ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]"
      : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
  }`;
}

export function ItemOptionsModal({
  itemName,
  basePrice,
  profile,
  initialPreparationId,
  initialMilkId,
  onClose,
  onConfirm,
}: ItemOptionsModalProps) {
  const { tr } = useLang();
  const [preparation, setPreparation] = useState<OptionChoice>(
    () => PREPARATIONS.find((p) => p.id === initialPreparationId) ?? PREPARATIONS[0],
  );
  const [milk, setMilk] = useState<OptionChoice | null>(() => {
    if (!initialMilkId) return null;
    const idx = MILK_LABELS.findIndex((l) => l.toLowerCase() === initialMilkId);
    if (idx < 0) return null;
    const priceDelta = profile === "matcha" ? 0.5 : 0;
    return { id: MILK_LABELS[idx].toLowerCase(), label: MILK_LABELS[idx], priceDelta: idx === 0 ? 0 : priceDelta };
  });

  const milkOptions = useMemo<OptionChoice[]>(() => {
    const priceDelta = profile === "matcha" ? 0.5 : 0;
    return MILK_LABELS.map((label, index) => ({
      id: label.toLowerCase(),
      label,
      priceDelta: index === 0 ? 0 : priceDelta,
    }));
  }, [profile]);

  const totalPrice = basePrice + (profile === "matcha" ? preparation.priceDelta : 0) + (milk?.priceDelta ?? 0);
  const canConfirm = milk !== null;

  const handleConfirm = () => {
    if (!milk) return;
    const labels = profile === "matcha" ? [preparation.label, milk.label] : [milk.label];
    onConfirm(labels.join(" · "), totalPrice);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        data-testid="item-options-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-border gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-[28px] font-semibold text-foreground leading-tight">
              {tr.chooseMilkTitle}
            </h2>
            <p className="text-muted-foreground text-[15px] mt-1 leading-snug">
              {tr.chooseMilkSubtitle}
            </p>
            <p className="text-primary/90 text-[15px] mt-3 font-semibold leading-snug">
              {itemName}
            </p>
          </div>
          <button
            data-testid="button-close-item-options"
            onClick={onClose}
            className="w-10 h-10 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-7 pt-6 pb-7 max-h-[70vh] overflow-y-auto">
          {profile === "matcha" && (
            <section className="mb-7">
              <h3 className="text-[13px] font-semibold tracking-[0.28em] uppercase text-muted-foreground mb-3">
                {tr.preparationLabel}
              </h3>
              <div className="space-y-2.5">
                {PREPARATIONS.map((option) => {
                  const selected = preparation.id === option.id;
                  return (
                    <button
                      key={option.id}
                      data-testid={`button-preparation-${option.id}`}
                      onClick={() => setPreparation(option)}
                      className={optionButtonClass(selected)}
                    >
                      <span className="text-[16px] font-semibold text-foreground">
                        {option.label}
                      </span>
                      <span className="text-[14px] text-muted-foreground tabular-nums">
                        {formatPriceDelta(option.priceDelta, tr.inclusive)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-[13px] font-semibold tracking-[0.28em] uppercase text-muted-foreground mb-3">
              {tr.milkLabel}
            </h3>
            <div className="space-y-2.5">
              {milkOptions.map((option) => {
                const selected = milk?.id === option.id;
                return (
                  <button
                    key={option.id}
                    data-testid={`button-milk-${option.id}`}
                    onClick={() => setMilk(option)}
                    className={optionButtonClass(selected)}
                  >
                    <span className="flex items-center gap-4 min-w-0">
                      <span
                        className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selected ? "border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {selected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </span>
                      <span className="text-[18px] font-semibold text-foreground">
                        {option.label}
                      </span>
                    </span>
                    <span className="text-[14px] text-muted-foreground tabular-nums">
                      {formatPriceDelta(option.priceDelta, tr.inclusive)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-2 border-t border-border">
          <button
            data-testid="button-item-options-cancel"
            onClick={onClose}
            className="h-16 text-[17px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            {tr.sauceSelectCancel}
          </button>
          <button
            data-testid="button-item-options-confirm"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`h-16 text-[17px] font-semibold border-l border-border transition-all duration-150 ${
              canConfirm
                ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99]"
                : "bg-muted/30 text-muted-foreground/60 cursor-not-allowed"
            }`}
          >
            {tr.sauceSelectConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
