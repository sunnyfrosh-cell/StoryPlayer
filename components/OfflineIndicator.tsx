import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';

export function OfflineIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel="Offline mode. Showing cached content.">
      <WifiOff size={14} color={colors.text} />
      <Text style={styles.text}>Offline — showing cached content</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});
