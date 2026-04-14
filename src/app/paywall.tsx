import { useEffect } from 'react';
import { Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  BookOpen,
  ScanLine,
  Star,
  Sparkles,
  ChevronLeft,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/theme-context';

const FEATURES = [
  { icon: BookOpen, label: 'Full Sake Menu Scanner', desc: 'Scan any restaurant menu and see every sake with prices & profiles' },
  { icon: ScanLine, label: 'Unlimited Label Scans', desc: 'No limits on individual bottle label scanning' },
  { icon: Star, label: 'Save & Rate Sakes', desc: 'Build your personal sake collection and share reviews' },
  { icon: Sparkles, label: 'AI Flavor Analysis', desc: 'Detailed tasting notes, food pairings, and serving recommendations' },
];

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const headerY = useSharedValue(-20);
  const headerOpacity = useSharedValue(0);
  const featuresOpacity = useSharedValue(0);
  const ctaScale = useSharedValue(0.9);
  const ctaOpacity = useSharedValue(0);

  useEffect(() => {
    headerY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    headerOpacity.value = withTiming(1, { duration: 400 });
    featuresOpacity.value = withDelay(250, withTiming(1, { duration: 400 }));
    ctaScale.value = withDelay(500, withSpring(1, { damping: 14, stiffness: 120 }));
    ctaOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
  }, [headerY, headerOpacity, featuresOpacity, ctaScale, ctaOpacity]);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerY.value }],
    opacity: headerOpacity.value,
  }));
  const featuresStyle = useAnimatedStyle(() => ({ opacity: featuresOpacity.value }));
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
    opacity: ctaOpacity.value,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Back button */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16, zIndex: 10 }}>
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

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingTop: insets.top + 60 }}>
        {/* Header */}
        <Animated.View style={[{ alignItems: 'center', marginBottom: 40 }, headerStyle]}>
          <LinearGradient
            colors={[`${colors.brandRed}30`, `${colors.primary}20`, 'transparent']}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Sparkles size={44} color={colors.brandRed} strokeWidth={1.5} />
          </LinearGradient>

          <Text
            style={{
              fontFamily: 'NotoSerifJP_700Bold',
              fontSize: 30,
              color: colors.text,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Unlock SakeScan
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
            Create a free account to access the full{'\n'}menu scanner and unlimited features.
          </Text>
        </Animated.View>

        {/* Feature list */}
        <Animated.View style={[{ marginBottom: 40 }, featuresStyle]}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <View
                key={f.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: i < FEATURES.length - 1 ? 20 : 0,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: `${colors.primary}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}
                >
                  <Icon size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                      {f.label}
                    </Text>
                    <Check size={14} color={colors.primary} strokeWidth={3} />
                  </View>
                  <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2, lineHeight: 19 }}>
                    {f.desc}
                  </Text>
                </View>
              </View>
            );
          })}
        </Animated.View>
      </View>

      {/* CTA buttons */}
      <Animated.View
        style={[
          { paddingHorizontal: 28, paddingBottom: insets.bottom + 24 },
          ctaStyle,
        ]}
      >
        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/welcome');
          }}
          style={{
            backgroundColor: colors.brandRed,
            paddingVertical: 18,
            borderRadius: 28,
            alignItems: 'center',
            shadowColor: colors.brandRed,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>
            Create Free Account
          </Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/auth');
          }}
          style={{
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>
            Already have an account? Sign In
          </Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={{ paddingVertical: 10, alignItems: 'center', marginTop: 4 }}
        >
          <Text style={{ color: colors.textTertiary, fontSize: 14 }}>
            Maybe Later
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
