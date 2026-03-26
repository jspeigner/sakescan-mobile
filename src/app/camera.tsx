import { useState, useRef, useEffect } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { ChevronLeft, Info, Image as ImageIcon, Zap } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { scanSakeLabel } from '@/lib/openai-scan';

// Height of the scan frame (must match styles.frame height)
const FRAME_HEIGHT = 380;

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [facing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Reanimated values
  const scanLineY = useSharedValue(0);          // sweeping scan line position (0-1)
  const cornerOpacity = useSharedValue(1);       // corner accent pulse
  const progressWidth = useSharedValue(0);       // progress bar fill
  const frameGlow = useSharedValue(0);           // frame border brightness
  const successFlash = useSharedValue(0);        // white flash on success

  useEffect(() => {
    if (isScanning) {
      // Sweep the scan line top→bottom→top on loop (2 s per pass)
      scanLineY.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
      // Pulse corner accents
      cornerOpacity.value = withRepeat(
        withSequence(
          withTiming(0.35, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      );
      // Gentle frame glow pulse
      frameGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.4, { duration: 900 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scanLineY);
      cancelAnimation(cornerOpacity);
      cancelAnimation(frameGlow);
      scanLineY.value = withTiming(0, { duration: 200 });
      cornerOpacity.value = withTiming(1, { duration: 200 });
      frameGlow.value = withTiming(0, { duration: 200 });
    }
  }, [isScanning, scanLineY, cornerOpacity, frameGlow]);

  // Drive animated progress bar from state
  useEffect(() => {
    progressWidth.value = withTiming(scanProgress / 100, { duration: 120 });
  }, [scanProgress, progressWidth]);

  // Progress ticker
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 95) { clearInterval(interval); return 95; }
          return prev + 3;
        });
      }, 150);
      return () => clearInterval(interval);
    } else {
      setScanProgress(0);
    }
  }, [isScanning]);

  // Animated styles
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scanLineY.value, [0, 1], [0, FRAME_HEIGHT - 3]) }],
    opacity: interpolate(scanLineY.value, [0, 0.05, 0.95, 1], [0, 1, 1, 0]),
  }));

  const cornerStyle = useAnimatedStyle(() => ({ opacity: cornerOpacity.value }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as `${number}%`,
  }));

  const frameStyle = useAnimatedStyle(() => ({
    opacity: interpolate(frameGlow.value, [0, 1], [0.6, 1]),
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: successFlash.value,
    pointerEvents: successFlash.value > 0 ? 'none' : 'none',
  }));

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <Text style={styles.permissionTitle}>Camera Permission Required</Text>
        <Text style={styles.permissionText}>
          SakeScan needs camera access to scan sake labels
        </Text>
        <Pressable
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const processImage = async (base64Image: string, imageUri?: string) => {
    if (isScanning) return;

    setIsScanning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('🔍 Starting sake label scan with OpenAI...');

      // Call OpenAI directly - no Edge Functions, no Supabase complexity
      const result = await scanSakeLabel(base64Image);

      if (result.success && result.sake) {
        console.log('✅ Successfully scanned:', result.sake.name);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Success flash then navigate
        setScanProgress(100);
        successFlash.value = withSequence(
          withTiming(0.6, { duration: 80 }),
          withTiming(0, { duration: 300 }),
        );
        await new Promise(r => setTimeout(r, 350));

        router.replace({
          pathname: '/scan-result',
          params: {
            sakeData: JSON.stringify(result.sake),
            imageUri: imageUri || '',
          },
        });
      } else {
        // Handle scan failure
        console.error('❌ Scan failed:', result.error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        // Show user-friendly error message
        setTimeout(() => {
          router.back();
          setTimeout(() => {
            alert(result.error || 'Failed to analyze the label. Please try again with a clearer photo.');
          }, 300);
        }, 100);
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      setTimeout(() => {
        router.back();
        setTimeout(() => {
          alert('An error occurred while scanning. Please check your internet connection and try again.');
        }, 300);
      }, 100);
    } finally {
      setIsScanning(false);
    }
  };

  const handleCapture = async () => {
    if (isScanning) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Capture photo from camera
      const photo = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: 0.7,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture photo');
      }

      await processImage(photo.base64, photo.uri);
    } catch (error) {
      console.error('Capture error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Failed to capture photo. Please try again.');
      setIsScanning(false);
    }
  };

  const handlePickImage = async () => {
    if (isScanning) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        alert('Please allow photo library access to scan a label from an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      let base64 = asset.base64 ?? null;
      if (!base64 && asset.uri) {
        try {
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch (readErr) {
          console.error('Failed to read image as base64:', readErr);
        }
      }

      if (!base64) {
        alert('Could not read this image. Try another photo or take a new picture.');
        return;
      }

      await processImage(base64, asset.uri);
    } catch (error) {
      console.error('Image picker error:', error);
      alert('Failed to pick image. Please try again.');
    }
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const toggleFlash = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashOn(!flashOn);
  };

  return (
    <View style={styles.container}>
      {/* Camera - no children allowed */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={flashOn}
      />

      {/* Overlay UI - positioned absolutely on top of camera */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={handleClose} style={styles.headerButton}>
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Scan Sake Label</Text>
          <Pressable style={styles.headerButton}>
            <Info size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Scanning Frame */}
        <View style={styles.frameContainer}>
          <Animated.View style={[styles.frame, frameStyle]}>
            {/* Dashed border effect */}
            <View style={[styles.frameBorder, styles.frameTop]} />
            <View style={[styles.frameBorder, styles.frameRight]} />
            <View style={[styles.frameBorder, styles.frameBottom]} />
            <View style={[styles.frameBorder, styles.frameLeft]} />

            {/* Corner accents — pulse when scanning */}
            <Animated.View style={[styles.cornerAccent, styles.cornerTL, cornerStyle]} />
            <Animated.View style={[styles.cornerAccent, styles.cornerTR, cornerStyle]} />
            <Animated.View style={[styles.cornerAccent, styles.cornerBL, cornerStyle]} />
            <Animated.View style={[styles.cornerAccent, styles.cornerBR, cornerStyle]} />

            {/* Sweeping scan line — only visible while scanning */}
            {isScanning && (
              <Animated.View style={[styles.scanLine, scanLineStyle]} />
            )}
          </Animated.View>
        </View>

        {/* Instructions and Progress */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>
            {isScanning ? 'Analyzing with AI...' : 'Position label within frame'}
          </Text>

          {isScanning && (
            <View style={styles.progressBarTrack}>
              <Animated.View style={[styles.progressBarFill, progressBarStyle]} />
              <Text style={styles.progressPercent}>{scanProgress}%</Text>
            </View>
          )}
        </View>

        {/* Full-screen white flash on success */}
        <Animated.View style={[styles.successFlash, flashStyle]} pointerEvents="none" />

        {/* Bottom Controls */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
          {/* Gallery Button */}
          <Pressable
            style={styles.sideButton}
            onPress={handlePickImage}
            disabled={isScanning}
          >
            <ImageIcon size={24} color="#FFFFFF" />
          </Pressable>

          {/* Capture Button */}
          <Pressable
            onPress={handleCapture}
            disabled={isScanning}
            style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
          >
            <View style={styles.captureButtonInner}>
              <View style={styles.cameraIcon}>
                <View style={styles.cameraIconLens} />
              </View>
            </View>
          </Pressable>

          {/* Flash Button */}
          <Pressable
            onPress={toggleFlash}
            style={[styles.sideButton, flashOn && styles.sideButtonActive]}
          >
            <Zap size={24} color="#FFFFFF" fill={flashOn ? '#FFFFFF' : 'transparent'} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
  },
  permissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    color: '#8B8B8B',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#C9A227',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 280,
    height: 380,
    position: 'relative',
  },
  frameBorder: {
    position: 'absolute',
    borderColor: '#C9A227',
    borderStyle: 'dashed',
  },
  frameTop: {
    top: 0,
    left: 20,
    right: 20,
    height: 0,
    borderTopWidth: 2,
  },
  frameRight: {
    top: 20,
    right: 0,
    bottom: 20,
    width: 0,
    borderRightWidth: 2,
  },
  frameBottom: {
    bottom: 0,
    left: 20,
    right: 20,
    height: 0,
    borderBottomWidth: 2,
  },
  frameLeft: {
    top: 20,
    left: 0,
    bottom: 20,
    width: 0,
    borderLeftWidth: 2,
  },
  cornerAccent: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#C9A227',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#C9A227',
    shadowColor: '#C9A227',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  progressBarTrack: {
    width: 220,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#C9A227',
  },
  progressPercent: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  successFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 40,
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonActive: {
    backgroundColor: 'rgba(201, 162, 39, 0.5)',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#C9A227',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C9A227',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C9A227',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    width: 24,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconLens: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
