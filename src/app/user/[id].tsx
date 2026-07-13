import { useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import { resolveSakeImageUrl } from '@/lib/supabase';
import {
  usePublicProfile,
  useFollowCounts,
  useIsFollowing,
  useFollow,
  useUnfollow,
  useUserActivity,
  useBlockUser,
  useReportContent,
  isSocialEnabled,
} from '@/lib/social-hooks';

export default function PublicUserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const userId = typeof id === 'string' ? id : id?.[0];
  const isSelf = !!user?.id && user.id === userId;

  const { data: profile, isLoading } = usePublicProfile(userId);
  const { data: counts } = useFollowCounts(userId);
  const { data: isFollowing } = useIsFollowing(user?.id, userId);
  const { data: activity } = useUserActivity(userId);
  const follow = useFollow();
  const unfollow = useUnfollow();
  const blockUser = useBlockUser();
  const reportContent = useReportContent();
  const [busy, setBusy] = useState(false);

  if (!isSocialEnabled()) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center px-6">
        <Text className="text-[#6B6B6B] text-center">Social features are coming soon.</Text>
      </View>
    );
  }

  const handleFollow = async () => {
    if (isGuest || !user?.id || !userId) {
      router.push('/auth');
      return;
    }
    setBusy(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (isFollowing) {
        await unfollow.mutateAsync({ followerId: user.id, followingId: userId });
      } else {
        await follow.mutateAsync({ followerId: user.id, followingId: userId });
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not update follow');
    } finally {
      setBusy(false);
    }
  };

  const handleMore = () => {
    if (!user?.id || !userId || isSelf) return;
    Alert.alert('User options', undefined, [
      {
        text: 'Report user',
        onPress: () => {
          Alert.prompt?.(
            'Report user',
            'Why are you reporting this profile?',
            async (reason) => {
              if (!reason?.trim()) return;
              try {
                await reportContent.mutateAsync({
                  reporterId: user.id,
                  targetType: 'user',
                  targetId: userId,
                  reason,
                });
                Alert.alert('Thanks', 'Your report was submitted.');
              } catch {
                Alert.alert('Error', 'Could not submit report.');
              }
            },
          ) ??
            Alert.alert('Report', 'Send a short reason via support if prompted unavailable.', [
              {
                text: 'Spam / abuse',
                onPress: async () => {
                  await reportContent.mutateAsync({
                    reporterId: user.id,
                    targetType: 'user',
                    targetId: userId,
                    reason: 'Spam or abuse',
                  });
                  Alert.alert('Thanks', 'Your report was submitted.');
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]);
        },
      },
      {
        text: 'Block user',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Block this user?', 'You will no longer see their activity.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                await blockUser.mutateAsync({ blockerId: user.id, blockedId: userId });
                router.back();
              },
            },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center">
        <ActivityIndicator color="#BC002D" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center px-6">
        <Text className="text-[#1a1a1a] font-semibold text-lg">User not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-5 py-3 rounded-full bg-[#BC002D]">
          <Text className="text-white font-semibold">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#F0EDE5] items-center justify-center"
        >
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        {!isSelf && (
          <Pressable onPress={handleMore} className="px-3 py-2">
            <Text className="text-[#6B6B6B] font-semibold">More</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View className="items-center px-5 mt-2">
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} className="w-24 h-24 rounded-full" />
          ) : (
            <View className="w-24 h-24 rounded-full bg-[#F0EDE5] items-center justify-center">
              <User size={40} color="#9CA3AF" />
            </View>
          )}
          <Text
            className="text-[#1a1a1a] text-2xl mt-4"
            style={{ fontFamily: 'NotoSerifJP_600SemiBold' }}
          >
            {profile.display_name ?? 'Sake fan'}
          </Text>
          {!!profile.bio && (
            <Text className="text-[#6B6B6B] text-center mt-2 px-4">{profile.bio}</Text>
          )}

          <View className="flex-row mt-5 w-full">
            <Pressable
              className="flex-1 items-center"
              onPress={() => router.push({ pathname: '/user/follows', params: { id: userId, mode: 'followers' } })}
            >
              <Text className="text-xl font-bold text-[#1a1a1a]">{counts?.followers ?? 0}</Text>
              <Text className="text-xs text-[#8B8B8B]">FOLLOWERS</Text>
            </Pressable>
            <Pressable
              className="flex-1 items-center"
              onPress={() => router.push({ pathname: '/user/follows', params: { id: userId, mode: 'following' } })}
            >
              <Text className="text-xl font-bold text-[#1a1a1a]">{counts?.following ?? 0}</Text>
              <Text className="text-xs text-[#8B8B8B]">FOLLOWING</Text>
            </Pressable>
          </View>

          {!isSelf && (
            <Pressable
              onPress={handleFollow}
              disabled={busy}
              className="mt-5 px-8 py-3 rounded-full"
              style={{ backgroundColor: isFollowing ? '#F0EDE5' : '#BC002D' }}
            >
              <Text
                className="font-semibold"
                style={{ color: isFollowing ? '#1a1a1a' : '#FFFFFF' }}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
          )}
        </View>

        <Text className="px-5 mt-8 mb-3 text-xs font-semibold text-[#9CA3AF] tracking-wide">
          RECENT ACTIVITY
        </Text>
        {(activity ?? []).length === 0 ? (
          <Text className="px-5 text-[#8B8B8B]">No public activity yet.</Text>
        ) : (
          (activity ?? []).map((item: any) => {
            const sake = item.sake as
              | { id: string; name: string; brewery: string; image_url?: string | null }
              | null;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (sake?.id) router.push(`/sake/${sake.id}`);
                }}
                className="mx-5 mb-3 flex-row items-center bg-white rounded-2xl p-3 border border-[#F0EDE5]"
              >
                {sake?.image_url ? (
                  <Image
                    source={{ uri: resolveSakeImageUrl(sake.image_url) ?? undefined }}
                    className="w-14 h-14 rounded-xl bg-[#F0EDE5]"
                  />
                ) : (
                  <View className="w-14 h-14 rounded-xl bg-[#F0EDE5]" />
                )}
                <View className="flex-1 ml-3">
                  <Text className="text-[#8B8B8B] text-xs uppercase">{item.type}</Text>
                  <Text className="text-[#1a1a1a] font-semibold" numberOfLines={1}>
                    {sake?.name ?? 'Sake'}
                  </Text>
                  <Text className="text-[#6B6B6B] text-sm" numberOfLines={1}>
                    {sake?.brewery ?? ''}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
