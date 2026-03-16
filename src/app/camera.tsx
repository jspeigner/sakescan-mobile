import { useState, useRef, useEffect } from 'react';
import { Text, View, Pressable, StyleSheet } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { ChevronLeft, Info, Image as ImageIcon, Zap } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { scanSakeLabel } from '@/lib/openai-scan';

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [facing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (isScanning) {
      // Update progress state for display
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setScanProgress(0);
    }
  }, [isScanning]);

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

        // Navigate to scan result screen with the sake data
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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        await processImage(result.assets[0].base64, result.assets[0].uri);
      }
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
          <View style={styles.frame}>
            {/* Dashed border effect using 4 sides */}
            <View style={[styles.frameBorder, styles.frameTop]} />
            <View style={[styles.frameBorder, styles.frameRight]} />
            <View style={[styles.frameBorder, styles.frameBottom]} />
            <View style={[styles.frameBorder, styles.frameLeft]} />

            {/* Corner accents */}
            <View style={[styles.cornerAccent, styles.cornerTL]} />
            <View style={[styles.cornerAccent, styles.cornerTR]} />
            <View style={[styles.cornerAccent, styles.cornerBL]} />
            <View style={[styles.cornerAccent, styles.cornerBR]} />
          </View>
        </View>

        {/* Instructions and Progress */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionText}>Position label within frame</Text>

          {isScanning && (
            <View style={styles.progressRow}>
              <View style={styles.progressDot}>
                <View style={styles.progressDotInner} />
              </View>
              <Text style={styles.analyzingText}>Analyzing with AI...</Text>
              <Text style={styles.progressPercent}>{scanProgress}%</Text>
            </View>
          )}
        </View>

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
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(201, 162, 39, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  progressDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C9A227',
  },
  analyzingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercent: {
    color: '#8B8B8B',
    fontSize: 14,
    marginLeft: 'auto',
    paddingLeft: 80,
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
