import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  FlatList,
  Alert,
  TextInput,
  Modal as RNModal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ThumbsUp, Bookmark, Share2, MessageCircle, Bell, Eye, Send, Trash2, CreditCard as Edit2, Pin, Flag, BadgeCheck, Video as VideoIcon, ChevronDown, Heart, CornerDownRight, MoveHorizontal as MoreHorizontal, Link as LinkIcon } from 'lucide-react-native';
import type { Video, Comment, CommentSort } from '@/types';
import { useVideos, useAuth, useToast, useUser } from '@/contexts';
import {
  videoRepository,
  commentRepository,
  likeRepository,
  subscriptionRepository,
  reportRepository,
  watchHistoryRepository,
} from '@/firebase';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatCount, timeAgo, shareVideo, copyLink } from '@/utils';
import { LoadingScreen, ErrorState, Avatar, EmptyState, Modal, EnhancedVideoPlayer } from '@/components';

const SORT_OPTIONS: { label: string; value: CommentSort }[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Most Liked', value: 'most_liked' },
];

const REPORT_REASONS = [
  'Spam or misleading',
  'Harassment or hate speech',
  'Violence or dangerous content',
  'Sexual content',
  'Other',
];

export default function WatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    getVideoById, toggleLike, isLiked, toggleBookmark, isBookmarked,
    toggleSubscription, isSubscribed, recordWatchProgress,
    getComments, getReplies, addComment, editComment, deleteComment,
    toggleCommentLike, pinComment, reportComment,
  } = useVideos();
  const { firebaseUser } = useAuth();
  const { profile } = useUser();
  const toast = useToast();

  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'related'>('comments');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentSort, setCommentSort] = useState<CommentSort>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [repliesMap, setRepliesMap] = useState<Record<string, Comment[]>>({});
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportVideoModal, setReportVideoModal] = useState(false);
  const [videoReportReason, setVideoReportReason] = useState('');
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null);
  const [resumePosition, setResumePosition] = useState(0);
  const [autoPlayNextEnabled, setAutoPlayNextEnabled] = useState(true);
  const hasTrackedViewRef = useRef(false);
  const unsubVideoRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!id) return;
    let unsubVideo: (() => void) | null = null;
    let unsubComments: (() => void) | null = null;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const v = await getVideoById(id);
        if (!v) { setError('Video not found'); return; }
        setVideo(v);
        setLiked(isLiked(id));
        setBookmarked(isBookmarked(id));
        setSubscribed(isSubscribed(v.creatorId));
        hasTrackedViewRef.current = false;

        // Resume from last watch position
        if (firebaseUser) {
          try {
            const history = await watchHistoryRepository.getProgress(firebaseUser.uid, id);
            if (history && history.progressSeconds > 3 && history.progressSeconds < history.durationSeconds - 10) {
              setResumePosition(history.progressSeconds);
            }
          } catch { /* non-fatal */ }
        }

        const relatedVids = await videoRepository.getRelated(v, 10);
        setRelated(relatedVids);

        if (firebaseUser) {
          const [l, s] = await Promise.all([
            likeRepository.isLiked(firebaseUser.uid, id),
            subscriptionRepository.isSubscribed(firebaseUser.uid, v.creatorId),
          ]);
          setLiked(l);
          setSubscribed(s);
        }

        unsubVideo = videoRepository.subscribeToVideo(id, (updated) => {
          if (!updated) return;
          // Only update counts, preserve current state to avoid player reload
          setVideo((prev) => prev ? {
            ...prev,
            likesCount: updated.likesCount,
            commentsCount: updated.commentsCount,
            viewsCount: updated.viewsCount,
            bookmarksCount: updated.bookmarksCount,
            sharesCount: updated.sharesCount,
          } : prev);
        });
        unsubComments = commentRepository.subscribeToVideoComments(id, (newComments) => {
          setComments(newComments);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video');
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      if (unsubVideo) unsubVideo();
      if (unsubComments) unsubComments();
    };
  }, [id, firebaseUser, getVideoById, isLiked, isBookmarked, isSubscribed]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    try {
      const sorted = await getComments(id, commentSort);
      setComments(sorted);
    } catch { /* keep existing */ }
  }, [id, commentSort, getComments]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleLike = useCallback(async () => {
    if (!firebaseUser || !video) return;
    // Optimistic update — no refetch, player stays mounted
    const wasLiked = liked;
    setLiked(!wasLiked);
    setVideo((prev) => prev ? {
      ...prev,
      likesCount: Math.max(0, prev.likesCount + (wasLiked ? -1 : 1)),
      likedByMe: !wasLiked,
    } : prev);
    try {
      await toggleLike(video.id);
    } catch {
      // Revert on failure
      setLiked(wasLiked);
      setVideo((prev) => prev ? {
        ...prev,
        likesCount: Math.max(0, prev.likesCount + (wasLiked ? 1 : -1)),
        likedByMe: wasLiked,
      } : prev);
    }
  }, [firebaseUser, video, liked, toggleLike]);

  const handleBookmark = useCallback(() => {
    if (!video) return;
    // Optimistic update — no refetch
    const wasBookmarked = bookmarked;
    setBookmarked(!wasBookmarked);
    setVideo((prev) => prev ? {
      ...prev,
      bookmarksCount: Math.max(0, prev.bookmarksCount + (wasBookmarked ? -1 : 1)),
      bookmarkedByMe: !wasBookmarked,
    } : prev);
    toggleBookmark(video.id);
  }, [video, bookmarked, toggleBookmark]);

  const handleSubscribe = useCallback(async () => {
    if (!firebaseUser || !video) return;
    // Optimistic update — no refetch
    const wasSubscribed = subscribed;
    setSubscribed(!wasSubscribed);
    if (!wasSubscribed) toast.success('Subscribed!'); else toast.info('Unsubscribed');
    try {
      await toggleSubscription(video.creatorId);
    } catch {
      setSubscribed(wasSubscribed);
    }
  }, [firebaseUser, video, subscribed, toggleSubscription, toast]);

  const handlePostComment = useCallback(async () => {
    if (!firebaseUser || !video || !commentInput.trim()) return;
    setIsPostingComment(true);
    try {
      await addComment({
        videoId: video.id,
        authorId: firebaseUser.uid,
        authorName: profile?.displayName ?? profile?.username ?? 'You',
        authorAvatarUrl: profile?.avatarUrl ?? null,
        authorIsCreator: profile?.isCreator ?? false,
        body: commentInput.trim(),
        parentId: null,
      });
      setCommentInput('');
      toast.success('Comment posted');
      loadComments();
    } catch {
      toast.error('Could not post comment');
    } finally {
      setIsPostingComment(false);
    }
  }, [firebaseUser, video, commentInput, profile, addComment, toast, loadComments]);

  const handlePostReply = useCallback(async (parent: Comment) => {
    if (!firebaseUser || !video || !replyInput.trim()) return;
    try {
      await addComment({
        videoId: video.id,
        authorId: firebaseUser.uid,
        authorName: profile?.displayName ?? profile?.username ?? 'You',
        authorAvatarUrl: profile?.avatarUrl ?? null,
        authorIsCreator: profile?.isCreator ?? false,
        body: replyInput.trim(),
        parentId: parent.id,
      });
      setReplyInput('');
      setReplyingTo(null);
      toast.success('Reply posted');
      const parentReplies = await getReplies(parent.id);
      setRepliesMap((prev) => ({ ...prev, [parent.id]: parentReplies }));
      loadComments();
    } catch {
      toast.error('Could not post reply');
    }
  }, [firebaseUser, video, replyInput, profile, addComment, getReplies, toast, loadComments]);

  const handleToggleReplies = useCallback(async (comment: Comment) => {
    const commentId = comment.id;
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
    if (!repliesMap[commentId]) {
      try {
        const replies = await getReplies(commentId);
        setRepliesMap((prev) => ({ ...prev, [commentId]: replies }));
      } catch { /* keep empty */ }
    }
  }, [repliesMap, getReplies]);

  const handleDeleteComment = useCallback((commentId: string) => {
    if (!video) return;
    Alert.alert('Delete comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          deleteComment(commentId, video.id).then(() => {
            toast.success('Comment deleted');
            loadComments();
          }).catch(() => toast.error('Could not delete comment'));
        },
      },
    ]);
  }, [video, deleteComment, toast, loadComments]);

  const handleEditComment = useCallback((comment: Comment) => {
    setEditingComment(comment);
    setEditText(comment.body);
    setShowActionsFor(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingComment || !editText.trim() || !video) return;
    try {
      await editComment(editingComment.id, video.id, editText.trim());
      setEditingComment(null);
      setEditText('');
      toast.success('Comment edited');
      loadComments();
    } catch {
      toast.error('Could not edit comment');
    }
  }, [editingComment, editText, video, editComment, toast, loadComments]);

  const handleLikeComment = useCallback(async (commentId: string) => {
    if (!firebaseUser) return;
    try {
      const nowLiked = await toggleCommentLike(commentId);
      setComments((prev) => prev.map((c) =>
        c.id === commentId
          ? { ...c, isLikedByMe: nowLiked, likesCount: c.likesCount + (nowLiked ? 1 : -1) }
          : c,
      ));
    } catch { /* ignore */ }
  }, [firebaseUser, toggleCommentLike]);

  const handlePinComment = useCallback(async (comment: Comment) => {
    if (!video) return;
    try {
      await pinComment(comment.id, video.id, !comment.isPinned);
      toast.success(comment.isPinned ? 'Comment unpinned' : 'Comment pinned');
      loadComments();
    } catch {
      toast.error('Could not pin comment');
    }
  }, [video, pinComment, toast, loadComments]);

  const handleReportComment = useCallback((commentId: string) => {
    setReportCommentId(commentId);
    setReportReason('');
    setShowReportModal(true);
    setShowActionsFor(null);
  }, []);

  const handleSubmitReport = useCallback(async () => {
    if (!firebaseUser || !reportCommentId || !reportReason) return;
    try {
      await reportComment(reportCommentId, reportReason, '');
      setShowReportModal(false);
      setReportCommentId(null);
      setReportReason('');
      toast.success('Report submitted. Thank you.');
    } catch {
      toast.error('Could not submit report');
    }
  }, [firebaseUser, reportCommentId, reportReason, reportComment, toast]);

  const handleReportVideo = useCallback(async () => {
    if (!firebaseUser || !video || !videoReportReason) return;
    try {
      await reportRepository.create({
        videoId: video.id,
        reporterId: firebaseUser.uid,
        reason: videoReportReason,
        description: '',
      });
      setReportVideoModal(false);
      setVideoReportReason('');
      toast.success('Report submitted. Thank you.');
    } catch {
      toast.error('Could not submit report');
    }
  }, [firebaseUser, video, videoReportReason, toast]);

  const handleShare = useCallback(async () => {
    if (!video) return;
    const shared = await shareVideo({
      title: video.title,
      description: video.description,
      videoId: video.id,
    });
    if (shared) {
      videoRepository.incrementShares(video.id).catch(() => {});
    }
  }, [video]);

  const handleCopyLink = useCallback(async () => {
    if (!video) return;
    const ok = await copyLink(video.id);
    if (ok) toast.success('Link copied');
    else toast.error('Could not copy link');
  }, [video, toast]);

  const setSpeed = useCallback((rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  }, []);

  const isVideoCreator = useMemo(
    () => firebaseUser?.uid === video?.creatorId,
    [firebaseUser, video],
  );

  const sortedComments = useMemo(() => {
    const pinned = comments.filter((c) => c.isPinned && !c.parentId);
    const regular = comments.filter((c) => !c.isPinned && !c.parentId);
    if (commentSort === 'most_liked') {
      regular.sort((a, b) => b.likesCount - a.likesCount);
    } else {
      regular.sort((a, b) => b.createdAt - a.createdAt);
    }
    return [...pinned, ...regular];
  }, [comments, commentSort]);

  const handleVideoProgress = useCallback((progress: number, positionSec: number, durationSec: number) => {
    if (!video || !durationSec || hasTrackedViewRef.current) return;
    // Count a view only after at least 3 seconds of watch time.
    // The repository handles creator exclusion and 24h dedup internally.
    if (positionSec >= 3) {
      hasTrackedViewRef.current = true;
      videoRepository.incrementViews(video.id, firebaseUser?.uid).catch((err: unknown) => {
        console.error('[Watch] incrementViews failed:', err);
      });
    }
    if (durationSec > 0 && progress > 0.05) {
      recordWatchProgress(video.id, progress, Math.round(positionSec), Math.round(durationSec));
    }
  }, [video, firebaseUser?.uid, recordWatchProgress]);

  if (isLoading) return <LoadingScreen message="Loading video..." />;
  if (error) return <ErrorState message={error} onRetry={() => router.back()} />;
  if (!video) return <ErrorState message="Video not found" onRetry={() => router.back()} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.videoWrap}>
          {video.videoUrl ? (
            <EnhancedVideoPlayer
              source={{ uri: video.videoUrl }}
              initialPositionSeconds={resumePosition}
              autoPlay={autoPlay}
              autoPlayNext={autoPlayNextEnabled && related.length > 0}
              onProgress={handleVideoProgress}
              onEnd={() => {
                if (autoPlayNextEnabled && related.length > 0) {
                  router.replace(`/watch/${related[0].id}`);
                }
              }}
            />
          ) : (
            <View style={[styles.video, styles.videoPlaceholder]}>
              <Text style={[typography.body, { color: colors.textMuted }]}>Video unavailable</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {(video.isExclusive || video.isSponsored || video.isFeatured) ? (
            <LinearGradient
              colors={['rgba(124,58,237,0.2)', 'rgba(124,58,237,0.06)']}
              style={styles.featureBadge}
            >
              <Text style={[typography.overline, { color: colors.secondaryLight }]}>Premium • Now streaming</Text>
            </LinearGradient>
          ) : null}
          <Text style={[typography.h2, styles.title]}>{video.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Eye size={14} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {formatCount(video.viewsCount)} views
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textMuted }]}>·</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {timeAgo(video.createdAt)}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>·</Text>
            <View style={styles.categoryBadge}>
              <Text style={[typography.overline, { color: colors.secondaryLight }]}>
                {video.category}
              </Text>
            </View>
          </View>

          {video.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {video.tags.slice(0, 5).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable style={[styles.actionBtn, liked && styles.actionActive]} onPress={handleLike}>
              <ThumbsUp size={20} color={liked ? colors.secondary : colors.textSecondary} fill={liked ? colors.secondary : undefined} />
              <Text style={[typography.caption, { color: liked ? colors.secondary : colors.textSecondary }]}>
                {formatCount(video.likesCount + (liked && !video.likedByMe ? 1 : 0))}
              </Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, bookmarked && styles.actionActive]} onPress={handleBookmark}>
              <Bookmark size={20} color={bookmarked ? colors.secondary : colors.textSecondary} fill={bookmarked ? colors.secondary : undefined} />
              <Text style={[typography.caption, { color: bookmarked ? colors.secondary : colors.textSecondary }]}>Save</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleShare} hitSlop={8}>
              <Share2 size={20} color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Share</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleCopyLink} hitSlop={8}>
              <LinkIcon size={18} color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Copy Link</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setReportVideoModal(true)}>
              <Flag size={18} color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Report</Text>
            </Pressable>
            <Pressable style={styles.speedBtn} onPress={() => setShowSpeedMenu(!showSpeedMenu)}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{playbackRate}x</Text>
              {showSpeedMenu ? (
                <View style={styles.speedMenu}>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <Pressable key={rate} style={styles.speedItem} onPress={() => setSpeed(rate)}>
                      <Text style={[typography.caption, { color: rate === playbackRate ? colors.secondary : colors.text }]}>
                        {rate}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Pressable>
          </View>

          <View style={styles.creatorRow}>
            <Pressable style={styles.creatorInfo} onPress={() => router.push(`/profile?creatorId=${video.creatorId}`)}>
              <Avatar uri={video.creatorAvatarUrl} size={44} />
              <View style={styles.creatorMeta}>
                <View style={styles.creatorNameRow}>
                  <Text style={[typography.label, { color: colors.text }]} numberOfLines={1}>
                    {video.creatorName}
                  </Text>
                  {video.creatorIsVerified ? <BadgeCheck size={16} color={colors.secondary} /> : null}
                </View>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {formatCount(video.viewsCount)} views
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.subscribeBtn, subscribed && styles.subscribeActive]}
              onPress={handleSubscribe}
            >
              <Bell size={16} color={subscribed ? colors.textMuted : colors.text} />
              <Text style={[typography.label, { color: subscribed ? colors.textMuted : colors.text }]}>
                {subscribed ? 'Subscribed' : 'Subscribe'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.descWrap}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              {video.description}
            </Text>
          </View>

          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, activeTab === 'comments' && styles.tabActive]}
              onPress={() => setActiveTab('comments')}
            >
              <MessageCircle size={16} color={activeTab === 'comments' ? colors.secondary : colors.textMuted} />
              <Text style={[typography.label, { color: activeTab === 'comments' ? colors.secondary : colors.textMuted }]}>
                Comments {sortedComments.length > 0 ? `(${sortedComments.length})` : ''}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'related' && styles.tabActive]}
              onPress={() => setActiveTab('related')}
            >
              <Text style={[typography.label, { color: activeTab === 'related' ? colors.secondary : colors.textMuted }]}>
                Related
              </Text>
            </Pressable>
          </View>

          {activeTab === 'comments' ? (
            <View style={styles.commentsSection}>
              {firebaseUser ? (
                <View style={styles.commentInputRow}>
                  <View style={styles.commentInputWrap}>
                    <TextInput
                      style={styles.inlineInput}
                      value={commentInput}
                      onChangeText={setCommentInput}
                      placeholder="Add a comment..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                    />
                    <Pressable onPress={handlePostComment} disabled={isPostingComment || !commentInput.trim()} style={styles.sendBtn}>
                      <Send size={18} color={isPostingComment || !commentInput.trim() ? colors.textMuted : colors.secondary} />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <Pressable style={styles.sortRow} onPress={() => setShowSortMenu(!showSortMenu)}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Sort by: {SORT_OPTIONS.find((o) => o.value === commentSort)?.label}
                </Text>
                <ChevronDown size={14} color={colors.textMuted} />
                {showSortMenu ? (
                  <View style={styles.sortMenu}>
                    {SORT_OPTIONS.map((opt) => (
                      <Pressable
                        key={opt.value}
                        style={styles.sortItem}
                        onPress={() => { setCommentSort(opt.value); setShowSortMenu(false); }}
                      >
                        <Text style={[typography.caption, { color: opt.value === commentSort ? colors.secondary : colors.text }]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </Pressable>

              {sortedComments.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title="No comments yet"
                  description="Be the first to share your thoughts"
                />
              ) : (
                sortedComments.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    currentUserId={firebaseUser?.uid ?? null}
                    isVideoCreator={isVideoCreator}
                    replies={repliesMap[c.id] ?? []}
                    isExpanded={expandedReplies.has(c.id)}
                    onToggleReplies={() => handleToggleReplies(c)}
                    onLike={() => handleLikeComment(c.id)}
                    onDelete={() => handleDeleteComment(c.id)}
                    onEdit={() => handleEditComment(c)}
                    onPin={() => handlePinComment(c)}
                    onReport={() => handleReportComment(c.id)}
                    onReply={() => { setReplyingTo(c); setReplyInput(''); }}
                    showActions={showActionsFor === c.id}
                    onToggleActions={() => setShowActionsFor(showActionsFor === c.id ? null : c.id)}
                  />
                ))
              )}

              {replyingTo ? (
                <View style={styles.replyInputRow}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Replying to {replyingTo.authorName}
                  </Text>
                  <View style={styles.commentInputWrap}>
                    <TextInput
                      style={styles.inlineInput}
                      value={replyInput}
                      onChangeText={setReplyInput}
                      placeholder="Add a reply..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      autoFocus
                    />
                    <Pressable
                      onPress={() => handlePostReply(replyingTo)}
                      disabled={!replyInput.trim()}
                      style={styles.sendBtn}
                    >
                      <Send size={18} color={!replyInput.trim() ? colors.textMuted : colors.secondary} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => setReplyingTo(null)}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>Cancel</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.relatedSection}>
              {related.length === 0 ? (
                <EmptyState icon={VideoIcon} title="No related videos" description="Check back later" />
              ) : (
                related.map((rv) => (
                  <Pressable key={rv.id} onPress={() => router.push(`/watch/${rv.id}`)}>
                    <View style={styles.relatedItem}>
                      <Image source={{ uri: rv.thumbnailUrl }} style={styles.relatedThumb} />
                      <View style={styles.relatedMeta}>
                        <Text style={[typography.label, { color: colors.text }]} numberOfLines={2}>
                          {rv.title}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                          {rv.creatorName}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textMuted }]}>
                          {formatCount(rv.viewsCount)} views · {timeAgo(rv.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.backHeader, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
      </View>

      <Modal visible={Boolean(editingComment)} onClose={() => setEditingComment(null)} title="Edit comment">
        <View style={styles.editForm}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            placeholder="Edit your comment..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            autoFocus
          />
          <View style={styles.editActions}>
            <Pressable style={styles.editCancelBtn} onPress={() => setEditingComment(null)}>
              <Text style={[typography.label, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.editSaveBtn} onPress={handleSaveEdit}>
              <Text style={[typography.label, { color: colors.text }]}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showReportModal} onClose={() => setShowReportModal(false)} title="Report comment">
        <View style={styles.reportForm}>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason}
              style={[styles.reportReasonItem, reportReason === reason && styles.reportReasonActive]}
              onPress={() => setReportReason(reason)}
            >
              <Text style={[typography.bodySmall, { color: reportReason === reason ? colors.secondary : colors.textSecondary }]}>
                {reason}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.reportSubmitBtn, !reportReason && styles.reportSubmitDisabled]}
            onPress={handleSubmitReport}
            disabled={!reportReason}
          >
            <Text style={[typography.label, { color: colors.text }]}>Submit Report</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={reportVideoModal} onClose={() => setReportVideoModal(false)} title="Report video">
        <View style={styles.reportForm}>
          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason}
              style={[styles.reportReasonItem, videoReportReason === reason && styles.reportReasonActive]}
              onPress={() => setVideoReportReason(reason)}
            >
              <Text style={[typography.bodySmall, { color: videoReportReason === reason ? colors.secondary : colors.textSecondary }]}>
                {reason}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.reportSubmitBtn, !videoReportReason && styles.reportSubmitDisabled]}
            onPress={handleReportVideo}
            disabled={!videoReportReason}
          >
            <Text style={[typography.label, { color: colors.text }]}>Submit Report</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: string | null;
  isVideoCreator: boolean;
  replies: Comment[];
  isExpanded: boolean;
  onToggleReplies: () => void;
  onLike: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onPin: () => void;
  onReport: () => void;
  onReply: () => void;
  showActions: boolean;
  onToggleActions: () => void;
}

function CommentItem({
  comment, currentUserId, isVideoCreator, replies, isExpanded,
  onToggleReplies, onLike, onDelete, onEdit, onPin, onReport, onReply,
  showActions, onToggleActions,
}: CommentItemProps) {
  const isOwn = comment.authorId === currentUserId;

  return (
    <View style={styles.commentItem}>
      <Avatar uri={comment.authorAvatarUrl} size={36} />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAuthorRow}>
            {comment.isPinned ? <Pin size={12} color={colors.secondary} /> : null}
            <Text style={[typography.label, { color: colors.text }]}>
              {comment.authorName}
            </Text>
            {comment.authorIsCreator ? (
              <View style={styles.creatorTag}>
                <Text style={[typography.overline, { color: colors.secondaryLight, fontSize: 9 }]}>CREATOR</Text>
              </View>
            ) : null}
            {comment.isEdited ? (
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>(edited)</Text>
            ) : null}
          </View>
          <View style={styles.commentHeaderRight}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {timeAgo(comment.createdAt)}
            </Text>
            <Pressable onPress={onToggleActions} hitSlop={8}>
              <MoreHorizontal size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {showActions ? (
          <View style={styles.commentActions}>
            <Pressable style={styles.commentActionBtn} onPress={onLike}>
              <Heart size={14} color={comment.isLikedByMe ? colors.secondary : colors.textMuted} fill={comment.isLikedByMe ? colors.secondary : undefined} />
              <Text style={[typography.caption, { color: colors.textMuted }]}>Like</Text>
            </Pressable>
            <Pressable style={styles.commentActionBtn} onPress={onReply}>
              <CornerDownRight size={14} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textMuted }]}>Reply</Text>
            </Pressable>
            {isOwn ? (
              <>
                <Pressable style={styles.commentActionBtn} onPress={onEdit}>
                  <Edit2 size={14} color={colors.textMuted} />
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Edit</Text>
                </Pressable>
                <Pressable style={styles.commentActionBtn} onPress={onDelete}>
                  <Trash2 size={14} color={colors.error} />
                  <Text style={[typography.caption, { color: colors.error }]}>Delete</Text>
                </Pressable>
              </>
            ) : null}
            {isVideoCreator ? (
              <Pressable style={styles.commentActionBtn} onPress={onPin}>
                <Pin size={14} color={comment.isPinned ? colors.secondary : colors.textMuted} />
                <Text style={[typography.caption, { color: comment.isPinned ? colors.secondary : colors.textMuted }]}>
                  {comment.isPinned ? 'Unpin' : 'Pin'}
                </Text>
              </Pressable>
            ) : null}
            {!isOwn ? (
              <Pressable style={styles.commentActionBtn} onPress={onReport}>
                <Flag size={14} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textMuted }]}>Report</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
          {comment.body}
        </Text>

        <View style={styles.commentFooter}>
          <Pressable style={styles.commentLikeBtn} onPress={onLike} hitSlop={8}>
            <Heart size={14} color={comment.isLikedByMe ? colors.secondary : colors.textMuted} fill={comment.isLikedByMe ? colors.secondary : undefined} />
            <Text style={[typography.caption, { color: comment.isLikedByMe ? colors.secondary : colors.textMuted }]}>
              {formatCount(comment.likesCount)}
            </Text>
          </Pressable>
          {comment.repliesCount > 0 ? (
            <Pressable style={styles.replyToggleBtn} onPress={onToggleReplies} hitSlop={8}>
              <CornerDownRight size={14} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {isExpanded ? 'Hide' : 'View'} {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.replyToggleBtn} onPress={onReply} hitSlop={8}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Reply</Text>
          </Pressable>
        </View>

        {isExpanded && replies.length > 0 ? (
          <View style={styles.repliesContainer}>
            {replies.map((reply) => (
              <View key={reply.id} style={styles.replyItem}>
                <Avatar uri={reply.authorAvatarUrl} size={28} />
                <View style={styles.replyBody}>
                  <View style={styles.replyHeader}>
                    <Text style={[typography.label, { color: colors.text, fontSize: 13 }]}>
                      {reply.authorName}
                    </Text>
                    {reply.isEdited ? (
                      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>(edited)</Text>
                    ) : null}
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {timeAgo(reply.createdAt)}
                    </Text>
                  </View>
                  <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
                    {reply.body}
                  </Text>
                  <View style={styles.replyFooter}>
                    <Pressable style={styles.commentLikeBtn} onPress={onLike} hitSlop={8}>
                      <Heart size={12} color={colors.textMuted} />
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        {formatCount(reply.likesCount)}
                      </Text>
                    </Pressable>
                    {reply.authorId === currentUserId ? (
                      <Pressable onPress={onDelete} hitSlop={8}>
                        <Trash2 size={12} color={colors.error} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },
  backHeader: { position: 'absolute', top: 0, left: 0, paddingTop: spacing.base, paddingLeft: spacing.base },
  videoWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.card },
  video: { width: '100%', height: '100%' },
  videoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.base, paddingTop: spacing.md },
  featureBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.base,
    marginBottom: spacing.sm,
  },
  title: { color: colors.text, marginBottom: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryBadge: {
    backgroundColor: 'rgba(124,58,237,0.15)', paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.base,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  tag: { backgroundColor: colors.card, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.base },
  actionRow: {
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md,
    paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.card, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.base,
  },
  actionActive: { backgroundColor: 'rgba(124,58,237,0.12)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)' },
  speedBtn: {
    backgroundColor: colors.card, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.base, alignItems: 'center', justifyContent: 'center',
  },
  speedMenu: {
    position: 'absolute', bottom: 48, right: 0, backgroundColor: colors.card,
    borderRadius: radius.lg, ...shadows.lg, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', zIndex: 10,
  },
  speedItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  creatorRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  creatorInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  creatorMeta: { gap: 2, flex: 1 },
  creatorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.secondary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.base, ...shadows.glow,
  },
  subscribeActive: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  descWrap: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  tabRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.secondary },
  commentsSection: { gap: spacing.sm },
  commentInputRow: { marginBottom: spacing.md },
  commentInputWrap: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  inlineInput: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    color: colors.text, fontFamily: 'Inter-Regular', fontSize: 14,
    borderWidth: 1, borderColor: colors.border, minHeight: 44, maxHeight: 100,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm,
    position: 'relative',
  },
  sortMenu: {
    position: 'absolute', top: 36, left: 0, backgroundColor: colors.card,
    borderRadius: radius.lg, ...shadows.lg, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', zIndex: 10,
  },
  sortItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  commentItem: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  commentBody: { flex: 1, gap: 4 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  creatorTag: {
    backgroundColor: 'rgba(124,58,237,0.15)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: radius.sm,
  },
  commentActions: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingVertical: spacing.xs,
    backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.sm,
  },
  commentActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  commentLikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  repliesContainer: { marginTop: spacing.sm, gap: spacing.sm, paddingLeft: spacing.xs },
  replyItem: { flexDirection: 'row', gap: spacing.sm },
  replyBody: { flex: 1, gap: 2 },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replyFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  relatedSection: { gap: spacing.sm },
  relatedItem: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  relatedThumb: { width: 160, height: 90, borderRadius: radius.md, backgroundColor: colors.card },
  relatedMeta: { flex: 1, gap: 2, justifyContent: 'center' },
  replyInputRow: { marginTop: spacing.md, gap: spacing.sm },
  editForm: { gap: spacing.md },
  editInput: {
    backgroundColor: colors.card, borderRadius: radius.base, paddingHorizontal: spacing.base,
    paddingVertical: spacing.md, color: colors.text, fontFamily: 'Inter-Regular', fontSize: 16,
    borderWidth: 1.5, borderColor: colors.border, minHeight: 90,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  editCancelBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  editSaveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.base,
  },
  reportForm: { gap: spacing.sm },
  reportReasonItem: {
    backgroundColor: colors.card, borderRadius: radius.base, paddingHorizontal: spacing.md,
    paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  reportReasonActive: { borderColor: colors.secondary, backgroundColor: 'rgba(124,58,237,0.1)' },
  reportSubmitBtn: {
    backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.base,
    alignItems: 'center', marginTop: spacing.sm,
  },
  reportSubmitDisabled: { opacity: 0.5 },
});
