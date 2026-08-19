import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '@/theme';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const loop = (sv: SharedValue<number>, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        ),
      );
    };
    loop(dot1, 0);
    loop(dot2, 160);
    loop(dot3, 320);
  }, [dot1, dot2, dot3]);

  const dotStyle = (sv: SharedValue<number>) =>
    useAnimatedStyle(() => ({ opacity: sv.value, transform: [{ scale: 0.8 + sv.value * 0.4 }] }));

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundElevated]}
      style={styles.container}
    >
      <View style={styles.dotRow}>
        <Animated.View style={[styles.dot, dotStyle(dot1)]} />
        <Animated.View style={[styles.dot, dotStyle(dot2)]} />
        <Animated.View style={[styles.dot, dotStyle(dot3)]} />
      </View>
      {message ? (
        <Text style={[typography.caption, styles.message]}>{message}</Text>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  dotRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary,
  },
  message: {
    color: colors.textMuted,
  },
});
