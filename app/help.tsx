import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  HelpCircle,
  Bug,
  Mail,
  FileText,
  ChevronRight,
  Users,
  Shield,
  Copyright,
  type LucideIcon,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';

interface HelpCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  route: string;
}

const CATEGORIES: HelpCategory[] = [
  {
    id: 'faq',
    title: 'FAQ',
    subtitle: 'Quick answers to common questions',
    icon: HelpCircle,
    accent: colors.primary,
    route: '/faq',
  },
  {
    id: 'bug',
    title: 'Report a Bug',
    subtitle: 'Tell us what went wrong',
    icon: Bug,
    accent: colors.error,
    route: '/report-bug',
  },
  {
    id: 'support',
    title: 'Contact Support',
    subtitle: 'Reach out to our team',
    icon: Mail,
    accent: colors.secondary,
    route: '/contact-support',
  },
  {
    id: 'guidelines',
    title: 'Community Guidelines',
    subtitle: 'Rules for a safe community',
    icon: Users,
    accent: colors.success,
    route: '/legal?section=guidelines',
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    subtitle: 'Our service agreement',
    icon: FileText,
    accent: colors.warning,
    route: '/legal?section=terms',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'How we handle your data',
    icon: Shield,
    accent: colors.primaryLight,
    route: '/legal?section=privacy',
  },
  {
    id: 'copyright',
    title: 'Copyright Info',
    subtitle: 'IP and takedown policy',
    icon: Copyright,
    accent: colors.accent,
    route: '/legal?section=copyright',
  },
];

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }, []);

  const handleNavigate = useCallback((route: string) => {
    router.push(route as any);
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Browse by category</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <Pressable
                key={category.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => handleNavigate(category.route)}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${category.accent}22` }]}>
                  <Icon size={24} color={category.accent} />
                </View>
                <Text style={styles.cardTitle}>{category.title}</Text>
                <Text style={styles.cardSubtitle}>{category.subtitle}</Text>
                <View style={styles.cardChevron}>
                  <ChevronRight size={18} color={colors.textMuted} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  sectionLabel: {
    ...typography.overline,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  card: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    paddingBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardChevron: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
  },
});
