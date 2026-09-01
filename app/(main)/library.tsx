import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Image,
  ImageBackground,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock,
  Heart,
  Bookmark,
  Download,
  ListVideo,
  Plus,
  Play,
  Trash2,
  Edit2,
  Lock,
  Globe,
  MoreVertical,
} from 'lucide-react-native';
import type {
  Video,
  Playlist,
  WatchHistoryItem,
  Bookmark as BookmarkType,
  VideoCategory,
} from '@/types';
import { useVideos, useAuth, useToast } from '@/contexts';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatCount, getVideoThumbnailSource, timeAgo } from '@/utils';
import {
  VideoCard,
  EmptyState,
  LoadingScreen,
  ErrorState,
  Modal,
  CustomButton,
  CustomInput,
} from '@/components';
import { videoRepository } from '@/firebase';

type TabKey = 'history' | 'liked' | 'saved' | 'playlists' | 'downloads';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: typeof Clock;
}

const TABS: TabConfig[] = [
  { key: 'history', label: 'History', icon: Clock },
  { key: 'liked', label: 'Liked', icon: Heart },
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'playlists', label: 'Playlists', icon: ListVideo },
  { key: 'downloads', label: 'Downloads', icon: Download },
];

type PlaylistModalMode = 'create' | 'rename' | null;

interface PlaylistMenuTarget {
  playlist: Playlist;
  measureY: number;
}

