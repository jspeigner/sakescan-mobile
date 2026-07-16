import { Text, View, ScrollView, Pressable, ActivityIndicator, Share } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Share2, Star, Building2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSakeByBrewery } from '@/lib/supabase-hooks';
import { resolveSakeImageUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme-context';

export default function BreweryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Decode brewery name from URL parameter
  const breweryName = id ? decodeURIComponent(id) : '';

  // Exact brewery match (case-insensitive) — avoids search false negatives
  const { data: brewerySakes, isLoading } = useSakeByBrewery(breweryName);

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
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Normalize for residual mismatches (whitespace / case)
  const normalize = (value: string) => value.trim().toLowerCase();
  const filteredSakes = (brewerySakes ?? []).filter(
    (s) => normalize(s.brewery ?? '') === normalize(breweryName),
  );

  if (filteredSakes.length === 0) {
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

  // Calculate stats from the sake
  const avgRating = filteredSakes.length > 0
    ? filteredSakes.reduce((sum, s) => sum + (s.average_rating ?? 0), 0) / filteredSakes.length
    : 0;

  const region = filteredSakes[0]?.region ?? filteredSakes[0]?.prefecture ?? 'Japan';

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header - Absolute positioned */}
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
        {/* Hero - Building icon instead of image */}
        <View
          style={{ height: 220, backgroundColor: colors.primaryLight }}
          className="items-center justify-center"
        >
          <Building2 size={64} color={colors.primary} />
        </View>

        {/* Logo */}
        <View className="items-center" style={{ marginTop: -50 }}>
          <View
            className="w-24 h-24 rounded-full items-center justify-center"
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
            <Building2 size={40} color={colors.primary} />
          </View>
        </View>

        {/* Brewery Info */}
        <View className="items-center px-5 pt-4">
          <Text
            className="text-center"
            style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 26, fontWeight: '600', color: colors.text }}
          >
            {breweryName}
          </Text>
          <Text className="text-base mt-1" style={{ color: colors.primary }}>
            {region}, Japan
          </Text>
        </View>

        {/* Stats Row */}
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
        </View>

        {/* Our Collection */}
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
