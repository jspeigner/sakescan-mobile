import { View, ActivityIndicator, Text, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import ScanResultScreen from '@/components/ScanResultScreen';
import { useSake } from '@/lib/supabase-hooks';
import { catalogSakeToScanInfo, type ScanDisplaySake } from '@/lib/sake-catalog';
import type { ScanCandidate } from '@/lib/openai-scan';

export default function ScanResult() {
  const params = useLocalSearchParams<{
    sakeData?: string;
    imageUri?: string;
    backImageUri?: string;
    sakeId?: string;
    candidates?: string;
    ambiguous?: string;
    correctedFrom?: string;
    rejectedSakeId?: string;
    rejectedName?: string;
    rejectedBrewery?: string;
    scanId?: string;
  }>();

  const catalogSakeId = params.sakeId?.trim() || undefined;
  const { data: catalogSake, isLoading: isCatalogLoading } = useSake(catalogSakeId);

  let scanFallback: ScanDisplaySake | null = null;
  let parseError = false;
  try {
    if (params.sakeData) {
      scanFallback = JSON.parse(params.sakeData) as ScanDisplaySake;
      if (!scanFallback?.name || !scanFallback?.brewery) {
        scanFallback = null;
        parseError = true;
      }
    }
  } catch {
    scanFallback = null;
    parseError = Boolean(params.sakeData);
  }

  let candidates: ScanCandidate[] = [];
  try {
    candidates = params.candidates ? (JSON.parse(params.candidates) as ScanCandidate[]) : [];
  } catch {
    candidates = [];
  }

  const ambiguous = params.ambiguous === '1' || params.ambiguous === 'true';
  const isCorrection = params.correctedFrom === '1' || params.correctedFrom === 'true';

  if (catalogSakeId && isCatalogLoading) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center">
        <ActivityIndicator size="large" color="#BC002D" />
      </View>
    );
  }

  // Prefer catalog details when available, but keep scan confidence/quality from the payload.
  const catalogInfo = catalogSake ? catalogSakeToScanInfo(catalogSake) : null;
  const sakeInfo: ScanDisplaySake | null = catalogInfo
    ? {
        ...catalogInfo,
        ...(scanFallback?.confidenceScore != null
          ? { confidenceScore: scanFallback.confidenceScore }
          : {}),
        ...(scanFallback?.scanQualityHint
          ? { scanQualityHint: scanFallback.scanQualityHint }
          : {}),
        ...(scanFallback?.qualityReasons
          ? { qualityReasons: scanFallback.qualityReasons }
          : {}),
      }
    : scanFallback;

  if (!sakeInfo) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center px-8">
        <Text
          style={{
            fontFamily: 'NotoSerifJP_600SemiBold',
            fontSize: 22,
            color: '#1a1a1a',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          Scan result unavailable
        </Text>
        <Text className="text-[#6B6B6B] text-center text-base mb-6 leading-6">
          {parseError
            ? 'This result could not be loaded (data may have been truncated). Please scan again.'
            : 'We could not load this scan. Please try scanning the label again.'}
        </Text>
        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/camera');
          }}
          className="flex-row items-center justify-center rounded-2xl px-6 py-4"
          style={{ backgroundColor: '#BC002D' }}
        >
          <Camera size={18} color="#FFFFFF" />
          <Text className="ml-2 text-white text-base font-semibold">Scan again</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          className="mt-4 py-3"
        >
          <Text className="text-[#6B6B6B] text-sm font-medium">Back to home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScanResultScreen
      sakeInfo={sakeInfo}
      imageUri={params.imageUri}
      backImageUri={params.backImageUri}
      catalogSakeId={catalogSake?.id ?? catalogSakeId}
      candidates={candidates}
      ambiguous={ambiguous}
      scanId={params.scanId?.trim() || undefined}
      isCorrection={isCorrection}
      rejectedSakeId={params.rejectedSakeId?.trim() || undefined}
      rejectedName={params.rejectedName}
      rejectedBrewery={params.rejectedBrewery}
    />
  );
}
