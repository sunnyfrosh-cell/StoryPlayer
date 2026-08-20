import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, Check, User as UserIcon, AtSign, MapPin, Twitter, Instagram, Youtube, Globe, CreditCard as Edit3, Image as ImageIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';
import { useUser, useToast } from '@/contexts';
import { Avatar } from '@/components';
import { validateUsername, normalizeMediaUri } from '@/utils';
import { uploadAvatar, uploadCoverImage, isCloudinaryConfigured } from '@/services/cloudinary';
import type { SocialLinks } from '@/types';

interface EditFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: LucideIcon;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'url' | 'email-address';
  maxLength?: number;
}

function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  icon: Icon,
  multiline = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  maxLength,
}: EditFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputIcon}>
          <Icon size={18} color={colors.textMuted} />
        </View>
        <TextInput
          style={[styles.textInput, multiline && styles.textInputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          maxLength={maxLength}
        />
      </View>
    </View>
  );
}

interface ImagePickerButtonProps {
  onPress: () => void;
  uploading: boolean;
  progress: number;
  icon: LucideIcon;
  label: string;
}

function ImagePickerButton({ onPress, uploading, progress, icon: Icon, label }: ImagePickerButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 320 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 260 });
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={uploading}>
      <Animated.View style={[styles.pickerBtn, animatedStyle]}>
        {uploading ? (
          <View style={styles.pickerBtnContent}>
            <ActivityIndicator size={14} color={colors.text} />
            <Text style={styles.pickerBtnText}>
              {progress > 0 ? `${progress}%` : 'Uploading…'}
            </Text>
          </View>
        ) : (
          <View style={styles.pickerBtnContent}>
            <Icon size={14} color={colors.text} />
            <Text style={styles.pickerBtnText}>{label}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function EditProfileScreen() {
  const { profile, updateProfile, isLoading } = useUser();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Load existing profile data once profile is available
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? '');
    setUsername(profile.username ?? '');
    setBio(profile.bio ?? '');
    setLocation(profile.location ?? '');
    setTwitter(profile.socialLinks?.twitter ?? '');
    setInstagram(profile.socialLinks?.instagram ?? '');
    setYoutube(profile.socialLinks?.youtube ?? '');
    setWebsite(profile.socialLinks?.website ?? '');
    setAvatarPreview(normalizeMediaUri(profile.avatarUrl) ?? null);
    setCoverPreview(normalizeMediaUri(profile.coverUrl) ?? null);
  }, [profile]);

  const coverUri = useMemo(() => normalizeMediaUri(coverPreview), [coverPreview]);

  const handleAvatarPick = useCallback(async () => {
    if (!profile) return;
    if (!isCloudinaryConfigured()) {
      toast.error('Image uploads are not configured. Add your Cloudinary credentials to .env.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is needed to select a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const rawUri = result.assets?.[0]?.uri;
    const normalizedUri = normalizeMediaUri(rawUri);
    if (result.canceled || !normalizedUri) {
      if (!result.canceled) toast.error('The selected image is invalid. Please choose another.');
      return;
    }

    // Immediate local preview
    setAvatarPreview(normalizedUri);
    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const upload = await uploadAvatar(profile.id, normalizedUri, {
        onProgress: (pct) => setAvatarProgress(pct),
      });
      await updateProfile({ avatarUrl: upload.secureUrl });
      toast.success('Profile picture updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not upload profile picture.';
      toast.error(message);
      // Revert preview on failure
      setAvatarPreview(normalizeMediaUri(profile.avatarUrl) ?? null);
    } finally {
      setAvatarUploading(false);
      setAvatarProgress(0);
    }
  }, [profile, updateProfile, toast]);

  const handleCoverPick = useCallback(async () => {
    if (!profile) return;
    if (!isCloudinaryConfigured()) {
      toast.error('Image uploads are not configured. Add your Cloudinary credentials to .env.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is needed to select a cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    const rawUri = result.assets?.[0]?.uri;
    const normalizedUri = normalizeMediaUri(rawUri);
    if (result.canceled || !normalizedUri) {
      if (!result.canceled) toast.error('The selected cover image is invalid. Please choose another.');
      return;
    }

    setCoverPreview(normalizedUri);
    setCoverUploading(true);
    setCoverProgress(0);
    try {
      const upload = await uploadCoverImage(profile.id, normalizedUri, {
        onProgress: (pct) => setCoverProgress(pct),
      });
      await updateProfile({ coverUrl: upload.secureUrl });
      toast.success('Cover image updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not upload cover image.';
      toast.error(message);
      setCoverPreview(normalizeMediaUri(profile.coverUrl) ?? null);
    } finally {
      setCoverUploading(false);
      setCoverProgress(0);
    }
  }, [profile, updateProfile, toast]);

  // Compute only changed fields to avoid unnecessary writes
  const buildPatch = useCallback(() => {
    if (!profile) return null;
    const patch: Record<string, unknown> = {};
    if (displayName.trim() !== (profile.displayName ?? '')) {
      patch.displayName = displayName.trim();
    }
    if (username.trim() !== profile.username) {
      patch.username = username.trim();
    }
    if (bio.trim() !== (profile.bio ?? '')) {
      patch.bio = bio.trim() || null;
    }
    if (location.trim() !== (profile.location ?? '')) {
      patch.location = location.trim() || null;
    }
    const newSocial: SocialLinks = {
      twitter: twitter.trim() || null,
      instagram: instagram.trim() || null,
      youtube: youtube.trim() || null,
      website: website.trim() || null,
    };
    const oldSocial = profile.socialLinks ?? { twitter: null, instagram: null, youtube: null, website: null };
    if (
      newSocial.twitter !== oldSocial.twitter ||
      newSocial.instagram !== oldSocial.instagram ||
      newSocial.youtube !== oldSocial.youtube ||
      newSocial.website !== oldSocial.website
    ) {
      patch.socialLinks = newSocial;
    }
    return patch;
  }, [profile, displayName, username, bio, location, twitter, instagram, youtube, website]);

  const handleSave = useCallback(async () => {
    if (!profile) return;
    const check = validateUsername(username);
    if (!check.valid) {
      setError(check.error);
      return;
    }
    if (displayName.trim().length === 0) {
      setError('Display name cannot be empty.');
      return;
    }
    setError(null);
    const patch = buildPatch();
    if (!patch || Object.keys(patch).length === 0) {
      toast.info('No changes to save.');
      router.back();
      return;
    }
    setSaving(true);
    try {
      await updateProfile(patch as Parameters<typeof updateProfile>[0]);
      toast.success('Profile updated successfully.');
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save your profile.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [profile, username, displayName, buildPatch, updateProfile, toast]);

  const handleCancel = useCallback(() => {
    if (saving || avatarUploading || coverUploading) {
      Alert.alert(
        'Discard changes?',
        'An action is still in progress. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => router.back() },
        ],
      );
      return;
    }
    router.back();
  }, [saving, avatarUploading, coverUploading]);

  if (!profile) {
    return (
      <View style={styles.loadingShell}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  const topInset = insets.top;
  const bottomInset = insets.bottom;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + spacing.sm }]}>
        <Pressable onPress={handleCancel} style={styles.headerBtn} hitSlop={12}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving || isLoading}
          style={[styles.headerBtn, styles.saveBtn, (saving || isLoading) && styles.saveBtnDisabled]}
          hitSlop={12}
        >
          {saving || isLoading ? (
            <ActivityIndicator size={20} color={colors.text} />
          ) : (
            <Check size={22} color={colors.text} />
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? topInset : 0}
      >
        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: bottomInset + spacing['3xl'] }}
        >
          <View>
            {/* Cover Image */}
            <View style={styles.coverWrap}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
              ) : (
                <LinearGradient
                  colors={[colors.primaryDark, colors.secondaryDark, colors.background]}
                  style={styles.coverImage}
                />
              )}
              <LinearGradient
                colors={['rgba(11,11,15,0.1)', 'rgba(11,11,15,0.6)']}
                style={styles.coverOverlay}
              />
              <View style={styles.coverActionRow}>
                <ImagePickerButton
                  onPress={handleCoverPick}
                  uploading={coverUploading}
                  progress={coverProgress}
                  icon={ImageIcon}
                  label="Change cover"
                />
              </View>
            </View>

            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <Avatar uri={avatarPreview} size={110} ring />
                <Pressable
                  onPress={handleAvatarPick}
                  disabled={avatarUploading}
                  style={styles.avatarCameraBtn}
                >
                  {avatarUploading ? (
                    avatarProgress > 0 ? (
                      <Text style={styles.avatarProgressText}>{avatarProgress}%</Text>
                    ) : (
                      <ActivityIndicator size={14} color={colors.text} />
                    )
                  ) : (
                    <Camera size={16} color={colors.text} />
                  )}
                </Pressable>
              </View>
              <Pressable onPress={handleAvatarPick} disabled={avatarUploading}>
                <Text style={styles.avatarActionLabel}>
                  {avatarUploading ? 'Uploading…' : 'Change profile picture'}
                </Text>
              </Pressable>
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Profile</Text>

              <EditField
                label="Display Name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your display name"
                icon={UserIcon}
                autoCapitalize="words"
                maxLength={30}
              />

              <EditField
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                icon={AtSign}
                maxLength={20}
              />

              <EditField
                label="Bio"
                value={bio}
                onChangeText={setBio}
                placeholder="Tell viewers about yourself..."
                icon={Edit3}
                multiline
                autoCapitalize="sentences"
                maxLength={160}
              />

              <EditField
                label="Location"
                value={location}
                onChangeText={setLocation}
                placeholder="City, Country"
                icon={MapPin}
                autoCapitalize="words"
              />
            </View>

            {/* Social Links */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Social Links</Text>

              <EditField
                label="Twitter / X"
                value={twitter}
                onChangeText={setTwitter}
                placeholder="https://twitter.com/username"
                icon={Twitter}
                keyboardType="url"
              />

              <EditField
                label="Instagram"
                value={instagram}
                onChangeText={setInstagram}
                placeholder="https://instagram.com/username"
                icon={Instagram}
                keyboardType="url"
              />

              <EditField
                label="YouTube"
                value={youtube}
                onChangeText={setYoutube}
                placeholder="https://youtube.com/@channel"
                icon={Youtube}
                keyboardType="url"
              />

              <EditField
                label="Website"
                value={website}
                onChangeText={setWebsite}
                placeholder="https://yourwebsite.com"
                icon={Globe}
                keyboardType="url"
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Bottom Save Button (visible, not hidden by keyboard) */}
            <View style={styles.bottomActions}>
              <Pressable
                onPress={handleCancel}
                style={[styles.bottomBtn, styles.bottomBtnGhost]}
                disabled={saving}
              >
                <Text style={styles.bottomBtnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={[styles.bottomBtn, styles.bottomBtnPrimary, (saving || isLoading) && styles.bottomBtnDisabled]}
                disabled={saving || isLoading}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bottomBtnGradient}
                >
                  {saving || isLoading ? (
                    <View style={styles.bottomBtnContent}>
                      <ActivityIndicator size={16} color={colors.text} />
                      <Text style={styles.bottomBtnText}>Saving…</Text>
                    </View>
                  ) : (
                    <View style={styles.bottomBtnContent}>
                      <Check size={16} color={colors.text} />
                      <Text style={styles.bottomBtnText}>Save changes</Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  loadingShell: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontFamily: 'Sora-SemiBold',
    fontSize: 18,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },

  // Cover
  coverWrap: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coverActionRow: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.base,
  },

  // Picker button
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(11,11,15,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pickerBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pickerBtnText: {
    color: colors.text,
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    fontWeight: '600',
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginTop: -spacing['4xl'],
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarCameraBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  avatarProgressText: {
    color: colors.text,
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    fontWeight: '600',
  },
  avatarActionLabel: {
    color: colors.secondary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },

  // Form
  formSection: {
    paddingHorizontal: spacing.base,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Sora-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  // Field
  fieldWrap: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    backgroundColor: colors.card,
    borderRadius: radius.base,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputIcon: {
    paddingLeft: spacing.base,
    paddingRight: spacing.sm,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 52,
    color: colors.text,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    paddingVertical: spacing.md,
    paddingRight: spacing.base,
  },
  textInputMultiline: {
    minHeight: 80,
    paddingTop: spacing.md,
  },

  // Error
  errorBanner: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: radius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },

  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  bottomBtn: {
    flex: 1,
    borderRadius: radius.base,
    minHeight: 50,
    overflow: 'hidden',
  },
  bottomBtnGhost: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  bottomBtnGhostText: {
    color: colors.textSecondary,
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomBtnPrimary: {},
  bottomBtnDisabled: {
    opacity: 0.5,
  },
  bottomBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bottomBtnText: {
    color: colors.text,
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    fontWeight: '600',
  },
});
