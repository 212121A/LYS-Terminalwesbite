import { useState } from "react";
import { X, Check } from "lucide-react";
import { BOX_SAUCES, NO_SAUCE_LABEL, NO_VEG_LABEL, type BoxSauce } from "@/data/boxSauces";
import { useLang } from "@/i18n/LanguageContext";
import { useAvailability } from "@/availability/AvailabilityContext";
import { sauceAvailabilityId } from "@/lib/availability";

const NONE = "__none__";

interface SauceModalProps {
  /** Name des Gerichts, zu dem die Soße gewählt wird (z. B. „Hähnchenfleisch · Groß Nudeln"). */
  dishName: string;
  /** Vorauswahl beim Bearbeiten einer bestehenden Warenkorb-Zeile. */
  initialSauceId?: BoxSauce["id"];
  /** Edit-Restore: war „Keine Soße" gewählt (nur Box-Pflichtmodus). */
  initialNoSauce?: boolean;
  /** Edit-Restore: war „Ohne Gemüse" gewählt. */
  initialNoVeg?: boolean;
  /** Edit-Restore: war „Doppelt Fleisch" gewählt. */
  initialDoubleMeat?: boolean;
  /** Optionaler Modus für Nicht-Box-Speisen: zusätzliche „Ohne extra Soße"-Option,
   *  Bestätigen immer möglich (gibt dann null zurück). */
  optional?: boolean;
  /** Box-Pflichtmodus: zusätzliche „Keine Soße"-Option am Ende der Liste. */
  allowNoSauce?: boolean;
  /** Zeigt den „Ohne Gemüse"-Schalter an. */
  allowNoVeg?: boolean;
  /** Zeigt den „Doppelt"-Schalter an (Hähnchen-/Paniertes-Hähnchen-/Fisch-Box). */
  allowDoubleMeat?: boolean;
  /** Label des „Doppelt"-Schalters („Doppelt Fleisch" bzw. „Doppelt Fisch"). */
  doubleMeatLabel?: string;
  /** Aufpreis für „Doppelt" in Euro (je nach Box/Größe 1, 2 oder 3). */
  doubleMeatSurcharge?: number;
  /** Modifier-Modus für Soßen-Gerichte (C/B/S/E/M): keine Soßen-Liste, „Keine
   *  Soße" als Toggle, Bestätigen immer möglich. Die Soße steckt schon im
   *  Gericht; wählbar sind nur die Modifikatoren. */
  modifiersOnly?: boolean;
  /** Auswählbare Soßen. Default: alle. Süße Gerichte schränken die Liste ein. */
  sauces?: BoxSauce[];
  onClose: () => void;
  onConfirm: (sauce: BoxSauce | null, withoutVeg: boolean, noSauce: boolean, doubleMeat: boolean) => void;
}

