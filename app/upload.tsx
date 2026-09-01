import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { X, Upload, Film, Image as ImageIcon, Check, ChevronDown, CircleAlert as AlertCircle, WifiOff, RefreshCw, Cloud, Database, Smartphone } from 'lucide-react-native';
import { useAuth, useUser, useToast, useVideos } from '@/contexts';
import {
  uploadVideo,
  uploadVideoThumbnail,
  isCloudinaryConfigured,
  getCloudinaryConfigDiagnostics,
  getCloudinaryVideoThumbnailUrl,
  UploadError,
  type UploadResult,
} from '@/services';
import { reelRepository } from '@/firebase';
import type { VideoCategory, VideoVisibility, CreateReelInput } from '@/types';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { CustomButton, CustomInput } from '@/components';
import { normalizeMediaUri } from '@/utils';

const CATEGORIES: VideoCategory[] = [
  'Comedy', 'Education', 'Music', 'Sports', 'Movies', 'Gaming',
  'Technology', 'Lifestyle', 'Entertainment', 'News', 'Travel', 'Cooking',
];

const VISIBILITIES: { label: string; value: VideoVisibility; desc: string }[] = [
  { label: 'Public', value: 'public', desc: 'Anyone can find and watch' },
  { label: 'Unlisted', value: 'unlisted', desc: 'Only people with the link' },
  { label: 'Private', value: 'private', desc: 'Only you can watch' },
];

type UploadStage = 'idle' | 'validating' | 'video' | 'thumbnail' | 'saving' | 'done';
type UploadMode = 'video' | 'reel';

const MAX_REEL_DURATION_SECONDS = 60;

interface UploadFailure {
  stage: 'video' | 'thumbnail' | 'firestore';
  title: string;
  message: string;
  isRetryable: boolean;
}

