import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography } from '@/theme';
interface BadgeProps {
  label: string;
  variant?: 'primary' | 'soft' | 'gold' | 'neutral';
  icon?: React.ReactNode;
}

export function Badge({ label, variant = 'soft', icon }: BadgeProps) {
  const resolved = variant;
  const labelColor = resolved === 'gold' ? '#1A1206' : colors.text;

  if (resolved === 'primary' || resolved === 'gold') {
    const gradientColors: [string, string] =
      resolved === 'gold'
        ? ['#FBBF24', '#F59E0B']
        : [colors.primary, colors.secondary];
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {icon}
        <Text style={[typography.overline, styles.label, { color: labelColor }]}>
          {label.toUpperCase()}
        </Text>
      </LinearGradient>
    );
  }

  const softBg =
    resolved === 'neutral'
      ? { backgroundColor: colors.surface }
      : { backgroundColor: 'rgba(168,85,247,0.16)' };

  return (
    <View style={[styles.solid, softBg]}>
      {icon}
      <Text
        style={[
          typography.overline,
          styles.label,
          {
            color: resolved === 'neutral' ? colors.textSecondary : colors.secondaryLight,
          },
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  solid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  label: {
    letterSpacing: 0.5,
  },
});
