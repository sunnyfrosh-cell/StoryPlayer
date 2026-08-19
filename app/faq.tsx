import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'account',
    question: 'How do I create an account?',
    answer:
      'Creating an account is easy! Tap the profile icon on the home screen and select "Sign Up." You can register using your email address or link an existing social account. After verifying your email, you can start watching and following creators right away.',
  },
  {
    id: 'password',
    question: 'How do I reset my password?',
    answer:
      'On the login screen, tap "Forgot Password?" and enter the email associated with your account. We will send a secure reset link within a few minutes. Tap the link, choose a new password, and you will be back to watching in no time.',
  },
  {
    id: 'uploads',
    question: 'Can I upload my own videos?',
    answer:
      'Yes! Any user can become a creator. Open your profile, enable Creator Mode, and you will get access to the Creator Studio where you can upload videos, manage your channel, and track analytics. Uploaded content must follow our Community Guidelines and may be reviewed before it goes live.',
  },
  {
    id: 'playback',
    question: 'Why is my video playback stuttering or buffering?',
    answer:
      'Buffering is usually caused by a slow or unstable internet connection. Try switching to Wi-Fi, closing other apps that use bandwidth, or lowering the playback quality. You can also enable Data Saver in Settings to automatically adjust quality based on your connection.',
  },
  {
    id: 'subscriptions',
    question: 'How do creator subscriptions work?',
    answer:
      'Subscriptions let you support your favorite creators with a monthly payment in exchange for exclusive perks like bonus content, early access, or subscriber-only chats. Tap the Subscribe button on a creator profile, choose a tier, and confirm. You can cancel anytime from Settings → Subscriptions.',
  },
  {
    id: 'reporting',
    question: 'How do I report inappropriate content?',
    answer:
      'If you see content that violates our guidelines, tap the three-dot menu on the video and select "Report." Choose a reason, add any helpful details, and submit. Our moderation team reviews reports promptly and takes action when necessary.',
  },
  {
    id: 'premium',
    question: 'What is Premium membership and what do I get?',
    answer:
      'Premium is an optional subscription that removes ads, unlocks higher video quality, supports offline downloads, and grants a special badge on your profile. You can subscribe from Settings → Premium Membership and try it risk-free with a free trial.',
  },
  {
    id: 'data',
    question: 'How much data does watching videos use?',
    answer:
      'Data usage depends on video quality. Standard definition uses roughly 0.3 GB per hour, while high definition can use up to 1.5 GB per hour. Enable Data Saver in Settings to reduce usage, or download videos over Wi-Fi to watch offline without using mobile data.',
  },
];

export default function FaqScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/help');
    }
  }, []);

  const toggleItem = useCallback(
    (id: string) => {
      setExpandedId((current) => (current === id ? null : id));
    },
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {FAQ_ITEMS.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <View key={item.id} style={styles.item}>
              <Pressable
                style={({ pressed }) => [styles.questionRow, pressed && styles.questionPressed]}
                onPress={() => toggleItem(item.id)}
              >
                <Text style={styles.question}>{item.question}</Text>
                <ChevronRight
                  size={20}
                  color={isExpanded ? colors.primary : colors.textMuted}
                  style={{
                    transform: [{ rotate: isExpanded ? '90deg' : '0deg' }],
                  }}
                />
              </Pressable>
              {isExpanded ? <Text style={styles.answer}>{item.answer}</Text> : null}
            </View>
          );
        })}
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
  item: {
    backgroundColor: colors.card,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.base,
  },
  questionPressed: {
    opacity: 0.85,
  },
  question: {
    ...typography.h4,
    color: colors.text,
    flexShrink: 1,
  },
  answer: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    lineHeight: 22,
  },
});
