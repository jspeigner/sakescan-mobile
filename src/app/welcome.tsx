import { Text, View, Pressable, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect, Defs, Pattern, G } from 'react-native-svg';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';

// Japanese Seigaiha wave pattern component
function WavePattern() {
  return (
    <Svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.4 }}
    >
      <Defs>
        <Pattern id="seigaiha" patternUnits="userSpaceOnUse" width="60" height="30">
          <G fill="none" stroke="#D4C9A8" strokeWidth="0.5">
            <Path d="M0 30 Q15 0 30 30" />
            <Path d="M30 30 Q45 0 60 30" />
            <Path d="M-30 30 Q-15 0 0 30" />
            <Path d="M0 30 Q15 15 30 30" />
            <Path d="M30 30 Q45 15 60 30" />
            <Path d="M-30 30 Q-15 15 0 30" />
            <Path d="M0 30 Q15 22 30 30" />
            <Path d="M30 30 Q45 22 60 30" />
          </G>
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#seigaiha)" />
    </Svg>
  );
}

// Sake bottle and glass icon
function SakeIcon() {
  return (
    <View
      style={{
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#F5EED9',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width="70" height="70" viewBox="0 0 70 70">
        {/* Sake glass (ochoko) */}
        <Path
          d="M15 25 L20 55 L30 55 L35 25 Z"
          fill="#C9A227"
        />
        <Rect x="18" y="55" width="14" height="3" fill="#C9A227" />

        {/* Sake bottle (tokkuri) */}
        <Path
          d="M42 15 L42 22 L38 30 L38 60 L58 60 L58 30 L54 22 L54 15 Z"
          fill="#C9A227"
        />
        <Rect x="44" y="10" width="8" height="5" rx="1" fill="#C9A227" />
      </Svg>
    </View>
  );
}

// Apple logo SVG
function AppleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#1a1a1a">
      <Path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </Svg>
  );
}

// Google logo SVG
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, continueAsGuest, signInWithApple, signInWithGoogle, isLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);

  useEffect(() => {
    console.log('[Welcome] mounted — insets:', JSON.stringify(insets));
  }, [insets]);

  // Watch for successful authentication and navigate to tabs
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleGetStarted = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/auth');
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    continueAsGuest();
    router.replace('/(tabs)');
  };

  const handleContinueAsGuest = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    continueAsGuest();
    router.replace('/(tabs)');
  };

  const handleSignInApple = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSigningIn(true);
    
    try {
      await signInWithApple();
      // Navigation happens automatically via auth state listener in index.tsx
      // Don't navigate here - let the auth state change trigger navigation
    } catch (error: unknown) {
      // Don't show error for user cancellation
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      const message = error instanceof Error ? error.message : 'Sign in failed. Please try again.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignInGoogle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSigningInGoogle(true);
    
    try {
      await signInWithGoogle();
      // Navigation happens automatically via auth state listener in index.tsx
      // Don't navigate here - let the auth state change trigger navigation
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign in failed. Please try again.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
      {/* Wave Pattern Background */}
      <WavePattern />

      {/* Skip → browse as guest */}
      <View
        className="absolute right-5 z-10"
        style={{ top: insets.top + 12 }}
      >
        <Pressable onPress={handleSkip}>
          <Text className="text-[#6B6B6B] text-base font-medium">
            Skip
          </Text>
        </Pressable>
      </View>

      {/* Main Content — inline flex so layout works even if NativeWind release output differs */}
      <View
        className="items-center justify-center px-6"
        style={{ flex: 1, paddingTop: insets.top }}
      >
        {/* Logo Icon */}
        <SakeIcon />

        {/* Title */}
        <Text
          className="mt-8 text-[#1a1a1a]"
          style={{ fontFamily: 'serif', fontSize: 36, fontWeight: '600' }}
        >
          SakeScan
        </Text>

        {/* Tagline */}
        <Text className="text-[#6B6B6B] text-lg mt-3">
          Discover sake, one label at a time
        </Text>
      </View>

      {/* Bottom Buttons */}
      <View
        className="px-5"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Get Started Button */}
        <Pressable
          onPress={handleGetStarted}
          className="active:scale-98 mb-3"
          style={{
            backgroundColor: '#C9A227',
            paddingVertical: 18,
            borderRadius: 28,
            alignItems: 'center',
          }}
        >
          <Text className="text-white text-base font-semibold">
            Sign In with Email
          </Text>
        </Pressable>

        {/* Divider */}
        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-[#E5E5E5]" />
          <Text className="mx-3 text-[#8B8B8B] text-sm">or sign in with</Text>
          <View className="flex-1 h-px bg-[#E5E5E5]" />
        </View>

        {/* Sign in with Apple */}
        <Pressable
          onPress={handleSignInApple}
          disabled={isSigningIn || isLoading}
          className="active:scale-98 mb-3"
          style={{
            backgroundColor: '#F0EDE5',
            paddingVertical: 18,
            borderRadius: 28,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            opacity: isSigningIn || isLoading ? 0.6 : 1,
          }}
        >
          <AppleLogo />
          <Text className="text-[#1a1a1a] text-base font-semibold ml-3">
            Sign in with Apple
          </Text>
        </Pressable>

        {/* Sign in with Google */}
        <Pressable
          onPress={handleSignInGoogle}
          disabled={isSigningInGoogle || isLoading}
          className="active:scale-98 mb-4"
          style={{
            backgroundColor: '#F0EDE5',
            paddingVertical: 18,
            borderRadius: 28,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            opacity: isSigningInGoogle || isLoading ? 0.6 : 1,
          }}
        >
          <GoogleLogo />
          <Text className="text-[#1a1a1a] text-base font-semibold ml-3">
            Sign in with Google
          </Text>
        </Pressable>

        <Pressable onPress={handleContinueAsGuest} className="items-center py-2">
          <Text className="text-[#8B8B8B] text-base">
            Continue as Guest
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
