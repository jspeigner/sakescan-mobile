import { Text, View, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Share2, Star, Building2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSearchSake } from '@/lib/supabase-hooks';
import { resolveSakeImageUrl } from '@/lib/supabase';

export default function BreweryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  // Decode brewery name from URL parameter
  const breweryName = id ? decodeURIComponent(id) : '';

  // Fetch all sake from this brewery
  const { data: brewerySakes, isLoading } = useSearchSake(breweryName);

  const handleSakePress = async (sakeId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/sake/${sakeId}`);
  };

  const handleShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Discover ${breweryName} on SakeScan — https://sakescan.com`,
        title: breweryName,
      });
    } catch {
      /* cancelled */
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center">
        <ActivityIndicator size="large" color="#C9A227" />
      </View>
    );
  }

  // Filter to only sake from this specific brewery
  const filteredSakes = (brewerySakes ?? []).filter(s => s.brewery === breweryName);

  if (filteredSakes.length === 0) {
    return (
      <View className="flex-1 bg-[#FAFAF8]">
        <View
          className="flex-row items-center px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Pressable onPress={() => router.back()} className="p-1">
            <ChevronLeft size={24} color="#1a1a1a" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <Building2 size={48} color="#C9A227" />
          <Text className="text-[#1a1a1a] font-semibold text-lg mt-4">Brewery not found</Text>
          <Text className="text-[#8B8B8B] text-center mt-2">
            No sake from "{breweryName}" in the database
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 px-6 py-3 rounded-full"
            style={{ backgroundColor: '#C9A227' }}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Calculate stats from the sake
  const avgRating = filteredSakes.length > 0
    ? filteredSakes.reduce((sum, s) => sum + (s.average_rating ?? 0), 0) / filteredSakes.length
    : 0;

  const region = filteredSakes[0]?.region ?? filteredSakes[0]?.prefecture ?? 'Japan';

  return (
    <View className="flex-1 bg-[#FAFAF8]">
      {/* Header - Absolute positioned */}
      <View
        className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </Pressable>
        <Text className="text-base font-semibold text-[#1a1a1a] bg-white/90 px-3 py-1 rounded-full">
          Brewery Profile
        </Text>
        <Pressable
          onPress={handleShare}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
        >
          <Share2 size={20} color="#1a1a1a" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero - Building icon instead of image */}
        <View
          style={{ height: 220, backgroundColor: '#F5EED9' }}
          className="items-center justify-center"
        >
          <Building2 size={64} color="#C9A227" />
        </View>

        {/* Logo */}
        <View className="items-center" style={{ marginTop: -50 }}>
          <View
            className="w-24 h-24 rounded-full items-center justify-center"
            style={{
              backgroundColor: '#FFFFFF',
              borderWidth: 4,
              borderColor: '#FAFAF8',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Building2 size={40} color="#C9A227" />
          </View>
        </View>

        {/* Brewery Info */}
        <View className="items-center px-5 pt-4">
          <Text
            className="text-[#1a1a1a] text-center"
            style={{ fontFamily: 'serif', fontSize: 26, fontWeight: '600' }}
          >
            {breweryName}
          </Text>
          <Text className="text-[#C9A227] text-base mt-1">
            {region}, Japan
          </Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-center px-5 py-6 gap-3">
          <View
            className="items-center py-3 px-5 rounded-xl"
            style={{ borderWidth: 1, borderColor: '#E8E4D9', minWidth: 90 }}
          >
            <Text className="text-xl font-bold text-[#C9A227]">{filteredSakes.length}</Text>
            <Text className="text-[#8B8B8B] text-xs mt-1">SAKES</Text>
          </View>
          {avgRating > 0 && (
            <View
              className="items-center py-3 px-5 rounded-xl"
              style={{ borderWidth: 1, borderColor: '#E8E4D9', minWidth: 90 }}
            >
              <View className="flex-row items-center">
                <Text className="text-xl font-bold text-[#C9A227]">{avgRating.toFixed(1)}</Text>
                <Star size={14} fill="#C9A227" color="#C9A227" style={{ marginLeft: 2 }} />
              </View>
              <Text className="text-[#8B8B8B] text-xs mt-1">RATING</Text>
            </View>
          )}
        </View>

        {/* Our Collection */}
        <View className="px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-[#1a1a1a]">Collection</Text>
            <Text className="text-[#8B8B8B] text-sm">{filteredSakes.length} sakes</Text>
          </View>

          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {filteredSakes.map((sake) => {
              const imageUrl = resolveSakeImageUrl(sake.image_url);
              return (
              <Pressable
                key={sake.id}
                onPress={() => handleSakePress(sake.id)}
                className="active:scale-98"
                style={{ width: '48%' }}
              >
                <View
                  className="rounded-2xl overflow-hidden mb-2"
                  style={{ backgroundColor: '#F5EED9', height: 160 }}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: '100%', height: 160 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Building2 size={32} color="#C9A227" />
                    </View>
                  )}
                </View>
                <Text className="text-[#1a1a1a] font-semibold text-sm" numberOfLines={1}>
                  {sake.name}
                </Text>
                <Text className="text-[#8B8B8B] text-xs" numberOfLines={1}>
                  {sake.type ?? 'Sake'}
                </Text>
                {(sake.average_rating ?? 0) > 0 && (
                  <View className="flex-row items-center mt-1">
                    <Star size={12} fill="#C9A227" color="#C9A227" />
                    <Text className="text-[#1a1a1a] text-sm ml-1">
                      {(sake.average_rating ?? 0).toFixed(1)}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
