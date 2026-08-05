import { Text, View, ScrollView, Pressable, ActivityIndicator, Share, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  Share2,
  Star,
  Building2,
  MapPin,
  Globe,
  Phone,
  Calendar,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useBreweryByName, useSakeByBrewery } from '@/lib/supabase-hooks';
import { sakeBreweryMatchesCatalogName } from '@/lib/brewery-name';
import { resolveSakeImageUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';

export default function BreweryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const breweryName = id ? decodeURIComponent(id) : '';

  const { data: brewery, isLoading: breweryLoading } = useBreweryByName(breweryName);
  const { data: brewerySakes, isLoading: sakesLoading } = useSakeByBrewery(breweryName);

  const isLoading = breweryLoading || sakesLoading;

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

  const openUrl = async (url: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const href = url.startsWith('http') ? url : `https://${url}`;
    try {
      await Linking.openURL(href);
    } catch {
      /* ignore */
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Prefix candidate + corporate-suffix equality (Sakescan PR #28) — rejects "Ito Shuzo" under "Ito".
  const catalogName = brewery?.name ?? breweryName;
  const filteredSakes = (brewerySakes ?? []).filter((s) =>
    sakeBreweryMatchesCatalogName(s.brewery, catalogName),
  );

  if (filteredSakes.length === 0 && !brewery) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <View
          className="flex-row items-center px-5"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Pressable onPress={() => router.back()} className="p-1">
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <Building2 size={48} color={colors.primary} />
          <Text className="font-semibold text-lg mt-4" style={{ color: colors.text }}>Brewery not found</Text>
          <Text className="text-center mt-2" style={{ color: colors.textTertiary }}>
            No sake from "{breweryName}" in the database
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 px-6 py-3 rounded-full"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const avgRating = filteredSakes.length > 0
    ? filteredSakes.reduce((sum, s) => sum + (s.average_rating ?? 0), 0) / filteredSakes.length
    : 0;

  const displayName = brewery?.name ?? breweryName;
  const region =
    brewery?.prefecture ??
    brewery?.region ??
    filteredSakes[0]?.region ??
    filteredSakes[0]?.prefecture ??
    'Japan';
  const heroImage = brewery?.image_url ?? null;
  const gallery = (brewery?.gallery_images ?? []).filter(Boolean);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.surface }}
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text
          className="text-base font-semibold px-3 py-1 rounded-full"
          style={{ color: colors.text, backgroundColor: colors.surface }}
        >
          Brewery Profile
        </Text>
        <Pressable
          onPress={handleShare}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.surface }}
        >
          <Share2 size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View
          style={{ height: 220, backgroundColor: colors.primaryLight }}
          className="items-center justify-center overflow-hidden"
        >
          {heroImage ? (
            <Image
              source={{ uri: heroImage }}
              style={{ width: '100%', height: 220 }}
              contentFit="cover"
            />
          ) : (
            <Building2 size={64} color={colors.primary} />
          )}
        </View>

        <View className="items-center" style={{ marginTop: -50 }}>
          <View
            className="w-24 h-24 rounded-full items-center justify-center overflow-hidden"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 4,
              borderColor: colors.background,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {heroImage ? (
              <Image source={{ uri: heroImage }} style={{ width: 96, height: 96 }} contentFit="cover" />
            ) : (
              <Building2 size={40} color={colors.primary} />
            )}
          </View>
        </View>

        <View className="items-center px-5 pt-4">
          <Text
            className="text-center"
            style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 26, fontWeight: '600', color: colors.text }}
          >
            {displayName}
          </Text>
          <View className="flex-row items-center mt-1">
            <MapPin size={14} color={colors.primary} />
            <Text className="text-base ml-1" style={{ color: colors.primary }}>
              {region}, Japan
            </Text>
          </View>
        </View>

        <View className="flex-row justify-center px-5 py-6 gap-3">
          <View
            className="items-center py-3 px-5 rounded-xl"
            style={{ borderWidth: 1, borderColor: colors.borderLight, minWidth: 90 }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.primary }}>{filteredSakes.length}</Text>
            <Text className="text-xs mt-1" style={{ color: colors.textTertiary }}>SAKES</Text>
          </View>
          {avgRating > 0 && (
            <View
              className="items-center py-3 px-5 rounded-xl"
              style={{ borderWidth: 1, borderColor: colors.borderLight, minWidth: 90 }}
            >
              <View className="flex-row items-center">
                <Text className="text-xl font-bold" style={{ color: colors.primary }}>{avgRating.toFixed(1)}</Text>
                <Star size={14} fill={colors.primary} color={colors.primary} style={{ marginLeft: 2 }} />
              </View>
              <Text className="text-xs mt-1" style={{ color: colors.textTertiary }}>RATING</Text>
            </View>
          )}
          {brewery?.founded_year != null && (
            <View
              className="items-center py-3 px-5 rounded-xl"
              style={{ borderWidth: 1, borderColor: colors.borderLight, minWidth: 90 }}
            >
              <View className="flex-row items-center">
                <Calendar size={14} color={colors.primary} />
                <Text className="text-xl font-bold ml-1" style={{ color: colors.primary }}>
                  {brewery.founded_year}
                </Text>
              </View>
              <Text className="text-xs mt-1" style={{ color: colors.textTertiary }}>FOUNDED</Text>
            </View>
          )}
        </View>

        {brewery?.description ? (
          <View className="px-5 mb-5">
            <Text className="text-xs font-medium mb-2 uppercase tracking-wide" style={{ color: colors.textSecondary }}>
              About
            </Text>
            <Text className="text-base leading-7" style={{ color: colors.text }}>
              {brewery.description}
            </Text>
          </View>
        ) : null}

        {(brewery?.address || brewery?.phone || brewery?.website || brewery?.visiting_info) && (
          <View className="px-5 mb-5">
            <Text className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: colors.textSecondary }}>
              Visit & Contact
            </Text>
            {brewery.address ? (
              <Text className="text-sm mb-2" style={{ color: colors.text }}>
                {brewery.address}
              </Text>
            ) : null}
            {brewery.visiting_info ? (
              <Text className="text-sm mb-3 leading-6" style={{ color: colors.textSecondary }}>
                {brewery.visiting_info}
                {brewery.tour_available ? ' · Tours available' : ''}
              </Text>
            ) : null}
            <View className="flex-row flex-wrap gap-2">
              {brewery.website ? (
                <Pressable
                  onPress={() => openUrl(brewery.website!)}
                  className="flex-row items-center px-3 py-2 rounded-full"
                  style={{ backgroundColor: colors.surfaceSecondary }}
                >
                  <Globe size={14} color={colors.primary} />
                  <Text className="ml-1.5 text-sm font-medium" style={{ color: colors.primary }}>Website</Text>
                </Pressable>
              ) : null}
              {brewery.phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${brewery.phone}`)}
                  className="flex-row items-center px-3 py-2 rounded-full"
                  style={{ backgroundColor: colors.surfaceSecondary }}
                >
                  <Phone size={14} color={colors.primary} />
                  <Text className="ml-1.5 text-sm font-medium" style={{ color: colors.primary }}>
                    {brewery.phone}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}

        {gallery.length > 0 && (
          <View className="mb-5">
            <Text
              className="text-xs font-medium mb-3 uppercase tracking-wide px-5"
              style={{ color: colors.textSecondary }}
            >
              Gallery
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            >
              {gallery.map((uri, idx) => (
                <Image
                  key={`${uri}-${idx}`}
                  source={{ uri }}
                  style={{ width: 160, height: 120, borderRadius: 12 }}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View className="px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold" style={{ color: colors.text }}>Collection</Text>
            <Text className="text-sm" style={{ color: colors.textTertiary }}>{filteredSakes.length} sakes</Text>
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
                  style={{ backgroundColor: colors.primaryLight, height: 160 }}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: '100%', height: 160 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Building2 size={32} color={colors.primary} />
                    </View>
                  )}
                </View>
                <Text className="font-semibold text-sm" numberOfLines={1} style={{ color: colors.text }}>
                  {sake.name}
                </Text>
                <Text className="text-xs" numberOfLines={1} style={{ color: colors.textTertiary }}>
                  {sake.type ?? 'Sake'}
                </Text>
                {(sake.average_rating ?? 0) > 0 && (
                  <View className="flex-row items-center mt-1">
                    <Star size={12} fill={colors.primary} color={colors.primary} />
                    <Text className="text-sm ml-1" style={{ color: colors.text }}>
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
