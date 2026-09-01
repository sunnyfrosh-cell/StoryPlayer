import { Pressable, View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Play, Eye, Clock } from 'lucide-react-native';
import type { Video } from '@/types';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatCount, formatDuration, getVideoThumbnailSource } from '@/utils';
import { Badge } from './Badge';

interface VideoCardProps {
  video: Video;
  onPress?: (video: Video) => void;
  width?: number;
  variant?: 'portrait' | 'landscape';
}

const DEFAULT_WIDTH = 168;

export function VideoCard({
  video,
  onPress,
  width = DEFAULT_WIDTH,
  variant = 'portrait',
}: VideoCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleIn = () => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 300 });
  };
  const handleOut = () => {
    scale.value = withSpring(1, { damping: 16, stiffness: 260 });
  };

  const isLandscape = variant === 'landscape';
  const aspectRatio = isLandscape ? 16 / 9 : 2 / 3;
  const coverSource = getVideoThumbnailSource(video.thumbnailUrl, video.videoUrl);

  return (
    <Animated.View style={[{ width }, animatedStyle, shadows.md]}>
      <Pressable
        onPressIn={handleIn}
        onPressOut={handleOut}
        onPress={() => onPress?.(video)}
        style={styles.pressable}
      >
        <ImageBackground
          source={coverSource}
          style={[styles.cover, { aspectRatio }]}
          imageStyle={styles.coverImage}
        >
          <LinearGradient
            colors={['rgba(11,11,15,0)', 'rgba(11,11,15,0.88)']}
            style={styles.gradient}
          >
            {video.isNew ? (
              <View style={styles.badgeRow}>
                <Badge label="New" variant="primary" />
              </View>
            ) : null}
            <View style={styles.playWrap}>
              <View style={styles.playButton}>
                <Play size={18} color={colors.text} fill={colors.text} />
              </View>
            </View>
            <View style={styles.meta}>
              <Text style={[typography.label, styles.title]} numberOfLines={2}>
                {video.title}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Eye size={12} color={colors.textSecondary} />
                  <Text style={[typography.caption, styles.metaText]}>
                    {formatCount(video.viewsCount)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={12} color={colors.textSecondary} />
                  <Text style={[typography.caption, styles.metaText]}>
                    {formatDuration(video.durationSeconds)}
                  </Text>
                </View>
              </View>
              {isLandscape ? (
                <Text style={[typography.caption, styles.creator]} numberOfLines={1}>
                  {video.creatorName}
                </Text>
              ) : null}
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    justifyContent: 'space-between',
  },
  coverImage: {
    borderRadius: radius.lg,
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.sm + 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  playWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124,58,237,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  meta: {
    gap: 2,
  },
  title: {
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    color: colors.textSecondary,
  },
  creator: {
    color: colors.textMuted,
    marginTop: 1,
  },
});
