import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ScanResultScreen from '@/components/ScanResultScreen';
import { useSake } from '@/lib/supabase-hooks';
import { catalogSakeToScanInfo } from '@/lib/sake-catalog';

export default function ScanResult() {
  const params = useLocalSearchParams<{
    sakeData?: string;
    imageUri?: string;
    sakeId?: string;
  }>();

  const catalogSakeId = params.sakeId?.trim() || undefined;
  const { data: catalogSake, isLoading: isCatalogLoading } = useSake(catalogSakeId);

  let scanFallback = null;
  try {
    scanFallback = params.sakeData ? JSON.parse(params.sakeData) : null;
  } catch {
    scanFallback = null;
  }

  if (catalogSakeId && isCatalogLoading) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center">
        <ActivityIndicator size="large" color="#BC002D" />
      </View>
    );
  }

  const sakeInfo = catalogSake ? catalogSakeToScanInfo(catalogSake) : scanFallback;

  if (!sakeInfo) {
    return <View className="flex-1 bg-white" />;
  }

  return (
    <ScanResultScreen
      sakeInfo={sakeInfo}
      imageUri={params.imageUri}
      catalogSakeId={catalogSake?.id ?? catalogSakeId}
    />
  );
}
