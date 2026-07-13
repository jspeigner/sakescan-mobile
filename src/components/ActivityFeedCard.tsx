import { Text, View, Pressable, Image } from 'react-native';
import { MessageCircle, Star, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { resolveSakeImageUrl } from '@/lib/supabase';
import type { FeedItem } from '@/lib/social-hooks';

function activityVerb(type: FeedItem['type']): string {
  switch (type) {
    case 'scan':
      return 'scanned';
    case 'rating':
      return 'rated';
    case 'favorite':
      return 'saved';
    case 'menu_share':
      return 'shared from a menu';
    default:
      return 'liked';
  }
}

export function ActivityFeedCard({ item }: { item: FeedItem }) {
  const imageUrl = resolveSakeImageUrl(item.sake_image_url);
  const name = item.actor_display_name ?? 'Someone';

  return (
    <View className="mx-5 mb-3 rounded-2xl bg-white border border-[#F0EDE5] overflow-hidden">
      <Pressable
        onPress={() => router.push(`/user/${item.actor_id}`)}
        className="flex-row items-center px-4 pt-4 pb-2"
      >
        {item.actor_avatar_url ? (
          <Image source={{ uri: item.actor_avatar_url }} className="w-9 h-9 rounded-full" />
        ) : (
          <View className="w-9 h-9 rounded-full bg-[#F0EDE5] items-center justify-center">
            <User size={16} color="#9CA3AF" />
          </View>
        )}
        <View className="flex-1 ml-3">
          <Text className="text-[#1a1a1a] font-semibold" numberOfLines={1}>
            {name}{' '}
            <Text className="font-normal text-[#6B6B6B]">{activityVerb(item.type)}</Text>
          </Text>
          <Text className="text-[#9CA3AF] text-xs mt-0.5">
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => {
          if (item.sake_id) router.push(`/sake/${item.sake_id}`);
        }}
        className="flex-row items-center px-4 pb-3"
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} className="w-16 h-16 rounded-xl bg-[#F0EDE5]" />
        ) : (
          <View className="w-16 h-16 rounded-xl bg-[#F0EDE5]" />
        )}
        <View className="flex-1 ml-3">
          <Text className="text-[#1a1a1a] font-semibold text-base" numberOfLines={1}>
            {item.sake_name ?? 'Sake'}
          </Text>
          <Text className="text-[#6B6B6B] text-sm" numberOfLines={1}>
            {[item.sake_brewery, item.sake_type].filter(Boolean).join(' · ')}
          </Text>
          {item.type === 'rating' && item.rating_value != null && (
            <View className="flex-row items-center mt-1">
              <Star size={12} color="#C9A227" fill="#C9A227" />
              <Text className="text-[#C9A227] text-sm font-semibold ml-1">
                {item.rating_value.toFixed(1)}
              </Text>
              {!!item.review_text && (
                <Text className="text-[#6B6B6B] text-sm ml-2 flex-1" numberOfLines={1}>
                  {item.review_text}
                </Text>
              )}
            </View>
          )}
        </View>
      </Pressable>

      <View className="flex-row items-center border-t border-[#F0EDE5] px-2">
        <Pressable
          onPress={() => router.push(`/activity/${item.id}`)}
          className="flex-row items-center px-3 py-3"
        >
          <MessageCircle size={16} color="#6B6B6B" />
          <Text className="text-[#6B6B6B] text-sm ml-1.5">
            {item.comment_count > 0 ? `${item.comment_count} comments` : 'Comment'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
