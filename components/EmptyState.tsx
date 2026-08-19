import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography } from '@/theme';
import { CustomButton } from './CustomButton';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(124,58,237,0.16)', 'rgba(168,85,247,0.0)']}
        style={styles.iconWrap}
      >
        <Icon size={32} color={colors.secondary} strokeWidth={1.75} />
      </LinearGradient>
      <Text style={[typography.h4, styles.title]}>{title}</Text>
      {description ? (
        <Text style={[typography.bodySmall, styles.description]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <CustomButton
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          size="sm"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  action: {
    marginTop: spacing.sm,
  },
});
