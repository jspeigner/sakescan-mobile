import { useEffect } from 'react';
import { Text, View, FlatList, Pressable, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, User } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import {
  useNotifications,
  useMarkNotificationsRead,
  isSocialEnabled,
} from '@/lib/social-hooks';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const { data, isLoading } = useNotifications(user?.id);
  const markRead = useMarkNotificationsRead();

  useEffect(() => {
    if (user?.id && (data ?? []).some((n: { read_at: string | null }) => !n.read_at)) {
      void markRead.mutateAsync(user.id);
    }
  }, [user?.id, data]);

  if (!isSocialEnabled()) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center px-6">
        <Text className="text-[#6B6B6B]">Notifications are coming soon.</Text>
      </View>
    );
  }

  if (isGuest || !user) {
    return (
      <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#F0EDE5] items-center justify-center"
          >
            <ChevronLeft size={22} color="#1a1a1a" />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-[#1a1a1a] text-center mr-10">
            Notifications
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Bell size={36} color="#C9A227" />
          <Text className="text-[#1a1a1a] font-semibold text-lg mt-4 text-center">
            Sign in for notifications
          </Text>
          <Pressable
            onPress={() => router.push('/auth')}
            className="mt-5 px-6 py-3 rounded-full bg-[#BC002D]"
          >
            <Text className="text-white font-semibold">Sign in</Text>
          </Pressable>
        </View>
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
        <Text className="flex-1 text-lg font-bold text-[#1a1a1a] text-center mr-10">
          Notifications
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#BC002D" />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(n: { id: string }) => n.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          ListEmptyComponent={
            <View className="items-center mt-16 px-6">
              <Bell size={32} color="#C9A227" />
              <Text className="text-[#6B6B6B] text-center mt-3">
                Follows and comments on your activity will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const actor = item.actor as
              | { display_name: string | null; avatar_url: string | null }
              | null;
            return (
              <Pressable
                onPress={() => {
                  if (item.activity_id) {
                    router.push(`/activity/${item.activity_id}`);
                  } else if (item.actor_id) {
                    router.push(`/user/${item.actor_id}`);
                  }
                }}
                className="flex-row items-center mb-3 bg-white rounded-2xl p-3 border border-[#F0EDE5]"
                style={{ opacity: item.read_at ? 0.75 : 1 }}
              >
                {actor?.avatar_url ? (
                  <Image source={{ uri: actor.avatar_url }} className="w-11 h-11 rounded-full" />
                ) : (
                  <View className="w-11 h-11 rounded-full bg-[#F0EDE5] items-center justify-center">
                    <User size={18} color="#9CA3AF" />
                  </View>
                )}
                <View className="flex-1 ml-3">
                  <Text className="text-[#1a1a1a]">
                    {item.body ??
                      (item.type === 'follow'
                        ? `${actor?.display_name ?? 'Someone'} followed you`
                        : 'New activity')}
                  </Text>
                  <Text className="text-[#9CA3AF] text-xs mt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>
                {!item.read_at && <View className="w-2.5 h-2.5 rounded-full bg-[#BC002D]" />}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
