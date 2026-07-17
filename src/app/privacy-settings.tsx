import { useState } from 'react';
import { Text, View, ScrollView, Pressable, Switch, Alert, Linking, ActivityIndicator } from 'react-native';
import { ChevronLeft, Eye, EyeOff, MapPin, BarChart3, Share2, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useI18n } from '@/lib/i18n-context';
import { useClearUserScans, useClearUserRatings } from '@/lib/supabase-hooks';
import { useScanHistoryStore } from '@/lib/scan-history-store';

const PRIVACY_POLICY_URL = 'https://sakescan.com/privacy';

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const clearUserScans = useClearUserScans();
  const clearUserRatings = useClearUserRatings();
  const clearLocalHistory = useScanHistoryStore((s) => s.clearHistory);
  const [isClearingScans, setIsClearingScans] = useState(false);
  const [isClearingReviews, setIsClearingReviews] = useState(false);

  // Privacy settings state
  const [profileVisible, setProfileVisible] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [shareLocation, setShareLocation] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [personalizedAds, setPersonalizedAds] = useState(false);

  const handleToggle = async (setter: (value: boolean) => void, value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(value);
  };

  const handleClearScanHistory = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('privacy.clearScanHistory'),
      t('privacy.clearScanHistoryConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear'),
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setIsClearingScans(true);
            try {
              await clearUserScans.mutateAsync(user.id);
              await clearLocalHistory();
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(t('common.success'), t('privacy.scanHistoryCleared'));
            } catch (err) {
              console.error('Failed to clear scan history:', err);
              Alert.alert(t('common.error'), t('privacy.clearScanHistoryFailed'));
            } finally {
              setIsClearingScans(false);
            }
          },
        },
      ]
    );
  };

  const handleClearReviews = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('privacy.clearAllReviews'),
      t('privacy.clearAllReviewsConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.clear'),
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setIsClearingReviews(true);
            try {
              await clearUserRatings.mutateAsync(user.id);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(t('common.success'), t('privacy.reviewsCleared'));
            } catch (err) {
              console.error('Failed to clear reviews:', err);
              Alert.alert(t('common.error'), t('privacy.clearReviewsFailed'));
            } finally {
              setIsClearingReviews(false);
            }
          },
        },
      ]
    );
  };

  const handleDownloadData = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('privacy.downloadData'),
      t('privacy.downloadDataBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('privacy.request'),
          onPress: () => {
            Alert.alert(t('privacy.requestSent'), t('privacy.requestSentBody'));
          },
        },
      ]
    );
  };

  const handleOpenPrivacyPolicy = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch (err) {
      console.error('Failed to open privacy policy:', err);
      Alert.alert(t('common.error'), t('privacy.openPolicyFailed'));
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text
          className="flex-1 text-lg font-bold text-center mr-8"
          style={{ color: colors.text }}
        >
          {t('privacy.title')}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Profile Privacy Section */}
        <View className="mx-5 mt-6 mb-6">
          <Text
            className="text-sm font-semibold tracking-wider mb-3"
            style={{ color: colors.textTertiary }}
          >
            {t('privacy.profilePrivacy')}
          </Text>

          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <View
              className="flex-row items-center p-4"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primaryLight }}
              >
                {profileVisible ? (
                  <Eye size={20} color={colors.primary} />
                ) : (
                  <EyeOff size={20} color={colors.primary} />
                )}
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium" style={{ color: colors.text }}>
                  {t('privacy.publicProfile')}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
                  {t('privacy.publicProfileHint')}
                </Text>
              </View>
              <Switch
                value={profileVisible}
                onValueChange={(v) => handleToggle(setProfileVisible, v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row items-center p-4">
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <BarChart3 size={20} color={colors.primary} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium" style={{ color: colors.text }}>
                  {t('privacy.showActivity')}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
                  {t('privacy.showActivityHint')}
                </Text>
              </View>
              <Switch
                value={showActivity}
                onValueChange={(v) => handleToggle(setShowActivity, v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Data Collection Section */}
        <View className="mx-5 mb-6">
          <Text
            className="text-sm font-semibold tracking-wider mb-3"
            style={{ color: colors.textTertiary }}
          >
            {t('privacy.dataCollection')}
          </Text>

          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <View
              className="flex-row items-center p-4"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <MapPin size={20} color={colors.primary} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium" style={{ color: colors.text }}>
                  {t('privacy.locationData')}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
                  {t('privacy.locationDataHint')}
                </Text>
              </View>
              <Switch
                value={shareLocation}
                onValueChange={(v) => handleToggle(setShareLocation, v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View
              className="flex-row items-center p-4"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <BarChart3 size={20} color={colors.primary} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium" style={{ color: colors.text }}>
                  {t('privacy.usageAnalytics')}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
                  {t('privacy.usageAnalyticsHint')}
                </Text>
              </View>
              <Switch
                value={analyticsEnabled}
                onValueChange={(v) => handleToggle(setAnalyticsEnabled, v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View className="flex-row items-center p-4">
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primaryLight }}
              >
                <Share2 size={20} color={colors.primary} />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-medium" style={{ color: colors.text }}>
                  {t('privacy.personalized')}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
                  {t('privacy.personalizedHint')}
                </Text>
              </View>
              <Switch
                value={personalizedAds}
                onValueChange={(v) => handleToggle(setPersonalizedAds, v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Your Data Section */}
        {!isGuest && (
          <View className="mx-5 mb-6">
            <Text
              className="text-sm font-semibold tracking-wider mb-3"
              style={{ color: colors.textTertiary }}
            >
              {t('privacy.yourData')}
            </Text>

            <View
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <Pressable
                className="flex-row items-center p-4"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
                onPress={handleDownloadData}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.primaryLight }}
                >
                  <Share2 size={20} color={colors.primary} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-base font-medium" style={{ color: colors.text }}>
                    {t('privacy.downloadMyData')}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
                    {t('privacy.downloadMyDataHint')}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                className="flex-row items-center p-4"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
                onPress={handleClearScanHistory}
                disabled={isClearingScans}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.redLight }}
                >
                  {isClearingScans ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Trash2 size={20} color={colors.error} />
                  )}
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-base font-medium" style={{ color: colors.error }}>
                    {t('privacy.clearScanHistory')}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
                    {t('privacy.clearScanHistoryHint')}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                className="flex-row items-center p-4"
                onPress={handleClearReviews}
                disabled={isClearingReviews}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.redLight }}
                >
                  {isClearingReviews ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Trash2 size={20} color={colors.error} />
                  )}
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-base font-medium" style={{ color: colors.error }}>
                    {t('privacy.clearAllReviews')}
                  </Text>
                  <Text className="text-xs mt-0.5" style={{ color: colors.textTertiary }}>
                    {t('privacy.clearAllReviewsHint')}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* Info Text */}
        <View className="mx-5 mt-2">
          <Text
            className="text-xs text-center leading-5"
            style={{ color: colors.textTertiary }}
          >
            {t('privacy.footer')}
          </Text>
          <Pressable className="mt-3 items-center" onPress={handleOpenPrivacyPolicy}>
            <Text className="text-sm font-medium" style={{ color: colors.primary }}>
              {t('privacy.viewPolicy')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
