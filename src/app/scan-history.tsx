import { useEffect, useState } from 'react';
import { Text, View, ScrollView, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { router, Stack } from 'expo-router';
import { ChevronLeft, GlassWater, Trash2, Clock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { useI18n } from '@/lib/i18n-context';
import { useScanHistoryStore } from '@/lib/scan-history-store';
import { useUserScans, useDeleteScan } from '@/lib/supabase-hooks';
import { resolveSakeImageUrl } from '@/lib/supabase';
import type { ScanWithSake } from '@/lib/database.types';

type DisplayScan = {
  id: string;
  name: string;
  brewery: string;
  imageUri: string | null;
  timestamp: string;
  sakeId: string | null;
  source: 'supabase' | 'local';
};

export default function ScanHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const localScans = useScanHistoryStore((s) => s.scans);
  const loadHistory = useScanHistoryStore((s) => s.loadHistory);
  const removeLocalScan = useScanHistoryStore((s) => s.removeScan);
  const { data: remoteScans, isLoading: remoteLoading } = useUserScans(user?.id);
  const deleteScan = useDeleteScan();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const displayScans: DisplayScan[] = user?.id
    ? (remoteScans ?? []).map((scan: ScanWithSake) => ({
        id: scan.id,
        name: scan.sake?.name ?? t('scanHistory.unknownSake'),
        brewery: scan.sake?.brewery ?? t('scanHistory.unknownBrewery'),
        imageUri:
<<<<<<< HEAD
          resolveSakeImageUrl(scan.scanned_image_url) ||
=======
          scan.scanned_image_url ||
>>>>>>> origin/main
          resolveSakeImageUrl(scan.sake?.image_url) ||
          null,
        timestamp: scan.created_at,
        sakeId: scan.sake_id,
        source: 'supabase' as const,
      }))
    : localScans.map((scan) => ({
        id: scan.id,
        name: scan.sakeInfo.name,
        brewery: scan.sakeInfo.brewery,
        imageUri: scan.imageUri || null,
        timestamp: scan.timestamp,
        sakeId: null,
        source: 'local' as const,
      }));

  const handleScanPress = async (scan: DisplayScan) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (scan.sakeId) {
      router.push(`/sake/${scan.sakeId}`);
      return;
    }
    const local = localScans.find((s) => s.id === scan.id);
    if (local) {
      router.push({
        pathname: '/scan-result',
        params: {
          sakeData: JSON.stringify(local.sakeInfo),
          imageUri: local.imageUri || '',
        },
      });
    }
  };

  const confirmRemove = (scan: DisplayScan) => {
    Alert.alert(
      t('scanHistory.deleteTitle'),
      t('scanHistory.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void handleRemove(scan);
          },
        },
      ],
    );
  };

  const handleRemove = async (scan: DisplayScan) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDeletingId(scan.id);
    try {
      if (scan.source === 'supabase' && user?.id) {
        await deleteScan.mutateAsync({ scanId: scan.id, userId: user.id });
      } else {
        await removeLocalScan(scan.id);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Failed to delete scan:', err);
      Alert.alert(t('common.error'), t('scanHistory.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('scanHistory.justNow');
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isLoading = !!user?.id && remoteLoading;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t('scanHistory.title'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="ml-2">
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            color: colors.text,
          },
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {isLoading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : displayScans.length === 0 ? (
            <View className="items-center justify-center py-20 px-5">
              <Clock size={64} color={colors.primary} />
              <Text className="font-semibold text-lg mt-4" style={{ color: colors.text }}>
                {t('scanHistory.emptyTitle')}
              </Text>
              <Text className="text-center mt-2" style={{ color: colors.textSecondary }}>
                {t('scanHistory.emptyBody')}
              </Text>
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/camera');
                }}
                className="mt-6 px-6 py-3 rounded-full"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-white font-semibold">{t('home.startScanning')}</Text>
              </Pressable>
            </View>
          ) : (
            <View className="px-5 pt-4">
              <Text className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                {displayScans.length}{' '}
                {displayScans.length === 1 ? t('scanHistory.scanSingular') : t('scanHistory.scanPlural')}
              </Text>
              {displayScans.map((scan) => (
                <Pressable
                  key={scan.id}
                  onPress={() => handleScanPress(scan)}
                  className="flex-row mb-3 active:scale-98"
                >
                  <View
                    className="flex-row flex-1 items-center p-3 rounded-2xl"
                    style={{
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View
                      className="w-20 h-20 rounded-xl overflow-hidden"
                      style={{ backgroundColor: colors.primaryLight }}
                    >
                      {scan.imageUri ? (
                        <Image
                          source={{ uri: scan.imageUri }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <GlassWater size={32} color={colors.primary} />
                        </View>
                      )}
                    </View>
                    <View className="flex-1 ml-3">
                      <Text
                        className="font-bold text-base"
                        numberOfLines={1}
                        style={{ color: colors.text }}
                      >
                        {scan.name}
                      </Text>
                      <Text
                        className="text-sm"
                        numberOfLines={1}
                        style={{ color: colors.textSecondary }}
                      >
                        {scan.brewery}
                      </Text>
                      <Text className="text-xs mt-1" style={{ color: colors.primary }}>
                        {formatDate(scan.timestamp)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        confirmRemove(scan);
                      }}
                      className="w-10 h-10 items-center justify-center ml-2 rounded-full"
                      style={{ backgroundColor: colors.redLight }}
                      disabled={deletingId === scan.id}
                    >
                      {deletingId === scan.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <Trash2 size={18} color={colors.error} />
                      )}
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
