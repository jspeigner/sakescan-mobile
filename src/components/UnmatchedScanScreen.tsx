import { useEffect } from 'react';
import { Text, View, Pressable, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Camera, Search, AlertCircle, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/theme-context';

interface UnmatchedScanScreenProps {
  errorMessage?: string;
  imageUri?: string;
}

export default function UnmatchedScanScreen({ errorMessage, imageUri }: UnmatchedScanScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const iconScale = useSharedValue(0.7);
  const contentOpacity = useSharedValue(0);
  const buttonsY = useSharedValue(20);

  useEffect(() => {
    iconScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    buttonsY.value = withDelay(400, withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }));
  }, [iconScale, contentOpacity, buttonsY]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: buttonsY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: insets.top + 8,
          paddingBottom: 12,
        }}
      >
        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Captured image thumbnail */}
        {imageUri && (
          <Animated.View style={iconStyle}>
            <View
              style={{
                width: 120,
                height: 160,
                borderRadius: 20,
                overflow: 'hidden',
                marginBottom: 24,
                borderWidth: 2,
                borderColor: colors.borderLight,
              }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)']}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 50,
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingBottom: 8,
                }}
              >
                <AlertCircle size={20} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </Animated.View>
        )}

        {!imageUri && (
          <Animated.View style={iconStyle}>
            <LinearGradient
              colors={[`${colors.brandRed}20`, `${colors.primary}15`, 'transparent']}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <AlertCircle size={48} color={colors.brandRed} strokeWidth={1.5} />
            </LinearGradient>
          </Animated.View>
        )}

        <Animated.View style={[{ alignItems: 'center' }, contentStyle]}>
          <Text
            style={{
              fontFamily: 'NotoSerifJP_600SemiBold',
              fontSize: 26,
              color: colors.text,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            No Match Found
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 23,
              marginBottom: 8,
            }}
          >
            {errorMessage ||
              "We couldn't identify this sake in our database. It might be a rare or new release."}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textTertiary,
              textAlign: 'center',
              lineHeight: 21,
            }}
          >
            Try scanning from a different angle, or search for the sake by name.
          </Text>
        </Animated.View>
      </View>

      {/* Action buttons */}
      <Animated.View style={[{ paddingHorizontal: 28, paddingBottom: insets.bottom + 24 }, buttonsStyle]}>
        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.back();
          }}
          style={{
            backgroundColor: colors.brandRed,
            paddingVertical: 16,
            borderRadius: 24,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Camera size={20} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
            Try Again
          </Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace('/search-results');
          }}
          style={{
            backgroundColor: colors.surfaceSecondary,
            paddingVertical: 16,
            borderRadius: 24,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            marginTop: 12,
          }}
        >
          <Search size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
            Search by Name
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
