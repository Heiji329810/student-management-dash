import { useEffect, useState, type ReactNode } from 'react';
import {
  LanguageContext,
  type Language,
  type TranslationKey,
} from '@/lib/language';
import { applyPageLanguage } from '@/lib/uiTranslation';

const translations = {
  en: {
    dashboardTitle: 'Student Management Dashboard',
    welcomeBack: 'Welcome back',
    home: 'Home',
    clubs: 'Clubs & Organizations',
    registrations: 'My Registrations',
    createClub: 'Create a Club',
    manageClubs: 'Manage Clubs and Activities',
    rateClub: 'Rate My Club',
    organizeEvents: 'Organize Official Events',
    studentCouncil: 'Student Council',
    navigation: 'Navigation',
    quickAccess: 'Quick access menu',
    account: 'Account',
    logout: 'Log out',
    teacher: 'Teacher',
    student: 'Student',
    light: 'Light',
    dark: 'Dark',
    switchLight: 'Switch to light mode',
    switchDark: 'Switch to dark mode',
    switchLanguage: '切换到中文',
  },
  zh: {
    dashboardTitle: '学生管理平台',
    welcomeBack: '欢迎回来',
    home: '首页',
    clubs: '社团与组织',
    registrations: '我的报名',
    createClub: '创建社团',
    manageClubs: '管理社团与活动',
    rateClub: '评价我的社团',
    organizeEvents: '组织学校官方活动',
    studentCouncil: '学生会',
    navigation: '导航',
    quickAccess: '快捷菜单',
    account: '账户',
    logout: '退出登录',
    teacher: '教师',
    student: '学生',
    light: '浅色',
    dark: '深色',
    switchLight: '切换到浅色模式',
    switchDark: '切换到深色模式',
    switchLanguage: 'Switch to English',
  },
} as const;

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('dashboardLanguage');
    const initial = saved === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = initial === 'zh' ? 'zh-CN' : 'en';
    return initial;
  });

  const toggleLanguage = () => {
    setLanguage((current) => {
      const next = current === 'en' ? 'zh' : 'en';
      localStorage.setItem('dashboardLanguage', next);
      document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
      return next;
    });
  };

  useEffect(() => applyPageLanguage(language), [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        toggleLanguage,
        t: (key: TranslationKey) => translations[language][key],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
