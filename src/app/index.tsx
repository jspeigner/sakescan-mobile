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

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' }}>
      <ActivityIndicator size="large" color="#C9A227" />
    </View>
  );
}
