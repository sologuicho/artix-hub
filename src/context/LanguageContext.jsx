import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const stored = localStorage.getItem('language');
    return stored || 'es';
  });

  const [translations, setTranslations] = useState({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        let translationsModule;
        if (language === 'es') {
          translationsModule = await import('../locales/es.json');
        } else {
          translationsModule = await import('../locales/en.json');
        }
        setTranslations(translationsModule.default || translationsModule);
      } catch (error) {
        console.error('Error loading translations:', error);
        // Fallback to Spanish
        try {
          const fallback = await import('../locales/es.json');
          setTranslations(fallback.default || fallback);
        } catch (fallbackError) {
          console.error('Error loading fallback translations:', fallbackError);
        }
      }
    };

    loadTranslations();
  }, [language]);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return key;
    }
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

