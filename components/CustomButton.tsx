import { Pressable, StyleSheet, ActivityIndicator, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';
import { colors, spacing, radius, typography } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  success?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CustomButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  success = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}: CustomButtonProps) {
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();

  const handlePressIn = () => {
    if (reduce) return;
    scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
  };
  const handlePressOut = () => {
    if (reduce) return;
    scale.value = withSpring(1, { damping: 16, stiffness: 260 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sizeStyle = sizeStyles[size];
  const isPrimary = variant === 'primary';

  if (isPrimary) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[animatedStyle, sizeStyle.container, fullWidth && { width: '100%' }, style, styles.primaryShadow]}
      >
        <LinearGradient
          colors={
            success
            ? [colors.success, colors.successDark]
            : [colors.primary, colors.secondary]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, sizeStyle.inner, disabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              {leftIcon}
              <Animated.Text style={[typography.button, styles.label, sizeStyle.label]}>
                {success ? 'Done!' : title}
              </Animated.Text>
              {rightIcon}
            </>
          )}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        animatedStyle,
        styles.solid,
        sizeStyle.inner,
        variantStyles[variant],
        fullWidth && { width: '100%' },
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? colors.text : colors.primary}
          size="small"
        />
      ) : (
        <>
          {leftIcon}
          <Animated.Text
            style={[
              typography.button,
              sizeStyle.label,
              { color: variant === 'ghost' ? colors.text : colors.primary },
            ]}
          >
            {title}
          </Animated.Text>
          {rightIcon}
        </>
      )}
    </AnimatedPressable>
  );
}

const variantStyles = StyleSheet.create({
  primary: {},
  secondary: {
    backgroundColor: colors.surface,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
});

const sizeStyles = {
  sm: {
    container: { borderRadius: radius.md } as ViewStyle,
    inner: { paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.md, minHeight: 38 } as ViewStyle,
    label: { fontSize: 13 } as TextStyle,
  },
  md: {
    container: { borderRadius: radius.base } as ViewStyle,
    inner: { paddingVertical: 14, paddingHorizontal: spacing.lg, borderRadius: radius.base, minHeight: 48 } as ViewStyle,
    label: {} as TextStyle,
  },
  lg: {
    container: { borderRadius: radius.lg } as ViewStyle,
    inner: { paddingVertical: 18, paddingHorizontal: spacing.xl, borderRadius: radius.lg, minHeight: 56 } as ViewStyle,
    label: { fontSize: 18 } as TextStyle,
  },
};

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  solid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.45,
  },
  primaryShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
