import { useEffect } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ChevronLeft,
  Snowflake,
  Home,
  Flame,
  GlassWater,
  TrendingDown,
  TrendingUp,
  Minus,
  BookOpen,
  Sparkles,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/theme-context';
import type { MenuSakeItem } from '@/lib/openai-scan';

function parsePriceValue(price?: string): number | null {
  if (!price) return null;
  const match = price.match(/[\d,.]+/);
  return match ? parseFloat(match[0].replace(/,/g, '')) : null;
}

function getPriceCategory(
  value: number | null,
  allValues: (number | null)[]
): 'low' | 'mid' | 'high' | null {
  if (value === null) return null;
  const valid = allValues.filter((v): v is number => v !== null);
  if (valid.length < 2) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const third = Math.floor(sorted.length / 3);
  if (value <= sorted[third]) return 'low';
  if (value >= sorted[sorted.length - 1 - third]) return 'high';
  return 'mid';
}

const FLAVOR_COLORS: Record<string, string> = {
  Crisp: '#4ECDC4',
  Floral: '#E8A0BF',
  Smooth: '#C9A227',
  Fruity: '#FF6B6B',
  Dry: '#95A5A6',
  Rich: '#8B4513',
  Umami: '#2ECC71',
  Sweet: '#F39C12',
};

function ServingBadge({ temp }: { temp: string }) {
  const icon =
    temp === 'Chilled' ? (
      <Snowflake size={12} color="#4ECDC4" />
    ) : temp === 'Warm' ? (
      <Flame size={12} color="#E8745A" />
    ) : (
      <Home size={12} color="#C9A227" />
    );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(201, 162, 39, 0.08)',
      }}
    >
      {icon}
      <Text style={{ fontSize: 11, color: '#6B6B6B', fontWeight: '500' }}>{temp}</Text>
    </View>
  );
}

