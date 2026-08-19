import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Dimensions,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Play, X, Loader as Loader2 } from 'lucide-react-native';
import type { DocumentSnapshot } from 'firebase/firestore';
import { router } from 'expo-router';
import type { Reel } from '@/types';
import { reelRepository } from '@/firebase';
import { useAuth, useToast } from '@/contexts';
import { colors, spacing, typography } from '@/theme';
import { shareVideo, copyLink } from '@/utils';
import { ReelItem } from '@/components/ReelItem';
import { ReelCommentSheet } from '@/components/ReelCommentSheet';
import { SkeletonLoader } from '@/components/SkeletonLoader';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

interface ReelsState {
  reels: Reel[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
}

export default function ReelsScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [state, setState] = useState<ReelsState>({
    reels: [],
    loading: true,
    error: null,
    hasMore: false,
    lastDoc: null,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [savedReels, setSavedReels] = useState<Set<string>>(new Set());
  const [followingCreators, setFollowingCreators] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [saveCounts, setSaveCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [showComments, setShowComments] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [commentCreatorId, setCommentCreatorId] = useState<string>('');
  const [shareSheetReel, setShareSheetReel] = useState<Reel | null>(null);

  const viewedReelsRef = useRef<Set<string>>(new Set());
  const watchProgressRef = useRef<Record<string, { seconds: number; duration: number }>>({});
  const unsubReelRef = useRef<(() => void) | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const isMountedRef = useRef(true);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Pause playback whenever the Reels tab loses focus (navigation to another tab/screen/modal)
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, []),
  );

  // Pause playback when the app goes to background or screen is locked
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'background' || nextState === 'inactive') {
        setIsScreenFocused(false);
      } else if (nextState === 'active') {
        // Only re-enable if the screen is still focused in the navigator
        setIsScreenFocused(true);
      }
    });
    return () => sub.remove();
  }, []);

  // Load reels with pagination
  const loadReels = useCallback(async (append: boolean = false) => {
    setState((prev) => ({ ...prev, loading: !append, error: null }));
    try {
      const result = await reelRepository.getFeed(10, append ? state.lastDoc : null);
      if (!isMountedRef.current) return;
      const newReels = append ? [...state.reels, ...result.items] : result.items;
      setState({
        reels: newReels,
        loading: false,
        error: null,
        hasMore: result.hasMore,
        lastDoc: result.lastDoc,
      });

      // Initialize counts from reel data
      const newLikeCounts: Record<string, number> = {};
      const newSaveCounts: Record<string, number> = {};
      const newCommentCounts: Record<string, number> = {};
      for (const reel of result.items) {
        newLikeCounts[reel.id] = reel.likesCount;
        newSaveCounts[reel.id] = reel.savesCount;
        newCommentCounts[reel.id] = reel.commentsCount;
      }
      setLikeCounts((prev) => ({ ...prev, ...newLikeCounts }));
      setSaveCounts((prev) => ({ ...prev, ...newSaveCounts }));
      setCommentCounts((prev) => ({ ...prev, ...newCommentCounts }));

      // Check liked/saved/following status for new reels
      if (user) {
        const newLiked = new Set(likedReels);
        const newSaved = new Set(savedReels);
        const newFollowing = new Set(followingCreators);
        for (const reel of result.items) {
          const [l, s, f] = await Promise.all([
            reelRepository.isLiked(user.id, reel.id),
            reelRepository.isSaved(user.id, reel.id),
            reelRepository.isFollowing(user.id, reel.creatorId),
          ]);
          if (l) newLiked.add(reel.id);
          if (s) newSaved.add(reel.id);
          if (f) newFollowing.add(reel.creatorId);
        }
        if (isMountedRef.current) {
          setLikedReels(newLiked);
          setSavedReels(newSaved);
          setFollowingCreators(newFollowing);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load reels',
      }));
    }
  }, [state.lastDoc, state.reels, user, likedReels, savedReels, followingCreators]);

  useEffect(() => {
    loadReels(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to active reel for real-time count updates
  useEffect(() => {
    if (unsubReelRef.current) {
      unsubReelRef.current();
      unsubReelRef.current = null;
    }
    const activeReel = state.reels[activeIndex];
    if (!activeReel) return;
    unsubReelRef.current = reelRepository.subscribeToReel(activeReel.id, (updated) => {
      if (!updated || !isMountedRef.current) return;
      // Only update counts, don't touch likedByMe/savedByMe (managed locally)
      setLikeCounts((prev) => ({ ...prev, [updated.id]: updated.likesCount }));
      setSaveCounts((prev) => ({ ...prev, [updated.id]: updated.savesCount }));
      setCommentCounts((prev) => ({ ...prev, [updated.id]: updated.commentsCount }));
    });
    return () => {
      if (unsubReelRef.current) {
        unsubReelRef.current();
        unsubReelRef.current = null;
      }
    };
  }, [activeIndex, state.reels]);

  // Qualified view tracking — only counts when 3s or 50% watched, 24h dedup, excludes creator
  const handleWatchProgress = useCallback((reelId: string, watchSeconds: number, durationSeconds: number) => {
    watchProgressRef.current[reelId] = { seconds: watchSeconds, duration: durationSeconds };

    // Record view once per reel per session when threshold met
    if (viewedReelsRef.current.has(reelId)) return;
    const minWatch = Math.min(3, durationSeconds * 0.5);
    if (watchSeconds >= minWatch && user) {
      viewedReelsRef.current.add(reelId);
      reelRepository.recordQualifiedView(reelId, user.id, watchSeconds, durationSeconds).catch(() => {});
    }
  }, [user]);

  // Like handler — optimistic, transactional, deduped
  const handleLike = useCallback(async (reel: Reel) => {
    if (!user) {
      toast.info('Sign in to like reels');
      return;
    }
    const isLiked = likedReels.has(reel.id);
    // Optimistic update
    setLikedReels((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(reel.id);
      else next.add(reel.id);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [reel.id]: Math.max(0, (prev[reel.id] ?? reel.likesCount) + (isLiked ? -1 : 1)),
    }));
    try {
      await reelRepository.toggleLike(user.id, reel.id);
    } catch {
      // Revert
      setLikedReels((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(reel.id);
        else next.delete(reel.id);
        return next;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [reel.id]: Math.max(0, (prev[reel.id] ?? reel.likesCount) + (isLiked ? 1 : -1)),
      }));
      toast.error('Failed to update like');
    }
  }, [user, likedReels, toast]);

  // Save handler — optimistic, transactional
  const handleSave = useCallback(async (reel: Reel) => {
    if (!user) {
      toast.info('Sign in to save reels');
      return;
    }
    const isSaved = savedReels.has(reel.id);
    setSavedReels((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(reel.id);
      else next.add(reel.id);
      return next;
    });
    setSaveCounts((prev) => ({
      ...prev,
      [reel.id]: Math.max(0, (prev[reel.id] ?? reel.savesCount) + (isSaved ? -1 : 1)),
    }));
    try {
      await reelRepository.toggleSave(user.id, reel.id);
    } catch {
      setSavedReels((prev) => {
        const next = new Set(prev);
        if (isSaved) next.add(reel.id);
        else next.delete(reel.id);
        return next;
      });
      setSaveCounts((prev) => ({
        ...prev,
        [reel.id]: Math.max(0, (prev[reel.id] ?? reel.savesCount) + (isSaved ? 1 : -1)),
      }));
      toast.error('Failed to update save');
    }
  }, [user, savedReels, toast]);

  // Follow handler
  const handleFollow = useCallback(async (reel: Reel) => {
    if (!user) {
      toast.info('Sign in to follow creators');
      return;
    }
    const isFollowing = followingCreators.has(reel.creatorId);
    setFollowingCreators((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(reel.creatorId);
      else next.add(reel.creatorId);
      return next;
    });
    try {
      await reelRepository.toggleReelFollow(user.id, reel.creatorId);
      toast.success(isFollowing ? 'Unfollowed' : 'Following');
    } catch {
      setFollowingCreators((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.add(reel.creatorId);
        else next.delete(reel.creatorId);
        return next;
      });
      toast.error('Failed to update follow');
    }
  }, [user, followingCreators, toast]);

  // Share handler — native Share API, increment count only on success
  const handleShare = useCallback(async (reel: Reel) => {
    const shared = await shareVideo({
      title: reel.title,
      description: reel.description,
      videoId: reel.id,
    });
    if (shared) {
      // Increment share count only after successful share
      try {
        await reelRepository.incrementShares(reel.id);
      } catch { /* non-fatal */ }
    }
  }, []);

  // Comment handler — open bottom sheet
  const handleComment = useCallback((reel: Reel) => {
    setCommentReelId(reel.id);
    setCommentCreatorId(reel.creatorId);
    setShowComments(true);
  }, []);

  // Comment count change callback
  const handleCommentCountChange = useCallback((count: number) => {
    if (!commentReelId) return;
    setCommentCounts((prev) => ({ ...prev, [commentReelId]: count }));
  }, [commentReelId]);

  const handleCreatorPress = useCallback((reel: Reel) => {
    router.push(`/profile?creatorId=${reel.creatorId}`);
  }, []);

  // Viewability detection — single source of truth for which reel plays
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<Reel>[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const getItemLayout = useCallback((_data: unknown, index: number) => ({
    length: SCREEN_H,
    offset: SCREEN_H * index,
    index,
  }), []);

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      loadReels(true);
    }
  }, [state.hasMore, state.loading, loadReels]);

  const renderItem = useCallback(
    ({ item: reel, index }: { item: Reel; index: number }) => (
      <ReelItem
        reel={reel}
        isActive={index === activeIndex && isScreenFocused && !showComments}
        isLiked={likedReels.has(reel.id)}
        isSaved={savedReels.has(reel.id)}
        isFollowing={followingCreators.has(reel.creatorId)}
        likeCount={likeCounts[reel.id] ?? reel.likesCount}
        saveCount={saveCounts[reel.id] ?? reel.savesCount}
        commentCount={commentCounts[reel.id] ?? reel.commentsCount}
        onLike={() => handleLike(reel)}
        onSave={() => handleSave(reel)}
        onShare={() => handleShare(reel)}
        onComment={() => handleComment(reel)}
        onFollow={() => handleFollow(reel)}
        onCreatorPress={() => handleCreatorPress(reel)}
        onWatchProgress={(sec, dur) => handleWatchProgress(reel.id, sec, dur)}
      />
    ),
    [
      activeIndex, isScreenFocused, showComments, likedReels, savedReels, followingCreators,
      likeCounts, saveCounts, commentCounts,
      handleLike, handleSave, handleShare, handleComment, handleFollow,
      handleCreatorPress, handleWatchProgress,
    ],
  );

  // Loading state with skeleton
  if (state.loading && state.reels.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <SkeletonLoader width={SCREEN_W} height={SCREEN_H} rounded={0} />
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Loading reels...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (state.error && state.reels.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <X size={48} color={colors.error} />
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
          Something went wrong
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' }]}>
          {state.error}
        </Text>
        <Pressable style={styles.retryBtn} onPress={() => loadReels(false)}>
          <Text style={[typography.label, { color: colors.secondary }]}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Empty state
  if (state.reels.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Play size={48} color={colors.textMuted} />
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>
          No reels yet
        </Text>
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
          Be the first to share a short!
        </Text>
      </View>
    );
  }

  const activeReel = state.reels[activeIndex];

  return (
    <>
      <StatusBar style="light" />
      <SafeAreaView style={styles.container} edges={['top']}>
        <FlatList
          data={state.reels}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={loadMore}
          onEndReachedThreshold={2}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews
          scrollEventThrottle={16}
        />
      </SafeAreaView>

      {/* Comment bottom sheet — only mounted while open */}
      {commentReelId && showComments && (
        <ReelCommentSheet
          visible={showComments}
          reelId={commentReelId}
          creatorId={commentCreatorId}
          commentCount={commentCounts[commentReelId] ?? activeReel?.commentsCount ?? 0}
          onClose={() => setShowComments(false)}
          onCommentCountChange={handleCommentCountChange}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 14,
  },
});
