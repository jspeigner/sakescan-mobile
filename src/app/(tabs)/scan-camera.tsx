import { View } from 'react-native';

/**
 * Middle tab uses a custom `tabBarButton` (opens /camera). This screen is a no-op placeholder.
 * Avoid Redirect / router.replace here — tab mount and focus timing differs on device vs Simulator
 * and can race with cold-start navigation (blank screen or stuck stack).
 */
export default function ScanCameraTab() {
  return <View style={{ flex: 1 }} />;
}
