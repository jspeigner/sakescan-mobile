import React from 'react';
import { Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Compass, Home, Heart, Camera, User, Building2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

function CameraTabButton() {
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
        backgroundColor: '#C9A227',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -20,
        shadowColor: '#C9A227',
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
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#C9A227',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FAFAF8',
          borderTopColor: '#E8E4D9',
          borderTopWidth: 1,
          paddingTop: 8,
          height: 85,
        },
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
