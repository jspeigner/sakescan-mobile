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
  'common.clear': 'Clear',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.skip': 'Skip',
  'common.next': 'Next',
  'common.done': 'Done',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.breweries': 'Breweries',
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
  'home.recentlyScanned': 'Recently Scanned',
  'home.popularSake': 'Popular Sake',
  'home.seeAll': 'See All',
  'explore.title': 'Explore',
  'explore.search': 'Search sake, breweries...',
  'saved.title': 'Saved',
  'saved.subtitle': 'Your favorite sakes and ratings',
  'saved.favorites': 'Favorites',
  'saved.rated': 'Rated',
  'privacy.title': 'Privacy Settings',
  'privacy.profilePrivacy': 'PROFILE PRIVACY',
  'privacy.publicProfile': 'Public Profile',
  'privacy.publicProfileHint': 'Others can see your profile and reviews',
  'privacy.showActivity': 'Show Activity',
  'privacy.showActivityHint': 'Display your scanning and review activity',
  'privacy.dataCollection': 'DATA COLLECTION',
  'privacy.locationData': 'Location Data',
  'privacy.locationDataHint': 'Share location when scanning for nearby sake',
  'privacy.usageAnalytics': 'Usage Analytics',
  'privacy.usageAnalyticsHint': 'Help improve the app with anonymous usage data',
  'privacy.personalized': 'Personalized Recommendations',
  'privacy.personalizedHint': 'Get sake suggestions based on your preferences',
  'privacy.yourData': 'YOUR DATA',
  'privacy.downloadData': 'Download Your Data',
  'privacy.downloadDataBody': 'We will prepare a copy of your data and send it to your email address. This may take up to 24 hours.',
  'privacy.downloadMyData': 'Download My Data',
  'privacy.downloadMyDataHint': 'Get a copy of all your data',
  'privacy.request': 'Request',
  'privacy.requestSent': 'Request Sent',
  'privacy.requestSentBody': 'You will receive an email with your data within 24 hours.',
  'privacy.clearScanHistory': 'Clear Scan History',
  'privacy.clearScanHistoryHint': 'Delete all your scanned sake records',
  'privacy.clearScanHistoryConfirm': 'This will permanently delete all your scan history. This action cannot be undone.',
  'privacy.scanHistoryCleared': 'Scan history cleared successfully.',
  'privacy.clearScanHistoryFailed': 'Failed to clear scan history. Please try again.',
  'privacy.clearAllReviews': 'Clear All Reviews',
  'privacy.clearAllReviewsHint': 'Delete all your reviews and ratings',
  'privacy.clearAllReviewsConfirm': 'This will permanently delete all your reviews and ratings. This action cannot be undone.',
  'privacy.reviewsCleared': 'All reviews cleared successfully.',
  'privacy.clearReviewsFailed': 'Failed to clear reviews. Please try again.',
  'privacy.footer': 'Your privacy is important to us. We only collect data necessary to provide and improve our services. For more information, please review our Privacy Policy.',
  'privacy.viewPolicy': 'View Privacy Policy',
  'privacy.openPolicyFailed': 'Unable to open Privacy Policy. Please try again later.',
  'scanHistory.title': 'Scan History',
  'scanHistory.emptyTitle': 'No Scans Yet',
  'scanHistory.emptyBody': 'Scanned sake will appear here. Start scanning to build your discovery database!',
  'scanHistory.deleteTitle': 'Delete Scan',
  'scanHistory.deleteConfirm': 'Are you sure you want to delete this scanned item?',
  'scanHistory.deleteFailed': 'Failed to delete scan. Please try again.',
  'scanHistory.justNow': 'Just now',
  'scanHistory.scanSingular': 'scan total',
  'scanHistory.scanPlural': 'scans total',
  'scanHistory.unknownSake': 'Unknown Sake',
  'scanHistory.unknownBrewery': 'Unknown Brewery',
  'profile.profileUpdated': 'Profile updated successfully.',
  'profile.avatarUpdated': 'Profile picture updated successfully.',
  'profile.following': 'FOLLOWING',
  'review.submitSuccess': 'Review submitted successfully.',
  'review.submit': 'Submit Review',
  'review.yourRating': 'YOUR RATING',
  'camera.infoTitle': 'How to Scan',
  'camera.infoLabel': 'Center the sake label in the frame. Make sure text is clear and well-lit. You can also pick a photo from your library.',
  'camera.infoMenu': 'Capture the full sake menu. Hold steady so prices and names are readable. We will match items to your preferences when possible.',
  'camera.gotIt': 'Got it',
};

