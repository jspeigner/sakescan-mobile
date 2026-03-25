import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = '@sakescan:language';

export type Language = 'en' | 'ja' | 'ko' | 'zh-TW';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Detect device language and map to supported languages — called lazily inside useEffect
function getDeviceLocale(): Language {
  try {
    // Dynamic require so this native module is only accessed inside the React lifecycle
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getLocales } = require('expo-localization') as { getLocales: () => { languageCode: string; regionCode: string; languageTag: string }[] };
    const locales = getLocales();
    const code = locales[0]?.languageCode ?? 'en';
    const region = locales[0]?.regionCode ?? '';
    const tag = locales[0]?.languageTag ?? '';

    if (code === 'ja') return 'ja';
    if (code === 'ko') return 'ko';
    if (code === 'zh' && (region === 'TW' || region === 'HK' || region === 'MO')) return 'zh-TW';
    if (tag === 'zh-Hant') return 'zh-TW';
  } catch {
    // Native module not available, fall back to English
  }
  return 'en';
}

// English translations (primary locale; extend as needed)
const en: Record<string, string> = {
  'common.home': 'Home',
  'common.explore': 'Explore',
  'common.saved': 'Saved',
  'common.profile': 'Profile',
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.skip': 'Skip',
  'common.next': 'Next',
  'common.done': 'Done',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'welcome.title': 'Discover Sake',
  'welcome.subtitle': 'Scan, learn, and track your sake journey',
  'welcome.getStarted': 'Get Started',
  'welcome.signIn': 'Sign In',
  'welcome.signUp': 'Sign Up',
  'auth.signIn': 'Sign In',
  'auth.signUp': 'Sign Up',
  'auth.createAccount': 'Create Account',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.confirmPassword': 'Confirm Password',
  'auth.forgotPassword': 'Forgot Password?',
  'auth.alreadyHaveAccount': 'Already have an account?',
  'auth.dontHaveAccount': "Don't have an account?",
  'auth.signInSubtitle': 'Sign in to access your scan history and reviews.',
  'auth.signUpSubtitle': 'Create an account to save your scans and reviews.',
  'profile.title': 'Profile',
  'profile.guestUser': 'Guest User',
  'profile.editProfile': 'Edit Profile',
  'profile.scanned': 'SCANNED',
  'profile.reviewed': 'REVIEWED',
  'profile.favorites': 'FAVORITES',
  'profile.recentScans': 'RECENT SCANS',
  'profile.preferences': 'PREFERENCES',
  'profile.notifications': 'Notifications',
  'profile.darkMode': 'Dark Mode',
  'profile.darkModeHint': 'Switch to dark theme',
  'profile.language': 'Language',
  'profile.languageHint': 'Choose app language',
  'profile.logOut': 'Log Out',
  'sake.details': 'Sake Details',
  'sake.writeReview': 'Write a Review',
  'sake.reviews': 'Reviews',
  'sake.noReviews': 'No reviews yet',
  'sake.whereToBuy': 'Where to Buy',
  'sake.gettingLocation': 'Getting Location...',
  'home.scanToDiscover': 'Scan to Discover',
  'home.startScanning': 'Start Scanning',
  'explore.title': 'Explore',
  'explore.search': 'Search sake, breweries...',
};

// Japanese translations (abbreviated)
const ja: Record<string, string> = {
  ...en,
  'common.home': 'ホーム',
  'common.explore': '探す',
  'common.saved': '保存済み',
  'common.profile': 'プロフィール',
  'welcome.title': '日本酒を発見',
  'profile.title': 'プロフィール',
  'profile.languageHint': 'アプリの言語を選ぶ',
  'sake.details': '日本酒の詳細',
  'sake.writeReview': 'レビューを書く',
};

// Korean translations (abbreviated)
const ko: Record<string, string> = {
  ...en,
  'common.home': '홈',
  'common.explore': '탐색',
  'profile.title': '프로필',
  'sake.details': '사케 상세',
};

// Traditional Chinese (abbreviated)
const zhTW: Record<string, string> = {
  ...en,
  'common.home': '首頁',
  'common.explore': '探索',
  'profile.title': '個人資料',
  'sake.details': '清酒詳情',
};

const translations: Record<Language, Record<string, string>> = { en, ja, ko, 'zh-TW': zhTW };

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  'zh-TW': '繁體中文',
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (saved && saved in translations) {
          setLanguageState(saved as Language);
        } else {
          const deviceLocale = getDeviceLocale();
          setLanguageState(deviceLocale);
        }
      } catch (err) {
        console.error('Error loading language preference:', err);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    } catch (err) {
      console.error('Error saving language preference:', err);
    }
  };

  const t = (key: string): string => {
    const translation = translations[language][key];
    if (!translation) {
      return translations.en[key] ?? key;
    }
    return translation;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
