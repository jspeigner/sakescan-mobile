import { useState, useEffect } from 'react';
import {
  Text,
  View,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Share,
  Alert,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SakeImage } from '@/components/SakeImage';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  Star,
  Heart,
  Share2,
  MoreHorizontal,
  Snowflake,
  Home,
  Flame,
  ShoppingBag,
  GlassWater,
  User as UserIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSake, useSakeRatings, useIsFavorite, useToggleFavorite } from '@/lib/supabase-hooks';
import { useAuth } from '@/lib/auth-context';
import { resolveSakeImageUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';
import { getUserLocation } from '@/lib/location';
import type { RatingWithUser } from '@/lib/database.types';

type ServingTemp = 'Chilled' | 'Room' | 'Warm';

export default function SakeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const { colors } = useTheme();
  const [selectedServing, setSelectedServing] = useState<ServingTemp>('Chilled');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Fetch from Supabase only
  const { data: supabaseSake, isLoading, isError, refetch } = useSake(id);

  // Favorites
  const { data: isFavorite } = useIsFavorite(user?.id, id);
  const toggleFavorite = useToggleFavorite();

  // Ratings/Reviews
  const { data: reviews } = useSakeRatings(id);

  // Entrance animations — must be declared before any early returns (Rules of Hooks)
  const heroOpacity = useSharedValue(0);
  const contentY = useSharedValue(40);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (!supabaseSake) return;
    heroOpacity.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) });
    contentY.value = withDelay(180, withSpring(0, { damping: 18, stiffness: 130 }));
    contentOpacity.value = withDelay(180, withTiming(1, { duration: 350 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseSake]);

  const heroStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: colors.background }}>
        <GlassWater size={48} color={colors.primary} />
        <Text className="font-semibold text-lg mt-4 text-center" style={{ color: colors.text }}>
          Could not load this sake
        </Text>
        <Text className="text-center mt-2" style={{ color: colors.textSecondary }}>
          Check your internet connection, then try again. If the problem continues, the database may be unavailable.
        </Text>
        <Pressable
          onPress={() => {
            void refetch();
          }}
          className="mt-6 px-6 py-3 rounded-full"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-white font-semibold">Try again</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="mt-4 py-2">
          <Text style={{ color: colors.textSecondary }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!supabaseSake) {
    return (
      <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: colors.background }}>
        <GlassWater size={48} color={colors.primary} />
        <Text className="font-semibold text-lg mt-4" style={{ color: colors.text }}>Sake not found</Text>
        <Text className="text-center mt-2" style={{ color: colors.textSecondary }}>
          This sake isn't in our database yet
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 px-6 py-3 rounded-full"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Map Supabase data to display format
  const sake = {
    id: supabaseSake.id,
    name: supabaseSake.name ?? 'Unknown',
    sakeType: supabaseSake.type ?? 'Other',
    description: supabaseSake.description ?? 'No description available.',
    avgRating: supabaseSake.average_rating ?? 0,
    reviewCount: supabaseSake.total_ratings ?? 0,
    labelImageUrl: resolveSakeImageUrl(supabaseSake.image_url) ?? null,
    alcoholContent: supabaseSake.alcohol_percentage ? `${supabaseSake.alcohol_percentage}%` : 'N/A',
    riceMilling: supabaseSake.polishing_ratio ? `${supabaseSake.polishing_ratio}%` : undefined,
    riceType: supabaseSake.rice_variety ?? 'N/A',
  };

  const brewery = {
    name: supabaseSake.brewery ?? 'Unknown Brewery',
    region: supabaseSake.region ?? supabaseSake.prefecture ?? '',
    country: 'Japan',
  };

  const handleFavorite = async () => {
    if (isGuest || !user?.id || !id) {
      router.push('/welcome');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite.mutate({ userId: user.id, sakeId: id, isFavorite: !!isFavorite });
  };

  const shareMessage = `Check out ${sake.name} by ${brewery.name} on SakeScan — https://sakescan.com`;

  const handleShare = async () => {
    setShowMoreMenu(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: shareMessage,
        title: sake.name,
      });
    } catch {
      // User cancelled or share failed
    }
  };

  const handleServingPress = async (temp: ServingTemp) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedServing(temp);
  };

  const handleWhereToBuy = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoadingLocation(true);
    try {
      const loc = await getUserLocation();
      router.push({
        pathname: '/stores',
        params: {
          sakeId: id,
          sakeName: sake.name,
          brewery: brewery.name,
          city: loc?.city ?? loc?.region ?? 'San Francisco',
          region: loc?.region,
          latitude: loc?.latitude?.toString(),
          longitude: loc?.longitude?.toString(),
        },
      });
    } catch {
      router.push({
        pathname: '/stores',
        params: { sakeId: id, sakeName: sake.name, brewery: brewery.name, city: 'San Francisco' },
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const formatReviewCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between px-5 py-3"
        style={{ paddingTop: insets.top + 8, backgroundColor: 'transparent' }}
      >
        <Pressable onPress={() => router.back()} className="p-1">
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-semibold" style={{ color: colors.text }}>Sake Details</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowMoreMenu(true);
          }}
          className="p-1"
        >
          <MoreHorizontal size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Hero Image */}
        <Animated.View
          style={[{ width: '100%', overflow: 'hidden', height: 340, backgroundColor: colors.surface }, heroStyle]}
        >
          <SakeImage uri={sake.labelImageUrl} height={340} />
          <LinearGradient
            colors={['transparent', `${colors.background}99`, colors.background]}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 }}
          />
        </Animated.View>

        {/* Content */}
        <Animated.View className="px-5 pt-4" style={[{ backgroundColor: colors.background }, contentStyle]}>
          {/* Title Section */}
          <View className="flex-row items-start justify-between mb-2">
            <Text
              className="flex-1 mr-4"
              style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 32, fontWeight: '600', color: colors.text }}
            >
              {sake.name}
            </Text>
            <View className="flex-row">
              <Pressable
                onPress={handleFavorite}
                className="w-12 h-12 rounded-full items-center justify-center mr-2"
                style={{ backgroundColor: isFavorite ? colors.primaryLight : colors.surface }}
              >
                <Heart
                  size={22}
                  color={isFavorite ? colors.primary : colors.text}
                  fill={isFavorite ? colors.primary : 'transparent'}
                />
              </Pressable>
              <Pressable
                onPress={handleShare}
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.surface }}
              >
                <Share2 size={22} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Brewery Info */}
          <Text className="text-base mb-3" style={{ color: colors.textSecondary }}>
            {brewery.name} • {brewery.region ? `${brewery.region}, ${brewery.country}` : brewery.country}
          </Text>

          {/* Rating */}
          <View className="flex-row items-center mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={22}
                fill={star <= Math.round(sake.avgRating) ? colors.primary : 'transparent'}
                color={colors.primary}
                strokeWidth={1.5}
              />
            ))}
            <Text className="font-semibold ml-2 text-lg" style={{ color: colors.text }}>
              {sake.avgRating.toFixed(1)}
            </Text>
            <Text className="font-medium ml-3 text-base" style={{ color: colors.primary }}>
              Review ({formatReviewCount(sake.reviewCount)})
            </Text>
          </View>

          {/* Specs Cards */}
          <View className="flex-row mb-6">
            <View className="flex-1 mr-3">
              <Text className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: colors.textSecondary }}>ABV</Text>
              <Text className="text-xl font-bold" style={{ color: colors.text }}>
                {sake.alcoholContent}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: colors.textSecondary }}>Rice Type</Text>
              <Text className="text-xl font-bold" style={{ color: colors.text }}>
                {sake.riceType}
              </Text>
            </View>
          </View>

          {/* Recommended Serving */}
          <View className="mb-6">
            <Text className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: colors.textSecondary }}>
              Recommended Serving
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => handleServingPress('Chilled')}
                className="flex-1 items-center py-4 rounded-2xl"
                style={{
                  backgroundColor: selectedServing === 'Chilled' ? colors.background : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedServing === 'Chilled' ? colors.primary : colors.border,
                }}
              >
                <Snowflake
                  size={24}
                  color={selectedServing === 'Chilled' ? colors.primary : colors.textSecondary}
                />
                <Text
                  className="mt-2 text-sm font-medium"
                  style={{ color: selectedServing === 'Chilled' ? colors.primary : colors.textSecondary }}
                >
                  Chilled
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleServingPress('Room')}
                className="flex-1 items-center py-4 rounded-2xl"
                style={{
                  backgroundColor: selectedServing === 'Room' ? colors.background : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedServing === 'Room' ? colors.primary : colors.border,
                }}
              >
                <Home
                  size={24}
                  color={selectedServing === 'Room' ? colors.primary : colors.textSecondary}
                />
                <Text
                  className="mt-2 text-sm font-medium"
                  style={{ color: selectedServing === 'Room' ? colors.primary : colors.textSecondary }}
                >
                  Room
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleServingPress('Warm')}
                className="flex-1 items-center py-4 rounded-2xl"
                style={{
                  backgroundColor: selectedServing === 'Warm' ? colors.background : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedServing === 'Warm' ? colors.primary : colors.border,
                }}
              >
                <Flame
                  size={24}
                  color={selectedServing === 'Warm' ? colors.primary : colors.textSecondary}
                />
                <Text
                  className="mt-2 text-sm font-medium"
                  style={{ color: selectedServing === 'Warm' ? colors.primary : colors.textSecondary }}
                >
                  Warm
                </Text>
              </Pressable>
            </View>
          </View>

          {/* History & Tasting Notes */}
          {sake.description && (
            <View className="mb-6">
              <Text className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                History & Tasting Notes
              </Text>
              <Text className="text-base leading-7" style={{ color: colors.text }}>
                {sake.description}
              </Text>
            </View>
          )}

          {/* Reviews Section */}
          {reviews && reviews.length > 0 && (
            <View className="mb-8">
              <Text className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: colors.textSecondary }}>
                Reviews
              </Text>
              {(reviews as RatingWithUser[]).slice(0, 5).map((r) => (
                <View
                  key={r.id}
                  className="mb-4 p-4 rounded-2xl"
                  style={{ backgroundColor: colors.surface }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      {r.users?.avatar_url ? (
                        <Image
                          source={{ uri: r.users.avatar_url }}
                          style={{ width: 32, height: 32, borderRadius: 16 }}
                        />
                      ) : (
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center"
                          style={{ backgroundColor: colors.border }}
                        >
                          <UserIcon size={16} color={colors.textSecondary} />
                        </View>
                      )}
                      <Text className="font-medium ml-2" style={{ color: colors.text }}>
                        {r.users?.display_name ?? 'Anonymous'}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Star size={14} fill={colors.primary} color={colors.primary} />
                      <Text className="ml-1 text-sm font-medium" style={{ color: colors.text }}>
                        {r.rating}
                      </Text>
                    </View>
                  </View>
                  {r.review_text && (
                    <Text className="text-sm leading-5" style={{ color: colors.textSecondary }}>
                      {r.review_text}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View
        className="absolute bottom-0 left-0 right-0 px-5 py-4"
        style={{
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Pressable
          onPress={handleWhereToBuy}
          disabled={isLoadingLocation}
          className="flex-row items-center justify-center py-4 rounded-2xl active:scale-98"
          style={{ backgroundColor: colors.primary }}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <ShoppingBag size={20} color="#FFFFFF" />
              <Text className="text-white text-base font-semibold ml-2">
                Where to Buy
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* More Menu Modal — single flex root so overlay + sheet layout correctly (B01) */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <View style={styles.menuRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={() => setShowMoreMenu(false)}
          />
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom + 16,
              paddingTop: 16,
            }}
          >
          <View
            style={{
              width: 36,
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />
          <Pressable
            onPress={handleShare}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Share2 size={22} color={colors.text} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500', marginLeft: 14 }}>
              Share Sake
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setShowMoreMenu(false);
              Alert.alert('Report', 'Thank you for helping us improve. Our team will review this sake listing.', [{ text: 'OK' }]);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 22, marginLeft: 1 }}>⚑</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 16, fontWeight: '500', marginLeft: 14 }}>
              Report an Issue
            </Text>
          </Pressable>
        </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  menuRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
