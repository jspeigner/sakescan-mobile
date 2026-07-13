import { Text, View, FlatList, Pressable, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, User } from 'lucide-react-native';
import { useFollowList, isSocialEnabled } from '@/lib/social-hooks';

export default function FollowListScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const userId = typeof id === 'string' ? id : id?.[0];
  const listMode = mode === 'followers' ? 'followers' : 'following';
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useFollowList(userId, listMode);

  if (!isSocialEnabled()) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center">
        <Text className="text-[#6B6B6B]">Social features are coming soon.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3 border-b border-[#F0EDE5]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#F0EDE5] items-center justify-center"
        >
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-[#1a1a1a] text-center mr-10 capitalize">
          {listMode}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#BC002D" />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(row) => row.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          ListEmptyComponent={
            <Text className="text-[#8B8B8B] text-center mt-12">
              {listMode === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/user/${item.id}`)}
              className="flex-row items-center mb-3 bg-white rounded-2xl p-3 border border-[#F0EDE5]"
            >
              {item.user?.avatar_url ? (
                <Image source={{ uri: item.user.avatar_url }} className="w-12 h-12 rounded-full" />
              ) : (
                <View className="w-12 h-12 rounded-full bg-[#F0EDE5] items-center justify-center">
                  <User size={20} color="#9CA3AF" />
                </View>
              )}
              <Text className="ml-3 text-[#1a1a1a] font-semibold flex-1" numberOfLines={1}>
                {item.user?.display_name ?? 'Sake fan'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
