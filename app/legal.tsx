import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Users,
  FileText,
  Shield,
  Copyright,
  type LucideIcon,
} from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';

type LegalSection = 'guidelines' | 'terms' | 'privacy' | 'copyright';

interface LegalEntry {
  section: LegalSection;
  title: string;
  icon: LucideIcon;
  accent: string;
  body: string[];
}

const LEGAL_CONTENT: Record<LegalSection, { title: string; icon: LucideIcon; accent: string; body: string[] }> = {
  guidelines: {
    title: 'Community Guidelines',
    icon: Users,
    accent: colors.success,
    body: [
      'StoryVerse is a community where creators and viewers come together to share and enjoy stories. To keep this space safe and welcoming for everyone, we ask all members to treat each other with respect. Harassment, hate speech, bullying, and threats of any kind are not tolerated and may result in content removal or account suspension.',
      'You are responsible for the content you post. Do not upload material that is illegal, sexually explicit, violent, or that infringes on someone else\'s intellectual property. Misinformation designed to cause harm, impersonation of other people, and spam are also prohibited. When in doubt, ask yourself whether your content would make the community proud.',
      'If you encounter content that violates these guidelines, please report it using the in-app report tool. Our moderation team reviews every report and takes fair, consistent action. Repeat offenders face escalating penalties, while first-time, good-faith mistakes usually result in a warning and a chance to correct the issue.',
    ],
  },
  terms: {
    title: 'Terms of Service',
    icon: FileText,
    accent: colors.warning,
    body: [
      'By creating an account or using StoryVerse, you agree to these Terms of Service. These terms form a legally binding agreement between you and StoryVerse governing your access to and use of our platform, including all features, content, and services we provide now or in the future.',
      'You may use StoryVerse only if you are at least 13 years old or the age of digital consent in your country, and you may not share your account credentials or access another person\'s account without permission. You agree to provide accurate information, keep your credentials secure, and be responsible for all activity under your account. We may suspend or terminate accounts that violate these terms.',
      'StoryVerse grants you a personal, non-exclusive, non-transferable license to access and use the platform for lawful, non-commercial purposes. We may update, modify, or discontinue features at any time without prior notice. These terms may be revised periodically; continued use of the service after changes are posted constitutes acceptance of the updated terms.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    icon: Shield,
    accent: colors.primaryLight,
    body: [
      'Your privacy matters to us. This Privacy Policy explains what information StoryVerse collects, how we use it, and the choices you have. We collect account information such as your email and display name, usage data like watch history and interactions, and technical data such as device type and approximate location for security and analytics.',
      'We use your information to operate and improve the platform, personalize your experience, communicate with you, prevent fraud, and comply with legal obligations. We do not sell your personal data to third parties. We may share limited data with trusted service providers who help us run the platform, and with authorities when legally required.',
      'You have control over your data. You can review and update your profile, adjust privacy settings to limit what others see, and request deletion of your account at any time. We retain data only as long as necessary to provide our services or as required by law. If you have questions about your privacy, contact us at privacy@storyverse.app.',
    ],
  },
  copyright: {
    title: 'Copyright Information',
    icon: Copyright,
    accent: colors.accent,
    body: [
      'StoryVerse respects the intellectual property rights of others and expects our users to do the same. All content on the platform, including videos, graphics, text, and the StoryVerse brand, is protected by copyright and other applicable laws. Creators retain ownership of the content they upload while granting StoryVerse a license to host and display it.',
      'If you believe that content on StoryVerse infringes your copyright, you may submit a takedown request under the Digital Millennium Copyright Act (DMCA) or applicable local law. Your notice must include identification of the copyrighted work, the location of the infringing material, your contact information, a good-faith statement, and your physical or electronic signature.',
      'Send takedown notices to copyright@storyverse.app. We review each notice and remove or disable access to infringing material as appropriate. Repeat infringers may have their accounts terminated. If your content was removed and you believe it was a mistake, you may submit a counter-notice with the same contact information.',
    ],
  },
};

const SECTION_ORDER: LegalSection[] = ['guidelines', 'terms', 'privacy', 'copyright'];

export default function LegalScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();

  const activeSection = (section as LegalSection | undefined) ?? null;
  const isValidSection = activeSection !== null && activeSection in LEGAL_CONTENT;

  const headerTitle = isValidSection ? LEGAL_CONTENT[activeSection].title : 'Legal';

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/help');
    }
  }, []);

  const handleNavigate = useCallback((target: LegalSection) => {
    router.push(`/legal?section=${target}` as any);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={isValidSection ? () => router.setParams({}) : handleBack}
          hitSlop={12}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isValidSection ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {LEGAL_CONTENT[activeSection].body.map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {SECTION_ORDER.map((key) => {
            const entry = LEGAL_CONTENT[key];
            const Icon = entry.icon;
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => handleNavigate(key)}
              >
                <View style={[styles.rowIcon, { backgroundColor: `${entry.accent}22` }]}>
                  <Icon size={22} color={entry.accent} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{entry.title}</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {entry.body[0]}
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
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
    flexShrink: 1,
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
  paragraph: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    ...typography.h4,
    color: colors.text,
  },
  rowSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
