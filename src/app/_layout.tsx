import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
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

// Tell the native storyboard splash to hide as early as possible.
// We replace JS-controlled splash gating with a React overlay (see SplashOverlay).
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.hideAsync().catch(() => {});

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

/**
 * React-layer splash overlay — replaces JS-controlled expo-splash-screen.
 * Covers the entire screen with the app background colour until fonts + auth
 * are both ready, then fades out in 200 ms. This avoids the Fabric race
 * condition where SplashScreen.hideAsync() can become a no-op.
 */
function SplashOverlay({ ready }: { ready: boolean }) {
  const opacity = useSharedValue(1);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (ready && !hidden) {
      console.log('[SplashOverlay] fading out');
      opacity.value = withTiming(0, { duration: 200 });
      const t = setTimeout(() => setHidden(true), 210);
      return () => clearTimeout(t);
    }
  }, [ready, hidden, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (hidden) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#FAFAF8',
          zIndex: 9999,
        },
        style,
      ]}
    />
  );
}

function AppContent({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const appReady = fontsReady && !isLoading;

  useEffect(() => {
    console.log('[AppContent] isLoading:', isLoading, 'fontsReady:', fontsReady, 'appReady:', appReady);
  }, [isLoading, fontsReady, appReady]);

  const navigationScheme = isDarkMode ? 'dark' : 'light';

  return (
    <>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <RootLayoutNav colorScheme={navigationScheme} />
      <SplashOverlay ready={appReady} />
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

  // If useFonts hangs silently (no error, never resolves), unblock the UI after 3 s
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!fontsLoaded && !fontError) {
        console.warn('[RootLayout] Font loading timed out — proceeding without custom fonts');
        setFontTimeout(true);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    console.log('[RootLayout] fontsLoaded:', fontsLoaded, 'fontError:', !!fontError);
    if (fontError) {
      console.error('[RootLayout] Font loading failed:', fontError);
    }
  }, [fontsLoaded, fontError]);

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

  const fontsReady = fontsLoaded || !!fontError || fontTimeout;

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
                      <AppContent fontsReady={fontsReady} />
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
