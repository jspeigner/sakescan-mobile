import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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
  try {
    scanFallback = params.sakeData ? (JSON.parse(params.sakeData) as ScanDisplaySake) : null;
  } catch {
    scanFallback = null;
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
    return <View className="flex-1 bg-white" />;
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