function SakeMenuCard({
  item,
  index,
  priceCategory,
  colors,
}: {
  item: MenuSakeItem;
  index: number;
  priceCategory: 'low' | 'mid' | 'high' | null;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const priceIcon =
    priceCategory === 'low' ? (
      <TrendingDown size={14} color="#2ECC71" />
    ) : priceCategory === 'high' ? (
      <TrendingUp size={14} color="#E74C3C" />
    ) : priceCategory === 'mid' ? (
      <Minus size={14} color="#C9A227" />
    ) : null;

  const priceBgColor =
    priceCategory === 'low'
      ? 'rgba(46, 204, 113, 0.1)'
      : priceCategory === 'high'
        ? 'rgba(231, 76, 60, 0.1)'
        : 'rgba(201, 162, 39, 0.1)';

  const priceLabelColor =
    priceCategory === 'low' ? '#2ECC71' : priceCategory === 'high' ? '#E74C3C' : '#C9A227';
  const recommendationColor =
    item.recommendationTier === 'Top Pick'
      ? '#2ECC71'
      : item.recommendationTier === 'Good Match'
        ? '#C9A227'
        : '#8B8B8B';

  return (
    <Animated.View
      entering={FadeIn.delay(index * 80)
        .duration(400)
        .easing(Easing.out(Easing.cubic))}
    >
      <Pressable
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          marginBottom: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.borderLight,
        }}
      >
        {/* Header: name + price */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: 20,
            paddingBottom: 12,
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            {item.recommendationTier && (
              <View
                style={{
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 10,
                  backgroundColor: `${recommendationColor}20`,
                  marginBottom: 8,
                }}
              >
                <Sparkles size={12} color={recommendationColor} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: recommendationColor }}>
                  {item.recommendationTier}
                  {item.recommendationScore != null ? ` • ${item.recommendationScore}` : ''}
                </Text>
              </View>
            )}
            <Text
              style={{
                fontFamily: 'NotoSerifJP_600SemiBold',
                fontSize: 20,
                color: colors.text,
                marginBottom: 2,
              }}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            {item.nameJapanese && (
              <Text style={{ fontSize: 14, color: colors.textTertiary, marginTop: 2 }}>
                {item.nameJapanese}
              </Text>
            )}
            {item.brewery && (
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                {item.brewery}
              </Text>
            )}
          </View>

          {item.price && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: colors.text,
                  letterSpacing: -0.5,
                }}
              >
                {item.price}
              </Text>
              {item.size && (
                <Text
                  style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}
                >
                  {item.size}
                </Text>
              )}
              {priceCategory && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 10,
                    backgroundColor: priceBgColor,
                  }}
                >
                  {priceIcon}
                  <Text style={{ fontSize: 11, fontWeight: '600', color: priceLabelColor }}>
                    {item.valueLabel ??
                      (priceCategory === 'low'
                        ? 'Great Value'
                        : priceCategory === 'high'
                          ? 'Premium'
                          : 'Mid-Range')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Type + specs row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
        >
          {item.type && (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
                backgroundColor: colors.primary,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                {item.type}
              </Text>
            </View>
          )}
          {item.alcoholPercentage != null && (
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              {item.alcoholPercentage}% ABV
            </Text>
          )}
          {item.polishingRatio != null && (
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              {item.polishingRatio}% RPR
            </Text>
          )}
        </View>

        {/* Flavor chips */}
        {item.flavorProfile && item.flavorProfile.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
              paddingHorizontal: 20,
              paddingBottom: 14,
            }}
          >
            {item.flavorProfile.map((flavor, idx) => {
              const bg = FLAVOR_COLORS[flavor] ?? '#C9A227';
              return (
                <View
                  key={`${flavor}-${idx}`}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 10,
                    backgroundColor: `${bg}18`,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: bg }}>{flavor}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Serving temps */}
        {item.servingTemperature && item.servingTemperature.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              gap: 6,
              paddingHorizontal: 20,
              paddingBottom: 14,
            }}
          >
            {item.servingTemperature.map((temp, idx) => (
              <ServingBadge key={`${temp}-${idx}`} temp={temp} />
            ))}
          </View>
        )}

        {item.recommendationReasons && item.recommendationReasons.length > 0 && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 14,
            }}
          >
            {item.recommendationReasons.slice(0, 2).map((reason, idx) => (
              <Text
                key={`${reason}-${idx}`}
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  lineHeight: 18,
                }}
              >
                • {reason}
              </Text>
            ))}
          </View>
        )}

        {/* Description */}
        {item.description && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 20,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
              paddingTop: 14,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                lineHeight: 21,
                color: colors.textSecondary,
              }}
            >
              {item.description}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function MenuResultsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ menuData: string }>();

  const headerOpacity = useSharedValue(0);
  const countScale = useSharedValue(0.6);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 350 });
    countScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 120 }));
  }, [headerOpacity, countScale]);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));
  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
    opacity: countScale.value,
  }));

  let sakes: MenuSakeItem[] = [];
  try {
    sakes = params.menuData ? JSON.parse(params.menuData) : [];
  } catch {
    sakes = [];
  }

  const priceValues = sakes.map((s) => parsePriceValue(s.price));
  const rankedSakes = [...sakes].sort(
    (a, b) => (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0)
  );
  const topPicks = rankedSakes.filter((item) => item.recommendationTier === 'Top Pick').slice(0, 3);

  if (sakes.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <GlassWater size={56} color={colors.primary} />
        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: colors.text,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          No Sake Found
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: colors.textSecondary,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          We couldn't identify any sake on this menu. Try taking a clearer photo.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 24,
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderRadius: 24,
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const typeBreakdown = sakes.reduce(
    (acc, s) => {
      const t = s.type ?? 'Other';
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const priceRange = (() => {
    const valid = priceValues.filter((v): v is number => v !== null);
    if (valid.length < 2) return null;
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const currency = sakes.find((s) => s.price)?.price?.match(/[^\d.,\s]+/)?.[0] ?? '$';
    return { min, max, currency };
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Fixed header */}
      <Animated.View
        style={[
          {
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: 12,
            backgroundColor: colors.background,
            zIndex: 10,
          },
          headerStyle,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>

          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'NotoSerifJP_600SemiBold',
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
              }}
            >
              Menu Results
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
      >
        {/* Summary banner */}
        <Animated.View style={countStyle}>
          <LinearGradient
            colors={[`${colors.brandRed}15`, `${colors.primary}10`, colors.surfaceSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.borderLight,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text
                    style={{
                      fontSize: 40,
                      fontWeight: '800',
                      color: colors.brandRed,
                      letterSpacing: -1,
                    }}
                  >
                    {sakes.length}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                    sake{sakes.length !== 1 ? 's' : ''} found
                  </Text>
                </View>

                {priceRange && (
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                    {priceRange.currency}
                    {priceRange.min} – {priceRange.currency}
                    {priceRange.max}
                  </Text>
                )}
              </View>

              <BookOpen size={36} color={colors.primary} strokeWidth={1.2} />
            </View>

            {/* Type breakdown pills */}
            {Object.keys(typeBreakdown).length > 1 && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 14,
                }}
              >
                {Object.entries(typeBreakdown).map(([type, count]) => (
                  <View
                    key={type}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 10,
                      backgroundColor: `${colors.primary}20`,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                      {type} ({count})
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {topPicks.length > 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.borderLight,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: colors.text,
                marginBottom: 6,
              }}
            >
              Top picks for your taste and budget
            </Text>
            {topPicks.map((item, idx) => (
              <Text key={`${item.name}-top-${idx}`} style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}>
                {idx + 1}. {item.name} {item.price ? `(${item.price})` : ''} {item.recommendationScore != null ? `- score ${item.recommendationScore}` : ''}
              </Text>
            ))}
          </View>
        )}

        {/* Sake cards */}
        {rankedSakes.map((item, index) => (
          <SakeMenuCard
            key={`${item.name}-${index}`}
            item={item}
            index={index}
            priceCategory={getPriceCategory(parsePriceValue(item.price), priceValues)}
            colors={colors}
          />
        ))}
      </ScrollView>
    </View>
  );
}
