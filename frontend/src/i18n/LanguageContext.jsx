import { createContext, useContext, useState, useCallback } from 'react';
import en from './en';
import hi from './hi';
import ml from './ml';
import ta from './ta';

const translations = { en, hi, ml, ta };
const STORAGE_KEY = 'healthraahi-language';

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch {}
  return 'en';
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
      try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    }
  }, []);

  const t = useCallback((key, params) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      if (value && typeof value === 'object') value = value[k];
      else return key;
    }
    if (typeof value !== 'string') return key;
    if (params) {
      return Object.entries(params).reduce(
        (str, [pk, pv]) => str.replace(new RegExp(`\\{${pk}\\}`, 'g'), pv),
        value
      );
    }
    return value;
  }, [language]);

  const availableLanguages = Object.entries(translations).map(([code, dict]) => ({
    code,
    name: dict.lang.name,
  }));

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
