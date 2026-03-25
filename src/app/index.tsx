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
    if (isLoading || !navReady || hasNavigated.current) return;
    hasNavigated.current = true;
    if (user || isGuest) {
      router.replace('/(tabs)');
    } else {
      router.replace('/welcome');
    }
  }, [user, isGuest, isLoading, navReady]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' }}>
      <ActivityIndicator size="large" color="#C9A227" />
    </View>
  );
}
