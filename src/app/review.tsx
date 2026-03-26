import { useState } from 'react';
import { Text, View, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Star } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { useCreateRating } from '@/lib/supabase-hooks';

export default function ReviewModal() {
  const insets = useSafeAreaInsets();
  const { id, name, type } = useLocalSearchParams<{ id: string; name: string; type: string }>();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const { user, isGuest } = useAuth();
  const createRating = useCreateRating();

  const sakeName = name ?? 'Sake';
  const sakeType = type ?? '';

  const handleStarPress = async (starValue: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRating(starValue);
  };

  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSubmit = async () => {
    if (!id || rating === 0) return;

    if (isGuest || !user?.id) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.back();
      router.push('/welcome');
      return;
    }

    try {
      await createRating.mutateAsync({
        userId: user.id,
        sakeId: id,
        rating,
        reviewText: review.trim() || undefined,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Failed to submit review:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View className="flex-1 bg-black/50">
      {/* Tap outside to dismiss */}
      <Pressable className="flex-1" onPress={handleCancel} />

      {/* Modal Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          className="bg-[#FAFAF8] rounded-t-3xl"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Drag Handle */}
          <View className="items-center pt-3 pb-4">
            <View className="w-10 h-1 rounded-full bg-[#D4D4D4]" />
          </View>

          {/* Content */}
          <View className="px-6">
            {/* Title */}
            <Text
              className="text-[#1a1a1a] mb-6"
              style={{ fontFamily: 'NotoSerifJP_600SemiBold', fontSize: 24, fontWeight: '600' }}
            >
              Rate {sakeName} {sakeType}
            </Text>

            {/* Guest Warning */}
            {isGuest && (
              <View
                className="p-4 rounded-xl mb-6"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <Text className="text-[#92400E] text-sm">
                  Sign in to save your review. Guest reviews are not saved.
                </Text>
              </View>
            )}

            {/* Rating Section */}
            <Text className="text-[#6B6B6B] text-xs font-semibold tracking-wider mb-3">
              YOUR RATING
            </Text>
            <View className="flex-row mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => handleStarPress(star)}
                  className="mr-3"
                >
                  <Star
                    size={36}
                    fill={star <= rating ? '#C9A227' : 'transparent'}
                    color={star <= rating ? '#C9A227' : '#D4C9A8'}
                    strokeWidth={1.5}
                  />
                </Pressable>
              ))}
            </View>

            {/* Review Section */}
            <Text className="text-[#1a1a1a] text-base mb-3">
              Review
            </Text>
            <View
              className="rounded-2xl mb-8"
              style={{
                backgroundColor: '#F5F3EE',
                borderWidth: 1,
                borderColor: '#E8E4D9',
              }}
            >
              <TextInput
                value={review}
                onChangeText={setReview}
                placeholder="What did you think of this sake?"
                placeholderTextColor="#A0A0A0"
                multiline
                numberOfLines={4}
                className="p-4 text-[#1a1a1a] text-base"
                style={{ minHeight: 120, textAlignVertical: 'top' }}
              />
            </View>
          </View>

          {/* Bottom Buttons */}
          <View
            className="flex-row px-6 pt-4"
            style={{ borderTopWidth: 1, borderTopColor: '#E8E4D9' }}
          >
            <Pressable
              onPress={handleCancel}
              className="flex-1 items-center py-4"
            >
              <Text className="text-[#1a1a1a] text-base font-medium">
                Cancel
              </Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={rating === 0 || createRating.isPending}
              className="flex-1 ml-3 items-center justify-center py-4 rounded-full"
              style={{
                backgroundColor: rating > 0 ? '#1a1a1a' : '#D4D4D4',
              }}
            >
              {createRating.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  className="text-base font-semibold"
                  style={{ color: rating > 0 ? '#FFFFFF' : '#8B8B8B' }}
                >
                  Submit Review
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
