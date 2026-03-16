import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/lib/auth-context';

export default function Index() {
  const { user, isGuest, isLoading } = useAuth();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (isLoading || hasNavigated.current) return;

    // Mark as navigated to prevent double navigation
    hasNavigated.current = true;

    // If user is authenticated or explicitly chose guest mode, go to tabs
    if (user || isGuest) {
      router.replace('/(tabs)');
    } else {
      // Otherwise, show welcome screen
      router.replace('/welcome');
    }
  }, [user, isGuest, isLoading]);

  // Safety timeout: if still on this screen after 6 seconds, force navigate to welcome
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasNavigated.current) {
        console.log('[Index] Safety timeout triggered - navigating to welcome');
        hasNavigated.current = true;
        router.replace('/welcome');
      }
    }, 6000);

    return () => clearTimeout(timeout);
  }, []);

  // Show loading screen while checking auth state
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' }}>
      <ActivityIndicator size="large" color="#C9A227" />
    </View>
  );
}
