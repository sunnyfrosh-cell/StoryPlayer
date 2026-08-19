import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Extrapolation,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { getIcon } from '@/utils';
import { colors, spacing, radius, typography } from '@/theme';
import { onboardingSlides } from '@/constants';
import { CustomButton } from '@/components';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const scrollX = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goNext = () => {
    if (activeIndex < onboardingSlides.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
    } else {
      router.replace('/(auth)/login');
    }
  };

  const goSkip = () => router.replace('/(auth)/login');

  const isLast = activeIndex === onboardingSlides.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.skipWrap}>
        {!isLast ? (
          <Pressable onPress={goSkip} hitSlop={12}>
            <Text style={[typography.label, styles.skip]}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          scrollX.value = e.nativeEvent.contentOffset.x;
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(idx);
        }}
        scrollEventThrottle={16}
        bounces={false}
      >
        {onboardingSlides.map((slide, index) => (
          <Slide key={slide.id} slide={slide} index={index} scrollX={scrollX} />
        ))}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <Pagination scrollX={scrollX} count={onboardingSlides.length} />
        <CustomButton
          title={isLast ? 'Get Started' : 'Next'}
          onPress={goNext}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

interface SlideProps {
  slide: (typeof onboardingSlides)[number];
  index: number;
  scrollX: SharedValue<number>;
}

function Slide({ slide, index, scrollX }: SlideProps) {
  const Icon = getIcon(slide.iconName);

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.imageWrap, animatedStyle]}>
        <LinearGradient
          colors={[slide.accentFrom, slide.accentTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.imageGradient}
        >
          <View style={styles.iconCircle}>
            <Icon size={56} color={colors.text} strokeWidth={1.5} />
          </View>
        </LinearGradient>
      </Animated.View>
      <View style={styles.textWrap}>
        <Text style={[typography.overline, styles.subtitle]}>{slide.subtitle}</Text>
        <Text style={[typography.h1, styles.title]}>{slide.title}</Text>
        <Text style={[typography.body, styles.description]}>{slide.description}</Text>
      </View>
    </View>
  );
}

interface PaginationProps {
  scrollX: SharedValue<number>;
  count: number;
}

function Pagination({ scrollX, count }: PaginationProps) {
  return (
    <View style={styles.paginationRow}>
      {Array.from({ length: count }).map((_, i) => (
        <PaginationDot key={i} index={i} scrollX={scrollX} />
      ))}
    </View>
  );
}

interface PaginationDotProps {
  index: number;
  scrollX: SharedValue<number>;
}

function PaginationDot({ index, scrollX }: PaginationDotProps) {
  const dotStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const w = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
    return { width: w, opacity };
  });
  return <Animated.View style={[styles.dot, dotStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipWrap: {
    position: 'absolute',
    top: 64,
    right: spacing.base,
    zIndex: 10,
  },
  skip: {
    color: colors.textSecondary,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  imageWrap: {
    marginBottom: spacing['2xl'],
  },
  imageGradient: {
    width: 240,
    height: 240,
    borderRadius: radius['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    alignItems: 'center',
    gap: spacing.md,
  },
  subtitle: {
    color: colors.secondaryLight,
    letterSpacing: 1.5,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'Sora-Bold',
  },
  description: {
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  paginationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
});
