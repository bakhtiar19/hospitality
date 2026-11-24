'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import idMessages from '../messages/id.json';
import enMessages from '../messages/en.json';

type Locale = 'id' | 'en';

interface IntlContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const messagesMap = {
  id: idMessages,
  en: enMessages,
};

const IntlContext = createContext<IntlContextType | null>(null);

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('id');

  useEffect(() => {
    const saved = localStorage.getItem('hospitality_locale') as Locale;
    if (saved && (saved === 'id' || saved === 'en')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('hospitality_locale', newLocale);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let current: unknown = messagesMap[locale];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return path;
      }
    }
    return typeof current === 'string' ? current : path;
  };

  return (
    <IntlContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </IntlContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(IntlContext);
  if (!context) {
    throw new Error('useI18n must be used within IntlProvider');
  }
  return context;
}
