import { useState, useEffect } from 'react';
import {
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Share,
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
  GlassWater,
  ChevronRight,
  Check,
  X,
  Search,
  Camera,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useScanHistoryStore } from '@/lib/scan-history-store';
import { useCreateSake, useCreateScan, useSake } from '@/lib/supabase-hooks';
import { getCurrentUser } from '@/lib/supabase';
import { buildSakeShareMessage } from '@/lib/share-sake';
import { catalogSakeToScanInfo } from '@/lib/sake-catalog';
import { getFlavorTagTip } from '@/lib/sake-learn';
import { logScanConfirm, logScanWrong } from '@/lib/scan-feedback';
import type { ScanCandidate } from '@/lib/openai-scan';

interface ScanResultScreenProps {
  /** When set, scan history uses this catalog id instead of creating a duplicate sake row. */
  catalogSakeId?: string;
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
    confidenceScore?: number;
    scanQualityHint?: 'high' | 'medium' | 'low';
    qualityReasons?: string[];
  };
  imageUri?: string;
  candidates?: ScanCandidate[];
  ambiguous?: boolean;
}

export default function ScanResultScreen({
  sakeInfo: initialSakeInfo,
  imageUri,
  catalogSakeId: initialCatalogId,
  candidates: initialCandidates = [],
  ambiguous = false,
}: ScanResultScreenProps) {
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);
  const [catalogSakeId, setCatalogSakeId] = useState<string | undefined>(initialCatalogId);
  const [sakeInfo, setSakeInfo] = useState(initialSakeInfo);
  const [candidates] = useState<ScanCandidate[]>(initialCandidates);
  const [confirmed, setConfirmed] = useState(false);
  const [showWrongPicker, setShowWrongPicker] = useState(ambiguous && initialCandidates.length > 1);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const addScan = useScanHistoryStore((s) => s.addScan);

  const { data: pendingCandidateSake } = useSake(pendingCandidateId ?? undefined);

  const heroOpacity = useSharedValue(0);
  const contentY = useSharedValue(32);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
    contentY.value = withDelay(200, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 450 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingCandidateSake || !pendingCandidateId) return;
    const mapped = catalogSakeToScanInfo(pendingCandidateSake);
    setSakeInfo({
      ...mapped,
      confidenceScore: sakeInfo.confidenceScore,
      scanQualityHint: sakeInfo.scanQualityHint,
      qualityReasons: sakeInfo.qualityReasons,
    });
    setCatalogSakeId(pendingCandidateId);
    setPendingCandidateId(null);
    setShowWrongPicker(false);
    setConfirmed(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCandidateSake, pendingCandidateId]);

  const heroStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  const createSake = useCreateSake();
  const createScan = useCreateScan();
  const qualityTone =
    sakeInfo.scanQualityHint === 'high'
      ? { bg: '#EAF9EE', border: '#B7E6C2', text: '#1F7A3C' }
      : sakeInfo.scanQualityHint === 'medium'
        ? { bg: '#FFF6E8', border: '#F3D7A6', text: '#9B6A19' }
        : { bg: '#FDECEC', border: '#F2B8B5', text: '#A0352F' };

  const isLowQuality = sakeInfo.scanQualityHint === 'low';

  useEffect(() => {
    const saveScan = async () => {
      try {
        await addScan({ sakeInfo: initialSakeInfo, imageUri });
        console.log('✅ Scan saved to local history:', initialSakeInfo.name);

        setIsSaving(true);
        const user = await getCurrentUser();

        if (!user) {
          console.log('⚠️ No user logged in, skipping Supabase save');
          setIsSaving(false);
          return;
        }

        let sakeId = initialCatalogId;

        if (!sakeId) {
          console.log('💾 Saving sake to Supabase:', initialSakeInfo.name);
          const sakeResult = await createSake.mutateAsync({
            name: initialSakeInfo.name,
            nameJapanese: initialSakeInfo.nameJapanese,
            brewery: initialSakeInfo.brewery,
            type: initialSakeInfo.type,
            subtype: initialSakeInfo.subtype,
            prefecture: initialSakeInfo.prefecture,
            region: initialSakeInfo.region,
            description: initialSakeInfo.description,
            riceVariety: initialSakeInfo.riceVariety,
            polishingRatio: initialSakeInfo.polishingRatio,
            alcoholPercentage: initialSakeInfo.alcoholPercentage,
            tastingNotes: initialSakeInfo.tastingNotes,
            foodPairings: initialSakeInfo.foodPairings,
            flavorProfile: initialSakeInfo.flavorProfile,
            servingTemperature: initialSakeInfo.servingTemperature,
            imageUrl: imageUri,
          });
          sakeId = sakeResult.id;
          if (sakeResult.isNew) {
            console.log('🎉 New sake added to global database!');
          }
          setCatalogSakeId(sakeId);
        } else {
          console.log('📚 Using catalog sake id:', sakeId);
        }

        if (!sakeId) {
          setIsSaving(false);
          return;
        }

        console.log('✅ Sake saved to Supabase with ID:', sakeId);

        await createScan.mutateAsync({
          userId: user.id,
          sakeId,
          imageUrl: imageUri,
          ocrRawText: JSON.stringify(initialSakeInfo),
        });

        console.log('✅ Scan record saved to Supabase');
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
    const tastingLine =
      sakeInfo.tastingNotes?.trim() ||
      sakeInfo.flavorProfile?.slice(0, 3).join(', ') ||
      sakeInfo.description?.trim()?.slice(0, 120) ||
      undefined;
    try {
      await Share.share({
        message: buildSakeShareMessage({
          name: sakeInfo.name,
          tastingLine,
          sakeId: catalogSakeId,
        }),
        title: sakeInfo.name,
      });
    } catch {
      // User cancelled or share failed
    }
  };

  const handleOpenFullPage = async () => {
    if (!catalogSakeId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/sake/${catalogSakeId}`);
  };

  const handleConfirm = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await logScanConfirm({
      sakeId: catalogSakeId,
      name: sakeInfo.name,
      brewery: sakeInfo.brewery,
    });
    setConfirmed(true);
    setShowWrongPicker(false);
  };

  const handleWrongSake = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logScanWrong({
      sakeId: catalogSakeId,
      name: sakeInfo.name,
      brewery: sakeInfo.brewery,
    });
    if (candidates.length > 1) {
      setShowWrongPicker(true);
      setConfirmed(false);
      return;
    }
    router.push({
      pathname: '/search-results',
      params: { query: sakeInfo.name },
    });
  };

  const handlePickCandidate = async (candidate: ScanCandidate) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingCandidateId(candidate.id);
  };

  const handleSearchInstead = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/search-results',
      params: { query: sakeInfo.name },
    });
  };

  const handleRetake = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/camera');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAF8' }}>
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
        <Animated.View style={[{ width: '100%', overflow: 'hidden', height: 420, backgroundColor: '#E8D5B0' }, heroStyle]}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <GlassWater size={80} color="#C9A227" />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(250,250,248,0.6)', '#FAFAF8']}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 }}
          />
        </Animated.View>

        <Animated.View style={[{ paddingHorizontal: 20, paddingTop: 4 }, contentStyle]}>
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

          <Text className="text-[#6B6B6B] text-base mb-6">
            {sakeInfo.brewery}
            {(sakeInfo.prefecture || sakeInfo.region) && ' • '}
            {sakeInfo.prefecture || sakeInfo.region}
          </Text>

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

          {catalogSakeId ? (
            <Pressable
              onPress={handleOpenFullPage}
              className="mb-6 flex-row items-center justify-between rounded-2xl px-4 py-4"
              style={{ backgroundColor: '#BC002D' }}
            >
              <View className="flex-1 pr-3">
                <Text className="text-white text-base font-semibold">
                  Open full sake page
                </Text>
                <Text className="text-white/80 text-sm mt-0.5">
                  Ratings, reviews, and where to buy
                </Text>
              </View>
              <ChevronRight size={22} color="#FFFFFF" />
            </Pressable>
          ) : null}

          {(sakeInfo.scanQualityHint || sakeInfo.confidenceScore != null) && (
            <View
              className="mb-6 rounded-2xl px-4 py-3"
              style={{
                backgroundColor: qualityTone.bg,
                borderWidth: 1,
                borderColor: qualityTone.border,
              }}
            >
              <Text style={{ color: qualityTone.text, fontSize: 13, fontWeight: '700' }}>
                Scan quality: {sakeInfo.scanQualityHint ?? 'unknown'}
                {sakeInfo.confidenceScore != null ? ` (${sakeInfo.confidenceScore}%)` : ''}
              </Text>
              {sakeInfo.scanQualityHint !== 'high' && (
                <Text className="mt-1 text-sm text-[#6B6B6B]">
                  {isLowQuality
                    ? 'Fill the frame with the front label, avoid glare, and hold steady in good light.'
                    : 'If details look off, retake a closer photo with better lighting.'}
                </Text>
              )}
              {sakeInfo.qualityReasons && sakeInfo.qualityReasons.length > 0 && (
                <Text className="mt-1 text-xs text-[#7B7B7B]">
                  Missing details: {sakeInfo.qualityReasons.join(' • ')}
                </Text>
              )}
              {isLowQuality && (
                <Pressable
                  onPress={handleRetake}
                  className="mt-3 flex-row items-center justify-center rounded-xl py-3"
                  style={{ backgroundColor: '#BC002D' }}
                >
                  <Camera size={16} color="#FFFFFF" />
                  <Text className="ml-2 text-white text-sm font-semibold">Retake photo</Text>
                </Pressable>
              )}
            </View>
          )}

          <View
            className="mb-6 rounded-2xl px-4 py-4"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E4D9' }}
          >
            <Text className="text-[#1a1a1a] text-base font-semibold mb-1">
              Is this the right bottle?
            </Text>
            <Text className="text-[#6B6B6B] text-sm mb-3">
              Confirm to improve future matches, or pick another sake.
            </Text>
            {confirmed ? (
              <View className="flex-row items-center rounded-xl px-3 py-3" style={{ backgroundColor: '#EAF9EE' }}>
                <Check size={18} color="#1F7A3C" />
                <Text className="ml-2 text-sm font-semibold" style={{ color: '#1F7A3C' }}>
                  Thanks — match confirmed
                </Text>
              </View>
            ) : (
              <View className="flex-row gap-2">
                <Pressable
                  onPress={handleConfirm}
                  className="flex-1 flex-row items-center justify-center rounded-xl py-3"
                  style={{ backgroundColor: '#1F7A3C' }}
                >
                  <Check size={16} color="#FFFFFF" />
                  <Text className="ml-2 text-white text-sm font-semibold">Confirm</Text>
                </Pressable>
                <Pressable
                  onPress={handleWrongSake}
                  className="flex-1 flex-row items-center justify-center rounded-xl py-3"
                  style={{ backgroundColor: '#F5F3EE' }}
                >
                  <X size={16} color="#A0352F" />
                  <Text className="ml-2 text-sm font-semibold" style={{ color: '#A0352F' }}>
                    Wrong sake
                  </Text>
                </Pressable>
              </View>
            )}
            <Pressable
              onPress={handleSearchInstead}
              className="mt-3 flex-row items-center justify-center py-2"
            >
              <Search size={14} color="#6B6B6B" />
              <Text className="ml-1.5 text-sm text-[#6B6B6B]">Search or edit match</Text>
            </Pressable>
          </View>

          {showWrongPicker && candidates.length > 0 && (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                Did you mean?
              </Text>
              {candidates.map((candidate) => {
                const isActive = candidate.id === catalogSakeId;
                return (
                  <Pressable
                    key={candidate.id}
                    onPress={() => handlePickCandidate(candidate)}
                    className="mb-2 flex-row items-center rounded-2xl px-4 py-3"
                    style={{
                      backgroundColor: isActive ? '#FFF1F3' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: isActive ? '#BC002D' : '#E8E4D9',
                    }}
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-[#1a1a1a] text-base font-semibold">{candidate.name}</Text>
                      <Text className="text-[#6B6B6B] text-sm mt-0.5">
                        {candidate.brewery}
                        {candidate.type ? ` • ${candidate.type}` : ''}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </Pressable>
                );
              })}
            </View>
          )}

          <View className="flex-row mb-6">
            {sakeInfo.alcoholPercentage ? (
              <View className="flex-1 mr-3">
                <Text className="text-[#9CA3AF] text-xs font-medium mb-2 uppercase tracking-wide">
                  ABV
                </Text>
                <Text className="text-[#1a1a1a] text-xl font-bold">
                  {sakeInfo.alcoholPercentage}%
                </Text>
              </View>
            ) : null}
            {sakeInfo.riceVariety ? (
              <View className="flex-1">
                <Text className="text-[#9CA3AF] text-xs font-medium mb-2 uppercase tracking-wide">
                  Rice Type
                </Text>
                <Text className="text-[#1a1a1a] text-xl font-bold">
                  {sakeInfo.riceVariety}
                </Text>
              </View>
            ) : null}
          </View>

          {sakeInfo.polishingRatio ? (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-2 uppercase tracking-wide">
                Polishing Ratio
              </Text>
              <Text className="text-[#1a1a1a] text-xl font-bold">
                {sakeInfo.polishingRatio}%
              </Text>
            </View>
          ) : null}

          {sakeInfo.flavorProfile && sakeInfo.flavorProfile.length > 0 ? (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                Flavor Profile
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-3">
                {sakeInfo.flavorProfile.map((flavor, index) => (
                  <View
                    key={`flavor-${index}`}
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
              {sakeInfo.flavorProfile
                .map((tag) => {
                  const tip = getFlavorTagTip(tag);
                  return tip ? { tag, tip } : null;
                })
                .filter((item): item is { tag: string; tip: string } => item != null)
                .slice(0, 3)
                .map(({ tag, tip }) => (
                  <Text key={`tip-${tag}`} className="text-sm text-[#6B6B6B] leading-5 mb-1.5">
                    <Text className="font-semibold text-[#1a1a1a]">{tag}: </Text>
                    {tip}
                  </Text>
                ))}
            </View>
          ) : null}

          {sakeInfo.servingTemperature && sakeInfo.servingTemperature.length > 0 ? (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                Recommended Serving
              </Text>
              <View className="flex-row gap-3">
                {sakeInfo.servingTemperature.map((temp, index) => (
                  <View
                    key={`temp-${index}`}
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
          ) : null}

          {sakeInfo.description ? (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                About This Sake
              </Text>
              <Text className="text-[#1a1a1a] text-base leading-7">
                {sakeInfo.description}
              </Text>
            </View>
          ) : null}

          {sakeInfo.tastingNotes ? (
            <View className="mb-6">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                Tasting Notes
              </Text>
              <Text className="text-[#1a1a1a] text-base leading-7">
                {sakeInfo.tastingNotes}
              </Text>
            </View>
          ) : null}

          {sakeInfo.foodPairings && sakeInfo.foodPairings.length > 0 ? (
            <View className="mb-8">
              <Text className="text-[#9CA3AF] text-xs font-medium mb-3 uppercase tracking-wide">
                Food Pairings
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {sakeInfo.foodPairings.map((food, index) => (
                  <View
                    key={`food-${index}`}
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
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
