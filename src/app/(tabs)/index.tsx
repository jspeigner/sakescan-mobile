import { useEffect } from 'react';
import { Text, View, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { Camera, Star, ScanLine, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useUserScans, useSakeList } from '@/lib/supabase-hooks';
import { resolveSakeImageUrl } from '@/lib/supabase';
import { SakeImage } from '@/components/SakeImage';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, session, isGuest } = useAuth();

  // Entrance animations
  const headerOpacity = useSharedValue(0);
  const scanScale = useSharedValue(0.85);
  const scanOpacity = useSharedValue(0);
  const listOpacity = useSharedValue(0);

  useEffect(() => {
    console.log('[HomeScreen] mounted');
    headerOpacity.value = withTiming(1, { duration: 350 });
    scanScale.value = withDelay(150, withSpring(1, { damping: 14, stiffness: 120 }));
    scanOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));
    listOpacity.value = withDelay(400, withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));
  const scanStyle = useAnimatedStyle(() => ({
    opacity: scanOpacity.value,
    transform: [{ scale: scanScale.value }],
  }));
  const listStyle = useAnimatedStyle(() => ({ opacity: listOpacity.value }));

  // Fetch user's recent scans from Supabase
  const { data: userScans, isLoading: scansLoading } = useUserScans(user?.id);

  // Fetch popular sake as fallback when no scans
  const { data: popularSake, isLoading: sakeLoading } = useSakeList({ limit: 5 });

  // Get recently scanned sake (matched only).
  // Prefer the actual scan photo (scanned_image_url) over the DB catalog image.
  const recentlyScanned = userScans
    ?.filter(scan => scan.matched && scan.sake)
    .slice(0, 5)
    .map(scan => ({
      id: scan.sake_id!,
      name: scan.sake?.name ?? 'Unknown',
      brewery: scan.sake?.brewery ?? 'Unknown',
      labelImageUrl:
        (scan as { scanned_image_url?: string | null }).scanned_image_url ||
        resolveSakeImageUrl(scan.sake?.image_url) ||
        null,
      avgRating: 0,
    })) ?? [];

  // Use popular sake if no scan history
  const displaySake = recentlyScanned.length > 0
    ? recentlyScanned
    : (popularSake?.data ?? []).slice(0, 5).map(sake => ({
        id: sake.id,
        name: sake.name,
        brewery: sake.brewery,
        labelImageUrl: resolveSakeImageUrl(sake.image_url) ?? null,
        avgRating: sake.average_rating ?? 0,
      }));

  const handleScanPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check if user is signed in
    if (!session?.access_token || isGuest) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to use the scan feature. Please create an account or sign in from the Profile tab.',
        [
          { text: 'Go to Profile', onPress: () => router.push('/profile') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    router.push('/camera');
  };

  const handleSakePress = async (sakeId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/sake/${sakeId}`);
  };

  const isLoading = scansLoading || sakeLoading;

  return (
    <View className="flex-1" style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }, headerStyle]}>
          <Text style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 28, fontWeight: '600', color: colors.text }}>
            SakeScan
          </Text>
          <Pressable onPress={() => router.push('/profile')}>
            <View
              style={{
                width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                backgroundColor: colors.primaryLight,
                borderWidth: 2,
                borderColor: colors.borderLight,
              }}
            >
              <User size={20} color={colors.primary} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Scan Button Area */}
        <Animated.View style={[{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 32, paddingBottom: 24 }, scanStyle]}>
          {/* Gradient glow ring behind button */}
          <LinearGradient
            colors={[`${colors.brandRed}22`, `${colors.brandRed}00`]}
            style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, top: 8 }}
          />
          <Pressable
            onPress={handleScanPress}
            style={{
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: colors.brandRed,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.brandRed,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            <Camera size={42} color="#FFFFFF" strokeWidth={1.5} />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 3, marginTop: 16 }}>
              SCAN LABEL
            </Text>
          </Pressable>
        </Animated.View>

        {/* Instructions */}
        <Animated.View style={[{ paddingHorizontal: 32, paddingBottom: 40 }, scanStyle]}>
          <Text style={{ textAlign: 'center', fontSize: 16, lineHeight: 24, color: colors.textSecondary }}>
            Point your camera at any sake label to{'\n'}learn more about the brewery, profile, and{'\n'}pairings.
          </Text>
        </Animated.View>

        {/* Recently Scanned / Popular Section */}
        <Animated.View style={[{ marginTop: 16 }, listStyle]}>
          <View className="flex-row items-center justify-between px-5 mb-4">
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {recentlyScanned.length > 0 ? 'Recently Scanned' : 'Popular Sake'}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (recentlyScanned.length > 0) {
                  router.push('/scan-history');
                } else {
                  router.push('/search-results');
                }
              }}
            >
              <Text className="font-semibold" style={{ color: colors.primary }}>
                See all
              </Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : displaySake.length === 0 ? (
            <View className="items-center py-10 px-5">
              <ScanLine size={48} color={colors.primary} />
              <Text className="font-semibold text-lg mt-4" style={{ color: colors.text }}>
                No scans yet
              </Text>
              <Text className="text-center mt-2" style={{ color: colors.textTertiary }}>
                Start scanning sake labels to build your history
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
              style={{ flexGrow: 0 }}
            >
              {displaySake.map((sake) => (
                <Pressable
                  key={sake.id}
                  onPress={() => handleSakePress(sake.id)}
                  className="active:scale-98"
                  style={{ width: 170 }}
                >
                  <View className="rounded-2xl overflow-hidden mb-3">
                    <SakeImage uri={sake.labelImageUrl} height={200} />
                  </View>
                  <Text className="font-bold text-base mb-1" numberOfLines={1} style={{ color: colors.text }}>
                    {sake.name}
                  </Text>
                  <Text className="text-sm mb-2" numberOfLines={1} style={{ color: colors.textTertiary }}>
                    {sake.brewery}
                  </Text>
                  {sake.avgRating > 0 && (
                    <View className="flex-row items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          fill={star <= Math.floor(sake.avgRating) ? colors.primary : 'transparent'}
                          color={colors.primary}
                          strokeWidth={1.5}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
