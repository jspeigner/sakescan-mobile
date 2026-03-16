import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@sakescan:theme';

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof lightColors;
}

const lightColors = {
  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F3EE',
  text: '#1a1a1a',
  textSecondary: '#6B6B6B',
  textTertiary: '#8B8B8B',
  primary: '#C9A227',
  primaryLight: '#F5EED9',
  red: '#dc2626',
  redLight: '#FEF2F2',
  border: '#F0EDE5',
  borderLight: '#E8E4D9',
  error: '#DC2626',
  success: '#10B981',
  warning: '#D97706',
};

const darkColors = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceSecondary: '#2a2a2a',
  text: '#FFFFFF',
  textSecondary: '#B5B5B5',
  textTertiary: '#8B8B8B',
  primary: '#C9A227',
  primaryLight: '#3a3428',
  red: '#ef4444',
  redLight: '#2d1515',
  border: '#333333',
  borderLight: '#2a2a2a',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved) {
          setThemeModeState(saved as ThemeMode);
        }
      } catch (err) {
        console.error('Error loading theme:', err);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (err) {
      console.error('Error saving theme:', err);
    }
  };

  // Determine if dark mode should be active
  const isDarkMode =
    themeMode === 'dark' || (themeMode === 'auto' && systemColorScheme === 'dark');

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeMode, isDarkMode, setThemeMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
