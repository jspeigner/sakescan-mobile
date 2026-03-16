import {
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  MapPin,
  Phone,
  ExternalLink,
  Navigation,
  Store,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { findSakeRetailers, getGoogleMapsUrl, getPhoneUrl, type RetailerInfo } from '@/lib/retailer-search';
import { useTheme } from '@/lib/theme-context';

export default function StoresScreen() {
  const { sakeName, brewery, city, region, latitude, longitude } = useLocalSearchParams<{
    sakeName?: string;
    brewery?: string;
    city?: string;
    region?: string;
    latitude?: string;
    longitude?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [retailers, setRetailers] = useState<RetailerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchCity = city ?? 'San Francisco';

  useEffect(() => {
    const loadRetailers = async () => {
      if (!sakeName || !brewery) {
        setError('Missing sake information');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const lat = latitude ? parseFloat(latitude) : undefined;
        const lng = longitude ? parseFloat(longitude) : undefined;
        const results = await findSakeRetailers(sakeName, brewery, searchCity, region, lat, lng);
        setRetailers(results);
      } catch (err) {
        console.error('Failed to find retailers:', err);
        setError('Failed to find stores. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadRetailers();
  }, [sakeName, brewery, searchCity, region, latitude, longitude]);

  const handleOpenMaps = async (retailer: RetailerInfo) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = getGoogleMapsUrl(retailer);
    await Linking.openURL(url);
  };

  const handleCall = async (phone: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = getPhoneUrl(phone);
    await Linking.openURL(url);
  };

  const handleWebsite = async (website: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Linking.openURL(website);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        className="border-b"
        style={{
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
        }}
      >
        <View className="flex-row items-center justify-between px-5">
          <Pressable onPress={() => router.back()} className="p-1">
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <View className="flex-1 mx-4">
            <Text className="text-lg font-semibold text-center" style={{ color: colors.text }}>
              Where to Buy
            </Text>
            {searchCity && (
              <Text className="text-xs text-center mt-0.5" style={{ color: colors.textSecondary }}>
                {region ? `${searchCity}, ${region}` : searchCity}
              </Text>
            )}
          </View>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-center px-8" style={{ color: colors.textSecondary }}>
            Finding stores that carry {sakeName ?? 'this sake'}...
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Store size={48} color={colors.primary} />
          <Text className="font-semibold text-lg mt-4 text-center" style={{ color: colors.text }}>
            Couldn't Find Stores
          </Text>
          <Text className="text-center mt-2" style={{ color: colors.textSecondary }}>
            {error}
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 px-6 py-3 rounded-full"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      ) : retailers.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Store size={48} color={colors.primary} />
          <Text className="font-semibold text-lg mt-4 text-center" style={{ color: colors.text }}>
            No Stores Found
          </Text>
          <Text className="text-center mt-2" style={{ color: colors.textSecondary }}>
            We couldn't find any stores in {searchCity} that carry this sake. Try a different location or call your local liquor store.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 px-6 py-3 rounded-full"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="mx-5 mt-5 mb-4 p-4 rounded-2xl" style={{ backgroundColor: colors.primaryLight }}>
            <Text className="text-sm leading-5" style={{ color: colors.text }}>
              These stores may carry <Text className="font-semibold">{sakeName}</Text> or similar sake.
              Call ahead to confirm availability.
            </Text>
          </View>

          <View className="px-5">
            {retailers.map((retailer, index) => (
              <View
                key={`${retailer.name}-${index}`}
                className="mb-4 rounded-2xl overflow-hidden"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <View className="p-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-3">
                      <Text className="font-semibold text-lg" style={{ color: colors.text }}>
                        {retailer.name}
                      </Text>
                      {retailer.specialization && (
                        <View
                          className="mt-2 px-2 py-1 rounded-full self-start"
                          style={{ backgroundColor: colors.primaryLight }}
                        >
                          <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                            {retailer.specialization}
                          </Text>
                        </View>
                      )}
                    </View>
                    {retailer.distance && (
                      <View className="px-3 py-1 rounded-full" style={{ backgroundColor: colors.surfaceSecondary }}>
                        <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                          {retailer.distance}
                        </Text>
                      </View>
                    )}
                  </View>

                  {retailer.description && (
                    <Text className="text-sm leading-5 mb-3" style={{ color: colors.textSecondary }}>
                      {retailer.description}
                    </Text>
                  )}

                  <View className="flex-row items-start mb-2">
                    <MapPin size={16} color={colors.textSecondary} style={{ marginTop: 2, marginRight: 8 }} />
                    <Text className="flex-1 text-sm" style={{ color: colors.text }}>
                      {retailer.address}
                    </Text>
                  </View>

                  {retailer.phone && (
                    <View className="flex-row items-center mb-2">
                      <Phone size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <Text className="text-sm" style={{ color: colors.text }}>
                        {retailer.phone}
                      </Text>
                    </View>
                  )}

                  {retailer.website && (
                    <View className="flex-row items-center">
                      <ExternalLink size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <Text className="text-sm flex-1" style={{ color: colors.text }} numberOfLines={1}>
                        {retailer.website}
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row border-t" style={{ borderTopColor: colors.border }}>
                  <Pressable
                    onPress={() => handleOpenMaps(retailer)}
                    className="flex-1 flex-row items-center justify-center py-4 border-r"
                    style={{ borderRightColor: colors.border }}
                  >
                    <Navigation size={18} color={colors.primary} />
                    <Text className="font-semibold ml-2" style={{ color: colors.primary }}>
                      Directions
                    </Text>
                  </Pressable>

                  {retailer.phone && (
                    <Pressable
                      onPress={() => handleCall(retailer.phone!)}
                      className="flex-1 flex-row items-center justify-center py-4"
                    >
                      <Phone size={18} color={colors.primary} />
                      <Text className="font-semibold ml-2" style={{ color: colors.primary }}>
                        Call
                      </Text>
                    </Pressable>
                  )}

                  {retailer.website && !retailer.phone && (
                    <Pressable
                      onPress={() => handleWebsite(retailer.website!)}
                      className="flex-1 flex-row items-center justify-center py-4"
                    >
                      <ExternalLink size={18} color={colors.primary} />
                      <Text className="font-semibold ml-2" style={{ color: colors.primary }}>
                        Website
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View className="mx-5 mt-2 mb-4 p-4 rounded-xl" style={{ backgroundColor: colors.surfaceSecondary }}>
            <Text className="text-xs text-center leading-5" style={{ color: colors.textSecondary }}>
              Store data is sourced from Google Places.
              Call ahead to confirm sake availability before visiting.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
