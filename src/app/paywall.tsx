import { useEffect, useState } from 'react';
import {
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
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
  Utensils,
  Heart,
  Bookmark,
  ChevronLeft,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/lib/subscription-context';
import { FALLBACK_PRICES } from '@/lib/purchases';

const FEATURES = [
  {
    icon: BookOpen,
    label: 'Unlimited Menu Scans',
    desc: 'Scan entire menus instantly—no monthly caps',
  },
  {
    icon: Utensils,
    label: 'Full Food Pairings',
    desc: 'See every expert pairing for each sake',
  },
  {
    icon: Heart,
    label: 'Unlimited Collection',
    desc: 'Save and rate every bottle you try',
  },
  {
    icon: Bookmark,
    label: 'Saved Menus',
    desc: 'Revisit past menus, picks, and prices anytime',
  },
];

type PlanId = 'annual' | 'monthly';

const TERMS_URL = 'https://sakescan.com/terms';
const PRIVACY_URL = 'https://sakescan.com/privacy';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user, isGuest } = useAuth();
  const {
    isPro,
    annualPackage,
    monthlyPackage,
    purchase,
    restore,
    isLoading,
  } = useSubscription();
  const [plan, setPlan] = useState<PlanId>('annual');
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    if (isPro) {
      router.back();
    }
  }, [isPro]);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerY.value }],
    opacity: headerOpacity.value,
  }));
  const featuresStyle = useAnimatedStyle(() => ({ opacity: featuresOpacity.value }));
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
    opacity: ctaOpacity.value,
  }));

  const annualPrice = annualPackage?.product.priceString ?? FALLBACK_PRICES.annual;
  const monthlyPrice = monthlyPackage?.product.priceString ?? FALLBACK_PRICES.monthly;

  const handleSubscribe = async () => {
    if (isGuest || !user) {
      router.replace('/account-gate');
      return;
    }
    const pkg = plan === 'annual' ? annualPackage : monthlyPackage;
    if (!pkg) {
      Alert.alert(
        'Unavailable',
        'Subscriptions are not available yet. Add your RevenueCat API key and App Store products, then try again.',
      );
      return;
    }
    setBusy(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await purchase(pkg);
      if (result.cancelled) return;
      if (result.error) {
        Alert.alert('Purchase failed', result.error);
        return;
      }
      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (isGuest || !user) {
      router.replace('/account-gate');
      return;
    }
    setBusy(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await restore();
      if (result.error) {
        Alert.alert('Restore failed', result.error);
        return;
      }
      if (result.isPro) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Welcome back', 'SakeScan Pro has been restored.');
        router.back();
      } else {
        Alert.alert('No purchases found', 'We could not find an active SakeScan Pro subscription.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 28,
          paddingTop: insets.top + 56,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[{ alignItems: 'center', marginBottom: 28 }, headerStyle]}>
          <LinearGradient
            colors={['#C9A22740', `${colors.brandRed}25`, 'transparent']}
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <Sparkles size={40} color="#C9A227" strokeWidth={1.5} />
          </LinearGradient>

          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: '#C9A22722',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: '#C9A227', fontWeight: '700', fontSize: 12, letterSpacing: 0.6 }}>
              SAKESCAN PRO
            </Text>
          </View>

          <Text
            style={{
              width: '100%',
              fontFamily: 'NotoSerifJP_700Bold',
              fontSize: 28,
              color: colors.text,
              textAlign: 'center',
              marginBottom: 10,
            }}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            maxFontSizeMultiplier={1.3}
            numberOfLines={2}
          >
            Never Order the Wrong Sake Again.
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            Unlock unlimited menu scans, full food pairings,{'\n'}and an unlimited collection.
          </Text>
        </Animated.View>

        <Animated.View style={[{ marginBottom: 24 }, featuresStyle]}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <View
                key={f.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: i < FEATURES.length - 1 ? 16 : 0,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: '#C9A22718',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Icon size={20} color="#C9A227" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 }}>
                      {f.label}
                    </Text>
                    <Check size={14} color="#C9A227" strokeWidth={3} />
                  </View>
                  <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2, lineHeight: 18 }}>
                    {f.desc}
                  </Text>
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Plan toggle */}
        <View style={{ marginBottom: 8 }}>
          <Pressable
            onPress={() => setPlan('annual')}
            style={{
              borderWidth: 2,
              borderColor: plan === 'annual' ? '#C9A227' : colors.border,
              backgroundColor: plan === 'annual' ? '#C9A22712' : colors.surface,
              borderRadius: 16,
              padding: 16,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>Annual</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  {annualPrice}/year (Just {FALLBACK_PRICES.annualPerMonth}/mo)
                </Text>
                <Text style={{ fontSize: 12, color: '#C9A227', fontWeight: '600', marginTop: 4 }}>
                  Includes 7-Day Free Trial
                </Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: plan === 'annual' ? '#C9A227' : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: plan === 'annual' ? '#C9A227' : 'transparent',
                }}
              >
                {plan === 'annual' && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setPlan('monthly')}
            style={{
              borderWidth: 2,
              borderColor: plan === 'monthly' ? '#C9A227' : colors.border,
              backgroundColor: plan === 'monthly' ? '#C9A22712' : colors.surface,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>Monthly</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  {monthlyPrice}/month
                </Text>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: plan === 'monthly' ? '#C9A227' : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: plan === 'monthly' ? '#C9A227' : 'transparent',
                }}
              >
                {plan === 'monthly' && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
              </View>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Animated.View
        style={[{ paddingHorizontal: 28, paddingBottom: insets.bottom + 16 }, ctaStyle]}
      >
        <Pressable
          onPress={handleSubscribe}
          disabled={busy || isLoading}
          style={{
            backgroundColor: '#C9A227',
            paddingVertical: 18,
            borderRadius: 28,
            alignItems: 'center',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>
              {plan === 'annual' ? 'Start 7-Day Free Trial' : 'Subscribe'}
            </Text>
          )}
        </Pressable>
        {plan === 'annual' && (
          <Text
            style={{
              textAlign: 'center',
              color: colors.textTertiary,
              fontSize: 12,
              marginTop: 8,
            }}
          >
            Cancel anytime before trial ends
          </Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 16,
            gap: 12,
          }}
        >
          <Pressable onPress={handleRestore}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
              Restore Purchases
            </Text>
          </Pressable>
          <Text style={{ color: colors.border }}>|</Text>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Terms of Service</Text>
          </Pressable>
          <Text style={{ color: colors.border }}>|</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Privacy Policy</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
