import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import { colors, spacing, typography } from '@/theme';

export default function SplashScreen() {
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const ring = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.exp) });
    logoOpacity.value = withTiming(1, { duration: 500 });
    titleOpacity.value = withDelay(250, withTiming(1, { duration: 500 }));
    subtitleOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    ring.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );

    const timeout = setTimeout(() => {
      router.replace('/onboarding');
    }, 2200);
    return () => clearTimeout(timeout);
  }, [logoScale, logoOpacity, titleOpacity, subtitleOpacity, ring]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ring.value * 360}deg` }, { scale: 1 + ring.value * 0.1 }],
    opacity: 0.4 + ring.value * 0.3,
  }));

  return (
    <LinearGradient
      colors={[colors.background, '#140A24', colors.background]}
      style={styles.container}
    >
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logo}
        >
          <Sparkles size={44} color={colors.text} strokeWidth={2} />
        </LinearGradient>
      </Animated.View>
      <Animated.View style={[styles.textWrap, titleStyle]}>
        <Text style={[typography.h1, styles.title]}>StoryVerse</Text>
      </Animated.View>
      <Animated.View style={[subtitleStyle]}>
        <Text style={[typography.bodySmall, styles.subtitle]}>
          Your stories, rewritten by you
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  logoWrap: {
    marginBottom: spacing.lg,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    gap: 4,
  },
  title: {
    color: colors.text,
    fontFamily: 'Sora-Bold',
    fontSize: 32,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
