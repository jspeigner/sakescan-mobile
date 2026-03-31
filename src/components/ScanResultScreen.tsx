import { useState, useEffect } from 'react';
import {
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Share2,
  Snowflake,
  Home,
  Flame,
  Wine,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useScanHistoryStore } from '@/lib/scan-history-store';
import { useCreateSake, useCreateScan } from '@/lib/supabase-hooks';
import { getCurrentUser } from '@/lib/supabase';

const { width } = Dimensions.get('window');

interface ScanResultScreenProps {
  sakeInfo: {
    name: string;
    nameJapanese?: string;
    brewery: string;
    type: string;
    subtype?: string;
    prefecture?: string;
    region?: string;
    description: string;
    tastingNotes?: string;
    foodPairings?: string[];
    riceVariety?: string;
    polishingRatio?: number;
    alcoholPercentage?: number;
    flavorProfile?: string[];
    servingTemperature?: string[];
  };
  imageUri?: string;
}

export default function ScanResultScreen({ sakeInfo, imageUri }: ScanResultScreenProps) {
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);
  const addScan = useScanHistoryStore((s) => s.addScan);

  // Entrance animations — component-level only, no Stack animation prop involved
  const heroOpacity = useSharedValue(0);
  const contentY = useSharedValue(32);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
    contentY.value = withDelay(200, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 450 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const heroStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  const createSake = useCreateSake();
  const createScan = useCreateScan();

  // Save scan to history AND Supabase when component mounts
  useEffect(() => {
    const saveScan = async () => {
      try {
        // Save to local history first (instant feedback)
        await addScan({ sakeInfo, imageUri });
        console.log('✅ Scan saved to local history:', sakeInfo.name);

        // Then save to Supabase for global discovery
        setIsSaving(true);
        const user = await getCurrentUser();

        if (!user) {
          console.log('⚠️ No user logged in, skipping Supabase save');
          setIsSaving(false);
          return;
        }

        console.log('💾 Saving sake to Supabase:', sakeInfo.name);

        // Create or get existing sake
        const sakeResult = await createSake.mutateAsync({
          name: sakeInfo.name,
          nameJapanese: sakeInfo.nameJapanese,
          brewery: sakeInfo.brewery,
          type: sakeInfo.type,
          subtype: sakeInfo.subtype,
          prefecture: sakeInfo.prefecture,
          region: sakeInfo.region,
          description: sakeInfo.description,
          riceVariety: sakeInfo.riceVariety,
          polishingRatio: sakeInfo.polishingRatio,
          alcoholPercentage: sakeInfo.alcoholPercentage,
          // Pass all OpenAI extracted data
          tastingNotes: sakeInfo.tastingNotes,
          foodPairings: sakeInfo.foodPairings,
          flavorProfile: sakeInfo.flavorProfile,
          servingTemperature: sakeInfo.servingTemperature,
          // Upload the captured label photo
          imageUrl: imageUri,
        });

        console.log('✅ Sake saved to Supabase with ID:', sakeResult.id);

        // Create scan record - stores complete OpenAI JSON in ocr_raw_text for full data preservation
        await createScan.mutateAsync({
          userId: user.id,
          sakeId: sakeResult.id,
          imageUrl: imageUri,
          ocrRawText: JSON.stringify(sakeInfo), // Full OpenAI response preserved here
        });

        console.log('✅ Scan record saved to Supabase');

        if (sakeResult.isNew) {
          console.log('🎉 New sake added to global database!');
        }

      } catch (error) {
        console.error('Failed to save scan:', error);
      } finally {
        setIsSaving(false);
      }
    };
    saveScan();
  }, []); // Empty deps array ensures this runs only once

  const handleShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
      {/* Floating header — sits over the hero */}
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: 'rgba(255,255,255,0.85)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isSaving && (
            <ActivityIndicator size="small" color="#C9A227" style={{ marginRight: 8 }} />
          )}
        </View>
        <Pressable
          onPress={handleShare}
          style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: 'rgba(255,255,255,0.85)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Share2 size={18} color="#1a1a1a" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Hero Image with gradient overlay */}
        <Animated.View style={[{ width: '100%', overflow: 'hidden', height: 420, backgroundColor: '#E8D5B0' }, heroStyle]}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Wine size={80} color="#C9A227" />
            </View>
          )}
          {/* Bottom gradient fade into page background */}
          <LinearGradient
            colors={['transparent', 'rgba(250,250,248,0.6)', '#FAFAF8']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 }}
          />
        </Animated.View>

        {/* Content — slides up on mount */}
        <Animated.View style={[{ paddingHorizontal: 20, paddingTop: 4 }, contentStyle]}>
          {/* Title Section */}
          <View className="mb-2">
            <Text
              className="text-[#1a1a1a]"
              style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 32, fontWeight: '600' }}
            >
              {sakeInfo.name}
            </Text>
            {sakeInfo.nameJapanese && (
              <Text className="text-[#6B6B6B] text-lg mt-1">
                {sakeInfo.nameJapanese}
              </Text>
            )}
          </View>

          {/* Brewery Info */}
          <Text className="text-[#6B6B6B] text-base mb-6">
            {sakeInfo.brewery}
            {(sakeInfo.prefecture || sakeInfo.region) && ' • '}
            {sakeInfo.prefecture || sakeInfo.region}
          </Text>

          {/* Type Badge */}
          <View className="flex-row mb-6">
            <View
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: '#C9A227' }}
            >
              <Text className="text-white text-sm font-semibold">
                {sakeInfo.type}
                {sakeInfo.subtype ? ` - ${sakeInfo.subtype}` : ''}
              </Text>
            </View>
          </View>

          {/* Specs Cards */}
          <View className="flex-row mb-6">
            {sakeInfo.alcoholPercentage && (
              <View className="flex-1 mr-3">
                <Text className="text-[#9CA3AF] text-xs font-medium mb-2 uppercase tracking-wide">
                  ABV
                </Text>
                <Text className="text-[#1a1a1a] text-xl font-bold">
                  {sakeInfo.alcoholPercentage}%
                </Text>
              </View>
            )}
            {sakeInfo.riceVariety && (
              <View className="flex-1">
                <Text className="text-[#9CA3AF] text-xs font-medium mb-2 uppercase tracking-wide">
                  Rice Type
                </Text>
                <Text className="text-[#1a1a1a] text-xl font-bold">
                  {sakeInfo.riceVariety}
                </Text>
              </View>
            )}
          </View>

          {sakeInfo.polishingRatio && (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-2 uppercase tracking-wide">
                Polishing Ratio
              </Text>
              <Text className="text-[#1a1a1a] text-xl font-bold">
                {sakeInfo.polishingRatio}%
              </Text>
            </View>
          )}

          {/* Flavor Profile */}
          {sakeInfo.flavorProfile && sakeInfo.flavorProfile.length > 0 && (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                Flavor Profile
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {sakeInfo.flavorProfile.map((flavor, index) => (
                  <View
                    key={flavor}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor: index === 0 ? '#C9A227' : '#F5F3EE',
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: index === 0 ? '#FFFFFF' : '#6B6B6B' }}
                    >
                      {flavor}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recommended Serving - Display Only */}
          {sakeInfo.servingTemperature && sakeInfo.servingTemperature.length > 0 && (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                Recommended Serving
              </Text>
              <View className="flex-row gap-3">
                {sakeInfo.servingTemperature.map((temp) => (
                  <View
                    key={temp}
                    className="flex-1 items-center py-4 rounded-2xl"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 2,
                      borderColor: '#E8E4D9',
                    }}
                  >
                    {temp === 'Chilled' ? (
                      <Snowflake size={24} color="#C9A227" />
                    ) : temp === 'Warm' ? (
                      <Flame size={24} color="#C9A227" />
                    ) : (
                      <Home size={24} color="#C9A227" />
                    )}
                    <Text className="mt-2 text-sm font-medium text-[#1a1a1a]">
                      {temp}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          {sakeInfo.description && (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                About This Sake
              </Text>
              <Text className="text-[#1a1a1a] text-base leading-7">
                {sakeInfo.description}
              </Text>
            </View>
          )}

          {/* Tasting Notes */}
          {sakeInfo.tastingNotes && (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                Tasting Notes
              </Text>
              <Text className="text-[#1a1a1a] text-base leading-7">
                {sakeInfo.tastingNotes}
              </Text>
            </View>
          )}

          {/* Food Pairings */}
          {sakeInfo.foodPairings && sakeInfo.foodPairings.length > 0 && (
            <View className="mb-8">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                Food Pairings
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {sakeInfo.foodPairings.map((food) => (
                  <View
                    key={food}
                    className="px-4 py-2 rounded-full"
                    style={{ backgroundColor: '#F5F3EE' }}
                  >
                    <Text className="text-sm text-[#6B6B6B]">
                      {food}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
