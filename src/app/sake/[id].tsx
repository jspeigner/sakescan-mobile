import { useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  Linking,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
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
  Wine,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSake, useSakeRatings, useIsFavorite, useToggleFavorite } from '@/lib/supabase-hooks';
import { useAuth } from '@/lib/auth-context';

const { width } = Dimensions.get('window');

type FlavorProfile = 'Fruity' | 'Dry' | 'Floral' | 'Smooth' | 'Rich' | 'Crisp' | 'Umami' | 'Sweet';
type ServingTemp = 'Chilled' | 'Room' | 'Warm';

export default function SakeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const [selectedServing, setSelectedServing] = useState<ServingTemp>('Chilled');

  // Fetch from Supabase only
  const { data: supabaseSake, isLoading } = useSake(id);

  // Favorites
  const { data: isFavorite } = useIsFavorite(user?.id, id);
  const toggleFavorite = useToggleFavorite();

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center">
        <ActivityIndicator size="large" color="#C9A227" />
      </View>
    );
  }

  if (!supabaseSake) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center px-5">
        <Wine size={48} color="#C9A227" />
        <Text className="text-[#1a1a1a] font-semibold text-lg mt-4">Sake not found</Text>
        <Text className="text-[#8B8B8B] text-center mt-2">
          This sake isn't in our database yet
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 px-6 py-3 rounded-full"
          style={{ backgroundColor: '#C9A227' }}
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
    labelImageUrl: supabaseSake.label_image_url ?? 'https://images.unsplash.com/photo-1589464835340-c5c07fbe5b8e?w=600&h=800&fit=crop',
    alcoholContent: supabaseSake.alcohol_percentage ? `${supabaseSake.alcohol_percentage}%` : 'N/A',
    riceMilling: supabaseSake.polishing_ratio ? `${supabaseSake.polishing_ratio}%` : undefined,
    riceType: supabaseSake.rice_variety ?? 'N/A',
  };

  const brewery = {
    name: supabaseSake.brewery ?? 'Unknown Brewery',
    region: supabaseSake.region ?? supabaseSake.prefecture ?? '',
    country: 'Japan',
  };

  // Mock flavor profile - in production, this would come from DB
  const flavorProfile: FlavorProfile[] = ['Fruity', 'Dry', 'Floral', 'Smooth'];

  const handleFavorite = async () => {
    if (isGuest || !user?.id || !id) {
      router.push('/welcome');
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite.mutate({ userId: user.id, sakeId: id, isFavorite: !!isFavorite });
  };

  const handleShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleServingPress = async (temp: ServingTemp) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedServing(temp);
  };

  const handleWhereToBuy = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Implement where to buy functionality
  };

  const formatReviewCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between px-5 py-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable onPress={() => router.back()} className="p-1">
          <ChevronLeft size={24} color="#1a1a1a" />
        </Pressable>
        <Text className="text-lg font-semibold text-[#1a1a1a]">Sake Details</Text>
        <Pressable className="p-1">
          <MoreHorizontal size={22} color="#1a1a1a" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Hero Image */}
        <View
          className="w-full overflow-hidden"
          style={{ height: 400, backgroundColor: '#D9B280' }}
        >
          <Image
            source={{ uri: sake.labelImageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />
        </View>

        {/* Content */}
        <View className="px-5 pt-6">
          {/* Title Section */}
          <View className="flex-row items-start justify-between mb-2">
            <Text
              className="flex-1 text-[#1a1a1a] mr-4"
              style={{ fontFamily: 'serif', fontSize: 32, fontWeight: '600' }}
            >
              {sake.name}
            </Text>
            <View className="flex-row">
              <Pressable
                onPress={handleFavorite}
                className="w-12 h-12 rounded-full items-center justify-center mr-2"
                style={{ backgroundColor: isFavorite ? '#F5EED9' : '#F5F3EE' }}
              >
                <Heart
                  size={22}
                  color={isFavorite ? '#C9A227' : '#1a1a1a'}
                  fill={isFavorite ? '#C9A227' : 'transparent'}
                />
              </Pressable>
              <Pressable
                onPress={handleShare}
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: '#F5F3EE' }}
              >
                <Share2 size={22} color="#1a1a1a" />
              </Pressable>
            </View>
          </View>

          {/* Brewery Info */}
          <Text className="text-[#6B6B6B] text-base mb-3">
            {brewery.name} • {brewery.region ? `${brewery.region}, ${brewery.country}` : brewery.country}
          </Text>

          {/* Rating */}
          <View className="flex-row items-center mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={22}
                fill={star <= Math.round(sake.avgRating) ? '#C9A227' : 'transparent'}
                color="#C9A227"
                strokeWidth={1.5}
              />
            ))}
            <Text className="text-[#1a1a1a] font-semibold ml-2 text-lg">
              {sake.avgRating.toFixed(1)}
            </Text>
            <Text className="text-[#C9A227] font-medium ml-3 text-base">
              Review ({formatReviewCount(sake.reviewCount)})
            </Text>
          </View>

          {/* Specs Cards */}
          <View className="flex-row mb-6">
            <View className="flex-1 mr-3">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-2 uppercase tracking-wide">ABV</Text>
              <Text className="text-[#1a1a1a] text-xl font-bold">
                {sake.alcoholContent}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-2 uppercase tracking-wide">Rice Type</Text>
              <Text className="text-[#1a1a1a] text-xl font-bold">
                {sake.riceType}
              </Text>
            </View>
          </View>

          {/* Flavor Profile */}
          <View className="mb-6">
            <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
              Flavor Profile
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {flavorProfile.map((flavor, index) => (
                <View
                  key={flavor}
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: index === 0 ? '#C9A227' : '#F5F3EE',
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: index === 0 ? '#FFFFFF' : '#6B6B6B' }}
                  >
                    {flavor}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recommended Serving */}
          <View className="mb-6">
            <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
              Recommended Serving
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => handleServingPress('Chilled')}
                className="flex-1 items-center py-4 rounded-2xl"
                style={{
                  backgroundColor: selectedServing === 'Chilled' ? '#FFFFFF' : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedServing === 'Chilled' ? '#C9A227' : '#E8E4D9',
                }}
              >
                <Snowflake
                  size={24}
                  color={selectedServing === 'Chilled' ? '#C9A227' : '#6B6B6B'}
                />
                <Text
                  className="mt-2 text-sm font-medium"
                  style={{ color: selectedServing === 'Chilled' ? '#C9A227' : '#6B6B6B' }}
                >
                  Chilled
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleServingPress('Room')}
                className="flex-1 items-center py-4 rounded-2xl"
                style={{
                  backgroundColor: selectedServing === 'Room' ? '#FFFFFF' : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedServing === 'Room' ? '#C9A227' : '#E8E4D9',
                }}
              >
                <Home
                  size={24}
                  color={selectedServing === 'Room' ? '#C9A227' : '#6B6B6B'}
                />
                <Text
                  className="mt-2 text-sm font-medium"
                  style={{ color: selectedServing === 'Room' ? '#C9A227' : '#6B6B6B' }}
                >
                  Room
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleServingPress('Warm')}
                className="flex-1 items-center py-4 rounded-2xl"
                style={{
                  backgroundColor: selectedServing === 'Warm' ? '#FFFFFF' : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedServing === 'Warm' ? '#C9A227' : '#E8E4D9',
                }}
              >
                <Flame
                  size={24}
                  color={selectedServing === 'Warm' ? '#C9A227' : '#6B6B6B'}
                />
                <Text
                  className="mt-2 text-sm font-medium"
                  style={{ color: selectedServing === 'Warm' ? '#C9A227' : '#6B6B6B' }}
                >
                  Warm
                </Text>
              </Pressable>
            </View>
          </View>

          {/* History & Tasting Notes */}
          {sake.description && (
            <View className="mb-8">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                History & Tasting Notes
              </Text>
              <Text className="text-[#1a1a1a] text-base leading-7">
                {sake.description}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View
        className="absolute bottom-0 left-0 right-0 px-5 py-4"
        style={{
          paddingBottom: insets.bottom + 16,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#F5F3EE',
        }}
      >
        <Pressable
          onPress={handleWhereToBuy}
          className="flex-row items-center justify-center py-4 rounded-2xl active:scale-98"
          style={{ backgroundColor: '#C9A227' }}
        >
          <ShoppingBag size={20} color="#FFFFFF" />
          <Text className="text-white text-base font-semibold ml-2">
            Where to Buy
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
