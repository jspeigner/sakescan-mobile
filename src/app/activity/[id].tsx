import { useState } from 'react';
import {
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Flag, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/lib/auth-context';
import {
  useActivityComments,
  useCreateComment,
  useReportContent,
  isSocialEnabled,
} from '@/lib/social-hooks';

export default function ActivityCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activityId = typeof id === 'string' ? id : id?.[0];
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const { data: comments, isLoading } = useActivityComments(activityId);
  const createComment = useCreateComment();
  const reportContent = useReportContent();
  const [body, setBody] = useState('');

  const submit = async () => {
    if (isGuest || !user?.id) {
      router.push('/auth');
      return;
    }
    if (!activityId || !body.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await createComment.mutateAsync({
        activityId,
        userId: user.id,
        body,
      });
      setBody('');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not post comment');
    }
  };

  const reportComment = (commentId: string) => {
    if (!user?.id) {
      router.push('/auth');
      return;
    }
    Alert.alert('Report comment', 'Why are you reporting this?', [
      {
        text: 'Spam or harassment',
        onPress: async () => {
          await reportContent.mutateAsync({
            reporterId: user.id,
            targetType: 'comment',
            targetId: commentId,
            reason: 'Spam or harassment',
          });
          Alert.alert('Thanks', 'Your report was submitted.');
        },
      },
      {
        text: 'Inappropriate',
        onPress: async () => {
          await reportContent.mutateAsync({
            reporterId: user.id,
            targetType: 'comment',
            targetId: commentId,
            reason: 'Inappropriate content',
          });
          Alert.alert('Thanks', 'Your report was submitted.');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const reportActivity = () => {
    if (!user?.id || !activityId) {
      router.push('/auth');
      return;
    }
    Alert.alert('Report activity', 'Why are you reporting this?', [
      {
        text: 'Spam',
        onPress: async () => {
          await reportContent.mutateAsync({
            reporterId: user.id,
            targetType: 'activity',
            targetId: activityId,
            reason: 'Spam',
          });
          Alert.alert('Thanks', 'Your report was submitted.');
        },
      },
      {
        text: 'Inappropriate',
        onPress: async () => {
          await reportContent.mutateAsync({
            reporterId: user.id,
            targetType: 'activity',
            targetId: activityId,
            reason: 'Inappropriate content',
          });
          Alert.alert('Thanks', 'Your report was submitted.');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!isSocialEnabled()) {
    return (
      <View className="flex-1 bg-[#FAFAF8] items-center justify-center px-6">
        <Text className="text-[#6B6B6B]">Comments are unavailable.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#FAFAF8]"
      style={{ paddingTop: insets.top }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center px-4 py-3 border-b border-[#F0EDE5]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#F0EDE5] items-center justify-center"
        >
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-[#1a1a1a] text-center">Comments</Text>
        <Pressable onPress={reportActivity} className="w-10 h-10 items-center justify-center">
          <Flag size={18} color="#6B6B6B" />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#BC002D" />
        </View>
      ) : (
        <FlatList
          data={comments ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}
          ListEmptyComponent={
            <Text className="text-[#8B8B8B] text-center mt-12">Be the first to comment.</Text>
          }
          renderItem={({ item }) => (
            <View className="flex-row mb-4">
              {item.users?.avatar_url ? (
                <Image source={{ uri: item.users.avatar_url }} className="w-9 h-9 rounded-full" />
              ) : (
                <View className="w-9 h-9 rounded-full bg-[#F0EDE5] items-center justify-center">
                  <User size={14} color="#9CA3AF" />
                </View>
              )}
              <View className="flex-1 ml-3 bg-white rounded-2xl px-3 py-2 border border-[#F0EDE5]">
                <View className="flex-row items-center justify-between">
                  <Pressable onPress={() => router.push(`/user/${item.user_id}`)}>
                    <Text className="text-[#1a1a1a] font-semibold text-sm">
                      {item.users?.display_name ?? 'User'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => reportComment(item.id)} hitSlop={8}>
                    <Flag size={14} color="#9CA3AF" />
                  </Pressable>
                </View>
                <Text className="text-[#1a1a1a] mt-1">{item.body}</Text>
                <Text className="text-[#9CA3AF] text-xs mt-1">
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      <View
        className="flex-row items-end px-4 pt-2 border-t border-[#F0EDE5] bg-[#FAFAF8]"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={isGuest ? 'Sign in to comment' : 'Add a comment…'}
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={1000}
          editable={!isGuest}
          onFocus={() => {
            if (isGuest) router.push('/auth');
          }}
          className="flex-1 max-h-28 bg-white rounded-2xl px-4 py-3 text-[#1a1a1a] border border-[#F0EDE5]"
        />
        <Pressable
          onPress={submit}
          disabled={createComment.isPending || !body.trim()}
          className="ml-2 w-11 h-11 rounded-full items-center justify-center"
          style={{ backgroundColor: body.trim() ? '#BC002D' : '#E5E5E5' }}
        >
          <Send size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
