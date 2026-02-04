import { Text, View, Pressable, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { Camera, Star, ScanLine, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { useUserScans, useSakeList } from '@/lib/supabase-hooks';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, session, isGuest } = useAuth();

  // Fetch user's recent scans from Supabase
  const { data: userScans, isLoading: scansLoading } = useUserScans(user?.id);

  // Fetch popular sake as fallback when no scans
  const { data: popularSake, isLoading: sakeLoading } = useSakeList({ limit: 5 });

  // Get recently scanned sake (matched only)
  const recentlyScanned = userScans
    ?.filter(scan => scan.matched && scan.sake)
    .slice(0, 5)
    .map(scan => ({
      id: scan.sake_id!,
      name: scan.sake?.name ?? 'Unknown',
      brewery: scan.sake?.brewery ?? 'Unknown',
      labelImageUrl: scan.sake?.label_image_url ?? 'https://images.unsplash.com/photo-1589464835340-c5c07fbe5b8e?w=600&h=800&fit=crop',
      avgRating: 0, // Would need to fetch from sake table
    })) ?? [];

  // Use popular sake if no scan history
  const displaySake = recentlyScanned.length > 0
    ? recentlyScanned
    : (popularSake?.data ?? []).slice(0, 5).map(sake => ({
        id: sake.id,
        name: sake.name,
        brewery: sake.brewery,
        labelImageUrl: sake.label_image_url ?? 'https://images.unsplash.com/photo-1589464835340-c5c07fbe5b8e?w=600&h=800&fit=crop',
        avgRating: sake.average_rating ?? 0,
      }));

  const handleScanPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check if user is signed in
    if (!session?.access_token || isGuest) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to use the scan feature. Please create an account or sign in from the Profile tab.',
        [
          { text: 'Go to Profile', onPress: () => router.push('/profile') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    router.push('/camera');
  };

  const handleSakePress = async (sakeId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/sake/${sakeId}`);
  };

  const isLoading = scansLoading || sakeLoading;

  return (
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4">
          <Text style={{ fontFamily: 'serif', fontSize: 28, fontWeight: '600', color: '#1a1a1a' }}>
            SakeScan
          </Text>
          <Pressable onPress={() => router.push('/profile')}>
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: '#F5EED9', borderWidth: 2, borderColor: '#F5F0E8' }}
            >
              <User size={20} color="#C9A227" />
            </View>
          </Pressable>
        </View>

        {/* Scan Button Area */}
        <View className="items-center px-5 pt-8 pb-6">
          <Pressable
            onPress={handleScanPress}
            className="active:scale-95"
            style={{
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: '#FAF8F3',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#E8E4D9',
              shadowColor: '#D4C9A8',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            <Camera size={42} color="#1a1a1a" strokeWidth={1.5} />
            <Text className="text-[#1a1a1a] text-sm font-semibold tracking-widest mt-4">
              SCAN LABEL
            </Text>
          </Pressable>
        </View>

        {/* Instructions */}
        <View className="px-8 pb-10">
          <Text className="text-center text-[#6B6B6B] text-base leading-6">
            Point your camera at any sake label to{'\n'}learn more about the brewery, profile, and{'\n'}pairings.
          </Text>
        </View>

        {/* Recently Scanned / Popular Section */}
        <View className="mt-4">
          <View className="flex-row items-center justify-between px-5 mb-4">
            <Text className="text-xl font-bold text-[#1a1a1a]">
              {recentlyScanned.length > 0 ? 'Recently Scanned' : 'Popular Sake'}
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/explore')}>
              <Text className="text-[#C9A227] font-semibold">
                See all
              </Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#C9A227" />
            </View>
          ) : displaySake.length === 0 ? (
            <View className="items-center py-10 px-5">
              <ScanLine size={48} color="#C9A227" />
              <Text className="text-[#1a1a1a] font-semibold text-lg mt-4">
                No scans yet
              </Text>
              <Text className="text-[#8B8B8B] text-center mt-2">
                Start scanning sake labels to build your history
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
              style={{ flexGrow: 0 }}
            >
              {displaySake.map((sake) => (
                <Pressable
                  key={sake.id}
                  onPress={() => handleSakePress(sake.id)}
                  className="active:scale-98"
                  style={{ width: 170 }}
                >
                  <View
                    className="rounded-2xl overflow-hidden mb-3"
                    style={{
                      backgroundColor: '#F5F3EE',
                      height: 200,
                    }}
                  >
                    <Image
                      source={{ uri: sake.labelImageUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                  <Text className="text-[#1a1a1a] font-bold text-base mb-1" numberOfLines={1}>
                    {sake.name}
                  </Text>
                  <Text className="text-[#8B8B8B] text-sm mb-2" numberOfLines={1}>
                    {sake.brewery}
                  </Text>
                  {sake.avgRating > 0 && (
                    <View className="flex-row items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          fill={star <= Math.floor(sake.avgRating) ? '#C9A227' : 'transparent'}
                          color="#C9A227"
                          strokeWidth={1.5}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
