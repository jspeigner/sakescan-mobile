import { View, Text } from 'react-native';

// This is a placeholder tab that's never actually shown
// The actual camera functionality is in /camera route
// This tab just provides the visual camera button in the tab bar
export default function ScanCameraTab() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>This screen should never be visible</Text>
    </View>
  );
}