export default function LibraryScreen() {
  const {
    videos,
    bookmarks,
    likedVideoIds,
    continueWatching,
    playlists,
    isLoading,
    error,
    refresh,
    isBookmarked,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
  } = useVideos();
  const { firebaseUser } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('history');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Playlist CRUD modal state
  const [playlistModalMode, setPlaylistModalMode] = useState<PlaylistModalMode>(null);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [playlistSaving, setPlaylistSaving] = useState(false);
  const [renamingPlaylistId, setRenamingPlaylistId] = useState<string | null>(null);

  // Per-playlist action menu
  const [menuPlaylistId, setMenuPlaylistId] = useState<string | null>(null);

  // Playlist detail modal (videos inside a playlist)
  const [detailPlaylist, setDetailPlaylist] = useState<Playlist | null>(null);
  const [detailVideos, setDetailVideos] = useState<Video[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const getVideoForId = useCallback(
    (vid: string): Video | undefined => videos.find((v) => v.id === vid),
    [videos],
  );

  const historyVideos = useMemo(() => {
    return continueWatching
      .map((h: WatchHistoryItem) => {
        const v = getVideoForId(h.videoId);
        return v ? { video: v, history: h } : null;
      })
      .filter((x): x is { video: Video; history: WatchHistoryItem } => x !== null);
  }, [continueWatching, getVideoForId]);

  const likedVideos = useMemo(
    () => videos.filter((v) => likedVideoIds.includes(v.id)),
    [videos, likedVideoIds],
  );

  const savedVideos = useMemo(
    () =>
      bookmarks
        .map((b: BookmarkType) => getVideoForId(b.videoId))
        .filter((v): v is Video => v !== null),
    [bookmarks, getVideoForId],
  );

  const tabCount = useCallback(
    (key: TabKey): number => {
      switch (key) {
        case 'history':
          return historyVideos.length;
        case 'liked':
          return likedVideos.length;
        case 'saved':
          return savedVideos.length;
        case 'playlists':
          return playlists.length;
        default:
          return 0;
      }
    },
    [historyVideos.length, likedVideos.length, savedVideos.length, playlists.length],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // ---------- Playlist CRUD handlers ----------
  const openCreatePlaylist = useCallback(() => {
    setPlaylistTitle('');
    setPlaylistDescription('');
    setRenamingPlaylistId(null);
    setPlaylistModalMode('create');
  }, []);

  const openRenamePlaylist = useCallback((playlist: Playlist) => {
    setPlaylistTitle(playlist.title);
    setPlaylistDescription(playlist.description);
    setRenamingPlaylistId(playlist.id);
    setPlaylistModalMode('rename');
    setMenuPlaylistId(null);
  }, []);

  const closePlaylistModal = useCallback(() => {
    setPlaylistModalMode(null);
    setRenamingPlaylistId(null);
    setPlaylistTitle('');
    setPlaylistDescription('');
    setPlaylistSaving(false);
  }, []);

  const handleSavePlaylist = useCallback(async () => {
    const trimmed = playlistTitle.trim();
    if (!trimmed) {
      toast.error('Please enter a playlist title');
      return;
    }
    setPlaylistSaving(true);
    try {
      if (playlistModalMode === 'create') {
        await createPlaylist({
          title: trimmed,
          description: playlistDescription.trim(),
          isPrivate: false,
          type: 'custom',
        });
        toast.success('Playlist created');
      } else if (playlistModalMode === 'rename' && renamingPlaylistId) {
        await renamePlaylist(renamingPlaylistId, trimmed);
        toast.success('Playlist renamed');
      }
      closePlaylistModal();
    } catch (err) {
      toast.error('Could not save playlist');
    } finally {
      setPlaylistSaving(false);
    }
  }, [
    playlistTitle,
    playlistDescription,
    playlistModalMode,
    renamingPlaylistId,
    createPlaylist,
    renamePlaylist,
    toast,
    closePlaylistModal,
  ]);

  const handleDeletePlaylist = useCallback(
    (playlist: Playlist) => {
      setMenuPlaylistId(null);
      Alert.alert(
        'Delete playlist',
        `Are you sure you want to delete "${playlist.title}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deletePlaylist(playlist.id);
                toast.success('Playlist deleted');
                if (detailPlaylist?.id === playlist.id) {
                  setDetailPlaylist(null);
                  setDetailVideos([]);
                }
              } catch (err) {
                toast.error('Could not delete playlist');
              }
            },
          },
        ],
        { cancelable: true },
      );
    },
    [deletePlaylist, toast, detailPlaylist],
  );

  // ---------- Playlist detail (videos inside) ----------
  const openPlaylistDetail = useCallback((playlist: Playlist) => {
    setDetailPlaylist(playlist);
    setDetailVideos([]);
    setDetailLoading(true);
    setMenuPlaylistId(null);
  }, []);

  useEffect(() => {
    if (!detailPlaylist) return;
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const ids = detailPlaylist.videoIds;
        const resolved: Video[] = [];
        for (const id of ids) {
          const local = videos.find((v) => v.id === id);
          if (local) {
            resolved.push(local);
          } else {
            const remote = await videoRepository.getById(id);
            if (remote) resolved.push(remote);
          }
        }
        if (!cancelled) setDetailVideos(resolved);
      } catch (err) {
        if (!cancelled) setDetailVideos([]);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailPlaylist, videos]);

  const handleRemoveFromPlaylist = useCallback(
    async (playlistId: string, videoId: string) => {
      try {
        await removeVideoFromPlaylist(playlistId, videoId);
        setDetailVideos((prev) => prev.filter((v) => v.id !== videoId));
        toast.success('Removed from playlist');
      } catch (err) {
        toast.error('Could not remove video');
      }
    },
    [removeVideoFromPlaylist, toast],
  );

  // ---------- Renderers ----------
  const renderVideoGrid = useCallback(
    (vids: Video[], emptyIcon: typeof Heart, emptyTitle: string, emptyDescription: string) => {
      if (vids.length === 0) {
        return (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
          />
        );
      }
      return (
        <FlatList
          data={vids}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item }) => (
            <VideoCard
              video={item}
              onPress={(v) => router.push(`/watch/${v.id}`)}
              width={160}
              variant="portrait"
            />
          )}
        />
      );
    },
    [],
  );

  const renderHistory = useCallback(() => {
    if (historyVideos.length === 0) {
      return (
        <EmptyState
          icon={Clock}
          title="No watch history"
          description="Videos you watch will show up here so you can pick up where you left off."
        />
      );
    }
    return (
      <FlatList
        data={historyVideos}
        keyExtractor={(item) => item.history.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => {
          const pct =
            item.history.durationSeconds > 0
              ? Math.min(
                  100,
                  Math.round(
                    (item.history.progressSeconds /
                      item.history.durationSeconds) *
                      100,
                  ),
                )
              : 0;
          const historySource = getVideoThumbnailSource(item.video.thumbnailUrl, item.video.videoUrl);
          return (
            <Pressable
              style={styles.historyItem}
              onPress={() => router.push(`/watch/${item.video.id}`)}
            >
              <ImageBackground
                source={historySource}
                style={[styles.historyThumb, !historySource && { backgroundColor: colors.card }]}
                imageStyle={styles.historyThumbImage}
              >
                <LinearGradient
                  colors={['rgba(11,11,15,0.1)', 'rgba(11,11,15,0.85)']}
                  style={styles.historyGradient}
                >
                  <View style={styles.historyPlayWrap}>
                    <View style={styles.historyPlayButton}>
                      <Play size={18} color={colors.text} fill={colors.text} />
                    </View>
                  </View>
                  {item.history.completed ? (
                    <View style={styles.completedBadge}>
                      <Text
                        style={[typography.overline, { color: colors.text }]}
                      >
                        Watched
                      </Text>
                    </View>
                  ) : null}
                </LinearGradient>
              </ImageBackground>
              <View style={styles.historyMeta}>
                <Text
                  style={[typography.label, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.video.title}
                </Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${pct}%` },
                      ]}
                    />
                  </View>
                  <Text
                    style={[typography.caption, { color: colors.secondary }]}
                  >
                    {pct}%
                  </Text>
                </View>
                <Text
                  style={[typography.caption, { color: colors.textMuted }]}
                >
                  {timeAgo(item.history.lastWatchedAt)}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    );
  }, [historyVideos]);

  const renderPlaylistCover = useCallback((playlist: Playlist) => {
    if (playlist.coverUrl) {
      return (
        <Image
          source={{ uri: playlist.coverUrl }}
          style={styles.playlistCoverImage}
        />
      );
    }
    return (
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.playlistCoverGradient}
      >
        <ListVideo size={26} color={colors.text} />
      </LinearGradient>
    );
  }, []);

  const renderPlaylists = useCallback(() => {
    if (playlists.length === 0) {
      return (
        <EmptyState
          icon={ListVideo}
          title="No playlists yet"
          description="Create playlists to organize your favorite videos and watch them later."
          actionLabel="Create Playlist"
          onAction={openCreatePlaylist}
        />
      );
    }
    return (
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: spacing.sm }}
        ListHeaderComponent={
          <View style={styles.playlistHeaderRow}>
            <Text
              style={[typography.caption, { color: colors.textMuted }]}
            >
              {playlists.length} playlist{playlists.length === 1 ? '' : 's'}
            </Text>
            <Pressable
              style={styles.createPill}
              onPress={openCreatePlaylist}
              hitSlop={8}
            >
              <Plus size={16} color={colors.secondary} />
              <Text
                style={[
                  typography.label,
                  { color: colors.secondary, fontSize: 12 },
                ]}
              >
                New
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const menuOpen = menuPlaylistId === item.id;
          return (
            <Pressable
              style={styles.playlistItem}
              onPress={() => openPlaylistDetail(item)}
            >
              <View style={styles.playlistCover}>
                {renderPlaylistCover(item)}
              </View>
              <View style={styles.playlistMeta}>
                <Text
                  style={[typography.label, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <View style={styles.playlistSubRow}>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textMuted },
                    ]}
                  >
                    {item.videoCount} video{item.videoCount === 1 ? '' : 's'}
                  </Text>
                  <View style={styles.privacyBadge}>
                    {item.isPrivate ? (
                      <Lock size={11} color={colors.textMuted} />
                    ) : (
                      <Globe size={11} color={colors.textMuted} />
                    )}
                    <Text
                      style={[
                        typography.overline,
                        { color: colors.textMuted, fontSize: 10 },
                      ]}
                    >
                      {item.isPrivate ? 'Private' : 'Public'}
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable
                style={styles.playlistMenuButton}
                onPress={() =>
                  setMenuPlaylistId((cur) => (cur === item.id ? null : item.id))
                }
                hitSlop={10}
              >
                <MoreVertical size={18} color={colors.textSecondary} />
              </Pressable>
              {menuOpen ? (
                <View style={styles.playlistMenu}>
                  <Pressable
                    style={styles.playlistMenuItem}
                    onPress={() => openRenamePlaylist(item)}
                  >
                    <Edit2 size={15} color={colors.textSecondary} />
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.text },
                      ]}
                    >
                      Rename
                    </Text>
                  </Pressable>
                  <View style={styles.playlistMenuDivider} />
                  <Pressable
                    style={[styles.playlistMenuItem, { paddingLeft: 0 }]}
                    onPress={() => handleDeletePlaylist(item)}
                  >
                    <Trash2 size={15} color={colors.error} />
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.error },
                      ]}
                    >
                      Delete
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    );
  }, [
    playlists,
    menuPlaylistId,
    openCreatePlaylist,
    openPlaylistDetail,
    renderPlaylistCover,
    openRenamePlaylist,
    handleDeletePlaylist,
  ]);

  const renderDownloads = useCallback(() => {
    return (
      <EmptyState
        icon={Download}
        title="No downloads"
        description="Downloaded videos will be available offline here. Tap the download icon on a video to save it."
      />
    );
  }, []);

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'history':
        return renderHistory();
      case 'liked':
        return renderVideoGrid(
          likedVideos,
          Heart,
          'No liked videos',
          'Videos you like will be collected here so you can find them again easily.',
        );
      case 'saved':
        return renderVideoGrid(
          savedVideos,
          Bookmark,
          'No saved videos',
          'Bookmark videos to save them here for later viewing.',
        );
      case 'playlists':
        return renderPlaylists();
      case 'downloads':
        return renderDownloads();
      default:
        return null;
    }
  }, [
    activeTab,
    renderHistory,
    renderVideoGrid,
    likedVideos,
    savedVideos,
    renderPlaylists,
    renderDownloads,
  ]);

  const playlistModalTitle =
    playlistModalMode === 'create'
      ? 'Create Playlist'
      : playlistModalMode === 'rename'
        ? 'Rename Playlist'
        : '';

  const renderPlaylistModalFooter = () => (
    <View style={styles.modalFooterRow}>
      <CustomButton
        title="Cancel"
        onPress={closePlaylistModal}
        variant="ghost"
        size="md"
        style={styles.modalFooterButton}
      />
      <CustomButton
        title={playlistModalMode === 'rename' ? 'Save' : 'Create'}
        onPress={handleSavePlaylist}
        loading={playlistSaving}
        size="md"
        style={styles.modalFooterButton}
      />
    </View>
  );

  const renderDetailModalFooter = () => {
    if (!detailPlaylist) return null;
    return (
      <CustomButton
        title="Close"
        onPress={() => setDetailPlaylist(null)}
        variant="ghost"
        size="md"
        fullWidth
      />
    );
  };

  if (isLoading && videos.length === 0) {
    return <LoadingScreen message="Loading your library..." />;
  }

  if (error && videos.length === 0) {
    return (
      <View style={styles.container}>
        <ErrorState title="Couldn't load your library" message={error} onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={[typography.h2, { color: colors.text }]}>
              Your Library
            </Text>
            <Text
              style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}
            >
              History, likes, saves and playlists
            </Text>
          </View>
          {activeTab === 'playlists' ? (
            <Pressable style={styles.headerCreateButton} onPress={openCreatePlaylist}>
              <Plus size={18} color={colors.text} />
              <Text style={[typography.label, { color: colors.text }]}>
                New
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tabCount(tab.key);
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon
                size={16}
                color={isActive ? colors.secondary : colors.textMuted}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: isActive ? colors.secondary : colors.textMuted,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 ? (
                <View style={styles.tabBadge}>
                  <Text
                    style={[
                      typography.overline,
                      { color: colors.text, fontSize: 9 },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(item) => item.key}
        renderItem={() => (
          <View style={styles.contentWrap}>{renderContent()}</View>
        )}
        contentContainerStyle={{ padding: spacing.base }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
      />

      {/* Create / Rename Playlist Modal */}
      <Modal
        visible={playlistModalMode !== null}
        onClose={closePlaylistModal}
        title={playlistModalTitle}
        footer={renderPlaylistModalFooter()}
      >
        <View style={styles.modalBody}>
          <CustomInput
            label="Playlist title"
            value={playlistTitle}
            onChangeText={setPlaylistTitle}
            placeholder="e.g. Watch later"
            autoCapitalize="sentences"
            returnKeyType="done"
          />
          {playlistModalMode === 'create' ? (
            <CustomInput
              label="Description (optional)"
              value={playlistDescription}
              onChangeText={setPlaylistDescription}
              placeholder="What's this playlist about?"
              autoCapitalize="sentences"
              multiline
              numberOfLines={3}
              style={styles.descriptionInput}
            />
          ) : null}
        </View>
      </Modal>

      {/* Playlist Detail Modal */}
      <Modal
        visible={detailPlaylist !== null}
        onClose={() => setDetailPlaylist(null)}
        title={detailPlaylist?.title ?? 'Playlist'}
        footer={renderDetailModalFooter()}
      >
        <View style={styles.detailBody}>
          {detailPlaylist ? (
            <View style={styles.detailHeaderRow}>
              <View style={styles.privacyBadge}>
                {detailPlaylist.isPrivate ? (
                  <Lock size={11} color={colors.textMuted} />
                ) : (
                  <Globe size={11} color={colors.textMuted} />
                )}
                <Text
                  style={[
                    typography.overline,
                    { color: colors.textMuted, fontSize: 10 },
                  ]}
                >
                  {detailPlaylist.isPrivate ? 'Private' : 'Public'}
                </Text>
              </View>
              <Text
                style={[typography.caption, { color: colors.textMuted }]}
              >
                {detailPlaylist.videoCount} video
                {detailPlaylist.videoCount === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}

          {detailLoading ? (
            <View style={styles.detailLoadingWrap}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Loading videos...
              </Text>
            </View>
          ) : detailVideos.length === 0 ? (
            <View style={styles.detailEmptyWrap}>
              <ListVideo size={28} color={colors.textMuted} />
              <Text
                style={[typography.bodySmall, { color: colors.textSecondary }]}
              >
                This playlist is empty
              </Text>
            </View>
          ) : (
            <FlatList
              data={detailVideos}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={{ gap: spacing.sm }}
              renderItem={({ item }) => (
                <View style={styles.detailVideoRow}>
                  <Pressable
                    style={styles.detailVideoPress}
                    onPress={() => {
                      setDetailPlaylist(null);
                      router.push(`/watch/${item.id}`);
                    }}
                  >
                    <VideoCard
                      video={item}
                      onPress={(v) => {
                        setDetailPlaylist(null);
                        router.push(`/watch/${v.id}`);
                      }}
                      width={140}
                      variant="landscape"
                    />
                  </Pressable>
                  <Pressable
                    style={styles.detailRemoveButton}
                    onPress={() =>
                      detailPlaylist &&
                      handleRemoveFromPlaylist(detailPlaylist.id, item.id)
                    }
                    hitSlop={10}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </Pressable>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
  },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
  },
  tabActive: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
  },
  tabBadge: {
    backgroundColor: colors.secondary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  contentWrap: { paddingBottom: spacing['2xl'] },

  // Watch history
  historyItem: {
    gap: spacing.xs,
  },
  historyThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  historyThumbImage: {
    borderRadius: radius.lg,
  },
  historyGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  historyPlayWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  historyPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124,58,237,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  completedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(34,197,94,0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  historyMeta: {
    gap: 4,
    paddingHorizontal: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.secondary,
  },

  // Playlists
  playlistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: spacing.xs,
  },
  createPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124,58,237,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.base,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  playlistCover: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  playlistCoverImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  playlistCoverGradient: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistMeta: {
    flex: 1,
    gap: 3,
  },
  playlistSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  playlistMenuButton: {
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  playlistMenu: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.xl + spacing.sm,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.base,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minWidth: 130,
    ...shadows.lg,
    zIndex: 10,
  },
  playlistMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  playlistMenuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },

  // Playlist create/rename modal
  modalBody: {
    gap: spacing.md,
  },
  descriptionInput: {
    minHeight: 90,
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalFooterButton: {
    flex: 1,
  },

  // Playlist detail modal
  detailBody: {
    gap: spacing.md,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLoadingWrap: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  detailEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  detailVideoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailVideoPress: {
    flex: 1,
  },
  detailRemoveButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
});
