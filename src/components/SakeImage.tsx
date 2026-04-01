import { View, Text, StyleSheet } from 'react-native';
import type { DimensionValue } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '@/lib/theme-context';

interface SakeImageProps {
  uri: string | null | undefined;
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  contentFit?: 'cover' | 'contain' | 'fill';
}

/**
 * Renders a sake bottle image from a URL, or a styled 酒 placeholder when
 * no image is available. Replaces direct ExpoImage usage so we never fall
 * back to a random external photo (e.g. a whisky bottle).
 */
export function SakeImage({
  uri,
  width = '100%',
  height,
  borderRadius = 0,
  contentFit = 'cover',
}: SakeImageProps) {
  const { colors } = useTheme();

  if (!uri) {
    return (
      <View
        style={[
          styles.placeholder,
          { width, height, borderRadius, backgroundColor: colors.surfaceSecondary },
        ]}
      >
        <Text style={[styles.kanji, { color: colors.textTertiary }]}>酒</Text>
      </View>
    );
  }

  return (
    <ExpoImage
      source={{ uri }}
      style={{ width, height, borderRadius }}
      contentFit={contentFit}
      transition={200}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanji: {
    fontSize: 48,
    opacity: 0.3,
    fontWeight: '300',
  },
});
