import React, { useEffect } from 'react';
import { Pressable, View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Tabs, router } from 'expo-router';
import { Compass, Home, Heart, Camera, Building2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme-context';

function CameraTabButton() {
  const { colors } = useTheme();
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/camera');
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 }}>
      <Pressable
        onPress={handlePress}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.brandRed,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -18,
          shadowColor: colors.brandRed,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Camera size={26} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + Math.max(insets.bottom, 10);

  useEffect(() => {
    console.log('[TabLayout] mounted');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.background,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 10),
          height: tabBarHeight,
          position: 'absolute',
        },
        tabBarBackground: Platform.OS === 'ios'
          ? () => (
              <BlurView
                intensity={80}
                tint={colors.background === '#0a0a0a' ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            )
          : undefined,
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 4,
        },
        tabBarIconStyle: { marginBottom: -2 },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          marginTop: 0,
          letterSpacing: 0.5,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color }: { color: string }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'EXPLORE',
          tabBarIcon: ({ color }: { color: string }) => <Compass size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan-camera"
        options={{
          title: '',
          tabBarButton: () => <CameraTabButton />,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'SAVED',
          tabBarIcon: ({ color }: { color: string }) => <Heart size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="breweries"
        options={{
          title: 'BREWERIES',
          tabBarIcon: ({ color }: { color: string }) => <Building2 size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
