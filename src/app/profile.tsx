import { useState } from 'react';
import { Text, View, ScrollView, Pressable, Image, Alert, Modal, TextInput, ActivityIndicator, Switch, Linking } from 'react-native';
import { User, LogOut, Trash2, ChevronRight, Star, Camera, BookOpen, X, CheckCircle, AlertCircle, Clock, Bell, Moon, Mail, Edit3, Shield } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useUserScans, useUserRatings, useUpdateUserProfile } from '@/lib/supabase-hooks';
import type { ScanWithSake } from '@/lib/database.types';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, isGuest, signOut } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit profile state
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  // Fetch user stats from Supabase
  const { data: scans } = useUserScans(user?.id);
  const { data: ratings } = useUserRatings(user?.id);
  const updateProfile = useUpdateUserProfile();

  const scannedCount = scans?.length ?? 0;
  const reviewedCount = ratings?.length ?? 0;
  const unmatchedCount = scans?.filter(s => !s.matched).length ?? 0;

  const userDisplayName = user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? 'Guest User';
  const userEmail = user?.email ?? 'No email';
  const userAvatar = user?.user_metadata?.avatar_url ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face';

  const handleScanPress = async (scan: ScanWithSake) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (scan.matched && scan.sake_id) {
      router.push(`/sake/${scan.sake_id}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace('/welcome');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Call Supabase Edge Function to delete user data
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: user?.id },
      });

      if (error) throw error;

      // Sign out the user
      await signOut();
      setShowDeleteModal(false);
      router.replace('/welcome');
    } catch (err) {
      console.error('Error deleting account:', err);
      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/welcome');
  };

  const openEditProfile = () => {
    setEditDisplayName(userDisplayName);
    setEditAvatarUrl(userAvatar);
    setShowEditProfileModal(true);
  };

  const handlePickImage = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploadingAvatar(true);
      try {
        const asset = result.assets[0];
        const fileName = `avatar-${user?.id}-${Date.now()}.jpg`;

        // Upload to Supabase Storage
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        setEditAvatarUrl(urlData.publicUrl);
      } catch (err) {
        console.error('Error uploading avatar:', err);
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Update user metadata in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: editDisplayName.trim(),
          avatar_url: editAvatarUrl,
        },
      });

      if (error) throw error;

      // Also update in users table if it exists
      await updateProfile.mutateAsync({
        userId: user.id,
        displayName: editDisplayName.trim(),
        avatarUrl: editAvatarUrl,
      });

      setShowEditProfileModal(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error updating profile:', err);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationsEnabled(value);
    // TODO: Persist to AsyncStorage or user settings
  };

  const handleToggleDarkMode = async (value: boolean) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDarkModeEnabled(value);
    // TODO: Implement theme switching
  };

  return (
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="px-5 py-4">
          <Text style={{ fontFamily: 'serif', fontSize: 28, fontWeight: '600', color: '#1a1a1a' }}>
            Profile
          </Text>
        </View>

        {/* Profile Card */}
        <View className="mx-5 mb-6">
          <View
            className="p-5 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
          >
            <View className="flex-row items-center">
              <Pressable onPress={!isGuest ? openEditProfile : undefined}>
                <View
                  className="w-20 h-20 rounded-full overflow-hidden"
                  style={{ backgroundColor: '#F5EED9' }}
                >
                  {isGuest ? (
                    <View className="flex-1 items-center justify-center">
                      <User size={40} color="#C9A227" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: userAvatar }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  )}
                </View>
                {!isGuest && (
                  <View
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full items-center justify-center"
                    style={{ backgroundColor: '#C9A227', borderWidth: 2, borderColor: '#FFFFFF' }}
                  >
                    <Edit3 size={14} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
              <View className="flex-1 ml-4">
                <Text className="text-xl font-bold text-[#1a1a1a]">
                  {isGuest ? 'Guest User' : userDisplayName}
                </Text>
                <Text className="text-[#8B8B8B] text-sm mt-1">
                  {isGuest ? 'Sign in to save your data' : userEmail}
                </Text>
                {isGuest ? (
                  <Pressable
                    onPress={handleSignIn}
                    className="mt-3 px-4 py-2 rounded-full self-start"
                    style={{ backgroundColor: '#C9A227' }}
                  >
                    <Text className="text-white text-sm font-semibold">Sign In</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={openEditProfile}
                    className="mt-3 px-4 py-2 rounded-full self-start flex-row items-center"
                    style={{ backgroundColor: '#F5EED9' }}
                  >
                    <Edit3 size={14} color="#C9A227" />
                    <Text className="text-[#C9A227] text-sm font-semibold ml-1">Edit Profile</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row mt-5 pt-5" style={{ borderTopWidth: 1, borderTopColor: '#F0EDE5' }}>
              <View className="flex-1 items-center">
                <View className="flex-row items-center mb-1">
                  <Camera size={16} color="#C9A227" />
                </View>
                <Text className="text-2xl font-bold text-[#1a1a1a]">{scannedCount}</Text>
                <Text className="text-xs text-[#8B8B8B] font-medium">SCANNED</Text>
              </View>
              <View className="w-px bg-[#F0EDE5]" />
              <View className="flex-1 items-center">
                <View className="flex-row items-center mb-1">
                  <Star size={16} color="#C9A227" />
                </View>
                <Text className="text-2xl font-bold text-[#1a1a1a]">{reviewedCount}</Text>
                <Text className="text-xs text-[#8B8B8B] font-medium">REVIEWED</Text>
              </View>
              <View className="w-px bg-[#F0EDE5]" />
              <View className="flex-1 items-center">
                <View className="flex-row items-center mb-1">
                  <BookOpen size={16} color="#C9A227" />
                </View>
                <Text className="text-2xl font-bold text-[#1a1a1a]">0</Text>
                <Text className="text-xs text-[#8B8B8B] font-medium">FOLLOWING</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Scans Section */}
        {scans && scans.length > 0 && (
          <View className="mx-5 mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider">
                RECENT SCANS
              </Text>
              {unmatchedCount > 0 && (
                <View className="flex-row items-center px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7' }}>
                  <AlertCircle size={12} color="#D97706" />
                  <Text className="text-xs text-[#D97706] font-medium ml-1">
                    {unmatchedCount} pending review
                  </Text>
                </View>
              )}
            </View>

            <View
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
            >
              {scans.slice(0, 5).map((scan, index) => (
                <Pressable
                  key={scan.id}
                  onPress={() => handleScanPress(scan)}
                  className="flex-row items-center p-3"
                  style={{
                    borderBottomWidth: index < Math.min(scans.length - 1, 4) ? 1 : 0,
                    borderBottomColor: '#F0EDE5',
                  }}
                >
                  {/* Scan Image Thumbnail */}
                  <View
                    className="w-12 h-12 rounded-lg overflow-hidden"
                    style={{ backgroundColor: '#F5EED9' }}
                  >
                    {scan.scanned_image_url ? (
                      <Image
                        source={{ uri: scan.scanned_image_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : scan.sake?.label_image_url ? (
                      <Image
                        source={{ uri: scan.sake.label_image_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Camera size={20} color="#C9A227" />
                      </View>
                    )}
                  </View>

                  {/* Scan Info */}
                  <View className="flex-1 ml-3">
                    <Text className="text-[#1a1a1a] font-semibold text-base" numberOfLines={1}>
                      {scan.matched && scan.sake?.name
                        ? scan.sake.name
                        : 'Unidentified Label'}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Clock size={12} color="#8B8B8B" />
                      <Text className="text-[#8B8B8B] text-xs ml-1">
                        {formatDate(scan.created_at)}
                      </Text>
                      {scan.sake?.brewery && (
                        <Text className="text-[#8B8B8B] text-xs ml-2">
                          • {scan.sake.brewery}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Match Status */}
                  {scan.matched ? (
                    <View className="flex-row items-center">
                      <CheckCircle size={16} color="#10B981" />
                      <ChevronRight size={18} color="#8B8B8B" />
                    </View>
                  ) : (
                    <View className="px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7' }}>
                      <Text className="text-xs text-[#D97706] font-medium">Pending</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            {scans.length > 5 && (
              <Pressable className="items-center py-3">
                <Text className="text-[#C9A227] font-medium">
                  View all {scans.length} scans
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Preferences Section */}
        <View className="mx-5 mb-6">
          <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider mb-3">
            PREFERENCES
          </Text>

          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
          >
            {/* Notifications */}
            <View
              className="flex-row items-center p-4"
              style={{ borderBottomWidth: 1, borderBottomColor: '#F0EDE5' }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <Bell size={20} color="#D97706" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-[#1a1a1a] text-base font-medium">
                  Notifications
                </Text>
                <Text className="text-[#8B8B8B] text-xs mt-0.5">
                  Get updates on new sake and features
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E5E5E5', true: '#C9A227' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Dark Mode */}
            <View
              className="flex-row items-center p-4"
              style={{ borderBottomWidth: 1, borderBottomColor: '#F0EDE5' }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#E0E7FF' }}
              >
                <Moon size={20} color="#6366F1" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-[#1a1a1a] text-base font-medium">
                  Dark Mode
                </Text>
                <Text className="text-[#8B8B8B] text-xs mt-0.5">
                  Switch to dark theme
                </Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: '#E5E5E5', true: '#C9A227' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Privacy */}
            <Pressable
              className="flex-row items-center p-4"
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/privacy-settings');
              }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#DCFCE7' }}
              >
                <Shield size={20} color="#16A34A" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-[#1a1a1a] text-base font-medium">
                  Privacy Settings
                </Text>
                <Text className="text-[#8B8B8B] text-xs mt-0.5">
                  Manage data and privacy options
                </Text>
              </View>
              <ChevronRight size={20} color="#8B8B8B" />
            </Pressable>
          </View>
        </View>

        {/* Support Section */}
        <View className="mx-5 mb-6">
          <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider mb-3">
            SUPPORT
          </Text>

          <View
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
          >
            {/* Contact Us */}
            <Pressable
              className="flex-row items-center p-4"
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const url = 'https://sakescan.com/contact';
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                  await Linking.openURL(url);
                }
              }}
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#FCE7F3' }}
              >
                <Mail size={20} color="#DB2777" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-[#1a1a1a] text-base font-medium">
                  Contact Us
                </Text>
                <Text className="text-[#8B8B8B] text-xs mt-0.5">
                  Get in touch with our team
                </Text>
              </View>
              <ChevronRight size={20} color="#8B8B8B" />
            </Pressable>
          </View>
        </View>

        {/* Account Section */}
        {!isGuest && (
          <View className="mx-5 mb-6">
            <Text className="text-sm font-semibold text-[#8B8B8B] tracking-wider mb-3">
              ACCOUNT
            </Text>

            <View
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EDE5' }}
            >
              <Pressable
                onPress={handleLogout}
                className="flex-row items-center p-4"
                style={{ borderBottomWidth: 1, borderBottomColor: '#F0EDE5' }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#FEF3F2' }}
                >
                  <LogOut size={20} color="#EF4444" />
                </View>
                <Text className="flex-1 text-[#1a1a1a] text-base font-medium ml-3">
                  Log Out
                </Text>
                <ChevronRight size={20} color="#8B8B8B" />
              </Pressable>

              <Pressable
                onPress={() => setShowDeleteModal(true)}
                className="flex-row items-center p-4"
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#FEF2F2' }}
                >
                  <Trash2 size={20} color="#DC2626" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[#DC2626] text-base font-medium">
                    Delete Account
                  </Text>
                  <Text className="text-[#8B8B8B] text-xs mt-0.5">
                    Permanently remove your account
                  </Text>
                </View>
                <ChevronRight size={20} color="#DC2626" />
              </Pressable>
            </View>
          </View>
        )}

        {/* App Info */}
        <View className="mx-5 items-center mt-4 mb-8">
          <Text className="text-[#8B8B8B] text-sm">SakeScan v1.0.0</Text>
          <Text className="text-[#B5B5B5] text-xs mt-1">Made with love for sake enthusiasts</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: '#FAFAF8', paddingBottom: insets.bottom + 20 }}
          >
            {/* Modal Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-[#F0EDE5]">
              <Pressable onPress={() => setShowEditProfileModal(false)}>
                <Text className="text-[#8B8B8B] text-base">Cancel</Text>
              </Pressable>
              <Text className="text-lg font-bold text-[#1a1a1a]">Edit Profile</Text>
              <Pressable onPress={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <ActivityIndicator size="small" color="#C9A227" />
                ) : (
                  <Text className="text-[#C9A227] text-base font-semibold">Save</Text>
                )}
              </Pressable>
            </View>

            {/* Avatar Edit */}
            <View className="items-center py-6">
              <Pressable onPress={handlePickImage} disabled={isUploadingAvatar}>
                <View
                  className="w-24 h-24 rounded-full overflow-hidden"
                  style={{ backgroundColor: '#F5EED9' }}
                >
                  {isUploadingAvatar ? (
                    <View className="flex-1 items-center justify-center">
                      <ActivityIndicator size="large" color="#C9A227" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: editAvatarUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  )}
                </View>
                <View
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#C9A227', borderWidth: 3, borderColor: '#FAFAF8' }}
                >
                  <Camera size={16} color="#FFFFFF" />
                </View>
              </Pressable>
              <Text className="text-[#8B8B8B] text-sm mt-3">Tap to change photo</Text>
            </View>

            {/* Form Fields */}
            <View className="px-5">
              <Text className="text-sm font-semibold text-[#8B8B8B] mb-2">DISPLAY NAME</Text>
              <TextInput
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                placeholder="Enter your name"
                placeholderTextColor="#B5B5B5"
                className="rounded-xl px-4 py-4 text-base mb-4"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#F0EDE5',
                  color: '#1a1a1a',
                }}
              />

              <Text className="text-sm font-semibold text-[#8B8B8B] mb-2">EMAIL</Text>
              <View
                className="rounded-xl px-4 py-4 mb-4"
                style={{ backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#F0EDE5' }}
              >
                <Text className="text-[#8B8B8B] text-base">{userEmail}</Text>
              </View>
              <Text className="text-xs text-[#B5B5B5] -mt-2 mb-4">
                Email cannot be changed
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-5">
          <View
            className="w-full rounded-2xl p-5"
            style={{ backgroundColor: '#FAFAF8', maxWidth: 400 }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-[#DC2626]">Delete Account</Text>
              <Pressable onPress={() => setShowDeleteModal(false)}>
                <X size={24} color="#8B8B8B" />
              </Pressable>
            </View>

            <Text className="text-[#1a1a1a] text-base mb-4 leading-6">
              This action is permanent and cannot be undone. All your scan history, reviews, and saved data will be permanently deleted.
            </Text>

            <Text className="text-[#8B8B8B] text-sm mb-2">
              Type <Text className="font-bold text-[#DC2626]">DELETE</Text> to confirm:
            </Text>

            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type DELETE"
              className="border rounded-xl px-4 py-3 mb-4 text-base"
              style={{
                borderColor: deleteConfirmText === 'DELETE' ? '#DC2626' : '#E8E4D9',
                backgroundColor: '#FFFFFF',
              }}
              autoCapitalize="characters"
            />

            <View className="flex-row">
              <Pressable
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 py-4 rounded-xl mr-2"
                style={{ backgroundColor: '#F0EDE5' }}
              >
                <Text className="text-center text-[#1a1a1a] font-semibold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                className="flex-1 py-4 rounded-xl ml-2 flex-row items-center justify-center"
                style={{
                  backgroundColor: deleteConfirmText === 'DELETE' ? '#DC2626' : '#FECACA',
                  opacity: deleteConfirmText === 'DELETE' && !isDeleting ? 1 : 0.5,
                }}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-center text-white font-semibold">Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
