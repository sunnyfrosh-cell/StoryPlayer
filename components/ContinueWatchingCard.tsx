import { Pressable, View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Play } from 'lucide-react-native';
import type { WatchHistoryItem, Video } from '@/types';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatSeconds, getImageSource, timeAgo } from '@/utils';

interface ContinueWatchingCardProps {
  item: WatchHistoryItem;
  video?: Video;
  onPress?: (item: WatchHistoryItem) => void;
  width?: number;
}

const DEFAULT_WIDTH = 280;

export function ContinueWatchingCard({
  item,
  video,
  onPress,
  width = DEFAULT_WIDTH,
}: ContinueWatchingCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const progress = Math.min(1, item.progressSeconds / item.durationSeconds);
  const coverSource = getImageSource(video?.thumbnailUrl);

  return (
    <Animated.View style={[{ width }, animatedStyle, shadows.lg]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        onPress={() => onPress?.(item)}
        style={styles.pressable}
      >
        <ImageBackground
          source={coverSource}
          style={styles.cover}
          imageStyle={styles.coverImage}
        >
          <LinearGradient
            colors={['rgba(11,11,15,0.1)', 'rgba(11,11,15,0.92)']}
            style={styles.gradient}
          >
            <View style={styles.playWrap}>
              <View style={styles.playButton}>
                <Play size={20} color={colors.text} fill={colors.text} />
              </View>
            </View>
            <View style={styles.meta}>
              <Text style={[typography.overline, styles.category]}>
                {video?.category ?? 'Video'} · {timeAgo(item.lastWatchedAt)}
              </Text>
              <Text style={[typography.h4, styles.title]} numberOfLines={1}>
                {video?.title ?? 'Untitled video'}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={[typography.caption, styles.remaining]}>
                {formatSeconds(item.durationSeconds - item.progressSeconds)} left
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 10,
    justifyContent: 'flex-end',
  },
  coverImage: {
    borderRadius: radius.xl,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.base,
  },
  playWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124,58,237,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  meta: {
    gap: 4,
  },
  category: {
    color: colors.secondaryLight,
  },
  title: {
    color: colors.text,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.secondary,
  },
  remaining: {
    color: colors.textSecondary,
  },
});
