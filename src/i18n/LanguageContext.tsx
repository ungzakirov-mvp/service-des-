import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Lang = "ru" | "uz" | "en";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// We'll lazy-load translations
import { translations } from "./translations";

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("novumtech-lang") as Lang | null;
    return saved && ["ru", "uz", "en"].includes(saved) ? saved : "ru";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("novumtech-lang", l);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const val = translations[lang]?.[key];
      if (val !== undefined) return val;
      // Fallback to Russian
      return translations.ru?.[key] ?? key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
