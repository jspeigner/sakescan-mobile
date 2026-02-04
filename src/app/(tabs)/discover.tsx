import { useState } from 'react';
import { Text, View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Heart, Star, Wine } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { useUserRatings, useUserFavorites } from '@/lib/supabase-hooks';

type TabType = 'favorites' | 'rated';

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('favorites');

  // Fetch user's favorites
  const { data: userFavorites, isLoading: favoritesLoading } = useUserFavorites(user?.id);

  // Fetch user's rated/reviewed sake
  const { data: userRatings, isLoading: ratingsLoading } = useUserRatings(user?.id);

  // Map favorites to display format
  const favoriteSakes = (userFavorites ?? []).map(fav => ({
    id: fav.sake_id,
    name: fav.sake?.name ?? 'Unknown',
    brewery: fav.sake?.brewery ?? 'Unknown',
    labelImageUrl: fav.sake?.label_image_url ?? 'https://images.unsplash.com/photo-1589464835340-c5c07fbe5b8e?w=600&h=800&fit=crop',
    avgRating: fav.sake?.average_rating ?? 0,
  }));

  // Map ratings to display format
  const ratedSakes = (userRatings ?? []).map(rating => ({
    id: rating.sake_id,
    name: rating.sake?.name ?? 'Unknown',
    brewery: rating.sake?.brewery ?? 'Unknown',
    labelImageUrl: rating.sake?.label_image_url ?? 'https://images.unsplash.com/photo-1589464835340-c5c07fbe5b8e?w=600&h=800&fit=crop',
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
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4">
        <Text style={{ fontFamily: 'serif', fontSize: 28, fontWeight: '600', color: '#1a1a1a' }}>
          Saved
        </Text>
        <Text className="text-[#8B8B8B] text-base mt-1">
          Your favorite sakes and ratings
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mx-5 mb-4 p-1 rounded-xl" style={{ backgroundColor: '#F0EDE5' }}>
        <Pressable
          onPress={() => handleTabPress('favorites')}
          className="flex-1 flex-row items-center justify-center py-3 rounded-lg"
          style={{ backgroundColor: activeTab === 'favorites' ? '#FFFFFF' : 'transparent' }}
        >
          <Heart
            size={16}
            color={activeTab === 'favorites' ? '#C9A227' : '#8B8B8B'}
            fill={activeTab === 'favorites' ? '#C9A227' : 'transparent'}
          />
          <Text
            className="ml-2 font-medium"
            style={{ color: activeTab === 'favorites' ? '#1a1a1a' : '#8B8B8B' }}
          >
            Favorites ({favoriteSakes.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleTabPress('rated')}
          className="flex-1 flex-row items-center justify-center py-3 rounded-lg"
          style={{ backgroundColor: activeTab === 'rated' ? '#FFFFFF' : 'transparent' }}
        >
          <Star
            size={16}
            color={activeTab === 'rated' ? '#C9A227' : '#8B8B8B'}
            fill={activeTab === 'rated' ? '#C9A227' : 'transparent'}
          />
          <Text
            className="ml-2 font-medium"
            style={{ color: activeTab === 'rated' ? '#1a1a1a' : '#8B8B8B' }}
          >
            Rated ({ratedSakes.length})
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
            <ActivityIndicator size="large" color="#C9A227" />
          </View>
        ) : currentSakes.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20 px-5">
            <Wine size={48} color="#C9A227" />
            <Text className="text-[#1a1a1a] font-semibold text-lg mt-4">
              {activeTab === 'favorites' ? 'No favorites yet' : 'No rated sakes yet'}
            </Text>
            <Text className="text-[#8B8B8B] text-sm mt-2 text-center">
              {activeTab === 'favorites'
                ? 'Tap the heart icon on any sake to add it to your favorites'
                : 'Rate and review sakes to track what you\'ve tried'}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/explore')}
              className="mt-6 px-6 py-3 rounded-full"
              style={{ backgroundColor: '#C9A227' }}
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
                        <View
                          className="rounded-2xl overflow-hidden mb-2"
                          style={{ backgroundColor: '#F5EED9', height: 160 }}
                        >
                          <Image
                            source={{ uri: sake.labelImageUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        </View>
                        {/* Heart Badge */}
                        <View
                          className="absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center"
                          style={{ backgroundColor: '#C9A227' }}
                        >
                          <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
                        </View>
                      </View>
                      <Text className="text-[#1a1a1a] font-bold text-sm" numberOfLines={1}>
                        {sake.name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-[#8B8B8B] text-xs" numberOfLines={1}>
                          {sake.brewery}
                        </Text>
                        {sake.avgRating > 0 && (
                          <>
                            <Text className="text-[#8B8B8B] text-xs mx-1">•</Text>
                            <Star size={10} color="#C9A227" fill="#C9A227" />
                            <Text className="text-[#8B8B8B] text-xs ml-0.5">
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
                        <View
                          className="rounded-2xl overflow-hidden mb-2"
                          style={{ backgroundColor: '#F5EED9', height: 160 }}
                        >
                          <Image
                            source={{ uri: sake.labelImageUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        </View>
                        {/* Rating Badge */}
                        <View
                          className="absolute top-2 right-2 flex-row items-center px-2 py-1 rounded-full"
                          style={{ backgroundColor: '#C9A227' }}
                        >
                          <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
                          <Text className="text-white text-xs font-bold ml-1">{sake.userRating}</Text>
                        </View>
                      </View>
                      <Text className="text-[#1a1a1a] font-bold text-sm" numberOfLines={1}>
                        {sake.name}
                      </Text>
                      <Text className="text-[#8B8B8B] text-xs" numberOfLines={1}>
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
