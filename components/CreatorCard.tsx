import { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import type { PopularCreator } from '@/contexts';
import { Avatar } from './Avatar';
import { colors, spacing, radius, typography } from '@/theme';
import { formatCount } from '@/utils';

interface CreatorCardProps {
  creator: PopularCreator;
  isFollowing: boolean;
  onFollow: () => void;
  onPress: (creatorId: string) => void;
  width?: number;
}

export const CreatorCard = memo(function CreatorCard({
  creator,
  isFollowing,
  onFollow,
  onPress,
  width = 140,
}: CreatorCardProps) {
  return (
    <Pressable style={[styles.card, { width }]} onPress={() => onPress(creator.id)}>
      <Avatar uri={creator.avatarUrl} size={64} />
      <Text style={[typography.label, styles.name]} numberOfLines={1}>
        {creator.displayName}
      </Text>
      <View style={styles.handleRow}>
        {creator.isVerified ? <BadgeCheck size={12} color={colors.secondary} /> : null}
        <Text style={[typography.caption, styles.handle]} numberOfLines={1}>
          {formatCount(creator.followersCount)} followers
        </Text>
      </View>
      <Pressable
        style={[styles.followBtn, isFollowing && styles.followingBtn]}
        onPress={onFollow}
      >
        <Text style={[typography.caption, isFollowing ? styles.followingText : styles.followText]}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: { color: colors.text, textAlign: 'center' },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  handle: { color: colors.textMuted },
  followBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.base,
    marginTop: spacing.xs,
    minWidth: 80,
    alignItems: 'center',
  },
  followingBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  followText: { color: colors.text, fontWeight: '600' },
  followingText: { color: colors.textSecondary },
});
