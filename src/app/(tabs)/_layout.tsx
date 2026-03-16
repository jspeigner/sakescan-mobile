import React from 'react';
import { Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Compass, Home, Heart, Camera, Building2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/theme-context';

function CameraTabButton() {
  const { colors } = useTheme();
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/camera');
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -20,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <Camera size={26} color="#FFFFFF" strokeWidth={2} />
    </Pressable>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 85,
        },
        tabBarItemStyle: { alignItems: 'center', justifyContent: 'center' },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          marginTop: 2,
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