// Japanese translations (abbreviated)
const ja: Record<string, string> = {
  ...en,
  'common.home': 'ホーム',
  'common.explore': '探す',
  'common.saved': '保存済み',
  'common.profile': 'プロフィール',
  'common.breweries': '蔵元',
  'common.cancel': 'キャンセル',
  'common.save': '保存',
  'common.delete': '削除',
  'common.clear': 'クリア',
  'common.success': '成功',
  'common.error': 'エラー',
  'welcome.title': '日本酒を発見',
  'profile.title': 'プロフィール',
  'profile.editProfile': 'プロフィール編集',
  'profile.scanned': 'スキャン',
  'profile.reviewed': 'レビュー',
  'profile.language': '言語',
  'profile.languageHint': 'アプリの言語を選ぶ',
  'profile.darkMode': 'ダークモード',
  'profile.notifications': '通知',
  'profile.logOut': 'ログアウト',
  'profile.profileUpdated': 'プロフィールを更新しました。',
  'profile.avatarUpdated': 'プロフィール写真を更新しました。',
  'sake.details': '日本酒の詳細',
  'sake.writeReview': 'レビューを書く',
  'home.scanToDiscover': 'スキャンして発見',
  'home.startScanning': 'スキャンを開始',
  'home.seeAll': 'すべて見る',
  'home.recentlyScanned': '最近のスキャン',
  'explore.title': '探す',
  'saved.title': '保存済み',
  'privacy.title': 'プライバシー設定',
  'privacy.clearScanHistory': 'スキャン履歴を削除',
  'privacy.clearAllReviews': 'すべてのレビューを削除',
  'privacy.scanHistoryCleared': 'スキャン履歴を削除しました。',
  'privacy.reviewsCleared': 'すべてのレビューを削除しました。',
  'privacy.viewPolicy': 'プライバシーポリシーを見る',
  'scanHistory.title': 'スキャン履歴',
  'scanHistory.emptyTitle': 'スキャンはまだありません',
  'scanHistory.deleteTitle': 'スキャンを削除',
  'scanHistory.deleteConfirm': 'このスキャンを削除してもよろしいですか？',
  'review.submitSuccess': 'レビューを投稿しました。',
  'review.submit': 'レビューを投稿',
  'camera.infoTitle': 'スキャン方法',
  'camera.gotIt': '了解',
};

// Korean translations (abbreviated)
const ko: Record<string, string> = {
  ...en,
  'common.home': '홈',
  'common.explore': '탐색',
  'common.saved': '저장됨',
  'common.profile': '프로필',
  'common.breweries': '양조장',
  'common.cancel': '취소',
  'common.save': '저장',
  'common.delete': '삭제',
  'common.clear': '지우기',
  'common.success': '성공',
  'profile.title': '프로필',
  'profile.language': '언어',
  'profile.darkMode': '다크 모드',
  'sake.details': '사케 상세',
  'home.startScanning': '스캔 시작',
  'home.seeAll': '모두 보기',
  'privacy.title': '개인정보 설정',
  'privacy.scanHistoryCleared': '스캔 기록이 삭제되었습니다.',
  'privacy.reviewsCleared': '모든 리뷰가 삭제되었습니다.',
  'scanHistory.title': '스캔 기록',
  'review.submitSuccess': '리뷰가 등록되었습니다.',
  'camera.infoTitle': '스캔 방법',
  'camera.gotIt': '확인',
};

// Traditional Chinese (abbreviated)
const zhTW: Record<string, string> = {
  ...en,
  'common.home': '首頁',
  'common.explore': '探索',
  'common.saved': '已儲存',
  'common.profile': '個人資料',
  'common.breweries': '酒造',
  'common.cancel': '取消',
  'common.save': '儲存',
  'common.delete': '刪除',
  'common.clear': '清除',
  'common.success': '成功',
  'profile.title': '個人資料',
  'profile.language': '語言',
  'profile.darkMode': '深色模式',
  'sake.details': '清酒詳情',
  'home.startScanning': '開始掃描',
  'home.seeAll': '查看全部',
  'privacy.title': '隱私設定',
  'privacy.scanHistoryCleared': '掃描紀錄已清除。',
  'privacy.reviewsCleared': '所有評論已清除。',
  'scanHistory.title': '掃描紀錄',
  'review.submitSuccess': '評論已成功送出。',
  'camera.infoTitle': '如何掃描',
  'camera.gotIt': '知道了',
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
