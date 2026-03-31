import { useState, useEffect } from 'react';
import { Text, View, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { ChevronLeft, Search, Star, Wine, SlidersHorizontal, X } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSearchSake, useSakeList } from '@/lib/supabase-hooks';
import { resolveSakeImageUrl } from '@/lib/supabase';
import { SakeImage } from '@/components/SakeImage';
import type { Sake as SupabaseSake } from '@/lib/database.types';

// Helper to map Supabase sake to display format
function mapSupabaseSake(sake: SupabaseSake) {
  return {
    id: sake.id,
    name: sake.name ?? 'Unknown',
    brewery: sake.brewery ?? 'Unknown',
    type: sake.type ?? 'Other',
    avgRating: sake.average_rating ?? 0,
    labelImageUrl: resolveSakeImageUrl(sake.image_url) ?? null,
    region: sake.region ?? sake.prefecture ?? '',
    polishingRatio: sake.polishing_ratio,
    smv: sake.smv,
  };
}

export default function SearchResultsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    query?: string;
    types?: string;
    regions?: string;
    minPrice?: string;
    maxPrice?: string;
    smv?: string;
    polishingRatio?: string;
  }>();

  const [searchQuery, setSearchQuery] = useState(params.query ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(params.query ?? '');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results or all sake
  const { data: searchResults, isLoading: searchLoading } = useSearchSake(debouncedQuery);
  const { data: allSakeData, isLoading: allLoading } = useSakeList({ limit: 100 });

  // Parse filter params
  const selectedTypes = params.types ? params.types.split(',') : [];
  const selectedRegions = params.regions ? params.regions.split(',') : [];

  // Get base sake list
  const baseSake = debouncedQuery.trim()
    ? (searchResults ?? [])
    : (allSakeData?.data ?? []);

  // Apply filters
  const filteredSake = baseSake.filter(sake => {
    // Type filter
    if (selectedTypes.length > 0) {
      const sakeType = sake.type?.toLowerCase() ?? '';
      const matchesType = selectedTypes.some(t => sakeType.includes(t.toLowerCase()));
      if (!matchesType) return false;
    }

    // Region filter
    if (selectedRegions.length > 0) {
      const sakeRegion = (sake.region ?? sake.prefecture ?? '').toLowerCase();
      const matchesRegion = selectedRegions.some(r => sakeRegion.includes(r.toLowerCase()));
      if (!matchesRegion) return false;
    }

    // SMV filter
    if (params.smv) {
      const targetSmv = parseFloat(params.smv);
      if (sake.smv !== null && sake.smv !== undefined) {
        // Allow +/- 2 range
        if (Math.abs(sake.smv - targetSmv) > 2) return false;
      }
    }

    // Polishing ratio filter
    if (params.polishingRatio) {
      const targetRatio = parseInt(params.polishingRatio, 10);
      if (sake.polishing_ratio !== null && sake.polishing_ratio !== undefined) {
        // Allow +/- 10% range
        if (Math.abs(sake.polishing_ratio - targetRatio) > 10) return false;
      }
    }

    return true;
  }).map(mapSupabaseSake);

  const isLoading = debouncedQuery.trim() ? searchLoading : allLoading;

  const handleSakePress = async (sakeId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/sake/${sakeId}`);
  };

  const handleOpenFilters = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/filters',
      params: {
        query: searchQuery,
        types: params.types,
        regions: params.regions,
      },
    });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedRegions.length > 0 || params.smv || params.polishingRatio;

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

        {/* Search Input */}
        <View
          className="flex-1 flex-row items-center px-3 py-2 rounded-xl mx-2"
          style={{ backgroundColor: '#F5F3EE', borderWidth: 1, borderColor: '#E8E4D9' }}
          pointerEvents="box-none"
        >
          <Search size={18} color="#8B8B8B" />
          <TextInput
            className="flex-1 ml-2 text-base text-[#1a1a1a]"
            placeholder="Search sake, breweries..."
            placeholderTextColor="#8B8B8B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={!params.query}
            returnKeyType="search"
            editable={true}
            selectTextOnFocus={true}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={handleClearSearch}>
              <X size={18} color="#8B8B8B" />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={handleOpenFilters}
          className="w-10 h-10 items-center justify-center rounded-xl"
          style={{
            backgroundColor: hasActiveFilters ? '#C9A227' : '#F5F3EE',
          }}
        >
          <SlidersHorizontal size={20} color={hasActiveFilters ? '#FFFFFF' : '#1a1a1a'} />
        </Pressable>
      </View>

      {/* Active Filters */}
      {hasActiveFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          style={{ flexGrow: 0 }}
        >
          {selectedTypes.map(type => (
            <View
              key={type}
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{ backgroundColor: '#F5EED9' }}
            >
              <Text className="text-[#C9A227] text-sm font-medium">{type}</Text>
            </View>
          ))}
          {selectedRegions.map(region => (
            <View
              key={region}
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{ backgroundColor: '#E0E7FF' }}
            >
              <Text className="text-[#6366F1] text-sm font-medium">{region}</Text>
            </View>
          ))}
          {params.smv && (
            <View
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{ backgroundColor: '#DCFCE7' }}
            >
              <Text className="text-[#16A34A] text-sm font-medium">
                SMV: {parseFloat(params.smv) >= 0 ? '+' : ''}{params.smv}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Results */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Result Count */}
        <View className="px-5 py-3">
          <Text className="text-[#8B8B8B] text-sm">
            {isLoading ? 'Searching...' : `${filteredSake.length} results found`}
          </Text>
        </View>

        {isLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color="#C9A227" />
          </View>
        ) : filteredSake.length === 0 ? (
          <View className="items-center py-20 px-5">
            <Wine size={48} color="#C9A227" />
            <Text className="text-[#1a1a1a] font-semibold text-lg mt-4">
              No sake found
            </Text>
            <Text className="text-[#8B8B8B] text-center mt-2">
              {debouncedQuery.trim()
                ? `No results for "${debouncedQuery}"`
                : 'Try adjusting your filters'}
            </Text>
            {hasActiveFilters && (
              <Pressable
                onPress={() => router.setParams({ types: '', regions: '', smv: '', polishingRatio: '' })}
                className="mt-4 px-6 py-3 rounded-full"
                style={{ backgroundColor: '#C9A227' }}
              >
                <Text className="text-white font-semibold">Clear Filters</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="px-5">
            {filteredSake.map((sake) => (
              <Pressable
                key={sake.id}
                onPress={() => handleSakePress(sake.id)}
                className="flex-row items-center p-3 mb-3 rounded-2xl"
                style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View className="w-16 h-16 rounded-xl overflow-hidden">
                  <SakeImage uri={sake.labelImageUrl} height={64} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[#1a1a1a] font-bold text-base" numberOfLines={1}>
                    {sake.name}
                  </Text>
                  <Text className="text-[#8B8B8B] text-sm" numberOfLines={1}>
                    {sake.brewery}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View
                      className="px-2 py-0.5 rounded-full mr-2"
                      style={{ backgroundColor: '#F5EED9' }}
                    >
                      <Text className="text-[#C9A227] text-xs font-medium">{sake.type}</Text>
                    </View>
                    {sake.region && (
                      <Text className="text-[#8B8B8B] text-xs">{sake.region}</Text>
                    )}
                  </View>
                </View>
                <View className="items-end">
                  <View className="flex-row items-center">
                    <Star size={14} fill="#C9A227" color="#C9A227" />
                    <Text className="text-[#1a1a1a] font-semibold ml-1">
                      {sake.avgRating.toFixed(1)}
                    </Text>
                  </View>
                  {sake.polishingRatio && (
                    <Text className="text-[#8B8B8B] text-xs mt-1">
                      {sake.polishingRatio}% polish
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
