import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { languages, LangCode } from "@/i18n/translations";

export function LanguageSelector() {
  const { lang, setLang, language } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (code: LangCode) => {
    setLang(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="button-language-selector"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-card-border text-foreground text-[13px] font-medium hover:bg-muted transition-colors active:scale-95 duration-100"
      >
        <span className="text-[17px] leading-none">{language.flag}</span>
        <span className="hidden sm:inline max-w-[72px] truncate">{language.name}</span>
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-52 bg-card border border-card-border rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
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
        </div>
      )}
    </div>
  );
}
