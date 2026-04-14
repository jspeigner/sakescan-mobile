import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import UnmatchedScanScreen from '@/components/UnmatchedScanScreen';

export default function UnmatchedScan() {
  const params = useLocalSearchParams<{
    errorMessage?: string;
    imageUri?: string;
  }>();

  return (
    <View style={{ flex: 1 }}>
      <UnmatchedScanScreen
        errorMessage={params.errorMessage}
        imageUri={params.imageUri}
      />
    </View>
  );
}
