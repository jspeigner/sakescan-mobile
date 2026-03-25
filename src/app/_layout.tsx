import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  NotoSerifJP_400Regular,
  NotoSerifJP_500Medium,
  NotoSerifJP_600SemiBold,
  NotoSerifJP_700Bold,
} from '@expo-google-fonts/noto-serif-jp';
import {
  ZenKakuGothicNew_300Light,
  ZenKakuGothicNew_400Regular,
  ZenKakuGothicNew_500Medium,
  ZenKakuGothicNew_700Bold,
  ZenKakuGothicNew_900Black,
} from '@expo-google-fonts/zen-kaku-gothic-new';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ThemeProvider as CustomThemeProvider, useTheme } from '@/lib/theme-context';
import { NotificationProvider } from '@/lib/notification-context';
import { I18nProvider } from '@/lib/i18n-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Text, View } from 'react-native';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function RootLayoutNav({ colorScheme }: { colorScheme: 'light' | 'dark' | null | undefined }) {
  const { colors } = useTheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerShown: false, animation: 'none' }}
        />
        <Stack.Screen
          name="welcome"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="auth"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="reset-password"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="camera"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="sake/[id]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="review"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="brewery/[id]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="filters"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="search-results"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="privacy-settings"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="profile"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="scan-result"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="scan-history"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="stores"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
      </Stack>
    </ThemeProvider>
  );
}

function AppContent() {
  const { isLoading } = useAuth();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  const navigationScheme = isDarkMode ? 'dark' : 'light';

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <RootLayoutNav colorScheme={navigationScheme} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSerifJP_400Regular,
    NotoSerifJP_500Medium,
    NotoSerifJP_600SemiBold,
    NotoSerifJP_700Bold,
    ZenKakuGothicNew_300Light,
    ZenKakuGothicNew_400Regular,
    ZenKakuGothicNew_500Medium,
    ZenKakuGothicNew_700Bold,
    ZenKakuGothicNew_900Black,
  });

  useEffect(() => {
    if (fontError) {
      console.error('[RootLayout] Font loading failed:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    const parsePairs = (str: string): Record<string, string> => {
      const result: Record<string, string> = {};
      str.split('&').forEach((pair) => {
        const eqIndex = pair.indexOf('=');
        if (eqIndex === -1) return;
        const key = pair.slice(0, eqIndex);
        const value = pair.slice(eqIndex + 1);
        if (key) result[key] = decodeURIComponent(value);
      });
      return result;
    };

    const handleUrl = async (url: string) => {
      const fragmentIndex = url.indexOf('#');
      const queryIndex = url.indexOf('?');

      let params: Record<string, string> = {};

      if (fragmentIndex !== -1) {
        params = parsePairs(url.slice(fragmentIndex + 1));
      } else if (queryIndex !== -1) {
        params = parsePairs(url.slice(queryIndex + 1));
      } else {
        return;
      }

      const { access_token, refresh_token, type } = params;

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          console.error('[RootLayout] Failed to set session from deep link:', error);
          return;
        }
        if (type === 'recovery') {
          router.replace('/reset-password');
        }
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary
        fallback={
          <View style={{ flex: 1, backgroundColor: '#FAFAF8', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center' }}>
              Unable to start SakeScan
            </Text>
            <Text style={{ fontSize: 16, color: '#6B6B6B', marginTop: 12, textAlign: 'center' }}>
              Please restart the app. If the problem persists, try reinstalling.
            </Text>
          </View>
        }
      >
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <AuthProvider>
              <I18nProvider>
                <CustomThemeProvider>
                  <NotificationProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <AppContent />
                    </GestureHandlerRootView>
                  </NotificationProvider>
                </CustomThemeProvider>
              </I18nProvider>
            </AuthProvider>
          </ErrorBoundary>
        </QueryClientProvider>
      </ErrorBoundary>
    </View>
  );
}
