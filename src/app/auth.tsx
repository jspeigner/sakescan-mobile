import { useState, useEffect } from 'react';
import { Text, View, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
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
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
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
            'Check Your Email',
            'We sent a confirmation link to your email. Please check your inbox and confirm to sign in.',
            [{ text: 'OK' }]
          );
        } else {
          // Auto-signed in (email confirmation disabled)
          // Navigation happens automatically via auth state listener
          Alert.alert(
            'Success!',
            'Account created successfully. You\'re now signed in!',
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
          'Account Already Exists',
          'This email is already registered. Please sign in with your password.',
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
      Alert.alert('Enter Your Email', 'Please enter your email address first, then tap Forgot Password.');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await resetPassword(email);
      Alert.alert(
        'Check Your Email',
        'If an account exists with that email, we sent a password reset link. Please check your inbox.',
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
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          </View>

          {/* Content */}
          <View className="flex-1 px-6 pt-8">
            <Text className="text-[#6B6B6B] text-base mb-8">
              {isSignUp
                ? 'Create an account to save your scans and reviews.'
                : 'Sign in to access your scan history and reviews.'}
            </Text>

            {/* Email Input */}
            <Text className="text-sm font-semibold text-[#8B8B8B] mb-2 tracking-wider">
              EMAIL
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
              PASSWORD
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
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
                  CONFIRM PASSWORD
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
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
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </Pressable>

            {/* Forgot Password - only on sign in */}
            {!isSignUp && (
              <Pressable onPress={handleForgotPassword} className="mt-4 items-center">
                <Text className="text-[#C9A227] text-sm font-medium">Forgot Password?</Text>
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
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text className="text-[#C9A227] font-semibold">
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
