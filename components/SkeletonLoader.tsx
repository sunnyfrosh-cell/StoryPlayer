import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  rounded?: number;
  style?: object;
}

export function SkeletonLoader({
  width = '100%',
  height = 16,
  rounded = 8,
  style,
}: SkeletonLoaderProps) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.shimmerBase }, animatedStyle, style]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonLoader width="100%" height={140} rounded={14} />
      <SkeletonLoader width="80%" height={12} style={{ marginTop: 10 }} />
      <SkeletonLoader width="50%" height={10} style={{ marginTop: 6 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 168,
    gap: 0,
  },
});
