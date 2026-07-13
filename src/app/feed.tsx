import { useCallback } from 'react';
import {
  Text,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Users } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { ActivityFeedCard } from '@/components/ActivityFeedCard';
import {
  useHomeFeed,
  useSuggestedUsers,
  useFollow,
  isSocialEnabled,
  type FeedItem,
} from '@/lib/social-hooks';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useHomeFeed();
  const { data: suggested } = useSuggestedUsers(user?.id);
  const follow = useFollow();

  const items: FeedItem[] = data?.pages.flat() ?? [];

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!isSocialEnabled()) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center px-6">
        <Text className="text-[#6B6B6B] text-center">Social feed is coming soon.</Text>
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
        <Text className="flex-1 text-lg font-bold text-[#1a1a1a] text-center mr-10">Feed</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#BC002D" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ActivityFeedCard item={item} />}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 40 }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#BC002D" />
          }
          ListHeaderComponent={
            items.length === 0 ? (
              <View className="px-5 mb-6">
                <View className="items-center py-8">
                  <Users size={36} color="#C9A227" />
                  <Text
                    className="text-[#1a1a1a] text-xl mt-4 text-center"
                    style={{ fontFamily: 'NotoSerifJP_600SemiBold' }}
                  >
                    Follow tasters
                  </Text>
                  <Text className="text-[#6B6B6B] text-center mt-2 px-4">
                    See their scans, ratings, and saved sake here.
                  </Text>
                </View>
                {(suggested ?? []).length > 0 && (
                  <>
                    <Text className="text-xs font-semibold text-[#9CA3AF] tracking-wide mb-3">
                      PEOPLE TO FOLLOW
                    </Text>
                    {(suggested ?? []).map((u) => (
                      <View
                        key={u.id}
                        className="flex-row items-center mb-3 bg-white rounded-2xl p-3 border border-[#F0EDE5]"
                      >
                        <Pressable
                          className="flex-row items-center flex-1"
                          onPress={() => router.push(`/user/${u.id}`)}
                        >
                          {u.avatar_url ? (
                            <Image source={{ uri: u.avatar_url }} className="w-12 h-12 rounded-full" />
                          ) : (
                            <View className="w-12 h-12 rounded-full bg-[#F0EDE5]" />
                          )}
                          <View className="ml-3 flex-1">
                            <Text className="text-[#1a1a1a] font-semibold" numberOfLines={1}>
                              {u.display_name ?? 'Sake fan'}
                            </Text>
                            {!!u.bio && (
                              <Text className="text-[#6B6B6B] text-sm" numberOfLines={1}>
                                {u.bio}
                              </Text>
                            )}
                          </View>
                        </Pressable>
                        {!isGuest && user?.id && (
                          <Pressable
                            onPress={() =>
                              follow.mutate({ followerId: user.id, followingId: u.id })
                            }
                            className="px-4 py-2 rounded-full bg-[#BC002D]"
                          >
                            <Text className="text-white font-semibold text-sm">Follow</Text>
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </View>
            ) : null
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator color="#BC002D" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
