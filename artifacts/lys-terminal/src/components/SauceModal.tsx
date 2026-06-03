import { useState } from "react";
import { X } from "lucide-react";
import { BOX_SAUCES, type BoxSauce } from "@/data/boxSauces";
import { useLang } from "@/i18n/LanguageContext";

const NONE = "__none__";

interface SauceModalProps {
  /** Name des Gerichts, zu dem die Soße gewählt wird (z. B. „Hähnchenfleisch · Groß Nudeln"). */
  dishName: string;
  /** Vorauswahl beim Bearbeiten einer bestehenden Warenkorb-Zeile. */
  initialSauceId?: BoxSauce["id"];
  /** Optionaler Modus für Nicht-Box-Speisen: zusätzliche „Ohne extra Soße"-Option,
   *  Bestätigen immer möglich (gibt dann null zurück). */
  optional?: boolean;
  onClose: () => void;
  onConfirm: (sauce: BoxSauce | null) => void;
}

export function SauceModal({ dishName, initialSauceId, optional, onClose, onConfirm }: SauceModalProps) {
  const { tr } = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialSauceId ?? (optional ? NONE : null),
  );

  const handleConfirm = () => {
    if (selectedId === null) return;
    if (selectedId === NONE) {
      onConfirm(null);
      return;
    }
    const sauce = BOX_SAUCES.find((s) => s.id === selectedId);
    if (sauce) onConfirm(sauce);
  };

  const options = optional
    ? [{ id: NONE, label: tr.extraSauceNone }, ...BOX_SAUCES]
    : BOX_SAUCES;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        data-testid="sauce-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-[22px] font-semibold text-foreground leading-tight">
              {optional ? tr.extraSauce : tr.sauceSelectTitle}
            </h2>
            {!optional && (
              <p className="text-muted-foreground text-[13px] mt-1 leading-snug">
                {tr.sauceSelectSubtitle}
              </p>
            )}
            <p className="text-primary/80 text-[13px] mt-1 font-medium truncate">
              {dishName}
            </p>
          </div>
          <button
            data-testid="button-close-sauce"
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pt-4 pb-6">
          <div className="space-y-2.5 mb-5">
            {options.map((sauce) => {
              const isSelected = selectedId === sauce.id;
              return (
                <button
                  key={sauce.id}
                  data-testid={`button-sauce-${sauce.id}`}
                  onClick={() => setSelectedId(sauce.id)}
                  className={`w-full min-h-14 rounded-xl border-2 flex items-center gap-3 px-5 py-3 text-left transition-all duration-150 active:scale-[0.99] ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? "border-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                  <span className="text-[15px] font-medium text-foreground">{sauce.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              data-testid="button-sauce-cancel"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl bg-muted text-muted-foreground text-[15px] font-medium active:scale-[0.98] transition-transform duration-100 hover:text-foreground"
            >
              {tr.sauceSelectCancel}
            </button>
            <button
              data-testid="button-sauce-confirm"
              onClick={handleConfirm}
              disabled={selectedId === null}
              className={`flex-1 h-12 rounded-xl text-[15px] font-semibold transition-all duration-150 ${
                selectedId !== null
                  ? "bg-primary text-primary-foreground shadow-md active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {tr.sauceSelectConfirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
