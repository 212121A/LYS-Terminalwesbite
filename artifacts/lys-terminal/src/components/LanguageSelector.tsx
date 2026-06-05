import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { languages, LangCode } from "@/i18n/translations";

const DROPDOWN_WIDTH = 208; // w-52

export function LanguageSelector() {
  const { lang, setLang, language } = useLang();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position relativ zum Button berechnen (fixed, da der Dropdown via Portal
  // außerhalb des Headers liegt — sonst würde ihn `overflow-hidden` des Headers
  // beschneiden und der Warenkorb ihn überdecken).
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 6, left: Math.max(8, r.right - DROPDOWN_WIDTH) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (code: LangCode) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        data-testid="button-language-selector"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-card-border text-foreground text-[13px] font-medium hover:bg-muted transition-colors active:scale-95 duration-100 min-[1600px]:px-5 min-[1600px]:py-3.5 min-[1600px]:text-[20px] min-[1600px]:gap-2.5 min-[1600px]:rounded-2xl"
      >
        <span className="text-[17px] leading-none">{language.flag}</span>
        <span className="hidden sm:inline max-w-[72px] truncate">{language.name}</span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: DROPDOWN_WIDTH }}
          className="bg-card border border-card-border rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-150"
          data-testid="dropdown-language"
        >
          <div className="max-h-[min(420px,calc(100vh-120px))] overflow-y-auto scrollbar-hide py-1">
            {languages.map((l) => (
              <button
                key={l.code}
                data-testid={`button-lang-${l.code}`}
                onClick={() => handleSelect(l.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-[14px] transition-colors text-left ${
                  lang === l.code
                    ? "bg-foreground/10 text-foreground font-medium"
                    : "text-foreground hover:bg-foreground/5"
                }`}
              >
                <span className="text-[18px] leading-none shrink-0">{l.flag}</span>
                <span className="flex-1">{l.name}</span>
                {lang === l.code && (
                  <Check size={14} className="text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
