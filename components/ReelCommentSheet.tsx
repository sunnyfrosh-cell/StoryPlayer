import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Heart,
  Send,
  Trash2,
  CornerDownRight,
  ChevronDown,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { colors, spacing, radius, typography } from '@/theme';
import { timeAgo, formatCount } from '@/utils';
import { reelRepository } from '@/firebase';
import { useAuth, useToast } from '@/contexts';
import type { Comment } from '@/types';

interface ReelCommentsScreenProps {
  reelId: string;
  creatorId: string;
}

export function ReelCommentsScreen({
  reelId,
  creatorId,
}: ReelCommentsScreenProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [repliesMap, setRepliesMap] = useState<Record<string, Comment[]>>({});
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [localCount, setLocalCount] = useState(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<TextInput>(null);
  const replyInputRef = useRef<TextInput>(null);
  // Subscribe to real-time comments
  useEffect(() => {
    if (!reelId) return;
    setLoading(true);
    unsubscribeRef.current = reelRepository.subscribeToReelComments(reelId, (newComments) => {
      // Separate top-level comments from replies
      const topLevel = newComments.filter((c) => !c.parentId);
      const replyMap: Record<string, Comment[]> = {};
      newComments.forEach((c) => {
        if (c.parentId) {
          if (!replyMap[c.parentId]) replyMap[c.parentId] = [];
          replyMap[c.parentId].push(c);
        }
      });
      setComments(topLevel);
      setRepliesMap(replyMap);
      setLoading(false);
      // Update local count ONLY — defer parent callback
      setLocalCount(newComments.length);
    });
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [reelId]);

  const handleSubmitComment = useCallback(async () => {
    if (!inputText.trim() || !user || submitting) return;
    setSubmitting(true);
    const text = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    // Optimistic: add a temporary comment
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      videoId: reelId,
      authorId: user.id,
      authorName: user.displayName,
      authorAvatarUrl: user.avatarUrl,
      authorIsCreator: user.isCreator,
      body: text,
      likesCount: 0,
      repliesCount: 0,
      isLikedByMe: false,
      isPinned: false,
      isEdited: false,
      parentId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setComments((prev) => [optimisticComment, ...prev]);
    // Update count separately in a new render cycle
    setLocalCount((prev) => prev + 1);

    try {
      await reelRepository.addReelComment({
        reelId,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatarUrl: user.avatarUrl,
        authorIsCreator: user.isCreator,
        body: text,
        parentId: null,
      });
    } catch {
      // Remove optimistic comment on failure
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setLocalCount((prev) => Math.max(0, prev - 1));
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }, [inputText, user, submitting, reelId, toast]);

  const handleSubmitReply = useCallback(async (parentComment: Comment) => {
    if (!replyText.trim() || !user || submitting) return;
    setSubmitting(true);
    const text = replyText.trim();
    setReplyText('');
    setReplyingTo(null);

    // Optimistic reply
    const tempId = `temp-${Date.now()}`;
    const optimisticReply: Comment = {
      id: tempId,
      videoId: reelId,
      authorId: user.id,
      authorName: user.displayName,
      authorAvatarUrl: user.avatarUrl,
      authorIsCreator: user.isCreator,
      body: text,
      likesCount: 0,
      repliesCount: 0,
      isLikedByMe: false,
      isPinned: false,
      isEdited: false,
      parentId: parentComment.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setRepliesMap((prev) => ({
      ...prev,
      [parentComment.id]: [...(prev[parentComment.id] ?? []), optimisticReply],
    }));
    setComments((prev) =>
      prev.map((c) => c.id === parentComment.id ? { ...c, repliesCount: c.repliesCount + 1 } : c),
    );
    setLocalCount((prev) => prev + 1);

    try {
      await reelRepository.addReelComment({
        reelId,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatarUrl: user.avatarUrl,
        authorIsCreator: user.isCreator,
        body: text,
        parentId: parentComment.id,
      });
    } catch {
      setRepliesMap((prev) => ({
        ...prev,
        [parentComment.id]: (prev[parentComment.id] ?? []).filter((r) => r.id !== tempId),
      }));
      setComments((prev) =>
        prev.map((c) => c.id === parentComment.id ? { ...c, repliesCount: Math.max(0, c.repliesCount - 1) } : c),
      );
      setLocalCount((prev) => Math.max(0, prev - 1));
      toast.error('Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  }, [replyText, user, submitting, reelId, toast]);

  const handleDeleteComment = useCallback(async (comment: Comment) => {
    // Optimistic remove
    const wasReply = !!comment.parentId;
    if (wasReply) {
      setRepliesMap((prev) => ({
        ...prev,
        [comment.parentId!]: (prev[comment.parentId!] ?? []).filter((r) => r.id !== comment.id),
      }));
      setComments((prev) =>
        prev.map((c) => c.id === comment.parentId ? { ...c, repliesCount: Math.max(0, c.repliesCount - 1) } : c),
      );
    } else {
      // Also remove its replies
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      setRepliesMap((prev) => {
        const next = { ...prev };
        delete next[comment.id];
        return next;
      });
    }
    const removed = wasReply ? 1 : 1 + (repliesMap[comment.id]?.length ?? 0);
    setLocalCount((prev) => Math.max(0, prev - removed));

    try {
      await reelRepository.deleteReelComment(comment.id, reelId);
    } catch {
      toast.error('Failed to delete comment');
      // Re-fetch from server
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = reelRepository.subscribeToReelComments(reelId, (newComments) => {
        const topLevel = newComments.filter((c) => !c.parentId);
        const replyMap: Record<string, Comment[]> = {};
        newComments.forEach((c) => {
          if (c.parentId) {
            if (!replyMap[c.parentId]) replyMap[c.parentId] = [];
            replyMap[c.parentId].push(c);
          }
        });
        setComments(topLevel);
        setRepliesMap(replyMap);
        setLocalCount(newComments.length);
      });
    }
  }, [reelId, repliesMap, toast]);

  const toggleReplies = useCallback((commentId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const toggleCommentLike = useCallback((commentId: string) => {
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const startReply = useCallback((comment: Comment) => {
    setReplyingTo(comment);
    setReplyText('');
    setTimeout(() => replyInputRef.current?.focus(), 100);
  }, []);

  const isVideoOwner = user?.id === creatorId;

  const renderComment = useCallback(({ item }: { item: Comment }) => {
    const isLiked = likedComments.has(item.id);
    const isExpanded = expandedReplies.has(item.id);
    const replies = repliesMap[item.id] ?? [];
    const isOwner = user?.id === item.authorId;

    return (
      <View style={styles.commentItem}>
        <ExpoImage
          source={item.authorAvatarUrl ? { uri: item.authorAvatarUrl } : undefined}
          style={styles.commentAvatar}
          contentFit="cover"
          placeholder={colors.card}
        />
        <View style={styles.commentBody}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{item.authorName}</Text>
            {item.authorIsCreator && <Text style={styles.creatorBadge}>Creator</Text>}
            <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{item.body}</Text>
          <View style={styles.commentActions}>
            <Pressable onPress={() => toggleCommentLike(item.id)} style={styles.commentActionBtn}>
              <Heart size={14} color={isLiked ? colors.error : colors.textMuted} fill={isLiked ? colors.error : undefined} />
              <Text style={[styles.commentActionText, isLiked && { color: colors.error }]}>
                {formatCount(item.likesCount + (isLiked ? 1 : 0))}
              </Text>
            </Pressable>
            <Pressable onPress={() => startReply(item)} style={styles.commentActionBtn}>
              <CornerDownRight size={14} color={colors.textMuted} />
              <Text style={styles.commentActionText}>Reply</Text>
            </Pressable>
            {item.repliesCount > 0 && (
              <Pressable onPress={() => toggleReplies(item.id)} style={styles.commentActionBtn}>
                <ChevronDown
                  size={14}
                  color={colors.textMuted}
                  style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                />
                <Text style={styles.commentActionText}>
                  {item.repliesCount} {item.repliesCount === 1 ? 'reply' : 'replies'}
                </Text>
              </Pressable>
            )}
            {isOwner && (
              <Pressable onPress={() => handleDeleteComment(item)} style={styles.commentActionBtn}>
                <Trash2 size={14} color={colors.error} />
                <Text style={[styles.commentActionText, { color: colors.error }]}>Delete</Text>
              </Pressable>
            )}
          </View>

          {/* Reply input */}
          {replyingTo?.id === item.id && (
            <View style={styles.replyInputWrap}>
              <TextInput
                ref={replyInputRef}
                style={styles.replyInput}
                placeholder={`Reply to ${item.authorName}...`}
                placeholderTextColor={colors.textMuted}
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
                multiline
                maxLength={500}
              />
              <Pressable
                onPress={() => handleSubmitReply(item)}
                disabled={!replyText.trim() || submitting}
                style={styles.sendBtn}
              >
                <Send size={16} color={replyText.trim() ? colors.primary : colors.textMuted} />
              </Pressable>
            </View>
          )}

          {/* Replies */}
          {isExpanded && replies.length > 0 && (
            <View style={styles.repliesContainer}>
              {replies.map((reply) => {
                const replyLiked = likedComments.has(reply.id);
                const replyOwner = user?.id === reply.authorId;
                return (
                  <View key={reply.id} style={styles.replyItem}>
                    <ExpoImage
                      source={reply.authorAvatarUrl ? { uri: reply.authorAvatarUrl } : undefined}
                      style={styles.replyAvatar}
                      contentFit="cover"
                      placeholder={colors.card}
                    />
                    <View style={styles.replyBody}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.replyAuthor}>{reply.authorName}</Text>
                        <Text style={styles.commentTime}>{timeAgo(reply.createdAt)}</Text>
                      </View>
                      <Text style={styles.replyText}>{reply.body}</Text>
                      <View style={styles.commentActions}>
                        <Pressable onPress={() => toggleCommentLike(reply.id)} style={styles.commentActionBtn}>
                          <Heart size={12} color={replyLiked ? colors.error : colors.textMuted} fill={replyLiked ? colors.error : undefined} />
                          <Text style={styles.commentActionText}>
                            {formatCount(reply.likesCount + (replyLiked ? 1 : 0))}
                          </Text>
                        </Pressable>
                        {replyOwner && (
                          <Pressable onPress={() => handleDeleteComment(reply)} style={styles.commentActionBtn}>
                            <Trash2 size={12} color={colors.error} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  }, [
    likedComments, expandedReplies, repliesMap, user,
    replyingTo, replyText, submitting,
    toggleCommentLike, startReply, toggleReplies, handleDeleteComment, handleSubmitReply,
  ]);

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [comments]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{formatCount(localCount)} comments</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : sortedComments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No comments yet</Text>
            <Text style={styles.emptySub}>Be the first to comment</Text>
          </View>
        ) : (
          <FlatList
            data={sortedComments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input bar */}
        {user ? (
          <View style={styles.inputBar}>
            <ExpoImage
              source={user.avatarUrl ? { uri: user.avatarUrl } : undefined}
              style={styles.inputAvatar}
              contentFit="cover"
              placeholder={colors.card}
            />
            <TextInput
              ref={inputRef}
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSubmitComment}
              disabled={!inputText.trim() || submitting}
              style={styles.sendBtn}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Send size={18} color={inputText.trim() ? colors.primary : colors.textMuted} />
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.signInPrompt}>
            <Text style={styles.signInText}>Sign in to leave a comment</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    ...typography.label,
    fontWeight: '600',
  },
  closeBtn: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  headerSpacer: {
    width: 36,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: colors.text,
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  emptySub: {
    color: colors.textMuted,
    ...typography.caption,
  },
  commentItem: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  commentAuthor: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '600',
  },
  creatorBadge: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: '600',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commentTime: {
    color: colors.textMuted,
    ...typography.caption,
    marginLeft: 'auto',
  },
  commentText: {
    color: colors.text,
    ...typography.body,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  commentActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  commentActionText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  replyInputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  replyInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.text,
    ...typography.body,
    maxHeight: 100,
  },
  sendBtn: {
    padding: spacing.sm,
    marginBottom: 2,
  },
  repliesContainer: {
    marginTop: spacing.md,
    paddingLeft: spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  replyItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  replyBody: {
    flex: 1,
  },
  replyAuthor: {
    color: colors.text,
    ...typography.caption,
    fontWeight: '600',
  },
  replyText: {
    color: colors.text,
    ...typography.caption,
    marginTop: spacing.xs,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.text,
    ...typography.body,
    maxHeight: 100,
  },
  signInPrompt: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    margin: spacing.base,
  },
  signInText: {
    color: colors.textMuted,
    ...typography.caption,
    textAlign: 'center',
  },
});
