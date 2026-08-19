import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Video as VideoIcon,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  Calendar,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MoreVertical,
  ChevronRight,
  Clock,
  BarChart3,
} from 'lucide-react-native';
import { useVideos, useAuth, useToast } from '@/contexts';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatCount, timeAgo } from '@/utils';
import { LoadingScreen, EmptyState, Modal, CustomButton, CustomInput } from '@/components';
import type { Video, VideoCategory, VideoVisibility } from '@/types';
import { videoRepository } from '@/firebase';
import { uploadVideoThumbnail, isCloudinaryConfigured } from '@/services/cloudinary';
import * as ImagePicker from 'expo-image-picker';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: VideoCategory[] = [
  'Comedy',
  'Education',
  'Music',
  'Sports',
  'Movies',
  'Gaming',
  'Technology',
  'Lifestyle',
  'Entertainment',
  'News',
  'Travel',
  'Cooking',
];

const VISIBILITY_OPTIONS: { value: VideoVisibility; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'unlisted', label: 'Unlisted' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusMeta(status: Video['status']): { color: string; label: string } {
  switch (status) {
    case 'published':
      return { color: colors.success, label: 'Published' };
    case 'scheduled':
      return { color: colors.secondary, label: 'Scheduled' };
    case 'archived':
      return { color: colors.textMuted, label: 'Archived' };
    case 'draft':
      return { color: colors.warning, label: 'Draft' };
    case 'processing':
      return { color: colors.primaryLight, label: 'Processing' };
    default:
      return { color: colors.textMuted, label: String(status) };
  }
}

// ---------------------------------------------------------------------------
// Action Row (used inside the actions modal)
// ---------------------------------------------------------------------------

type IconType = typeof Edit2;

interface ActionRowProps {
  icon: IconType;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function ActionRow({ icon: Icon, label, onPress, destructive }: ActionRowProps) {
  const iconColor = destructive ? colors.error : colors.textSecondary;
  const textColor = destructive ? colors.error : colors.text;

  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
      onPress={onPress}
    >
      <Icon size={20} color={iconColor} />
      <Text style={[typography.body, styles.actionLabel, { color: textColor }]}>
        {label}
      </Text>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ContentManager() {
  const { myVideos, refresh, isLoading } = useVideos();
  const { firebaseUser } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [actionsVideo, setActionsVideo] = useState<Video | null>(null);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<VideoCategory>('Comedy');
  const [editVisibility, setEditVisibility] = useState<VideoVisibility>('public');
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // ---- pull-to-refresh --------------------------------------------------

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  // ---- modal helpers ----------------------------------------------------

  const openActions = useCallback((video: Video) => {
    setActionsVideo(video);
  }, []);

  const closeActions = useCallback(() => {
    setActionsVideo(null);
  }, []);

  const openEdit = useCallback((video: Video) => {
    setEditVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description);
    setEditCategory(video.category);
    setEditVisibility(video.visibility);
    setActionsVideo(null);
  }, []);

  const closeEdit = useCallback(() => {
    setEditVideo(null);
  }, []);

  // ---- actions ----------------------------------------------------------

  const handleSaveEdit = useCallback(async () => {
    if (!editVideo) return;
    if (!editTitle.trim()) {
      toast.error('Title cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await videoRepository.update(editVideo.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        visibility: editVisibility,
      });
      toast.success('Video updated successfully.');
      setEditVideo(null);
      await refresh();
    } catch {
      toast.error('Failed to update video.');
    } finally {
      setSaving(false);
    }
  }, [
    editVideo,
    editTitle,
    editDescription,
    editCategory,
    editVisibility,
    toast,
    refresh,
  ]);

  const handleViewAnalytics = useCallback((video: Video) => {
    setActionsVideo(null);
    router.push(`/analytics/${video.id}`);
  }, []);

  const handleReplaceThumbnail = useCallback(
    async (video: Video) => {
      setActionsVideo(null);
      if (!isCloudinaryConfigured()) {
        toast.error('Cloudinary is not configured.');
        return;
      }
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.85,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        setUploadingThumbnail(true);
        const upload = await uploadVideoThumbnail(video.id, result.assets[0].uri);
        await videoRepository.update(video.id, { thumbnailUrl: upload.secureUrl });
        toast.success('Thumbnail updated.');
        await refresh();
      } catch {
        toast.error('Failed to update thumbnail.');
      } finally {
        setUploadingThumbnail(false);
      }
    },
    [toast, refresh],
  );

  const handleArchive = useCallback(
    async (video: Video) => {
      setActionsVideo(null);
      try {
        await videoRepository.archive(video.id);
        toast.success('Video archived.');
        await refresh();
      } catch {
        toast.error('Failed to archive video.');
      }
    },
    [toast, refresh],
  );

  const handleUnarchive = useCallback(
    async (video: Video) => {
      setActionsVideo(null);
      try {
        await videoRepository.unarchive(video.id);
        toast.success('Video restored.');
        await refresh();
      } catch {
        toast.error('Failed to restore video.');
      }
    },
    [toast, refresh],
  );

  const handleDelete = useCallback(
    (video: Video) => {
      setActionsVideo(null);
      if (!firebaseUser) {
        toast.error('You must be signed in to delete a video.');
        return;
      }
      Alert.alert(
        'Delete Video',
        `Are you sure you want to delete "${video.title}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await videoRepository.delete(video.id, firebaseUser.uid);
                toast.success('Video deleted.');
                await refresh();
              } catch {
                toast.error('Failed to delete video.');
              }
            },
          },
        ],
      );
    },
    [firebaseUser, toast, refresh],
  );

  // ---- list item --------------------------------------------------------

  const renderVideoCard = useCallback(
    ({ item }: { item: Video }) => {
      const statusMeta = getStatusMeta(item.status);
      const isHidden = item.visibility === 'private' || item.visibility === 'unlisted';

      return (
        <View style={styles.card}>
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
            {isHidden && (
              <View style={styles.visibilityOverlay}>
                <EyeOff size={16} color={colors.text} />
              </View>
            )}
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <View
              style={[styles.statusBadge, { backgroundColor: `${statusMeta.color}22` }]}
            >
              {item.status === 'scheduled' && (
                <Clock size={11} color={statusMeta.color} />
              )}
              <Text style={[styles.statusText, { color: statusMeta.color }]}>
                {statusMeta.label}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Eye size={12} color={colors.textMuted} />
                <Text style={styles.statText}>{formatCount(item.viewsCount)}</Text>
              </View>
              <Text style={styles.statSeparator}>·</Text>
              <Text style={styles.statText}>
                {formatCount(item.likesCount)} likes
              </Text>
              <Text style={styles.statSeparator}>·</Text>
              <Text style={styles.statText}>{formatCount(item.commentsCount)}</Text>
            </View>

            <View style={styles.dateRow}>
              <Calendar size={12} color={colors.textMuted} />
              <Text style={styles.dateText}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>

          <Pressable
            style={styles.moreButton}
            onPress={() => openActions(item)}
            hitSlop={12}
          >
            <MoreVertical size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      );
    },
    [openActions],
  );

  // ---- render -----------------------------------------------------------

  if (isLoading) {
    return <LoadingScreen message="Loading your content..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Content Manager</Text>
          <Text style={styles.headerSubtitle}>
            {myVideos.length} {myVideos.length === 1 ? 'video' : 'videos'}
          </Text>
        </View>
      </View>

      {/* Video list */}
      <FlatList
        data={myVideos}
        keyExtractor={(item) => item.id}
        renderItem={renderVideoCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={VideoIcon}
            title="No Content Yet"
            description="Videos you upload will appear here for management."
          />
        }
      />

      {/* Actions modal */}
      <Modal
        visible={!!actionsVideo}
        onClose={closeActions}
        title="Video Actions"
      >
        <View style={styles.actionsList}>
          {actionsVideo && (
            <>
              <ActionRow
                icon={Edit2}
                label="Edit Video"
                onPress={() => openEdit(actionsVideo)}
              />
              <ActionRow
                icon={BarChart3}
                label="View Analytics"
                onPress={() => handleViewAnalytics(actionsVideo)}
              />
              <ActionRow
                icon={ImageIcon}
                label="Replace Thumbnail"
                onPress={() => handleReplaceThumbnail(actionsVideo)}
              />
              {actionsVideo.status === 'archived' ? (
                <ActionRow
                  icon={ArchiveRestore}
                  label="Unarchive"
                  onPress={() => handleUnarchive(actionsVideo)}
                />
              ) : (
                <ActionRow
                  icon={Archive}
                  label="Archive"
                  onPress={() => handleArchive(actionsVideo)}
                />
              )}
              <View style={styles.actionDivider} />
              <ActionRow
                icon={Trash2}
                label="Delete Video"
                onPress={() => handleDelete(actionsVideo)}
                destructive
              />
            </>
          )}
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal
        visible={!!editVideo}
        onClose={closeEdit}
        title="Edit Video"
        footer={
          <CustomButton
            title="Save Changes"
            onPress={handleSaveEdit}
            loading={saving}
            fullWidth
          />
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.editScrollContent}
        >
          <View style={styles.editForm}>
            <CustomInput
              label="Title"
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Enter video title"
              autoCapitalize="sentences"
            />

            <CustomInput
              label="Description"
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Enter video description"
              autoCapitalize="sentences"
              multiline
              textAlignVertical="top"
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipsContainer}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.chip, editCategory === cat && styles.chipActive]}
                    onPress={() => setEditCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        editCategory === cat && styles.chipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Visibility</Text>
              <View style={styles.chipsContainer}>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.chip,
                      editVisibility === opt.value && styles.chipActive,
                    ]}
                    onPress={() => setEditVisibility(opt.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        editVisibility === opt.value && styles.chipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </Modal>

      {/* Thumbnail upload overlay */}
      {uploadingThumbnail && (
        <View style={styles.uploadingOverlay}>
          <LoadingScreen message="Uploading thumbnail..." />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: 0,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
  },

  // Video card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 120,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  visibilityOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.md,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  cardTitle: {
    ...typography.label,
    color: colors.text,
    fontSize: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...typography.overline,
    fontSize: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  statSeparator: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  moreButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  // Actions modal
  actionsList: {
    gap: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  actionRowPressed: {
    opacity: 0.6,
  },
  actionLabel: {
    flex: 1,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },

  // Edit modal
  editScrollContent: {
    paddingBottom: spacing.xl,
  },
  editForm: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: `${colors.primary}22`,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.primaryLight,
  },

  // Upload overlay
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
});
