import { useState, useRef, useEffect, useMemo } from 'react';
import { Text, View, Pressable, StyleSheet, Platform, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { ChevronLeft, Info, Image as ImageIcon, Zap, BookOpen, ScanLine } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { scanSakeLabel, scanSakeMenu, type MenuPreferences } from '@/lib/openai-scan';
import { useAuth } from '@/lib/auth-context';
import { useGuestUsageStore } from '@/lib/guest-usage-store';
import { useUserFavorites, useUserRatings } from '@/lib/supabase-hooks';

type ScanMode = 'label' | 'menu';

// Height of the scan frame (must match styles.frame height)
const FRAME_HEIGHT = 380;

const LABEL_STAGES = [
  { threshold: 0, label: 'Capturing label...' },
  { threshold: 20, label: 'Identifying sake...' },
  { threshold: 50, label: 'Analyzing characteristics...' },
  { threshold: 80, label: 'Finishing up...' },
];

const MENU_STAGES = [
  { threshold: 0, label: 'Reading menu...' },
  { threshold: 15, label: 'Identifying sakes...' },
  { threshold: 40, label: 'Extracting prices...' },
  { threshold: 65, label: 'Analyzing flavor profiles...' },
  { threshold: 85, label: 'Finishing up...' },
];

function getScanStage(progress: number, mode: ScanMode): string {
  const stages = mode === 'menu' ? MENU_STAGES : LABEL_STAGES;
  for (let i = stages.length - 1; i >= 0; i--) {
    if (progress >= stages[i].threshold) return stages[i].label;
  }
  return stages[0].label;
}

function mapTypeToFlavorHints(type?: string | null): string[] {
  const normalized = type?.toLowerCase() ?? '';
  if (normalized.includes('daiginjo') || normalized.includes('ginjo')) {
    return ['Floral', 'Fruity', 'Crisp'];
  }
  if (normalized.includes('junmai')) {
    return ['Umami', 'Rich', 'Dry'];
  }
  if (normalized.includes('nigori')) {
    return ['Sweet', 'Rich', 'Smooth'];
  }
  if (normalized.includes('sparkling')) {
    return ['Crisp', 'Fruity', 'Sweet'];
  }
  if (normalized.includes('honjozo') || normalized.includes('futsushu')) {
    return ['Dry', 'Smooth', 'Crisp'];
  }
  return ['Crisp', 'Smooth'];
}

function inferMenuPreferences(
  ratings: { rating: number; sake?: { type?: string | null } | null }[] | undefined,
  favorites: { sake?: { type?: string | null } | null }[] | undefined
): MenuPreferences | undefined {
  const flavorCounts = new Map<string, number>();
  let premiumVotes = 0;
  let valueVotes = 0;

  for (const rating of ratings ?? []) {
    const type = rating.sake?.type;
    if (!type || rating.rating < 4) continue;

    const weight = rating.rating >= 4.5 ? 2 : 1;
    for (const flavor of mapTypeToFlavorHints(type)) {
      flavorCounts.set(flavor, (flavorCounts.get(flavor) ?? 0) + weight);
    }

    const lowered = type.toLowerCase();
    if (lowered.includes('daiginjo') || lowered.includes('ginjo')) premiumVotes += weight;
    if (lowered.includes('junmai') || lowered.includes('honjozo') || lowered.includes('futsushu')) {
      valueVotes += weight;
    }
  }

  for (const favorite of favorites ?? []) {
    const type = favorite.sake?.type;
    if (!type) continue;
    for (const flavor of mapTypeToFlavorHints(type)) {
      flavorCounts.set(flavor, (flavorCounts.get(flavor) ?? 0) + 1);
    }

    const lowered = type.toLowerCase();
    if (lowered.includes('daiginjo') || lowered.includes('ginjo')) premiumVotes += 1;
    if (lowered.includes('junmai') || lowered.includes('honjozo') || lowered.includes('futsushu')) {
      valueVotes += 1;
    }
  }

  const preferredFlavors = [...flavorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([flavor]) => flavor);

  if (preferredFlavors.length === 0 && premiumVotes === 0 && valueVotes === 0) {
    return undefined;
  }

  const budgetBias: MenuPreferences['budgetBias'] =
    premiumVotes - valueVotes >= 2 ? 'premium' : valueVotes - premiumVotes >= 2 ? 'value' : 'balanced';

  return {
    preferredFlavors,
    budgetBias,
  };
}

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [facing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('label');
  const cameraRef = useRef<CameraView>(null);
  const { isGuest, session } = useAuth();
  const incrementLabelScan = useGuestUsageStore((s) => s.incrementLabelScan);
  const userId = session?.user?.id;
  const { data: userRatings } = useUserRatings(userId);
  const { data: userFavorites } = useUserFavorites(userId);
  const menuPreferences = useMemo(
    () => inferMenuPreferences(userRatings, userFavorites),
    [userFavorites, userRatings]
  );

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

  // Progress ticker — menu scans are slower (more tokens to generate)
  useEffect(() => {
    if (isScanning) {
      const step = scanMode === 'menu' ? 2 : 3;
      const ms = scanMode === 'menu' ? 200 : 150;
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 95) { clearInterval(interval); return 95; }
          return prev + step;
        });
      }, ms);
      return () => clearInterval(interval);
    } else {
      setScanProgress(0);
    }
  }, [isScanning, scanMode]);

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

    setCapturedImageUri(imageUri ?? null);
    setIsScanning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (scanMode === 'menu') {
        console.log('📋 Starting sake menu scan with OpenAI...');
        const result = await scanSakeMenu(base64Image, menuPreferences);

        if (result.success && result.sakes && result.sakes.length > 0) {
          console.log(`✅ Found ${result.sakes.length} sakes on menu`);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          setScanProgress(100);
          successFlash.value = withSequence(
            withTiming(0.6, { duration: 80 }),
            withTiming(0, { duration: 300 }),
          );
          await new Promise(r => setTimeout(r, 350));

          router.replace({
            pathname: '/menu-results',
            params: { menuData: JSON.stringify(result.sakes) },
          });
        } else {
          console.error('❌ Menu scan failed:', result.error);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setErrorMessage(result.error || 'Could not read the menu. Try a clearer photo.');
        }
      } else {
        console.log('🔍 Starting sake label scan with OpenAI...');
        const result = await scanSakeLabel(base64Image);

        if (result.success && result.sake) {
          console.log('✅ Successfully scanned:', result.sake.name);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          if (isGuest && !session?.access_token) {
            await incrementLabelScan();
          }

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
          console.error('❌ Scan failed:', result.error);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          router.replace({
            pathname: '/unmatched-scan',
            params: {
              errorMessage: result.error || 'Could not identify this sake label.',
              imageUri: imageUri || '',
            },
          });
        }
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage('Something went wrong. Check your internet connection and try again.');
    } finally {
      setIsScanning(false);
      setCapturedImageUri(null);
    }
  };

  const handleCapture = async () => {
    if (isScanning) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
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
      setErrorMessage('Failed to capture photo. Please try again.');
      setIsScanning(false);
    }
  };

  const handlePickImage = async () => {
    if (isScanning) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setErrorMessage('Please allow photo library access in Settings to scan from your library.');
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
        setErrorMessage('Could not read this image. Try another photo or take a new picture.');
        return;
      }

      await processImage(base64, asset.uri);
    } catch (error) {
      console.error('Image picker error:', error);
      setErrorMessage('Failed to pick image. Please try again.');
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

  const toggleScanMode = async () => {
    if (isScanning) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const wantMenu = scanMode === 'label';
    if (wantMenu && (isGuest || !session?.access_token)) {
      router.push('/paywall');
      return;
    }
    setScanMode((prev) => (prev === 'label' ? 'menu' : 'label'));
  };

  const stageText = getScanStage(scanProgress, scanMode);

  return (
    <View style={styles.container}>
      {/* Background: frozen captured photo when scanning, live camera otherwise */}
      {isScanning && capturedImageUri ? (
        <>
          <Image
            source={{ uri: capturedImageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={[StyleSheet.absoluteFillObject, styles.scanDimOverlay]} />
        </>
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={flashOn}
        />
      )}

      {/* Overlay UI - positioned absolutely on top of camera */}
      <View style={styles.overlay}>
        {/* Header — frosted glass */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 60 : 100}
          tint="dark"
          style={[styles.header, { paddingTop: insets.top + 8 }]}
        >
          <Pressable onPress={handleClose} style={styles.headerButton}>
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isScanning
              ? 'Scanning...'
              : scanMode === 'menu'
                ? 'Scan Sake Menu'
                : 'Scan Sake Label'}
          </Text>
          <Pressable style={styles.headerButton}>
            <Info size={22} color="#FFFFFF" />
          </Pressable>
        </BlurView>

        {/* Mode toggle — label vs menu */}
        {!isScanning && (
          <View style={styles.modeToggleRow}>
            <Pressable
              onPress={toggleScanMode}
              style={[
                styles.modeToggleButton,
                scanMode === 'label' && styles.modeToggleActive,
              ]}
            >
              <ScanLine size={16} color={scanMode === 'label' ? '#C9A227' : '#FFFFFF'} />
              <Text
                style={[
                  styles.modeToggleText,
                  scanMode === 'label' && styles.modeToggleTextActive,
                ]}
              >
                Label
              </Text>
            </Pressable>
            <Pressable
              onPress={toggleScanMode}
              style={[
                styles.modeToggleButton,
                scanMode === 'menu' && styles.modeToggleActive,
              ]}
            >
              <BookOpen size={16} color={scanMode === 'menu' ? '#C9A227' : '#FFFFFF'} />
              <Text
                style={[
                  styles.modeToggleText,
                  scanMode === 'menu' && styles.modeToggleTextActive,
                ]}
              >
                Menu
              </Text>
            </Pressable>
          </View>
        )}

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

        {/* Full-screen white flash on success */}
        <Animated.View style={[styles.successFlash, flashStyle]} pointerEvents="none" />

        {/* Error toast — tap to dismiss */}
        {errorMessage && (
          <Pressable
            onPress={() => setErrorMessage(null)}
            style={styles.errorToast}
          >
            <Text style={styles.errorToastText}>{errorMessage}</Text>
          </Pressable>
        )}

        {/* Bottom area: Vivino-style analyzing panel when scanning, controls when idle */}
        {isScanning ? (
          <BlurView
            intensity={Platform.OS === 'ios' ? 75 : 100}
            tint="dark"
            style={[styles.analyzingPanel, { paddingBottom: insets.bottom + 32 }]}
          >
            <Text style={styles.analyzingTitle}>
              {scanMode === 'menu' ? 'Reading Menu' : 'Analyzing with AI'}
            </Text>
            <Text style={styles.analyzingStage}>{stageText}</Text>

            {/* Thick Vivino-style progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressBarStyle]} />
            </View>

            <Text style={styles.progressLabel}>{scanProgress}%</Text>
          </BlurView>
        ) : (
          <>
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionText}>
                {scanMode === 'menu'
                  ? 'Point camera at the sake menu'
                  : 'Position label within frame'}
              </Text>
            </View>

            {/* Bottom Controls — frosted glass */}
            <BlurView
              intensity={Platform.OS === 'ios' ? 55 : 100}
              tint="dark"
              style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}
            >
              {/* Gallery Button */}
              <Pressable style={styles.sideButton} onPress={handlePickImage}>
                <ImageIcon size={24} color="#FFFFFF" />
              </Pressable>

              {/* Capture Button */}
              <Pressable onPress={handleCapture} style={styles.captureButton}>
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
            </BlurView>
          </>
        )}
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
  modeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  modeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  modeToggleActive: {
    backgroundColor: 'rgba(201, 162, 39, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.5)',
  },
  modeToggleText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  modeToggleTextActive: {
    color: '#C9A227',
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
  scanDimOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
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
    height: 3,
    borderRadius: 2,
    backgroundColor: '#C9A227',
    shadowColor: '#C9A227',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  // Vivino-style analyzing panel
  analyzingPanel: {
    paddingTop: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  analyzingTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  analyzingStage: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.1,
    marginBottom: 22,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#C9A227',
  },
  progressLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    letterSpacing: 0.8,
  },
  successFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  errorToast: {
    position: 'absolute',
    bottom: 160,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(30,10,10,0.88)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(220,60,60,0.4)',
  },
  errorToastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
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