export default function UploadVideoScreen() {
  const { firebaseUser } = useAuth();
  const { profile } = useUser();
  const { createVideo, refresh } = useVideos();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VideoCategory>('Entertainment');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState<VideoVisibility>('public');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [videoResult, setVideoResult] = useState<UploadResult | null>(null);
  const [thumbResult, setThumbResult] = useState<UploadResult | null>(null);
  const [failure, setFailure] = useState<UploadFailure | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('video');
  const [reelDuration, setReelDuration] = useState(0);

  const pickVideo = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = normalizeMediaUri(asset.uri);
        if (!uri) {
          toast.error('Could not get a valid video file path. Please try again.');
          return;
        }
        // Validate duration for reel mode (DocumentPicker doesn't expose duration on web)
        // Duration will be validated after upload if needed
        if (uploadMode === 'reel') {
          // Duration check deferred to post-upload metadata
        }
        setVideoUri(uri);
        setVideoResult(null);
        setVideoUploadProgress(0);
        setFailure(null);
      }
    } catch (err) {
      console.error('[Upload] Document picker error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Could not pick video file: ${msg}`);
    }
  }, [toast, uploadMode]);

  const pickThumbnail = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = normalizeMediaUri(result.assets[0].uri);
        if (!uri) {
          toast.error('Could not get a valid thumbnail path. Please try again.');
          return;
        }
        setThumbnailUri(uri);
        setThumbResult(null);
        setThumbnailUploadProgress(0);
      }
    } catch (err) {
      console.error('[Upload] Image picker error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Could not pick thumbnail: ${msg}`);
    }
  }, [toast]);

  const buildFailure = useCallback(
    (err: unknown, stage: 'video' | 'thumbnail' | 'firestore'): UploadFailure => {
      if (err instanceof UploadError) {
        const titles: Record<string, string> = {
          not_configured: 'Cloudinary Not Configured',
          no_internet: 'No Internet Connection',
          invalid_uri: 'Invalid File',
          invalid_credentials: 'Cloudinary Authentication Failed',
          invalid_preset: 'Invalid Upload Preset',
          file_too_large: 'File Too Large',
          server_error: 'Cloudinary Server Error',
          timeout: 'Upload Timed Out',
          parse_error: 'Upload Parse Error',
          network: 'Network Error',
          unknown: 'Upload Failed',
        };
        const retryable = ['no_internet', 'timeout', 'network', 'server_error'].includes(err.type);
        return {
          stage,
          title: titles[err.type] ?? 'Upload Failed',
          message: err.message,
          isRetryable: retryable,
        };
      }
      const msg = err instanceof Error ? err.message : String(err);
      const isFirestoreOffline = msg.includes('offline') || msg.includes('network') || msg.includes('unreachable');
      return {
        stage,
        title: stage === 'firestore' ? 'Database Save Failed' : 'Upload Failed',
        message: msg,
        isRetryable: isFirestoreOffline || stage === 'firestore',
      };
    },
    [],
  );

  const handleUpload = useCallback(async () => {
    if (!title.trim()) {
      toast.error('Please add a title');
      return;
    }
    if (!videoUri) {
      toast.error('Please select a video file');
      return;
    }

    const { configured, missing } = getCloudinaryConfigDiagnostics();
    if (!configured) {
      const msg = `Cloudinary is not configured. Missing: ${missing.join(', ')}. Add these to your .env file.`;
      console.error('[Upload] Config check failed:', msg);
      toast.error(msg);
      return;
    }

    const normalizedVideoUri = normalizeMediaUri(videoUri);
    if (!normalizedVideoUri) {
      toast.error('The selected video file is invalid. Please choose another file.');
      return;
    }

    const normalizedThumbnailUri = normalizeMediaUri(thumbnailUri);
    if (thumbnailUri && !normalizedThumbnailUri) {
      toast.error('The selected thumbnail is invalid. Please choose another image.');
      return;
    }

    if (!firebaseUser) {
      toast.error('You must be signed in to upload');
      return;
    }

    setFailure(null);
    setIsUploading(true);
    setUploadStage('validating');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let finalVideoUrl = videoResult?.secureUrl ?? '';
      let finalThumbUrl = thumbResult?.secureUrl ?? '';
      let duration = videoResult?.durationSeconds ?? 0;
      // Validate reel duration after upload (since DocumentPicker doesn't expose duration on web)
      if (uploadMode === 'reel' && duration > MAX_REEL_DURATION_SECONDS) {
        setFailure({
          stage: 'video',
          title: 'Reel Too Long',
          message: `Reels must be under 60 seconds. Your video is ${Math.round(duration)}s.`,
          isRetryable: false,
        });
        setUploadStage('idle');
        return;
      }

      // ---- Stage 1: Upload video to Cloudinary ----
      if (!finalVideoUrl) {
        setUploadStage('video');
        setVideoUploadProgress(0);
        console.log('[Upload] Starting video upload to Cloudinary:', normalizedVideoUri);
        try {
          const result = await uploadVideo(firebaseUser.uid, normalizedVideoUri, {
            onProgress: setVideoUploadProgress,
            signal: controller.signal,
          });
          finalVideoUrl = result.secureUrl;
          duration = result.durationSeconds ?? 0;
          setVideoResult(result);
          console.log('[Upload] Video uploaded successfully:', result.secureUrl);
        } catch (err) {
          console.error('[Upload] Video upload to Cloudinary failed:', err);
          if (err instanceof Error && err.stack) console.error(err.stack);
          const f = buildFailure(err, 'video');
          setFailure(f);
          toast.error(`${f.title}: ${f.message}`);
          return;
        }
      }

      // ---- Stage 2: Upload thumbnail to Cloudinary (optional) ----
      if (normalizedThumbnailUri && !finalThumbUrl) {
        setUploadStage('thumbnail');
        setThumbnailUploadProgress(0);
        console.log('[Upload] Starting thumbnail upload:', normalizedThumbnailUri);
        try {
          const thumbRes = await uploadVideoThumbnail(firebaseUser.uid, normalizedThumbnailUri, {
            onProgress: setThumbnailUploadProgress,
            signal: controller.signal,
          });
          finalThumbUrl = thumbRes.secureUrl;
          setThumbResult(thumbRes);
          console.log('[Upload] Thumbnail uploaded successfully:', thumbRes.secureUrl);
        } catch (err) {
          console.error('[Upload] Thumbnail upload failed (non-fatal):', err);
          toast.error('Thumbnail upload failed, but video was uploaded. Using auto-generated thumbnail.');
        }
      }

      // Fallback: derive a Cloudinary thumbnail from the uploaded video URL.
      if (!finalThumbUrl) {
        finalThumbUrl = finalVideoUrl ? getCloudinaryVideoThumbnailUrl(finalVideoUrl) ?? '' : '';
      }

      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

      // ---- Stage 3: Save metadata to Firestore ----
      setUploadStage('saving');
      console.log('[Upload] Saving to Firestore...', uploadMode);
      try {
        let id: string;
        if (uploadMode === 'reel') {
          const reelInput: CreateReelInput = {
            title: title.trim(),
            description: description.trim(),
            videoUrl: finalVideoUrl,
            thumbnailUrl: finalThumbUrl,
            durationSeconds: duration || reelDuration,
            hashtags: tags,
            creatorId: firebaseUser.uid,
            creatorName: profile?.displayName ?? profile?.username ?? 'Creator',
            creatorAvatarUrl: profile?.avatarUrl ?? null,
            creatorIsVerified: profile?.isVerified ?? false,
          };
          id = await reelRepository.create(reelInput);
        } else {
          id = await createVideo({
            title: title.trim(),
            description: description.trim(),
            category,
            tags,
            visibility,
            videoUrl: finalVideoUrl,
            thumbnailUrl: finalThumbUrl,
            durationSeconds: duration,
            creatorId: firebaseUser.uid,
            creatorName: profile?.displayName ?? profile?.username ?? 'Creator',
            creatorAvatarUrl: profile?.avatarUrl ?? null,
            creatorIsVerified: profile?.isVerified ?? false,
          });
        }
        console.log('[Upload] Firestore save succeeded, ID:', id);
        setUploadStage('done');
        toast.success(uploadMode === 'reel' ? 'Reel uploaded successfully!' : 'Video uploaded successfully!');
        await refresh();
        router.replace(uploadMode === 'reel' ? '/(main)/reels' : `/watch/${id}`);
      } catch (err) {
        console.error('[Upload] Firestore save failed:', err);
        if (err instanceof Error && err.stack) console.error(err.stack);
        const f = buildFailure(err, 'firestore');
        setFailure(f);
        toast.error(`${f.title}: ${f.message}`);
        return;
      }
    } catch (err) {
      console.error('[Upload] Unexpected error during upload flow:', err);
      if (err instanceof Error && err.stack) console.error(err.stack);
      const msg = err instanceof Error ? err.message : String(err);
      const f: UploadFailure = {
        stage: 'video',
        title: 'Unexpected Error',
        message: msg,
        isRetryable: true,
      };
      setFailure(f);
      toast.error(`Unexpected error: ${msg}`);
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
      if (uploadStage !== 'done') setUploadStage('idle');
    }
  }, [title, videoUri, thumbnailUri, firebaseUser, profile, category, visibility, tagsInput, description, createVideo, refresh, toast, videoResult, thumbResult, buildFailure, uploadStage, uploadMode, reelDuration]);

  const handleCancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadStage('idle');
    setVideoUploadProgress(0);
    setThumbnailUploadProgress(0);
    toast.info('Upload cancelled');
  }, [toast]);

  const handleRetry = useCallback(() => {
    setFailure(null);
    setVideoUploadProgress(0);
    setThumbnailUploadProgress(0);
    handleUpload();
  }, [handleUpload]);

  const canUpload = Boolean(title.trim() && videoUri && !isUploading);

  const stageLabel = uploadStage === 'video'
    ? `Uploading ${uploadMode}... ${Math.round(videoUploadProgress)}%`
    : uploadStage === 'thumbnail'
    ? `Uploading thumbnail... ${Math.round(thumbnailUploadProgress)}%`
    : uploadStage === 'saving'
    ? `Saving ${uploadMode} details...`
    : uploadStage === 'validating'
    ? 'Checking requirements...'
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <X size={24} color={colors.text} />
          </Pressable>
          <Text style={[typography.h3, styles.headerTitle]}>{uploadMode === 'reel' ? 'Upload Reel' : 'Upload Video'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Mode toggle */}
            <View style={styles.modeToggleWrap}>
              <Pressable
                style={[styles.modeToggleBtn, uploadMode === 'video' && styles.modeToggleActive]}
                onPress={() => { setUploadMode('video'); setReelDuration(0); }}
              >
                <Film size={16} color={uploadMode === 'video' ? colors.text : colors.textMuted} />
                <Text style={[typography.label, { color: uploadMode === 'video' ? colors.text : colors.textMuted }]}>Video</Text>
              </Pressable>
              <Pressable
                style={[styles.modeToggleBtn, uploadMode === 'reel' && styles.modeToggleActive]}
                onPress={() => { setUploadMode('reel'); setReelDuration(0); }}
              >
                <Smartphone size={16} color={uploadMode === 'reel' ? colors.text : colors.textMuted} />
                <Text style={[typography.label, { color: uploadMode === 'reel' ? colors.text : colors.textMuted }]}>Reel (under 60s)</Text>
              </Pressable>
            </View>

            {uploadMode === 'reel' ? (
              <View style={styles.reelHint}>
                <Text style={[typography.caption, { color: colors.secondary }]}>
                  Reels are vertical short videos (9:16) under 60 seconds. They appear in the Reels feed.
                </Text>
              </View>
            ) : null}

            <Pressable style={styles.videoPicker} onPress={pickVideo}>
              {videoUri ? (
                <View style={styles.videoPreview}>
                  {Platform.OS === 'web' ? (
                    <video src={videoUri} style={styles.videoElement} controls={false} muted />
                  ) : (
                    <Film size={48} color={colors.secondary} />
                  )}
                  <View style={styles.videoPreviewOverlay}>
                    <Text style={[typography.caption, styles.videoPreviewText]} numberOfLines={1}>
                      Video selected
                    </Text>
                    <Pressable onPress={pickVideo} style={styles.changeBtn}>
                      <Text style={[typography.caption, { color: colors.secondary }]}>Change</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Upload size={40} color={colors.textMuted} />
                  <Text style={[typography.body, styles.placeholderText]}>Select a video file</Text>
                  <Text style={[typography.caption, styles.placeholderSub]}>MP4, MOV, AVI — up to 500MB</Text>
                </View>
              )}
            </Pressable>

            {(videoUploadProgress > 0 || isUploading) && uploadStage === 'video' ? (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${videoUploadProgress}%` }]} />
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Uploading video... {Math.round(videoUploadProgress)}%
                </Text>
              </View>
            ) : null}

            <Pressable style={styles.thumbPicker} onPress={pickThumbnail}>
              {thumbnailUri ? (
                <Image source={{ uri: thumbnailUri }} style={styles.thumbPreview} />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <ImageIcon size={24} color={colors.textMuted} />
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Add thumbnail (optional)
                  </Text>
                </View>
              )}
            </Pressable>

            {(thumbnailUploadProgress > 0 || isUploading) && uploadStage === 'thumbnail' ? (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${thumbnailUploadProgress}%` }]} />
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Uploading thumbnail... {Math.round(thumbnailUploadProgress)}%
                </Text>
              </View>
            ) : null}

            <CustomInput
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Give your video a title"
              maxLength={100}
            />

            <CustomInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Tell viewers about your video"
              multiline
              numberOfLines={4}
              maxLength={2000}
            />

            <Text style={[typography.label, styles.fieldLabel]}>Category</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => { setShowCategoryPicker(!showCategoryPicker); setShowVisibilityPicker(false); }}
            >
              <Text style={[typography.body, { color: colors.text }]}>{category}</Text>
              <ChevronDown size={20} color={colors.textMuted} />
            </Pressable>
            {showCategoryPicker ? (
              <View style={styles.dropdownList}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.dropdownItem, cat === category && styles.dropdownItemActive]}
                    onPress={() => { setCategory(cat); setShowCategoryPicker(false); }}
                  >
                    <Text style={[typography.body, { color: cat === category ? colors.secondary : colors.textSecondary }]}>
                      {cat}
                    </Text>
                    {cat === category ? <Check size={18} color={colors.secondary} /> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            <CustomInput
              label="Tags (comma-separated)"
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="e.g. gaming, tutorial, funny"
            />

            <Text style={[typography.label, styles.fieldLabel]}>Visibility</Text>
            <Pressable
              style={styles.dropdown}
              onPress={() => { setShowVisibilityPicker(!showVisibilityPicker); setShowCategoryPicker(false); }}
            >
              <Text style={[typography.body, { color: colors.text }]}>
                {VISIBILITIES.find((v) => v.value === visibility)?.label}
              </Text>
              <ChevronDown size={20} color={colors.textMuted} />
            </Pressable>
            {showVisibilityPicker ? (
              <View style={styles.dropdownList}>
                {VISIBILITIES.map((v) => (
                  <Pressable
                    key={v.value}
                    style={[styles.dropdownItem, v.value === visibility && styles.dropdownItemActive]}
                    onPress={() => { setVisibility(v.value); setShowVisibilityPicker(false); }}
                  >
                    <View>
                      <Text style={[typography.body, { color: v.value === visibility ? colors.secondary : colors.textSecondary }]}>
                        {v.label}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>{v.desc}</Text>
                    </View>
                    {v.value === visibility ? <Check size={18} color={colors.secondary} /> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            {failure ? (
              <View style={styles.failureCard}>
                <View style={styles.failureHeader}>
                  <AlertCircle size={20} color={colors.error} />
                  <Text style={[typography.label, { color: colors.error, flex: 1 }]} numberOfLines={2}>
                    {failure.title}
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                  {failure.message}
                </Text>
                <View style={styles.failureFooter}>
                  {failure.stage === 'video' && (
                    <View style={styles.failureBadge}>
                      <Cloud size={12} color={colors.textMuted} />
                      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                        Failed at: Cloudinary upload
                      </Text>
                    </View>
                  )}
                  {failure.stage === 'firestore' && (
                    <View style={styles.failureBadge}>
                      <Database size={12} color={colors.textMuted} />
                      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                        Cloudinary OK — Failed at: Database save
                      </Text>
                    </View>
                  )}
                  {failure.isRetryable && !isUploading ? (
                    <Pressable style={styles.retryBtn} onPress={handleRetry}>
                      <RefreshCw size={14} color={colors.secondary} />
                      <Text style={[typography.caption, { color: colors.secondary, fontWeight: '600' }]}>
                        Retry
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={{ height: spacing.lg }} />

            <CustomButton
              title={isUploading ? stageLabel : (uploadMode === 'reel' ? 'Publish Reel' : 'Publish Video')}
              onPress={handleUpload}
              disabled={!canUpload}
              loading={isUploading}
              fullWidth
            />

            {isUploading ? (
              <Pressable style={styles.cancelBtn} onPress={handleCancelUpload}>
                <X size={16} color={colors.error} />
                <Text style={[typography.label, { color: colors.error }]}>Cancel Upload</Text>
              </Pressable>
            ) : null}

            {isUploading && uploadStage === 'saving' ? (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color={colors.secondary} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Saving video details...
                </Text>
              </View>
            ) : null}

            {!isCloudinaryConfigured() ? (
              <View style={styles.configWarning}>
                <AlertCircle size={16} color={colors.warning} />
                <Text style={[typography.caption, { color: colors.warning }]}>
                  Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env file.
                </Text>
              </View>
            ) : null}

            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  headerTitle: { color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  videoPicker: {
    borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.md,
    ...shadows.md,
  },
  videoPlaceholder: {
    aspectRatio: 16 / 9, backgroundColor: colors.card, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
  },
  placeholderText: { color: colors.textSecondary },
  placeholderSub: { color: colors.textMuted },
  videoPreview: {
    aspectRatio: 16 / 9, backgroundColor: colors.card, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  videoElement: { width: '100%', height: '100%', objectFit: 'cover' as unknown as undefined },
  videoPreviewOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: 'rgba(11,11,15,0.7)',
  },
  videoPreviewText: { color: colors.text },
  changeBtn: { paddingHorizontal: spacing.sm },
  thumbPicker: {
    borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md,
  },
  thumbPlaceholder: {
    aspectRatio: 16 / 9, backgroundColor: colors.card, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  thumbPreview: {
    aspectRatio: 16 / 9, borderRadius: radius.lg, width: '100%',
  },
  progressWrap: { marginBottom: spacing.md, gap: 4 },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.secondary },
  fieldLabel: {
    color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm,
  },
  dropdown: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  dropdownList: {
    backgroundColor: colors.card, borderRadius: radius.lg, marginBottom: spacing.md,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.border,
  },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownItemActive: { backgroundColor: 'rgba(124,58,237,0.08)' },
  failureCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.error + '40', marginBottom: spacing.md,
  },
  failureHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
  },
  failureFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.sm,
  },
  failureBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.md, backgroundColor: colors.secondary + '15',
  },
  savingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, marginTop: spacing.sm,
  },
  configWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    marginTop: spacing.md, padding: spacing.sm,
    backgroundColor: colors.warning + '15', borderRadius: radius.md,
  },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.base, backgroundColor: colors.error + '15',
  },
  modeToggleWrap: {
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md,
  },
  modeToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: spacing.sm, borderRadius: radius.lg,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  modeToggleActive: {
    borderColor: colors.secondary, backgroundColor: colors.secondary + '15',
  },
  reelHint: {
    backgroundColor: colors.secondary + '10', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md,
  },
});
