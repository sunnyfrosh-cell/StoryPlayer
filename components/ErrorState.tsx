import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { colors, spacing, typography } from '@/theme';
import { CustomButton } from './CustomButton';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <AlertTriangle size={32} color={colors.error} strokeWidth={1.75} />
      </View>
      <Text style={[typography.h4, styles.title]}>{title}</Text>
      <Text style={[typography.bodySmall, styles.message]}>{message}</Text>
      {onRetry ? (
        <CustomButton
          title="Try again"
          onPress={onRetry}
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  action: {
    marginTop: spacing.sm,
  },
});
