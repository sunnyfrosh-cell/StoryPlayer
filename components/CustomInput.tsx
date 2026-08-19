import { useState, useEffect } from 'react';
import {
  type TextInputProps,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';

interface CustomInputProps extends Omit<TextInputProps, 'onChangeText'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  leftIcon?: LucideIcon;
  isPassword?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function CustomInput({
  label,
  value,
  onChangeText,
  error,
  leftIcon: LeftIcon,
  isPassword = false,
  placeholder,
  autoCapitalize = 'none',
  keyboardType = 'default',
  ...rest
}: CustomInputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(isPassword);
  const borderColor = useSharedValue(0);

  useEffect(() => {
    borderColor.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, borderColor]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor:
      borderColor.value > 0.5 ? colors.primary : colors.border,
    borderWidth: 1.5,
  }));

  const Left = LeftIcon ? <LeftIcon size={20} color={colors.textMuted} /> : null;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[typography.label, styles.label]}>{label}</Text>
      ) : null}
      <Animated.View style={[styles.container, borderStyle, error && styles.errorBorder]}>
        {Left}
        <TextInput
          style={[typography.body, styles.input]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden && isPassword}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {isPassword ? (
          <Pressable onPress={() => setHidden((h: boolean) => !h)} hitSlop={12}>
            {hidden ? (
              <EyeOff size={20} color={colors.textMuted} />
            ) : (
              <Eye size={20} color={colors.textMuted} />
            )}
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? (
        <Text style={[typography.caption, styles.errorText]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    minHeight: 54,
  },
  input: {
    flex: 1,
    color: colors.text,
    padding: 0,
    margin: 0,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    marginLeft: spacing.xs,
  },
});
