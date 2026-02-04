import { useState } from 'react';
import { Text, View, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { ChevronLeft, Eye, EyeOff, MapPin, BarChart3, Share2, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();

  // Privacy settings state
  const [profileVisible, setProfileVisible] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [shareLocation, setShareLocation] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [personalizedAds, setPersonalizedAds] = useState(false);

  const handleToggle = async (setter: (value: boolean) => void, value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(value);
    // TODO: Persist to AsyncStorage or user settings in Supabase
  };

  const handleClearScanHistory = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear Scan History',
      'This will permanently delete all your scan history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement clear scan history
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleClearReviews = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear All Reviews',
      'This will permanently delete all your reviews and ratings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement clear reviews
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleDownloadData = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Download Your Data',
      'We will prepare a copy of your data and send it to your email address. This may take up to 24 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: () => {
            // TODO: Implement data download request
            Alert.alert('Request Sent', 'You will receive an email with your data within 24 hours.');
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-[#F0EDE5]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-[#1a1a1a] text-center mr-8">
          Privacy Settings
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Profile Privacy Section */}
        <View className="mx-5 mt-6 mb-6">
          <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider mb-3">
            PROFILE PRIVACY
          </Text>

          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
          >
            {/* Public Profile */}
            <View
              className="flex-row items-center p-4"
              style={{ borderBottomWidth: 1, borderBottomColor: '#F0EDE5' }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#E0E7FF' }}
              >
                {profileVisible ? (
                  <Eye size={20} color="#6366F1" />
                ) : (
                  <EyeOff size={20} color="#6366F1" />
                )}
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-[#1a1a1a] text-base font-medium">
                  Public Profile
                </Text>
                <Text className="text-[#8B8B8B] text-xs mt-0.5">
                  Others can see your profile and reviews
                </Text>
              </View>
              <Switch
                value={profileVisible}
                onValueChange={(v) => handleToggle(setProfileVisible, v)}
                trackColor={{ false: '#E5E5E5', true: '#C9A227' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Show Activity */}
            <View className="flex-row items-center p-4">
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#DCFCE7' }}
              >
                <BarChart3 size={20} color="#16A34A" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-[#1a1a1a] text-base font-medium">
                  Show Activity
                </Text>
                <Text className="text-[#8B8B8B] text-xs mt-0.5">
                  Display your scanning and review activity
                </Text>
              </View>
              <Switch
                value={showActivity}
                onValueChange={(v) => handleToggle(setShowActivity, v)}
                trackColor={{ false: '#E5E5E5', true: '#C9A227' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Data Collection Section */}
        <View className="mx-5 mb-6">
          <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider mb-3">
            DATA COLLECTION
          </Text>

          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
          >
            {/* Location Sharing */}
            <View
              className="flex-row items-center p-4"
              style={{ borderBottomWidth: 1, borderBottomColor: '#F0EDE5' }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <MapPin size={20} color="#D97706" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-[#1a1a1a] text-base font-medium">
                  Location Data
                </Text>
                <Text className="text-[#8B8B8B] text-xs mt-0.5">
                  Share location when scanning for nearby sake
                </Text>
              </View>
              <Switch
                value={shareLocation}
                onValueChange={(v) => handleToggle(setShareLocation, v)}
                trackColor={{ false: '#E5E5E5', true: '#C9A227' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Analytics */}
            <View
              className="flex-row items-center p-4"
              style={{ borderBottomWidth: 1, borderBottomColor: '#F0EDE5' }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#F5EED9' }}
              >
                <BarChart3 size={20} color="#C9A227" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-[#1a1a1a] text-base font-medium">
                  Usage Analytics
                </Text>
                <Text className="text-[#8B8B8B] text-xs mt-0.5">
                  Help improve the app with anonymous usage data
                </Text>
              </View>
              <Switch
                value={analyticsEnabled}
                onValueChange={(v) => handleToggle(setAnalyticsEnabled, v)}
                trackColor={{ false: '#E5E5E5', true: '#C9A227' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Personalized Content */}
            <View className="flex-row items-center p-4">
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#FCE7F3' }}
              >
                <Share2 size={20} color="#DB2777" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-[#1a1a1a] text-base font-medium">
                  Personalized Recommendations
                </Text>
                <Text className="text-[#8B8B8B] text-xs mt-0.5">
                  Get sake suggestions based on your preferences
                </Text>
              </View>
              <Switch
                value={personalizedAds}
                onValueChange={(v) => handleToggle(setPersonalizedAds, v)}
                trackColor={{ false: '#E5E5E5', true: '#C9A227' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Your Data Section */}
        {!isGuest && (
          <View className="mx-5 mb-6">
            <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider mb-3">
              YOUR DATA
            </Text>

            <View
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
            >
              {/* Download Data */}
              <Pressable
                className="flex-row items-center p-4"
                style={{ borderBottomWidth: 1, borderBottomColor: '#F0EDE5' }}
                onPress={handleDownloadData}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#E0E7FF' }}
                >
                  <Share2 size={20} color="#6366F1" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[#1a1a1a] text-base font-medium">
                    Download My Data
                  </Text>
                  <Text className="text-[#8B8B8B] text-xs mt-0.5">
                    Get a copy of all your data
                  </Text>
                </View>
              </Pressable>

              {/* Clear Scan History */}
              <Pressable
                className="flex-row items-center p-4"
                style={{ borderBottomWidth: 1, borderBottomColor: '#F0EDE5' }}
                onPress={handleClearScanHistory}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#FEF3F2' }}
                >
                  <Trash2 size={20} color="#EF4444" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[#EF4444] text-base font-medium">
                    Clear Scan History
                  </Text>
                  <Text className="text-[#8B8B8B] text-xs mt-0.5">
                    Delete all your scanned sake records
                  </Text>
                </View>
              </Pressable>

              {/* Clear Reviews */}
              <Pressable
                className="flex-row items-center p-4"
                onPress={handleClearReviews}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#FEF3F2' }}
                >
                  <Trash2 size={20} color="#EF4444" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[#EF4444] text-base font-medium">
                    Clear All Reviews
                  </Text>
                  <Text className="text-[#8B8B8B] text-xs mt-0.5">
                    Delete all your reviews and ratings
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        )}

        {/* Info Text */}
        <View className="mx-5 mt-2">
          <Text className="text-[#8B8B8B] text-xs text-center leading-5">
            Your privacy is important to us. We only collect data necessary to provide and improve our services.
            For more information, please review our Privacy Policy.
          </Text>
          <Pressable className="mt-3 items-center">
            <Text className="text-[#C9A227] text-sm font-medium">
              View Privacy Policy
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
