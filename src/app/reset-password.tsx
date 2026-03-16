import { useState } from 'react';
import {
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { updatePassword } = useAuth();
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Missing Information', 'Please enter and confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
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
      await updatePassword(password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Password Updated',
        'Your password has been updated successfully. You can now sign in.',
        [{ text: 'OK', onPress: () => router.replace('/auth') }]
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update password. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/auth');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <View className="flex-row items-center px-5 py-4">
            <Pressable onPress={handleBack} className="mr-3">
              <ChevronLeft size={28} color={colors.text} />
            </Pressable>
            <Text className="text-2xl font-bold" style={{ color: colors.text }}>
              New Password
            </Text>
          </View>

          <View className="flex-1 px-6 pt-8">
            <Text className="text-base mb-8" style={{ color: colors.textSecondary }}>
              Choose a new password for your account.
            </Text>

            <Text className="text-sm font-semibold mb-2 tracking-wider" style={{ color: colors.textSecondary }}>
              NEW PASSWORD
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-xl px-4 py-4 text-base mb-4"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
              }}
            />

            <Text className="text-sm font-semibold mb-2 tracking-wider" style={{ color: colors.textSecondary }}>
              CONFIRM PASSWORD
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-xl px-4 py-4 text-base mb-4"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
              }}
            />

            <Pressable
              onPress={handleSubmit}
              disabled={isLoading}
              className="rounded-full py-4 mt-4"
              style={{
                backgroundColor: colors.primary,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-base font-semibold text-center">
                  Update Password
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
