import { ScrollView, Text, View, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { X, BookOpen } from 'lucide-react-native';
import {
  SAKE_TYPE_EXPLAINERS,
  findTypeExplainer,
  type SakeTypeExplainer,
} from '@/lib/sake-learn';

function TypeCard({ item, highlighted }: { item: SakeTypeExplainer; highlighted: boolean }) {
  return (
    <View
      className="mb-3 p-4 rounded-2xl"
      style={{
        backgroundColor: highlighted ? 'rgba(188, 0, 45, 0.06)' : '#F5F3EE',
        borderWidth: highlighted ? 1.5 : 0,
        borderColor: highlighted ? '#BC002D' : 'transparent',
      }}
    >
      <View className="flex-row items-baseline justify-between mb-1">
        <Text
          style={{
            fontFamily: 'NotoSerifJP_600SemiBold',
            fontSize: 18,
            color: '#1a1a1a',
          }}
        >
          {item.name}
        </Text>
        <Text className="text-xs text-[#8B8B8B] ml-3 flex-shrink" numberOfLines={1}>
          {item.polishingHint}
        </Text>
      </View>
      <Text className="text-sm text-[#1a1a1a] leading-5 mb-2">{item.summary}</Text>
      <Text className="text-sm text-[#6B6B6B] leading-5">{item.taste}</Text>
    </View>
  );
}

export default function SakeLearnModal() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const matched = findTypeExplainer(type);
  const highlightId = matched?.id;

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center justify-between px-5 mb-4">
        <View className="flex-row items-center flex-1 mr-3">
          <BookOpen size={20} color="#BC002D" />
          <Text
            className="ml-2"
            style={{
              fontFamily: 'NotoSerifJP_600SemiBold',
              fontSize: 22,
              color: '#1a1a1a',
            }}
          >
            Sake Types
          </Text>
        </View>
        <Pressable
          onPress={handleClose}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: '#F0EDE5' }}
        >
          <X size={20} color="#1a1a1a" />
        </Pressable>
      </View>

      <Text className="px-5 text-sm text-[#8B8B8B] mb-4 leading-5">
        Quick guides to the styles you&apos;ll see on labels and menus — not a full course.
      </Text>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {matched && (
          <View className="mb-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-[#BC002D] mb-2">
              About this bottle
            </Text>
            <TypeCard item={matched} highlighted />
          </View>
        )}

        <Text className="text-xs font-semibold uppercase tracking-wide text-[#8B8B8B] mb-2 mt-2">
          All styles
        </Text>
        {SAKE_TYPE_EXPLAINERS.filter((item) => item.id !== highlightId).map((item) => (
          <TypeCard key={item.id} item={item} highlighted={false} />
        ))}
      </ScrollView>
    </View>
  );
}