export function SauceModal({ dishName, initialSauceId, initialNoSauce, initialNoVeg, initialDoubleMeat, optional, allowNoSauce, allowNoVeg, allowDoubleMeat, doubleMeatLabel, doubleMeatSurcharge, modifiersOnly, sauces = BOX_SAUCES, onClose, onConfirm }: SauceModalProps) {
  const { tr } = useLang();
  const { isItemSoldOut } = useAvailability();
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialSauceId ?? ((optional || initialNoSauce) ? NONE : null),
  );
  const [withoutVeg, setWithoutVeg] = useState<boolean>(() => initialNoVeg ?? false);
  const [noSauce, setNoSauce] = useState<boolean>(() => initialNoSauce ?? false);
  const [doubleMeat, setDoubleMeat] = useState<boolean>(() => initialDoubleMeat ?? false);

  const handleConfirm = () => {
    if (modifiersOnly) {
      onConfirm(null, withoutVeg, noSauce, doubleMeat);
      return;
    }
    if (selectedId === null) return;
    if (selectedId === NONE) {
      onConfirm(null, withoutVeg, true, doubleMeat);
      return;
    }
    const sauce = BOX_SAUCES.find((s) => s.id === selectedId);
    if (sauce) onConfirm(sauce, withoutVeg, false, doubleMeat);
  };

  const doubleMeatPrice =
    doubleMeatSurcharge !== undefined
      ? "+" + doubleMeatSurcharge.toFixed(2).replace(".", ",") + " €"
      : null;

  // „Keine Soße" gehört in die Soßen-Liste, wenn es eine echte Soßen-Wahl ist
  // (Box-Pflicht oder optionale Extra-Soße). Im modifiersOnly-Modus ist es ein Toggle.
  const noneInSauceList = !modifiersOnly && (optional || allowNoSauce);
  const noneLabel = optional ? tr.extraSauceNone : NO_SAUCE_LABEL;
  const hasOptions = allowDoubleMeat || allowNoVeg || modifiersOnly;
  const canConfirm = modifiersOnly || selectedId !== null;

  const sectionLabel =
    "text-[11px] min-[1600px]:text-[16px] font-semibold uppercase tracking-[0.12em] text-foreground/45 mb-2 px-1";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl min-[1600px]:rounded-3xl shadow-2xl w-full max-w-md min-[1600px]:max-w-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        data-testid="sauce-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kopf */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 gap-3 min-[1600px]:px-8 min-[1600px]:pt-8">
          <div className="min-w-0">
            <h2 className="font-serif text-[23px] min-[1600px]:text-[34px] font-semibold text-foreground leading-tight tracking-tight">
              {modifiersOnly ? tr.dishOptionsTitle : optional ? tr.extraSauce : tr.sauceSelectTitle}
            </h2>
            {!optional && !modifiersOnly && (
              <p className="text-foreground/55 text-[13.5px] min-[1600px]:text-[20px] mt-1.5 leading-snug">
                {tr.sauceSelectSubtitle}
              </p>
            )}
            <p className="text-primary text-[12.5px] min-[1600px]:text-[18px] mt-2 font-semibold uppercase tracking-wide truncate">
              {dishName}
            </p>
          </div>
          <button
            data-testid="button-close-sauce"
            onClick={onClose}
            className="w-10 h-10 min-[1600px]:w-14 min-[1600px]:h-14 shrink-0 rounded-full bg-muted/70 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted transition-colors active:scale-95"
            aria-label={tr.sauceSelectCancel}
          >
            <X size={18} className="min-[1600px]:w-7 min-[1600px]:h-7" />
          </button>
        </div>

        {/* Scrollbarer Body */}
        <div className="px-6 pb-6 min-[1600px]:px-8 max-h-[68vh] overflow-y-auto scrollbar-hide">
          {/* Soßen-Liste als eine ruhige Gruppe */}
          {!modifiersOnly && (
            <div className="rounded-2xl min-[1600px]:rounded-3xl bg-card overflow-hidden divide-y divide-card-border/50">
              {sauces.map((sauce) => {
                const isSelected = selectedId === sauce.id;
                const soldOut = isItemSoldOut(sauceAvailabilityId(sauce));
                return (
                  <SauceRow
                    key={sauce.id}
                    testId={`button-sauce-${sauce.id}`}
                    label={sauce.label}
                    selected={isSelected}
                    soldOut={soldOut}
                    soldOutLabel={tr.soldOut}
                    onClick={() => { if (!soldOut) setSelectedId(sauce.id); }}
                  />
                );
              })}
              {noneInSauceList && (
                <SauceRow
                  testId="button-sauce-none"
                  label={noneLabel}
                  selected={selectedId === NONE}
                  onClick={() => setSelectedId(NONE)}
                />
              )}
            </div>
          )}

          {/* Optionen / Modifikatoren */}
          {hasOptions && (
            <div className={modifiersOnly ? "" : "mt-6"}>
              {!modifiersOnly && <p className={sectionLabel}>{tr.dishOptionsTitle}</p>}
              <div className="rounded-2xl min-[1600px]:rounded-3xl bg-card overflow-hidden divide-y divide-card-border/50">
                {allowDoubleMeat && (
                  <OptionRow
                    testId="button-double-meat"
                    label={doubleMeatLabel ?? ""}
                    checked={doubleMeat}
                    trailing={doubleMeatPrice}
                    onClick={() => setDoubleMeat((v) => !v)}
                  />
                )}
                {modifiersOnly && (
                  <OptionRow
                    testId="button-sauce-none"
                    label={NO_SAUCE_LABEL}
                    checked={noSauce}
                    onClick={() => setNoSauce((v) => !v)}
                  />
                )}
                {allowNoVeg && (
                  <OptionRow
                    testId="button-without-veg"
                    label={NO_VEG_LABEL}
                    checked={withoutVeg}
                    onClick={() => setWithoutVeg((v) => !v)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Fuß: Grün = bestätigen (LYS-Konvention) */}
          <div className="flex gap-2.5 mt-6">
            <button
              data-testid="button-sauce-cancel"
              onClick={onClose}
              className="flex-1 h-12 min-[1600px]:h-16 rounded-xl min-[1600px]:rounded-2xl bg-muted/70 text-foreground/70 text-[15px] min-[1600px]:text-[22px] font-medium hover:bg-muted hover:text-foreground active:scale-[0.98] transition-all duration-100"
            >
              {tr.sauceSelectCancel}
            </button>
            <button
              data-testid="button-sauce-confirm"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`flex-[1.6] h-12 min-[1600px]:h-16 rounded-xl min-[1600px]:rounded-2xl text-[15px] min-[1600px]:text-[22px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${
                canConfirm
                  ? "bg-emerald-600 text-white shadow-[0_8px_22px_-6px_rgba(5,150,105,0.5)] hover:bg-emerald-700 active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {tr.sauceSelectConfirm}
              {canConfirm && <Check size={18} strokeWidth={2.6} className="min-[1600px]:w-7 min-[1600px]:h-7" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Einzelwahl-Zeile (Soße) — runder Radio, linker Akzentbalken bei Auswahl. */
function SauceRow({
  testId, label, selected, soldOut, soldOutLabel, onClick,
}: {
  testId: string;
  label: string;
  selected: boolean;
  soldOut?: boolean;
  soldOutLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={soldOut}
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 min-[1600px]:gap-5 pl-5 pr-5 min-[1600px]:pl-7 min-[1600px]:pr-7 min-h-[56px] min-[1600px]:min-h-[84px] py-3 text-left border-l-[3px] min-[1600px]:border-l-4 transition-colors duration-150 ${
        soldOut
          ? "border-transparent opacity-45 cursor-not-allowed"
          : selected
            ? "border-primary bg-primary/12 active:bg-primary/15"
            : "border-transparent hover:bg-foreground/[0.04] active:bg-foreground/[0.06]"
      }`}
    >
      <span
        className={`w-[20px] h-[20px] min-[1600px]:w-8 min-[1600px]:h-8 shrink-0 rounded-full border-2 grid place-items-center transition-colors ${
          selected ? "border-primary" : "border-foreground/25"
        }`}
      >
        {selected && <span className="w-[10px] h-[10px] min-[1600px]:w-4 min-[1600px]:h-4 rounded-full bg-primary" />}
      </span>
      <span className={`text-[15.5px] min-[1600px]:text-[24px] leading-tight ${
        selected ? "font-semibold text-foreground" : soldOut ? "font-medium text-foreground/50 line-through" : "font-medium text-foreground/90"
      }`}>
        {label}
      </span>
      {soldOut && soldOutLabel && (
        <span className="ml-auto text-[12px] min-[1600px]:text-[18px] font-medium text-foreground/45 shrink-0">{soldOutLabel}</span>
      )}
    </button>
  );
}

/** Mehrfachwahl-Zeile (Option/Modifikator) — eckige Checkbox, optionaler Aufpreis rechts. */
function OptionRow({
  testId, label, checked, trailing, onClick,
}: {
  testId: string;
  label: string;
  checked: boolean;
  trailing?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 pl-5 pr-5 min-[1600px]:pl-7 min-[1600px]:pr-7 min-h-[56px] min-[1600px]:min-h-[84px] py-3 text-left border-l-[3px] min-[1600px]:border-l-4 transition-colors duration-150 ${
        checked
          ? "border-primary bg-primary/12 active:bg-primary/15"
          : "border-transparent hover:bg-foreground/[0.04] active:bg-foreground/[0.06]"
      }`}
    >
      <span className="flex items-center gap-3.5 min-[1600px]:gap-5 min-w-0">
        <span
          className={`w-[20px] h-[20px] min-[1600px]:w-8 min-[1600px]:h-8 shrink-0 rounded-md border-2 grid place-items-center transition-colors ${
            checked ? "border-primary bg-primary" : "border-foreground/25"
          }`}
        >
          {checked && <Check size={14} strokeWidth={3} className="text-primary-foreground min-[1600px]:w-6 min-[1600px]:h-6" />}
        </span>
        <span className={`text-[15.5px] min-[1600px]:text-[24px] leading-tight truncate ${checked ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>
          {label}
        </span>
      </span>
      {trailing && (
        <span className={`text-[14px] min-[1600px]:text-[20px] tabular-nums shrink-0 ${checked ? "text-foreground/70 font-medium" : "text-foreground/55"}`}>
          {trailing}
        </span>
      )}
    </button>
  );
}
