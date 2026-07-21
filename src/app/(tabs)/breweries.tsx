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
import { SakeImage } from '@/components/SakeImage';
import { Star, MapPin, Building2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  useBreweriesCatalog,
  BREWERIES_CATALOG_PAGE_SIZE,
} from '@/lib/supabase-hooks';
import { resolveSakeImageUrl } from '@/lib/supabase';
import type { BreweryCatalogRow } from '@/lib/database.types';
import { useTheme } from '@/lib/theme-context';
import { useI18n } from '@/lib/i18n-context';

type BreweryDisplay = {
  name: string;
  region: string;
  sakeCount: number;
  avgRating: number;
  displayImageUrl: string | null;
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
    displayImageUrl: resolved ?? null,
  };
}

export default function BreweriesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useI18n();

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
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <View style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden' }}>
            <SakeImage uri={brewery.displayImageUrl} height={64} />
          </View>
          <View className="flex-1 ml-3 justify-center">
            <Text className="font-bold text-base" style={{ color: colors.text }}>{brewery.name}</Text>
            <Text className="text-sm" style={{ color: colors.primary }}>{brewery.region}</Text>
            <View className="flex-row items-center mt-1">
              {brewery.avgRating > 0 && (
                <>
                  <Star size={12} fill={colors.primary} color={colors.primary} />
                  <Text className="text-xs ml-1" style={{ color: colors.text }}>{brewery.avgRating.toFixed(1)}</Text>
                  <Text className="text-xs ml-2" style={{ color: colors.textTertiary }}>•</Text>
                </>
              )}
              <Text className="text-xs ml-2" style={{ color: colors.textTertiary }}>
                {brewery.sakeCount} sake{brewery.sakeCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    ),
    [handleBreweryPress, colors],
  );

  const listHeader = useMemo(
    () => (
      <View>
        {featuredBrewery ? (
          <View className="px-5 mb-6">
            <Text className="text-sm font-semibold tracking-wider mb-3" style={{ color: colors.textTertiary }}>
              FEATURED
            </Text>
            <Pressable
              onPress={() => handleBreweryPress(featuredBrewery.name)}
              className="active:scale-98"
            >
              <View className="rounded-2xl overflow-hidden">
                <SakeImage uri={featuredBrewery.displayImageUrl} height={176} />
                <View className="p-4" style={{ backgroundColor: colors.primaryLight }}>
                  <Text className="text-xl font-bold" style={{ color: colors.text }}>{featuredBrewery.name}</Text>
                  <View className="flex-row items-center mt-1">
                    <MapPin size={14} color={colors.primary} />
                    <Text className="text-sm ml-1" style={{ color: colors.primary }}>{featuredBrewery.region}</Text>
                  </View>
                  <Text className="text-sm mt-2" style={{ color: colors.textSecondary }}>
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
            <Text className="text-sm font-semibold tracking-wider" style={{ color: colors.textTertiary }}>ALL BREWERIES</Text>
          </View>
        ) : null}
      </View>
    ),
    [featuredBrewery, listData.length, handleBreweryPress, colors],
  );

  if (isPending && flatRows.length === 0) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
        <View className="px-5 py-4">
          <Text style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 28, fontWeight: '600', color: colors.text }}>
            {t('common.breweries')}
          </Text>
          <Text className="text-base mt-1" style={{ color: colors.textTertiary }}>
            Discover Japan's finest sake producers
          </Text>
        </View>
        <View className="items-center py-20">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4" style={{ color: colors.textTertiary }}>Loading breweries...</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
        <View className="px-5 py-4">
          <Text style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 28, fontWeight: '600', color: colors.text }}>
            {t('common.breweries')}
          </Text>
        </View>
        <View className="items-center py-16 px-6">
          <Building2 size={48} color={colors.primary} />
          <Text className="font-semibold text-lg mt-4 text-center" style={{ color: colors.text }}>
            Couldn't load breweries
          </Text>
          <Text className="text-center mt-2 text-sm" style={{ color: colors.textTertiary }}>
            {error instanceof Error ? error.message : 'Check your connection and try again.'}
          </Text>
          <Text className="text-center mt-3 text-xs px-2" style={{ color: colors.textTertiary }}>
            If this is the first time, run{' '}
            <Text className="font-mono" style={{ color: colors.textSecondary }}>supabase db push</Text> so the catalog
            function exists.
          </Text>
          <Pressable
            onPress={() => void refetch()}
            className="mt-6 px-6 py-3 rounded-full"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-semibold">Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="px-5 py-4">
        <Text style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 28, fontWeight: '600', color: colors.text }}>
          {t('common.breweries')}
        </Text>
        <Text className="text-base mt-1" style={{ color: colors.textTertiary }}>
          Discover Japan's finest sake producers
        </Text>
        {flatRows.length > 0 && (
          <Text className="text-xs mt-2" style={{ color: colors.textSecondary }}>
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
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          featuredBrewery ? null : (
            <View className="items-center py-16 px-5">
              <Building2 size={48} color={colors.primary} />
              <Text className="font-semibold text-lg mt-4" style={{ color: colors.text }}>No breweries yet</Text>
              <Text className="text-center mt-2" style={{ color: colors.textTertiary }}>
                Add sake to your Supabase catalog to see breweries here.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-xs mt-2" style={{ color: colors.textTertiary }}>Loading more…</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
