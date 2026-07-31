import { useState, useEffect } from 'react';
import { Text, View, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n-context';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  
  // Watch for successful authentication and navigate to tabs
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('auth.missingInfo'));
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('common.error'), t('auth.invalidPassword'));
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await signUpWithEmail(email, password);
        // Check if email confirmation is required
        const session = result?.session;
        if (!session) {
          Alert.alert(
            t('auth.checkEmail'),
            t('auth.checkEmailBody'),
            [{ text: 'OK' }]
          );
        } else {
          // Auto-signed in (email confirmation disabled)
          // Navigation happens automatically via auth state listener
          Alert.alert(
            t('common.success'),
            t('auth.signUpSuccess'),
            [{ text: 'OK' }]
          );
        }
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      console.error('Auth error:', error);

      // Provide more helpful error messages
      let errorMessage = error?.message || 'Something went wrong. Please try again.';

      if (error?.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error?.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.';
      } else if (error?.message?.includes('User already registered') || error?.message?.includes('already exists')) {
        setIsSignUp(false);
        setConfirmPassword('');
        Alert.alert(
          t('common.error'),
          t('auth.accountExists'),
          [{ text: 'OK' }]
        );
        return;
      }

      Alert.alert(
        isSignUp ? 'Sign Up Failed' : 'Sign In Failed',
        errorMessage
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('auth.enterEmailFirst'));
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await resetPassword(email);
      Alert.alert(
        t('auth.resetSentTitle'),
        t('auth.resetSentBody'),
        [{ text: 'OK' }]
      );
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    }
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FAFAF8' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, paddingTop: insets.top }}>
          {/* Header */}
          <View className="flex-row items-center px-5 py-4">
            <Pressable onPress={handleBack} className="mr-3">
              <ChevronLeft size={28} color="#1a1a1a" />
            </Pressable>
            <Text className="text-2xl font-bold text-[#1a1a1a]">
              {isSignUp ? t('auth.createAccount') : t('auth.signIn')}
            </Text>
          </View>

          {/* Content */}
          <View className="flex-1 px-6 pt-8">
            <Text className="text-[#6B6B6B] text-base mb-8">
              {isSignUp ? t('auth.signUpSubtitle') : t('auth.signInSubtitle')}
            </Text>

            {/* Email Input */}
            <Text className="text-sm font-semibold text-[#8B8B8B] mb-2 tracking-wider">
              {t('auth.emailLabel')}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#B5B5B5"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-xl px-4 py-4 text-base mb-4"
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#F0EDE5',
                color: '#1a1a1a',
              }}
            />

            {/* Password Input */}
            <Text className="text-sm font-semibold text-[#8B8B8B] mb-2 tracking-wider">
              {t('auth.passwordLabel')}
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor="#B5B5B5"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-xl px-4 py-4 text-base mb-4"
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#F0EDE5',
                color: '#1a1a1a',
              }}
            />

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <>
                <Text className="text-sm font-semibold text-[#8B8B8B] mb-2 tracking-wider">
                  {t('auth.confirmPasswordLabel')}
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  placeholderTextColor="#B5B5B5"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="rounded-xl px-4 py-4 text-base mb-4"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#F0EDE5',
                    color: '#1a1a1a',
                  }}
                />
              </>
            )}

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={isLoading}
              className="rounded-full py-4 mt-4"
              style={{
                backgroundColor: '#C9A227',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-semibold text-center">
                  {isSignUp ? t('auth.createAccount') : t('auth.signIn')}
                </Text>
              )}
            </Pressable>

            {/* Forgot Password - only on sign in */}
            {!isSignUp && (
              <Pressable onPress={handleForgotPassword} className="mt-4 items-center">
                <Text className="text-[#C9A227] text-sm font-medium">{t('auth.forgotPassword')}</Text>
              </Pressable>
            )}

            {/* Toggle Sign Up / Sign In */}
            <Pressable
              onPress={() => {
                setIsSignUp(!isSignUp);
                setConfirmPassword('');
              }}
              className="mt-6 items-center"
            >
              <Text className="text-[#6B6B6B] text-base">
                {isSignUp ? t('auth.alreadyHaveAccount') + ' ' : t('auth.dontHaveAccount') + ' '}
                <Text className="text-[#C9A227] font-semibold">
                  {isSignUp ? t('auth.signIn') : t('auth.signUp')}
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
