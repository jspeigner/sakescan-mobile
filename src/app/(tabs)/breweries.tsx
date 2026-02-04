import { Text, View, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { Star, MapPin, Building2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSakeList } from '@/lib/supabase-hooks';

// Extract unique breweries from sake list
function extractBreweries(sakeList: Array<{
  brewery: string | null;
  region: string | null;
  prefecture: string | null;
  average_rating: number | null;
}>) {
  const breweryMap = new Map<string, {
    name: string;
    region: string;
    sakeCount: number;
    totalRating: number;
    ratingCount: number;
  }>();

  sakeList.forEach(sake => {
    const breweryName = sake.brewery ?? 'Unknown';
    const existing = breweryMap.get(breweryName);

    if (existing) {
      existing.sakeCount += 1;
      if (sake.average_rating) {
        existing.totalRating += sake.average_rating;
        existing.ratingCount += 1;
      }
    } else {
      breweryMap.set(breweryName, {
        name: breweryName,
        region: sake.region ?? sake.prefecture ?? 'Japan',
        sakeCount: 1,
        totalRating: sake.average_rating ?? 0,
        ratingCount: sake.average_rating ? 1 : 0,
      });
    }
  });

  return Array.from(breweryMap.values())
    .map(b => ({
      ...b,
      avgRating: b.ratingCount > 0 ? b.totalRating / b.ratingCount : 0,
    }))
    .sort((a, b) => b.sakeCount - a.sakeCount);
}

export default function BreweriesScreen() {
  const insets = useSafeAreaInsets();

  // Fetch all sake to extract brewery info
  const { data: sakeData, isLoading } = useSakeList({ limit: 100 });

  const breweries = extractBreweries(sakeData?.data ?? []);
  const featuredBrewery = breweries[0];

  const handleBreweryPress = async (breweryName: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/brewery/${encodeURIComponent(breweryName)}`);
  };

  return (
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4">
        <Text style={{ fontFamily: 'serif', fontSize: 28, fontWeight: '600', color: '#1a1a1a' }}>
          Breweries
        </Text>
        <Text className="text-[#8B8B8B] text-base mt-1">
          Discover Japan's finest sake producers
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {isLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color="#C9A227" />
            <Text className="text-[#8B8B8B] mt-4">Loading breweries...</Text>
          </View>
        ) : breweries.length === 0 ? (
          <View className="items-center py-20 px-5">
            <Building2 size={48} color="#C9A227" />
            <Text className="text-[#1a1a1a] font-semibold text-lg mt-4">
              No breweries yet
            </Text>
            <Text className="text-[#8B8B8B] text-center mt-2">
              Scan sake labels to discover breweries
            </Text>
          </View>
        ) : (
          <>
            {/* Featured Brewery */}
            {featuredBrewery && (
              <View className="px-5 mb-6">
                <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider mb-3">
                  FEATURED
                </Text>
                <Pressable
                  onPress={() => handleBreweryPress(featuredBrewery.name)}
                  className="active:scale-98"
                >
                  <View className="rounded-2xl overflow-hidden">
                    <View
                      className="w-full h-44 items-center justify-center"
                      style={{ backgroundColor: '#F5EED9' }}
                    >
                      <Building2 size={48} color="#C9A227" />
                    </View>
                    <View
                      className="p-4"
                      style={{ backgroundColor: '#F5EED9' }}
                    >
                      <Text className="text-xl font-bold text-[#1a1a1a]">
                        {featuredBrewery.name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <MapPin size={14} color="#C9A227" />
                        <Text className="text-[#C9A227] text-sm ml-1">{featuredBrewery.region}</Text>
                      </View>
                      <Text className="text-[#6B6B6B] text-sm mt-2">
                        {featuredBrewery.sakeCount} sake{featuredBrewery.sakeCount !== 1 ? 's' : ''} in collection
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            )}

            {/* All Breweries */}
            <View className="px-5">
              <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider mb-3">
                ALL BREWERIES
              </Text>

              {breweries.slice(1).map((brewery) => (
                <Pressable
                  key={brewery.name}
                  onPress={() => handleBreweryPress(brewery.name)}
                  className="active:scale-98 mb-3"
                >
                  <View
                    className="flex-row p-3 rounded-2xl"
                    style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
                  >
                    <View
                      className="w-16 h-16 rounded-xl items-center justify-center"
                      style={{ backgroundColor: '#F5EED9' }}
                    >
                      <Building2 size={24} color="#C9A227" />
                    </View>
                    <View className="flex-1 ml-3 justify-center">
                      <Text className="text-[#1a1a1a] font-bold text-base">{brewery.name}</Text>
                      <Text className="text-[#C9A227] text-sm">{brewery.region}</Text>
                      <View className="flex-row items-center mt-1">
                        {brewery.avgRating > 0 && (
                          <>
                            <Star size={12} fill="#C9A227" color="#C9A227" />
                            <Text className="text-[#1a1a1a] text-xs ml-1">{brewery.avgRating.toFixed(1)}</Text>
                            <Text className="text-[#8B8B8B] text-xs ml-2">•</Text>
                          </>
                        )}
                        <Text className="text-[#8B8B8B] text-xs ml-2">
                          {brewery.sakeCount} sake{brewery.sakeCount !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
