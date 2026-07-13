import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import UnmatchedScanScreen from '@/components/UnmatchedScanScreen';
import type { ScanCandidate } from '@/lib/openai-scan';

export default function UnmatchedScan() {
  const params = useLocalSearchParams<{
    errorMessage?: string;
    imageUri?: string;
    sakeData?: string;
    candidates?: string;
  }>();

  let candidates: ScanCandidate[] = [];
  try {
    candidates = params.candidates ? (JSON.parse(params.candidates) as ScanCandidate[]) : [];
  } catch {
    candidates = [];
  }

  return (
    <View style={{ flex: 1 }}>
      <UnmatchedScanScreen
        errorMessage={params.errorMessage}
        imageUri={params.imageUri}
        sakeData={params.sakeData}
        candidates={candidates}
      />
    </View>
  );
}
