import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translate, loadLanguage, saveLanguage } from './i18n';
import { DEFAULT_LANGUAGE } from './translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    loadLanguage().then(setLanguageState);
  }, []);

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    saveLanguage(lang);
  }, []);

  const t = useCallback((key, params) => translate(language, key, params), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
