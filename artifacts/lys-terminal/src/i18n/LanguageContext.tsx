import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import t, { LangCode, Translations, languages, Language } from "./translations";

interface LanguageContextValue {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  tr: Translations;
  language: Language;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "lys-lang";

function detectBrowserLang(): LangCode {
  const supported = languages.map((l) => l.code);
  const nav = navigator.language.slice(0, 2) as LangCode;
  return supported.includes(nav) ? nav : "de";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (stored && t[stored]) return stored;
    return detectBrowserLang();
  });

  const setLang = (code: LangCode) => {
    setLangState(code);
    localStorage.setItem(STORAGE_KEY, code);
  };

  const language = languages.find((l) => l.code === lang)!;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = language.dir ?? "ltr";
  }, [lang, language]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: t[lang], language }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
