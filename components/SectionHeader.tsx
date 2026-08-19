import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing, typography } from '@/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textWrap}>
        <Text style={[typography.h3, styles.title]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.caption, styles.subtitle]}>{subtitle}</Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} style={styles.action}>
          <Text style={[typography.label, styles.actionText]}>{actionLabel}</Text>
          <ChevronRight size={16} color={colors.secondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    color: colors.secondary,
  },
});
