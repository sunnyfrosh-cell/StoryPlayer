import { Redirect } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/contexts';
import { LoadingScreen } from '@/components';
import { colors, spacing, radius, typography } from '@/theme';

export default function Index() {
  const { isInitializing, isAuthenticated, startupError, retryStartup } = useAuth();

  if (isInitializing) {
    return <LoadingScreen message="Loading StoryVerse…" />;
  }

  if (startupError) {
    return (
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <AlertTriangle size={32} color={colors.warning} />
        </View>
        <Text style={[typography.h3, styles.title]}>Taking longer than expected</Text>
        <Text style={[typography.bodySmall, styles.message]}>{startupError}</Text>
        <Pressable style={styles.retryBtn} onPress={retryStartup}>
          <RefreshCw size={18} color={colors.text} />
          <Text style={[typography.button, { color: colors.text }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/splash" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245,158,11,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { color: colors.text, textAlign: 'center' },
  message: { color: colors.textSecondary, textAlign: 'center', maxWidth: 280 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    marginTop: spacing.sm,
  },
});
