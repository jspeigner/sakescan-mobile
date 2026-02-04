import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ScanResultScreen from '@/components/ScanResultScreen';

export default function ScanResult() {
  const params = useLocalSearchParams<{
    sakeData: string;
    imageUri?: string;
  }>();

  // Parse the sake data from URL params
  const sakeInfo = params.sakeData ? JSON.parse(params.sakeData) : null;

  if (!sakeInfo) {
    return <View className="flex-1 bg-white" />;
  }

  return <ScanResultScreen sakeInfo={sakeInfo} imageUri={params.imageUri} />;
}
