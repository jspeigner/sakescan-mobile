import { useState, useEffect } from 'react';
import { Text, View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SakeImage } from '@/components/SakeImage';
import { Search, Star, Bell, ChevronDown, User, SlidersHorizontal, Wine, Clock, Globe, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSakeList, useSakeByRegion, useAllScans } from '@/lib/supabase-hooks';
import { resolveSakeImageUrl } from '@/lib/supabase';
import type { Sake as SupabaseSake } from '@/lib/database.types';
import { useScanHistoryStore } from '@/lib/scan-history-store';

type FilterType = 'All Types' | 'Junmai' | 'Ginjo' | 'Daiginjo' | 'Honjozo';

// Helper to map Supabase sake to display format
function mapSupabaseSake(sake: SupabaseSake) {
  return {
    id: sake.id,
    name: sake.name ?? 'Unknown',
    breweryName: sake.brewery ?? 'Unknown',
    sakeType: sake.type ?? 'Other',
    avgRating: sake.average_rating ?? 0,
    labelImageUrl: resolveSakeImageUrl(sake.image_url) ?? null,
    region: sake.region ?? sake.prefecture ?? '',
  };
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterType>('All Types');

  // Load scan history on mount
  const scans = useScanHistoryStore((s) => s.scans);
  const loadHistory = useScanHistoryStore((s) => s.loadHistory);
  const isHistoryLoaded = useScanHistoryStore((s) => s.isLoaded);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Fetch all sake from Supabase
  const { data: supabaseData, isLoading, isError, error, refetch, isFetching } = useSakeList({ limit: 50 });

  // Fetch all scans from Supabase (global discovery)
  const { data: allScansData, isLoading: isLoadingScans } = useAllScans({ limit: 50 });

  // Fetch Niigata sake specifically
  const { data: niigataSake } = useSakeByRegion('Niigata');

  // Map to display format
  const allSake = (supabaseData?.data ?? []).map(mapSupabaseSake);

  const handleFilterPress = async (filter: FilterType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(filter);
  };

  const handleAdvancedFilters = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/search-results');
  };

  const handleSakePress = async (sakeId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/sake/${sakeId}`);
  };

  /** Full browse list (search-results), respecting the active type chip. */
  const handleSeeAllCatalog = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeFilter === 'All Types') {
      router.push('/search-results');
    } else {
      router.push({
        pathname: '/search-results',
        params: { types: activeFilter },
      });
    }
  };

  const handleSeeAllNiigata = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/search-results',
      params: { regions: 'Niigata' },
    });
  };

  // Filter sake based on type filter
  const filteredSake = allSake.filter(sake => {
    return activeFilter === 'All Types' || (sake.sakeType?.includes(activeFilter) ?? false);
  });

  // Sections
  const trendingSake = filteredSake.slice(0, 2);
  const newArrivals = filteredSake.slice(2, 6);
  const topRatedNiigata = (niigataSake ?? [])
    .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
    .slice(0, 3)
    .map(mapSupabaseSake);

  // Global scanned sake - convert to display format
  const globalScannedSake = (allScansData ?? [])
    .filter(scan => scan.sake)
    .map(scan => {
      const sake = scan.sake!;
      return {
        id: sake.id ?? 'unknown',
        name: sake.name ?? 'Unknown',
        breweryName: sake.brewery ?? 'Unknown',
        sakeType: sake.type ?? 'Other',
        avgRating: sake.average_rating ?? 0,
        labelImageUrl: resolveSakeImageUrl(sake.image_url) ?? null,
        scanCount: 1,
        scannedAt: scan.created_at,
      };
    });

  return (
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.push('/profile')}
          className="w-10 h-10 rounded-full bg-[#F0EDE5] items-center justify-center"
        >
          <User size={20} color="#1a1a1a" />
        </Pressable>
        <Text style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 20, fontWeight: '600', color: '#1a1a1a' }}>
          SakeScan
        </Text>
        <Pressable className="w-10 h-10 rounded-full bg-[#F0EDE5] items-center justify-center">
          <Bell size={20} color="#1a1a1a" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Search Bar */}
        <View className="px-5 pt-2 pb-4">
          <Pressable
            onPress={handleAdvancedFilters}
            className="flex-row items-center px-4 py-3 rounded-xl"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E4D9' }}
          >
            <Search size={18} color="#8B8B8B" />
            <Text className="flex-1 ml-3 text-base text-[#8B8B8B]">
              Search sake, breweries...
            </Text>
            <SlidersHorizontal size={18} color="#C9A227" />
          </Pressable>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          style={{ flexGrow: 0, marginBottom: 16 }}
        >
          {(['All Types', 'Junmai', 'Ginjo', 'Daiginjo', 'Honjozo'] as FilterType[]).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => handleFilterPress(filter)}
              className="px-4 py-2 rounded-full"
              style={{
                backgroundColor: activeFilter === filter ? '#C9A227' : '#FFFFFF',
                borderWidth: 1,
                borderColor: activeFilter === filter ? '#C9A227' : '#E8E4D9',
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: activeFilter === filter ? '#FFFFFF' : '#1a1a1a' }}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {isError ? (
          <View className="items-center py-16 px-5">
            <Wine size={48} color="#C9A227" />
            <Text className="text-[#1a1a1a] font-semibold text-lg mt-4 text-center">
              Could not load the sake list
            </Text>
            <Text className="text-[#8B8B8B] text-center mt-2 text-sm">
              {error &&
              typeof error === 'object' &&
              'message' in error &&
              String((error as { message: string }).message).toLowerCase().includes('permission denied')
                ? 'The database is not allowing public reads on the sake catalog. In Supabase, run migrations (including GRANT SELECT on public.sake for anon) or check Row Level Security policies.'
                : 'Check your internet connection. Use the same Supabase project for EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_KEY).'}
            </Text>
            {__DEV__ && error && typeof error === 'object' && 'message' in error ? (
              <Text className="text-[#B8860B] text-center mt-3 text-xs font-mono px-2">
                {(error as { message: string }).message}
              </Text>
            ) : null}
            <Pressable
              onPress={() => {
                void refetch();
              }}
              disabled={isFetching}
              className="mt-6 flex-row items-center px-6 py-3 rounded-full bg-[#C9A227]"
            >
              <RefreshCw size={18} color="#FFFFFF" />
              <Text className="text-white font-semibold ml-2">{isFetching ? 'Retrying…' : 'Try again'}</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color="#C9A227" />
            <Text className="text-[#8B8B8B] mt-4">Loading sake...</Text>
          </View>
        ) : filteredSake.length === 0 ? (
          <View className="items-center py-20 px-5">
            <Wine size={48} color="#C9A227" />
            <Text className="text-[#1a1a1a] font-semibold text-lg mt-4">
              No sake found
            </Text>
            <Text className="text-[#8B8B8B] text-center mt-2">
              {activeFilter !== 'All Types'
                ? `No ${activeFilter} sake in the database yet`
                : 'The sake database is empty. Scan labels to help build it!'}
            </Text>
          </View>
        ) : (
          <>
            {/* Community Discoveries - Global Scanned Sake */}
            {globalScannedSake.length > 0 && (
              <View className="px-5 mb-6">
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <Globe size={20} color="#C9A227" />
                    <Text className="text-lg font-bold text-[#1a1a1a] ml-2">Community Discoveries</Text>
                  </View>
                  <View className="px-2 py-1 rounded-full bg-[#C9A227]/10">
                    <Text className="text-[#C9A227] text-xs font-semibold">
                      {globalScannedSake.length} scanned
                    </Text>
                  </View>
                </View>

                <Text className="text-[#8B8B8B] text-sm mb-3">
                  Sake recently scanned by our community
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                  style={{ flexGrow: 0 }}
                >
                  {globalScannedSake.slice(0, 10).map((sake, index) => (
                    <Pressable
                      key={`${sake.id}-${index}`}
                      onPress={async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        // Navigate to sake detail if we have a proper ID, otherwise just show the info
                        router.push(`/sake/${sake.id}`);
                      }}
                      className="active:scale-98"
                      style={{ width: 140 }}
                    >
                      <View className="rounded-2xl overflow-hidden mb-2">
                        <SakeImage uri={sake.labelImageUrl} height={180} />
                      </View>
                      <Text className="text-[#1a1a1a] font-bold text-sm" numberOfLines={1}>
                        {sake.name}
                      </Text>
                      <Text className="text-[#8B8B8B] text-xs" numberOfLines={1}>
                        {sake.breweryName}
                      </Text>
                      {sake.avgRating > 0 && (
                        <View className="flex-row items-center mt-1">
                          <Star size={10} fill="#C9A227" color="#C9A227" />
                          <Text className="text-[#1a1a1a] text-xs ml-1">
                            {sake.avgRating.toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Recently Scanned - Scan History */}
            {scans.length > 0 && (
              <View className="px-5 mb-6">
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <Clock size={20} color="#C9A227" />
                    <Text className="text-lg font-bold text-[#1a1a1a] ml-2">Recently Scanned</Text>
                  </View>
                  <Pressable onPress={() => router.push('/scan-history')}>
                    <Text className="text-[#C9A227] font-medium">See All</Text>
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                  style={{ flexGrow: 0 }}
                >
                  {scans.slice(0, 5).map((scan) => (
                    <Pressable
                      key={scan.id}
                      onPress={async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: '/scan-result',
                          params: {
                            sakeData: JSON.stringify(scan.sakeInfo),
                            imageUri: scan.imageUri || '',
                          },
                        });
                      }}
                      className="active:scale-98"
                      style={{ width: 140 }}
                    >
                      <View className="rounded-2xl overflow-hidden mb-2">
                        <SakeImage uri={scan.imageUri} height={180} />
                      </View>
                      <Text className="text-[#1a1a1a] font-bold text-sm" numberOfLines={1}>
                        {scan.sakeInfo.name}
                      </Text>
                      <Text className="text-[#8B8B8B] text-xs" numberOfLines={1}>
                        {scan.sakeInfo.brewery}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Trending This Week */}
            {trendingSake.length > 0 && (
              <View className="px-5 mb-6">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-bold text-[#1a1a1a]">Trending This Week</Text>
                  <Pressable onPress={handleSeeAllCatalog} hitSlop={8}>
                    <Text className="text-[#C9A227] font-medium">See All</Text>
                  </Pressable>
                </View>

                <View className="flex-row gap-3">
                  {trendingSake.map((sake) => (
                    <Pressable
                      key={sake.id}
                      onPress={() => handleSakePress(sake.id)}
                      className="flex-1 active:scale-98"
                    >
                      <View className="rounded-2xl overflow-hidden mb-2">
                        <SakeImage uri={sake.labelImageUrl} height={180} />
                      </View>
                      <Text className="text-[#1a1a1a] font-bold text-base" numberOfLines={1}>{sake.name}</Text>
                      <View className="flex-row items-center mt-1">
                        <Star size={12} fill="#C9A227" color="#C9A227" />
                        <Text className="text-[#1a1a1a] text-sm ml-1">{sake.avgRating.toFixed(1)}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* New Arrivals */}
            {newArrivals.length > 0 && (
              <View className="px-5 mb-6">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-bold text-[#1a1a1a]">New Arrivals</Text>
                  <Pressable onPress={handleSeeAllCatalog} hitSlop={8}>
                    <Text className="text-[#C9A227] font-medium">See All</Text>
                  </Pressable>
                </View>

                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {newArrivals.map((sake) => (
                    <Pressable
                      key={sake.id}
                      onPress={() => handleSakePress(sake.id)}
                      className="active:scale-98"
                      style={{ width: '48%' }}
                    >
                      <View className="rounded-2xl overflow-hidden mb-2">
                        <SakeImage uri={sake.labelImageUrl} height={140} />
                      </View>
                      <Text className="text-[#1a1a1a] font-semibold text-sm" numberOfLines={1}>
                        {sake.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Top Rated in Niigata */}
            {topRatedNiigata.length > 0 && (
              <View className="px-5 mb-6">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-bold text-[#1a1a1a]">Top Rated in Niigata</Text>
                  <Pressable onPress={handleSeeAllNiigata} hitSlop={8}>
                    <Text className="text-[#C9A227] font-medium">See All</Text>
                  </Pressable>
                </View>

                {topRatedNiigata.map((sake) => (
                  <Pressable
                    key={sake.id}
                    onPress={() => handleSakePress(sake.id)}
                    className="active:scale-98 mb-3"
                  >
                    <View
                      className="flex-row items-center p-3 rounded-2xl"
                      style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
                    >
                      <View className="w-14 h-14 rounded-xl overflow-hidden">
                        <SakeImage uri={sake.labelImageUrl} height={56} contentFit="cover" />
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className="text-[#1a1a1a] font-bold text-base" numberOfLines={1}>{sake.name}</Text>
                        <Text className="text-[#8B8B8B] text-sm">{sake.sakeType}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <Star size={14} fill="#C9A227" color="#C9A227" />
                        <Text className="text-[#C9A227] font-semibold ml-1">
                          {sake.avgRating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
