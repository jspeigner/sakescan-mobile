import { useEffect } from 'react';
import { Text, View, ScrollView, Pressable, Image } from 'react-native';
import { router, Stack } from 'expo-router';
import { ChevronLeft, GlassWater, Trash2, Clock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useScanHistoryStore } from '@/lib/scan-history-store';

export default function ScanHistoryScreen() {
  const insets = useSafeAreaInsets();
  const scans = useScanHistoryStore((s) => s.scans);
  const loadHistory = useScanHistoryStore((s) => s.loadHistory);
  const removeScan = useScanHistoryStore((s) => s.removeScan);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleScanPress = async (scan: typeof scans[0]) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/scan-result',
      params: {
        sakeData: JSON.stringify(scan.sakeInfo),
        imageUri: scan.imageUri || '',
      },
    });
  };

  const handleRemove = async (id: string, e: any) => {
    e.stopPropagation();
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await removeScan(id);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Scan History',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="ml-2">
              <ChevronLeft size={24} color="#1a1a1a" />
            </Pressable>
          ),
          headerStyle: {
            backgroundColor: '#FAFAF8',
          },
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {scans.length === 0 ? (
            <View className="items-center justify-center py-20 px-5">
              <Clock size={64} color="#C9A227" />
              <Text className="text-[#1a1a1a] font-semibold text-lg mt-4">
                No Scans Yet
              </Text>
              <Text className="text-[#8B8B8B] text-center mt-2">
                Scanned sake will appear here. Start scanning to build your discovery database!
              </Text>
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/camera');
                }}
                className="mt-6 px-6 py-3 rounded-full"
                style={{ backgroundColor: '#C9A227' }}
              >
                <Text className="text-white font-semibold">Start Scanning</Text>
              </Pressable>
            </View>
          ) : (
            <View className="px-5 pt-4">
              <Text className="text-[#8B8B8B] text-sm mb-4">
                {scans.length} {scans.length === 1 ? 'scan' : 'scans'} total
              </Text>
              {scans.map((scan) => (
                <Pressable
                  key={scan.id}
                  onPress={() => handleScanPress(scan)}
                  className="flex-row mb-3 active:scale-98"
                >
                  <View
                    className="flex-row flex-1 items-center p-3 rounded-2xl"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: '#F0EDE5',
                    }}
                  >
                    <View
                      className="w-20 h-20 rounded-xl overflow-hidden"
                      style={{ backgroundColor: '#F5EED9' }}
                    >
                      {scan.imageUri ? (
                        <Image
                          source={{ uri: scan.imageUri }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <GlassWater size={32} color="#C9A227" />
                        </View>
                      )}
                    </View>
                    <View className="flex-1 ml-3">
                      <Text
                        className="text-[#1a1a1a] font-bold text-base"
                        numberOfLines={1}
                      >
                        {scan.sakeInfo.name}
                      </Text>
                      <Text className="text-[#8B8B8B] text-sm" numberOfLines={1}>
                        {scan.sakeInfo.brewery}
                      </Text>
                      <Text className="text-[#C9A227] text-xs mt-1">
                        {formatDate(scan.timestamp)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={(e) => handleRemove(scan.id, e)}
                      className="w-10 h-10 items-center justify-center ml-2"
                    >
                      <Trash2 size={18} color="#8B8B8B" />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}
