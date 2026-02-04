import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/lib/auth-context';

export default function Index() {
  const { user, isGuest, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // If user is authenticated or explicitly chose guest mode, go to tabs
    if (user || isGuest) {
      router.replace('/(tabs)');
    } else {
      // Otherwise, show welcome screen
      router.replace('/welcome');
    }
  }, [user, isGuest, isLoading]);

  // Show loading screen while checking auth state
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' }}>
      <ActivityIndicator size="large" color="#C9A227" />
    </View>
  );
}
