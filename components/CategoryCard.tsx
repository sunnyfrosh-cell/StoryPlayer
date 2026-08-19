import { Pressable, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { getIcon } from '@/utils';

interface CategoryCardProps {
  name: string;
  color: string;
  iconName: string;
  videosCount?: number;
  onPress?: (name: string) => void;
  width?: number;
}

const DEFAULT_WIDTH = 140;

export function CategoryCard({
  name,
  color,
  iconName,
  videosCount,
  onPress,
  width = DEFAULT_WIDTH,
}: CategoryCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const Icon: LucideIcon = getIcon(iconName);

  return (
    <Animated.View style={[{ width }, animatedStyle, shadows.md]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.95, { damping: 18, stiffness: 300 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        onPress={() => onPress?.(name)}
        style={styles.pressable}
      >
        <LinearGradient
          colors={[color, `${color}99`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.iconWrap}>
            <Icon size={24} color={colors.text} strokeWidth={2} />
          </View>
          <View>
            <Text style={[typography.h4, styles.name]}>{name}</Text>
            {typeof videosCount === 'number' ? (
              <Text style={[typography.caption, styles.count]}>
                {videosCount} videos
              </Text>
            ) : null}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  gradient: {
    aspectRatio: 1.4,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.base,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  name: {
    color: colors.text,
  },
  count: {
    color: 'rgba(255,255,255,0.82)',
  },
});
