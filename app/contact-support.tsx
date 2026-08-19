import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Mail, Send, MessageCircle } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';
import { CustomButton, CustomInput } from '@/components';
import { useToast, useAuth } from '@/contexts';
import { adminRepository } from '@/firebase';

const SUPPORT_EMAIL = 'support@storyverse.app';

export default function ContactSupportScreen() {
  const toast = useToast();
  const { user, firebaseUser } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/help');
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (subject.trim().length === 0) {
      toast.error('Please add a subject');
      return;
    }
    if (message.trim().length === 0) {
      toast.error('Please enter a message');
      return;
    }
    const uid = firebaseUser?.uid ?? user?.id;
    if (!uid) {
      toast.error('You must be signed in to contact support');
      return;
    }
    setIsSubmitting(true);
    try {
      await adminRepository.createReport({
        targetType: 'user',
        targetId: 'support-request',
        reporterId: uid,
        reporterName: user?.username ?? user?.displayName ?? 'member',
        reason: subject.trim(),
        description: message.trim(),
      });
      toast.success('Message sent! We will be in touch soon.');
      handleBack();
    } catch {
      toast.error('Could not send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [subject, message, toast, handleBack, firebaseUser, user]);

  const handleEmailLink = useCallback(() => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Contact Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <CustomInput
                label="Subject"
                value={subject}
                onChangeText={setSubject}
                placeholder="Briefly describe your issue"
                autoCapitalize="sentences"
              />
            </View>

            <View style={styles.field}>
              <CustomInput
                label="Message"
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us more about what you need help with..."
                multiline
                autoCapitalize="sentences"
                style={styles.multilineInput}
              />
            </View>

            <View style={styles.responseNote}>
              <Mail size={18} color={colors.secondary} />
              <Text style={styles.responseText}>
                We&apos;ll respond to your registered email within 24-48 hours.
              </Text>
            </View>

            <CustomButton
              title="Send Message"
              onPress={handleSend}
              fullWidth
              loading={isSubmitting}
              leftIcon={<Send size={18} color={colors.text} />}
              style={styles.sendButton}
            />

            <View style={styles.divider} />

            <View style={styles.alternativeSection}>
              <Text style={styles.sectionTitle}>Alternative contact</Text>
              <Pressable
                style={({ pressed }) => [styles.emailRow, pressed && styles.emailRowPressed]}
                onPress={handleEmailLink}
              >
                <View style={styles.emailIcon}>
                  <MessageCircle size={20} color={colors.primary} />
                </View>
                <View style={styles.emailContent}>
                  <Text style={styles.emailLabel}>Email us directly</Text>
                  <Text style={styles.emailValue}>{SUPPORT_EMAIL}</Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
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
    paddingBottom: spacing['4xl'],
  },
  field: {
    marginBottom: spacing.lg,
  },
  multilineInput: {
    minHeight: 140,
    alignItems: 'flex-start',
    paddingTop: spacing.md,
  },
  responseNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: `${colors.secondary}1A`,
    borderRadius: radius.base,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  responseText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  sendButton: {
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xl,
  },
  alternativeSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
  },
  emailRowPressed: {
    opacity: 0.85,
  },
  emailIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}22`,
  },
  emailContent: {
    flex: 1,
    gap: spacing.xs,
  },
  emailLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  emailValue: {
    ...typography.body,
    color: colors.text,
  },
});
