import { Pressable, View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Heart, MessageCircle, UserPlus, UserCheck, Video, CheckCircle, Share2, Info, CornerDownRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { AppNotification } from '@/types';
import { colors, spacing, radius, typography } from '@/theme';
import { getImageSource, timeAgo } from '@/utils';
import { Avatar } from './Avatar';

const typeIcon: Record<AppNotification['type'], LucideIcon> = {
  new_video: Video,
  new_follower: UserPlus,
  new_subscriber: UserCheck,
  like: Heart,
  comment: MessageCircle,
  reply: CornerDownRight,
  video_upload_complete: CheckCircle,
  playlist_shared: Share2,
  system: Info,
};

const typeAccent: Record<AppNotification['type'], string> = {
  new_video: colors.primary,
  new_follower: '#22C55E',
  new_subscriber: '#F59E0B',
  like: '#EC4899',
  comment: colors.secondary,
  reply: colors.secondaryLight,
  video_upload_complete: '#22C55E',
  playlist_shared: '#06B6D4',
  system: colors.textMuted,
};

interface NotificationCardProps {
  notification: AppNotification;
  onPress?: (n: AppNotification) => void;
}

export function NotificationCard({ notification, onPress }: NotificationCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Icon = typeIcon[notification.type];
  const accent = typeAccent[notification.type];
  const imageSource = getImageSource(notification.imageUrl);

  return (
    <Animated.View style={[animatedStyle]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        onPress={() => onPress?.(notification)}
        style={[styles.container, !notification.read && styles.unread]}
      >
        <View style={styles.avatarWrap}>
          {notification.actorAvatarUrl ? (
            <Avatar uri={notification.actorAvatarUrl} size={48} />
          ) : imageSource ? (
            <Image
              source={imageSource}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.iconOnly, { backgroundColor: `${accent}22` }]}>
              <Icon size={22} color={accent} strokeWidth={2} />
            </View>
          )}
          {!notification.read ? <View style={styles.dot} /> : null}
        </View>
        <View style={styles.body}>
          <Text style={[typography.label, styles.title]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[typography.bodySmall, styles.bodyText]} numberOfLines={2}>
            {notification.body}
          </Text>
          <Text style={[typography.caption, styles.time]}>
            {timeAgo(notification.createdAt)}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  unread: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.18)',
  },
  avatarWrap: {
    position: 'relative',
  },
  iconOnly: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.card,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
  },
  bodyText: {
    color: colors.textSecondary,
  },
  time: {
    color: colors.textMuted,
    marginTop: 2,
  },
});
