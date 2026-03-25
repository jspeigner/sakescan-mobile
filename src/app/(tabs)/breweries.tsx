import { useCallback, useMemo } from 'react';
import {
  Text,
  View,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ListRenderItem,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Star, MapPin, Building2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  useBreweriesCatalog,
  BREWERIES_CATALOG_PAGE_SIZE,
} from '@/lib/supabase-hooks';
import { FALLBACK_SAKE_LABEL_URL, resolveSakeImageUrl } from '@/lib/supabase';
import type { BreweryCatalogRow } from '@/lib/database.types';

type BreweryDisplay = {
  name: string;
  region: string;
  sakeCount: number;
  avgRating: number;
  displayImageUrl: string;
};

function mapRowToDisplay(row: BreweryCatalogRow): BreweryDisplay {
  const resolved = resolveSakeImageUrl(row.thumbnail_image_url);
  const avg =
    row.avg_rating != null && !Number.isNaN(Number(row.avg_rating))
      ? Number(row.avg_rating)
      : 0;
  return {
    name: row.name,
    region: row.region?.trim() ? row.region : 'Japan',
    sakeCount: Number(row.sake_count) || 0,
    avgRating: avg,
    displayImageUrl: resolved ?? FALLBACK_SAKE_LABEL_URL,
  };
}

export default function BreweriesScreen() {
  const insets = useSafeAreaInsets();

  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useBreweriesCatalog();

  const flatRows = useMemo((): BreweryDisplay[] => {
    const pages = data?.pages ?? [];
    return pages.flatMap((page) => page.map(mapRowToDisplay));
  }, [data]);

  const featuredBrewery = flatRows[0];
  const listData = flatRows.slice(1);

  const handleBreweryPress = useCallback(async (breweryName: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/brewery/${encodeURIComponent(breweryName)}`);
  }, []);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem: ListRenderItem<BreweryDisplay> = useCallback(
    ({ item: brewery }) => (
      <Pressable
        onPress={() => handleBreweryPress(brewery.name)}
        className="active:scale-98 mb-3 mx-5"
      >
        <View
          className="flex-row p-3 rounded-2xl"
          style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
        >
          <ExpoImage
            source={{ uri: brewery.displayImageUrl }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              backgroundColor: '#F5EED9',
            }}
            contentFit="cover"
            transition={200}
          />
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
    ),
    [handleBreweryPress],
  );

  const listHeader = useMemo(
    () => (
      <View>
        {featuredBrewery ? (
          <View className="px-5 mb-6">
            <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider mb-3">
              FEATURED
            </Text>
            <Pressable
              onPress={() => handleBreweryPress(featuredBrewery.name)}
              className="active:scale-98"
            >
              <View className="rounded-2xl overflow-hidden">
                <ExpoImage
                  source={{ uri: featuredBrewery.displayImageUrl }}
                  style={{ width: '100%', height: 176, backgroundColor: '#F5EED9' }}
                  contentFit="cover"
                  transition={200}
                />
                <View className="p-4" style={{ backgroundColor: '#F5EED9' }}>
                  <Text className="text-xl font-bold text-[#1a1a1a]">{featuredBrewery.name}</Text>
                  <View className="flex-row items-center mt-1">
                    <MapPin size={14} color="#C9A227" />
                    <Text className="text-[#C9A227] text-sm ml-1">{featuredBrewery.region}</Text>
                  </View>
                  <Text className="text-[#6B6B6B] text-sm mt-2">
                    {featuredBrewery.sakeCount} sake{featuredBrewery.sakeCount !== 1 ? 's' : ''} in
                    collection
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        {listData.length > 0 ? (
          <View className="px-5 mb-3">
            <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider">ALL BREWERIES</Text>
          </View>
        ) : null}
      </View>
    ),
    [featuredBrewery, listData.length, handleBreweryPress],
  );

  if (isPending && flatRows.length === 0) {
    return (
      <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
        <View className="px-5 py-4">
          <Text style={{ fontFamily: 'serif', fontSize: 28, fontWeight: '600', color: '#1a1a1a' }}>
            Breweries
          </Text>
          <Text className="text-[#8B8B8B] text-base mt-1">
            Discover Japan's finest sake producers
          </Text>
        </View>
        <View className="items-center py-20">
          <ActivityIndicator size="large" color="#C9A227" />
          <Text className="text-[#8B8B8B] mt-4">Loading breweries...</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
        <View className="px-5 py-4">
          <Text style={{ fontFamily: 'serif', fontSize: 28, fontWeight: '600', color: '#1a1a1a' }}>
            Breweries
          </Text>
        </View>
        <View className="items-center py-16 px-6">
          <Building2 size={48} color="#C9A227" />
          <Text className="text-[#1a1a1a] font-semibold text-lg mt-4 text-center">
            Couldn't load breweries
          </Text>
          <Text className="text-[#8B8B8B] text-center mt-2 text-sm">
            {error instanceof Error ? error.message : 'Check your connection and try again.'}
          </Text>
          <Text className="text-[#8B8B8B] text-center mt-3 text-xs px-2">
            If this is the first time, run{' '}
            <Text className="font-mono text-[#6B6B6B]">supabase db push</Text> so the catalog
            function exists.
          </Text>
          <Pressable
            onPress={() => void refetch()}
            className="mt-6 px-6 py-3 rounded-full"
            style={{ backgroundColor: '#C9A227' }}
          >
            <Text className="text-white font-semibold">Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
      <View className="px-5 py-4">
        <Text style={{ fontFamily: 'serif', fontSize: 28, fontWeight: '600', color: '#1a1a1a' }}>
          Breweries
        </Text>
        <Text className="text-[#8B8B8B] text-base mt-1">
          Discover Japan's finest sake producers
        </Text>
        {flatRows.length > 0 && (
          <Text className="text-[#B5B5B5] text-xs mt-2">
            {flatRows.length}
            {hasNextPage ? '+' : ''} breweries · {BREWERIES_CATALOG_PAGE_SIZE} per page
          </Text>
        )}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: 100 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isFetchingNextPage && flatRows.length > 0}
            onRefresh={() => void refetch()}
            tintColor="#C9A227"
          />
        }
        ListEmptyComponent={
          featuredBrewery ? null : (
            <View className="items-center py-16 px-5">
              <Building2 size={48} color="#C9A227" />
              <Text className="text-[#1a1a1a] font-semibold text-lg mt-4">No breweries yet</Text>
              <Text className="text-[#8B8B8B] text-center mt-2">
                Add sake to your Supabase catalog to see breweries here.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#C9A227" />
              <Text className="text-[#8B8B8B] text-xs mt-2">Loading more…</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
