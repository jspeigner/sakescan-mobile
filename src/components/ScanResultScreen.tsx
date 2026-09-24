import { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Share,
  Modal,
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
import {
  useCreateSake,
  useCreateScan,
  useUpdateScan,
  useSake,
  persistSakeLabelImages,
} from '@/lib/supabase-hooks';
import { getCurrentUser } from '@/lib/supabase';
import { buildSakeShareMessage } from '@/lib/share-sake';
import { catalogSakeToScanInfo } from '@/lib/sake-catalog';
import { getFlavorTagTip } from '@/lib/sake-learn';
import { logScanConfirm, logScanWrong, logScanCorrection } from '@/lib/scan-feedback';
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
  backImageUri?: string;
  candidates?: ScanCandidate[];
  ambiguous?: boolean;
  /** Existing scan row to update after a back-label correction. */
  scanId?: string;
  /** True when this result came from a front+back correction pass. */
  isCorrection?: boolean;
  rejectedSakeId?: string;
  rejectedName?: string;
  rejectedBrewery?: string;
}

export default function ScanResultScreen({
  sakeInfo: initialSakeInfo,
  imageUri,
  backImageUri,
  catalogSakeId: initialCatalogId,
  candidates: initialCandidates = [],
  ambiguous = false,
  scanId: initialScanId,
  isCorrection = false,
  rejectedSakeId,
  rejectedName,
  rejectedBrewery,
}: ScanResultScreenProps) {
  const insets = useSafeAreaInsets();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [catalogSakeId, setCatalogSakeId] = useState<string | undefined>(initialCatalogId);
  const [sakeInfo, setSakeInfo] = useState(initialSakeInfo);
  const [candidates] = useState<ScanCandidate[]>(initialCandidates);
  const [confirmed, setConfirmed] = useState(false);
  const [showWrongPicker, setShowWrongPicker] = useState(ambiguous && initialCandidates.length > 1);
  const [showBackLabelPrompt, setShowBackLabelPrompt] = useState(false);
  const [pendingCandidateId, setPendingCandidateId] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | undefined>(initialScanId);
  const scanIdRef = useRef<string | undefined>(initialScanId);
  const isSavingRef = useRef(false);
  const addScan = useScanHistoryStore((s) => s.addScan);

  useEffect(() => {
    scanIdRef.current = scanId;
  }, [scanId]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  const { data: pendingCandidateSake } = useSake(pendingCandidateId ?? undefined);

  const heroOpacity = useSharedValue(0);
  const contentY = useSharedValue(32);
  const contentOpacity = useSharedValue(0);

  const createSake = useCreateSake();
  const createScan = useCreateScan();
  const updateScan = useUpdateScan();

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
    contentY.value = withDelay(200, withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }));
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 450 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingCandidateSake || !pendingCandidateId) return;
    const mapped = catalogSakeToScanInfo(pendingCandidateSake);
    const selectedId = pendingCandidateId;
    setSakeInfo({
      ...mapped,
      confidenceScore: sakeInfo.confidenceScore,
      scanQualityHint: sakeInfo.scanQualityHint,
      qualityReasons: sakeInfo.qualityReasons,
    });
    setCatalogSakeId(selectedId);
    setPendingCandidateId(null);
    setShowWrongPicker(false);
    setConfirmed(false);

    // Persist the chosen candidate onto the scan row so history matches the UI
    if (scanId) {
      void updateScan
        .mutateAsync({
          scanId,
          sakeId: selectedId,
          matched: true,
        })
        .catch((err) => {
          console.warn('Failed to update scan after candidate pick:', err);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCandidateSake, pendingCandidateId]);

  const heroStyle = useAnimatedStyle(() => ({ opacity: heroOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

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
        setSaveError(null);
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

        // Correction pass: update the original scan row when we have a scanId
        if (isCorrection && initialScanId) {
          const updated = await updateScan.mutateAsync({
            scanId: initialScanId,
            sakeId,
            imageUrl: imageUri,
            backImageUrl: backImageUri,
            ocrRawText: JSON.stringify(initialSakeInfo),
            matched: true,
          });
          setScanId((updated as { id?: string })?.id ?? initialScanId);
          console.log('✅ Scan record updated after correction');
        } else if (!isCorrection) {
          const created = await createScan.mutateAsync({
            userId: user.id,
            sakeId,
            imageUrl: imageUri,
            backImageUrl: backImageUri,
            ocrRawText: JSON.stringify(initialSakeInfo),
          });
          setScanId((created as { id?: string })?.id);
          console.log('✅ Scan record saved to Supabase');
        } else if (isCorrection && !initialScanId) {
          // Correction without prior scan row (e.g. guest later signed in) — create fresh
          const created = await createScan.mutateAsync({
            userId: user.id,
            sakeId,
            imageUrl: imageUri,
            backImageUrl: backImageUri,
            ocrRawText: JSON.stringify(initialSakeInfo),
          });
          setScanId((created as { id?: string })?.id);
          console.log('✅ Scan record created for correction (no prior scanId)');
        }
      } catch (error) {
        console.error('Failed to save scan:', error);
        setSaveError('Could not save this scan to your account. Check your connection and try again.');
      } finally {
        setIsSaving(false);
      }
    };
    saveScan();
  }, []); // Empty deps array ensures this runs only once

  const openBackLabelCamera = async () => {
    // Avoid racing the initial save — wait briefly so we can pass scanId for correction updates
    if (isSavingRef.current) {
      const started = Date.now();
      while (isSavingRef.current && Date.now() - started < 5000) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    setShowBackLabelPrompt(false);
    setShowWrongPicker(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const resolvedScanId = scanIdRef.current;
    router.push({
      pathname: '/camera',
      params: {
        mode: 'label',
        correction: '1',
        frontImageUri: imageUri || '',
        rejectedSakeId: catalogSakeId || rejectedSakeId || '',
        rejectedName: sakeInfo.name || rejectedName || '',
        rejectedBrewery: sakeInfo.brewery || rejectedBrewery || '',
        ...(resolvedScanId ? { scanId: resolvedScanId } : {}),
      },
    });
  };

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

    const user = await getCurrentUser();

    // Catalog writes (label images + correction trail) require sign-in
    if (isCorrection && !user) {
      router.push({
        pathname: '/account-gate',
        params: { reason: 'save-correction' },
      });
      return;
    }

    if (isCorrection && user) {
      let sakeId = catalogSakeId;
      if (!sakeId) {
        const created = await createSake.mutateAsync({
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
          tastingNotes: sakeInfo.tastingNotes,
          foodPairings: sakeInfo.foodPairings,
          flavorProfile: sakeInfo.flavorProfile,
          servingTemperature: sakeInfo.servingTemperature,
          imageUrl: imageUri,
        });
        sakeId = created.id;
        setCatalogSakeId(sakeId);
      }

      if (sakeId) {
        const uploaded = await persistSakeLabelImages({
          sakeId,
          userId: user.id,
          frontImageUri: imageUri,
          backImageUri,
          scanId,
        });

        if (scanId) {
          await updateScan.mutateAsync({
            scanId,
            sakeId,
            imageUrl: uploaded.frontPath ?? imageUri,
            backImageUrl: uploaded.backPath ?? backImageUri,
            matched: true,
          });
        }

        await logScanCorrection({
          rejectedSakeId: rejectedSakeId,
          rejectedName: rejectedName || 'Unknown',
          rejectedBrewery: rejectedBrewery || '',
          correctedSakeId: sakeId,
          correctedName: sakeInfo.name,
          correctedBrewery: sakeInfo.brewery,
          scanId,
          frontImageUrl: uploaded.frontPath ?? imageUri,
          backImageUrl: uploaded.backPath ?? backImageUri,
        });
      }
    } else {
      // Keep the scan row in sync when the user confirmed a different candidate
      if (user && scanId && catalogSakeId) {
        try {
          await updateScan.mutateAsync({
            scanId,
            sakeId: catalogSakeId,
            matched: true,
          });
        } catch (err) {
          console.warn('Failed to sync scan on confirm:', err);
        }
      }
      await logScanConfirm({
        sakeId: catalogSakeId,
        name: sakeInfo.name,
        brewery: sakeInfo.brewery,
        scanId,
        frontImageUrl: imageUri,
        backImageUrl: backImageUri,
      });
    }

    setConfirmed(true);
    setShowWrongPicker(false);
    setShowBackLabelPrompt(false);
  };

  const handleWrongSake = async () => {
    if (isSaving) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logScanWrong({
      sakeId: catalogSakeId,
      name: sakeInfo.name,
      brewery: sakeInfo.brewery,
      scanId: scanIdRef.current,
      frontImageUrl: imageUri,
    });
    if (candidates.length > 1) {
      setShowWrongPicker(true);
      setConfirmed(false);
      return;
    }
    setShowBackLabelPrompt(true);
    setConfirmed(false);
  };

  const handleNoneOfThese = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowWrongPicker(false);
    setShowBackLabelPrompt(true);
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
          {isCorrection ? (
            <View
              className="mb-4 self-start rounded-full px-3 py-1.5"
              style={{ backgroundColor: '#FFF1F3', borderWidth: 1, borderColor: '#F2B8B5' }}
            >
              <Text className="text-xs font-semibold" style={{ color: '#BC002D' }}>
                Updated with back label
              </Text>
            </View>
          ) : null}

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

          {saveError ? (
            <View
              className="mb-6 rounded-2xl px-4 py-3"
              style={{ backgroundColor: '#FDECEC', borderWidth: 1, borderColor: '#F2B8B5' }}
            >
              <Text style={{ color: '#A0352F', fontSize: 13, fontWeight: '600' }}>
                {saveError}
              </Text>
            </View>
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
              Confirm to improve future matches, or scan the back label for more detail.
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
                  disabled={isSaving}
                  className="flex-1 flex-row items-center justify-center rounded-xl py-3"
                  style={{ backgroundColor: '#F5F3EE', opacity: isSaving ? 0.5 : 1 }}
                >
                  <X size={16} color="#A0352F" />
                  <Text className="ml-2 text-sm font-semibold" style={{ color: '#A0352F' }}>
                    {isSaving ? 'Saving…' : 'Wrong sake'}
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
              <Pressable
                onPress={handleNoneOfThese}
                className="mt-2 flex-row items-center justify-center rounded-2xl px-4 py-3.5"
                style={{
                  backgroundColor: '#FFF1F3',
                  borderWidth: 1,
                  borderColor: '#F2B8B5',
                }}
              >
                <Camera size={16} color="#BC002D" />
                <Text className="ml-2 text-sm font-semibold" style={{ color: '#BC002D' }}>
                  None of these — scan back label
                </Text>
              </Pressable>
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

      <Modal
        visible={showBackLabelPrompt}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBackLabelPrompt(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
          onPress={() => setShowBackLabelPrompt(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FAFAF8',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 20,
              paddingBottom: insets.bottom + 24,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#E8E4D9',
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                fontFamily: 'NotoSerifJP_600SemiBold',
                fontSize: 22,
                color: '#1a1a1a',
                marginBottom: 8,
              }}
            >
              Scan the back label
            </Text>
            <Text style={{ fontSize: 15, color: '#6B6B6B', lineHeight: 22, marginBottom: 20 }}>
              Back labels often list rice, polishing ratio, and brewery details that pin down the
              exact bottle. We&apos;ll combine it with your front photo.
            </Text>
            <Pressable
              onPress={openBackLabelCamera}
              style={{
                backgroundColor: '#BC002D',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Camera size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                Open camera
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSearchInstead}
              style={{ marginTop: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#6B6B6B', fontSize: 15, fontWeight: '600' }}>
                Search by name instead
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
