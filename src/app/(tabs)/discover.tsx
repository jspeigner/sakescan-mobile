import { useEffect, useState } from 'react';
import { Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Heart, Star, GlassWater } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useI18n } from '@/lib/i18n-context';
import { useUserRatings, useUserFavorites } from '@/lib/supabase-hooks';
import { resolveSakeImageUrl } from '@/lib/supabase';
import { SakeImage } from '@/components/SakeImage';

type TabType = 'favorites' | 'rated';

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<TabType>(tab === 'rated' ? 'rated' : 'favorites');

  useEffect(() => {
    if (tab === 'rated' || tab === 'favorites') {
      setActiveTab(tab);
    }
  }, [tab]);

  // Fetch user's favorites
  const { data: userFavorites, isLoading: favoritesLoading } = useUserFavorites(user?.id);

  // Fetch user's rated/reviewed sake
  const { data: userRatings, isLoading: ratingsLoading } = useUserRatings(user?.id);

  // Map favorites to display format
  const favoriteSakes = (userFavorites ?? []).map(fav => ({
    id: fav.sake_id,
    name: fav.sake?.name ?? 'Unknown',
    brewery: fav.sake?.brewery ?? 'Unknown',
    labelImageUrl: resolveSakeImageUrl(fav.sake?.image_url) ?? null,
    avgRating: fav.sake?.average_rating ?? 0,
  }));

  // Map ratings to display format
  const ratedSakes = (userRatings ?? []).map(rating => ({
    id: rating.sake_id,
    name: rating.sake?.name ?? 'Unknown',
    brewery: rating.sake?.brewery ?? 'Unknown',
    labelImageUrl: resolveSakeImageUrl(rating.sake?.image_url) ?? null,
    userRating: rating.rating,
  }));

  const handleSakePress = async (sakeId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/sake/${sakeId}`);
  };

  const handleTabPress = async (tab: TabType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const isLoading = activeTab === 'favorites' ? favoritesLoading : ratingsLoading;
  const currentSakes = activeTab === 'favorites' ? favoriteSakes : ratedSakes;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4">
        <Text style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 28, fontWeight: '600', color: colors.text }}>
          {t('saved.title')}
        </Text>
        <Text className="text-base mt-1" style={{ color: colors.textTertiary }}>
          {t('saved.subtitle')}
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mx-5 mb-4 p-1 rounded-xl" style={{ backgroundColor: colors.surfaceSecondary }}>
        <Pressable
          onPress={() => handleTabPress('favorites')}
          className="flex-1 flex-row items-center justify-center py-3 rounded-lg"
          style={{ backgroundColor: activeTab === 'favorites' ? colors.surface : 'transparent' }}
        >
          <Heart
            size={16}
            color={activeTab === 'favorites' ? colors.primary : colors.textTertiary}
            fill={activeTab === 'favorites' ? colors.primary : 'transparent'}
          />
          <Text
            className="ml-2 font-medium"
            style={{ color: activeTab === 'favorites' ? colors.text : colors.textTertiary }}
          >
            {t('saved.favorites')} ({favoriteSakes.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleTabPress('rated')}
          className="flex-1 flex-row items-center justify-center py-3 rounded-lg"
          style={{ backgroundColor: activeTab === 'rated' ? colors.surface : 'transparent' }}
        >
          <Star
            size={16}
            color={activeTab === 'rated' ? colors.primary : colors.textTertiary}
            fill={activeTab === 'rated' ? colors.primary : 'transparent'}
          />
          <Text
            className="ml-2 font-medium"
            style={{ color: activeTab === 'rated' ? colors.text : colors.textTertiary }}
          >
            {t('saved.rated')} ({ratedSakes.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {isLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : currentSakes.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20 px-5">
            <GlassWater size={48} color={colors.primary} />
            <Text className="font-semibold text-lg mt-4" style={{ color: colors.text }}>
              {activeTab === 'favorites' ? 'No favorites yet' : 'No rated sakes yet'}
            </Text>
            <Text className="text-sm mt-2 text-center" style={{ color: colors.textTertiary }}>
              {activeTab === 'favorites'
                ? 'Tap the heart icon on any sake to add it to your favorites'
                : 'Rate and review sakes to track what you\'ve tried'}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/explore')}
              className="mt-6 px-6 py-3 rounded-full"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-white font-semibold">Explore Sake</Text>
            </Pressable>
          </View>
        ) : (
          <View className="px-5">
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {activeTab === 'favorites'
                ? favoriteSakes.map((sake) => (
                    <Pressable
                      key={sake.id}
                      onPress={() => handleSakePress(sake.id)}
                      className="active:scale-98"
                      style={{ width: '48%' }}
                    >
                      <View className="relative">
                        <View className="rounded-2xl overflow-hidden mb-2">
                          <SakeImage uri={sake.labelImageUrl} height={160} />
                        </View>
                        {/* Heart Badge */}
                        <View
                          className="absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center"
                          style={{ backgroundColor: colors.primary }}
                        >
                          <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
                        </View>
                      </View>
                      <Text className="font-bold text-sm" numberOfLines={1} style={{ color: colors.text }}>
                        {sake.name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-xs" numberOfLines={1} style={{ color: colors.textTertiary }}>
                          {sake.brewery}
                        </Text>
                        {sake.avgRating > 0 && (
                          <>
                            <Text className="text-xs mx-1" style={{ color: colors.textTertiary }}>•</Text>
                            <Star size={10} color={colors.primary} fill={colors.primary} />
                            <Text className="text-xs ml-0.5" style={{ color: colors.textTertiary }}>
                              {sake.avgRating.toFixed(1)}
                            </Text>
                          </>
                        )}
                      </View>
                    </Pressable>
                  ))
                : ratedSakes.map((sake) => (
                    <Pressable
                      key={sake.id}
                      onPress={() => handleSakePress(sake.id)}
                      className="active:scale-98"
                      style={{ width: '48%' }}
                    >
                      <View className="relative">
                        <View className="rounded-2xl overflow-hidden mb-2">
                          <SakeImage uri={sake.labelImageUrl} height={160} />
                        </View>
                        {/* Rating Badge */}
                        <View
                          className="absolute top-2 right-2 flex-row items-center px-2 py-1 rounded-full"
                          style={{ backgroundColor: colors.primary }}
                        >
                          <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
                          <Text className="text-white text-xs font-bold ml-1">{sake.userRating}</Text>
                        </View>
                      </View>
                      <Text className="font-bold text-sm" numberOfLines={1} style={{ color: colors.text }}>
                        {sake.name}
                      </Text>
                      <Text className="text-xs" numberOfLines={1} style={{ color: colors.textTertiary }}>
                        {sake.brewery}
                      </Text>
                    </Pressable>
                  ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
