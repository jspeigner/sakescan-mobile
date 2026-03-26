import { useEffect, useRef } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/lib/auth-context';

export default function Index() {
  const { user, isGuest, isLoading } = useAuth();
  const hasNavigated = useRef(false);
  const rootNavigationState = useRootNavigationState();
  const navReady = Boolean(rootNavigationState?.key);

  useEffect(() => {
    console.log('[Index] state check — isLoading:', isLoading, 'navReady:', navReady, 'user:', !!user, 'isGuest:', isGuest);
    if (isLoading || !navReady || hasNavigated.current) return;
    hasNavigated.current = true;
    const dest = (user || isGuest) ? '/(tabs)' : '/welcome';
    console.log('[Index] navigating to:', dest);
    router.replace(dest as Parameters<typeof router.replace>[0]);
  }, [user, isGuest, isLoading, navReady]);

  // Safety net: if navReady never becomes true (can happen on New Arch in production),
  // force navigation after 3 s regardless.
  useEffect(() => {
    const t = setTimeout(() => {
      if (hasNavigated.current) return;
      console.warn('[Index] navReady timeout — forcing navigation');
      hasNavigated.current = true;
      const dest = (user || isGuest) ? '/(tabs)' : '/welcome';
      router.replace(dest as Parameters<typeof router.replace>[0]);
    }, 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' }}>
      <ActivityIndicator size="large" color="#C9A227" />
    </View>
  );
}
