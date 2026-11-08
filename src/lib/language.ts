import { createContext, useContext } from 'react';

export type Language = 'en' | 'zh';

export type TranslationKey =
  | 'dashboardTitle'
  | 'welcomeBack'
  | 'home'
  | 'clubs'
  | 'registrations'
  | 'createClub'
  | 'manageClubs'
  | 'rateClub'
  | 'organizeEvents'
  | 'studentCouncil'
  | 'navigation'
  | 'quickAccess'
  | 'account'
  | 'logout'
  | 'teacher'
  | 'student'
  | 'light'
  | 'dark'
  | 'switchLight'
  | 'switchDark'
  | 'switchLanguage';

export interface LanguageContextValue {
  language: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
}
