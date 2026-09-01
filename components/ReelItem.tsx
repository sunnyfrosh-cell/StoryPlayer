import React, {
  memo,
  useCallback,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Music,
  BadgeCheck,
  UserPlus,
  Check,
} from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme';
import { formatCount } from '@/utils';
import { ReelVideoPlayer } from './ReelVideoPlayer';
import type { Reel } from '@/types';

const { height: SCREEN_H } = Dimensions.get('window');

interface ReelItemProps {
  reel: Reel;
  isActive: boolean;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onComment: () => void;
  onFollow: () => void;
  onCreatorPress: () => void;
  onWatchProgress: (watchSeconds: number, durationSeconds: number) => void;
}

function ReelItemBase({
  reel,
  isActive,
  isLiked,
  isSaved,
  isFollowing,
  likeCount,
  saveCount,
  commentCount,
  onLike,
  onSave,
  onShare,
  onComment,
  onFollow,
  onCreatorPress,
  onWatchProgress,
}: ReelItemProps) {
  // Action button animations
  const likeScale = useSharedValue(1);
  const saveScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
  const commentScale = useSharedValue(1);
  const followOpacity = useSharedValue(0);

  const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    Haptics.impactAsync(style).catch(() => {});
  }, []);

  const handleLike = useCallback(() => {
    if (isLiked) return; // Don't unlike from action button — only double-tap likes
    onLike();
    likeScale.value = withSequence(
      withTiming(1.35, { duration: 150, easing: Easing.out(Easing.ease) }),
      withSpring(1, { damping: 6, stiffness: 200 }),
    );
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
  }, [isLiked, onLike, likeScale, triggerHaptic]);

  const handleDoubleTapLike = useCallback(() => {
    if (isLiked) return;
    onLike();
    likeScale.value = withSequence(
      withTiming(1.35, { duration: 150, easing: Easing.out(Easing.ease) }),
      withSpring(1, { damping: 6, stiffness: 200 }),
    );
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
  }, [isLiked, onLike, likeScale, triggerHaptic]);

  const handleSave = useCallback(() => {
    onSave();
    saveScale.value = withSequence(
      withTiming(1.3, { duration: 150 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
    triggerHaptic();
  }, [onSave, saveScale, triggerHaptic]);

  const handleShare = useCallback(() => {
    onShare();
    shareScale.value = withSequence(
      withTiming(1.3, { duration: 150 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
    triggerHaptic();
  }, [onShare, shareScale, triggerHaptic]);

  const handleComment = useCallback(() => {
    onComment();
    commentScale.value = withSequence(
      withTiming(1.3, { duration: 150 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
    triggerHaptic();
  }, [onComment, commentScale, triggerHaptic]);

  const handleFollow = useCallback(() => {
    onFollow();
    followOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 800 }),
    );
    triggerHaptic();
  }, [onFollow, followOpacity, triggerHaptic]);

  // Animated styles for action buttons
  const likeIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));
  const saveIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));
  const shareIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));
  const commentIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: commentScale.value }],
  }));

  const followBadgeStyle = useAnimatedStyle(() => ({
    opacity: followOpacity.value,
    transform: [{ scale: interpolate(followOpacity.value, [0, 1], [0.5, 1]) }],
  }));

  return (
    <View style={styles.container}>
      {/* Video player */}
      <ReelVideoPlayer
        videoUrl={reel.videoUrl}
        thumbnailUrl={reel.thumbnailUrl || undefined}
        isActive={isActive}
        onDoubleTapLike={handleDoubleTapLike}
        onWatchProgress={onWatchProgress}
      />

      {/* Gradient overlays for readability */}
      <LinearGradient
        colors={['rgba(11,11,15,0.4)', 'transparent', 'transparent', 'rgba(11,11,15,0.85)']}
        style={styles.gradientOverlay}
        pointerEvents="none"
      />

      {/* Right action rail */}
      <View style={styles.actionRail}>
        {/* Like */}
        <Pressable style={styles.actionItem} onPress={handleLike}>
          <Animated.View style={[styles.actionIcon, likeIconStyle]}>
            <Heart
              size={30}
              color={isLiked ? colors.error : colors.text}
              fill={isLiked ? colors.error : undefined}
            />
          </Animated.View>
          <Text style={styles.actionLabel}>{formatCount(likeCount)}</Text>
        </Pressable>

        {/* Comment */}
        <Pressable style={styles.actionItem} onPress={handleComment}>
          <Animated.View style={[styles.actionIcon, commentIconStyle]}>
            <MessageCircle size={30} color={colors.text} fill={colors.text} />
          </Animated.View>
          <Text style={styles.actionLabel}>{formatCount(commentCount)}</Text>
        </Pressable>

        {/* Save */}
        <Pressable style={styles.actionItem} onPress={handleSave}>
          <Animated.View style={[styles.actionIcon, saveIconStyle]}>
            <Bookmark
              size={30}
              color={isSaved ? colors.secondary : colors.text}
              fill={isSaved ? colors.secondary : undefined}
            />
          </Animated.View>
          <Text style={styles.actionLabel}>{formatCount(saveCount)}</Text>
        </Pressable>

        {/* Share */}
        <Pressable style={styles.actionItem} onPress={handleShare}>
          <Animated.View style={[styles.actionIcon, shareIconStyle]}>
            <Share2 size={28} color={colors.text} />
          </Animated.View>
          <Text style={styles.actionLabel}>Share</Text>
        </Pressable>
      </View>

      {/* Bottom info overlay */}
      <View style={styles.bottomInfo}>
        {/* Creator row */}
        <View style={styles.creatorRow}>
          <Pressable onPress={onCreatorPress} style={styles.creatorLeft}>
            <ExpoImage
              source={reel.creatorAvatarUrl ? { uri: reel.creatorAvatarUrl } : undefined}
              style={styles.creatorAvatar}
              contentFit="cover"
              placeholder={colors.card}
            />
            <View style={styles.creatorMeta}>
              <View style={styles.creatorNameRow}>
                <Text style={styles.creatorName} numberOfLines={1}>
                  {reel.creatorName}
                </Text>
                {reel.creatorIsVerified ? (
                  <BadgeCheck size={15} color={colors.secondary} />
                ) : null}
              </View>
            </View>
          </Pressable>

          {/* Follow button */}
          {!isFollowing && (
            <Pressable onPress={handleFollow} style={styles.followBtn}>
              <UserPlus size={14} color={colors.text} />
              <Text style={styles.followText}>Follow</Text>
            </Pressable>
          )}
          {/* Follow confirmation badge */}
          <Animated.View style={[styles.followBadge, followBadgeStyle]} pointerEvents="none">
            <Check size={14} color={colors.text} />
          </Animated.View>
        </View>

        {/* Title and description */}
        <Text style={styles.reelTitle} numberOfLines={2}>
          {reel.title}
        </Text>
        {reel.description ? (
          <Text style={styles.reelDesc} numberOfLines={3}>
            {reel.description}
          </Text>
        ) : null}
        {reel.hashtags.length > 0 ? (
          <Text style={styles.hashtags} numberOfLines={1}>
            {reel.hashtags.map((h) => `#${h}`).join(' ')}
          </Text>
        ) : null}

        {/* Music row */}
        <View style={styles.musicRow}>
          <Music size={12} color={colors.text} />
          <Text style={styles.musicText} numberOfLines={1}>
            Original audio · {reel.creatorName}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const ReelItem = memo(ReelItemBase);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: SCREEN_H,
    backgroundColor: colors.card,
    position: 'relative',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  actionRail: {
    position: 'absolute',
    right: spacing.sm,
    bottom: 100,
    alignItems: 'center',
    gap: spacing.md,
    zIndex: 3,
  },
  actionItem: { alignItems: 'center', gap: 4 },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  actionLabel: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  bottomInfo: {
    position: 'absolute',
    left: spacing.base,
    right: 70,
    bottom: 80,
    gap: spacing.xs,
    zIndex: 3,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  creatorLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  creatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
  },
  creatorMeta: { flex: 1 },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorName: {
    color: colors.text,
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.text,
  },
  followText: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  followBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  reelDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  hashtags: {
    color: colors.secondaryLight,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  musicText: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
});
