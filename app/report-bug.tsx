import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Bug, Info } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';
import { CustomButton, CustomInput } from '@/components';
import { useToast, useAuth } from '@/contexts';
import { adminRepository } from '@/firebase';

const BUG_TYPES = [
  'Playback Issue',
  'Crash',
  'UI Glitch',
  'Login Problem',
  'Other',
] as const;

type BugType = (typeof BUG_TYPES)[number];

export default function ReportBugScreen() {
  const toast = useToast();
  const { user, firebaseUser } = useAuth();
  const [bugType, setBugType] = useState<BugType | null>(null);
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/help');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!bugType) {
      toast.error('Please select a bug type');
      return;
    }
    if (description.trim().length === 0) {
      toast.error('Please describe what happened');
      return;
    }
    const uid = firebaseUser?.uid ?? user?.id;
    if (!uid) {
      toast.error('You must be signed in to submit a bug report');
      return;
    }
    setIsSubmitting(true);
    try {
      const fullDescription = steps.trim()
        ? `${description}\n\nSteps to reproduce:\n${steps}`
        : description;
      await adminRepository.createReport({
        targetType: 'user',
        targetId: 'bug-report',
        reporterId: uid,
        reporterName: user?.username ?? user?.displayName ?? 'member',
        reason: bugType,
        description: fullDescription,
      });
      toast.success('Bug report submitted. Thank you!');
      handleBack();
    } catch {
      toast.error('Could not submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [bugType, description, steps, toast, handleBack, firebaseUser, user]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Report a Bug</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.infoNote}>
              <Info size={18} color={colors.secondary} />
              <Text style={styles.infoText}>
                Thank you for helping us improve StoryVerse. Our team will review your report.
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Bug type</Text>
            <View style={styles.chipsContainer}>
              {BUG_TYPES.map((type) => {
                const selected = bugType === type;
                return (
                  <Pressable
                    key={type}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipSelected,
                      pressed && styles.chipPressed,
                    ]}
                    onPress={() => setBugType(type)}
                  >
                    {selected ? <Bug size={14} color={colors.text} /> : null}
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.field}>
              <CustomInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what happened..."
                multiline
                autoCapitalize="sentences"
                style={styles.multilineInput}
              />
            </View>

            <View style={styles.field}>
              <CustomInput
                label="Steps to reproduce"
                value={steps}
                onChangeText={setSteps}
                placeholder="What steps did you take?"
                multiline
                autoCapitalize="sentences"
                style={styles.multilineInput}
              />
            </View>

            <CustomButton
              title="Submit Report"
              onPress={handleSubmit}
              fullWidth
              loading={isSubmitting}
              style={styles.submitButton}
            />
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
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: `${colors.secondary}1A`,
    borderRadius: radius.base,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.text,
  },
  field: {
    marginBottom: spacing.lg,
  },
  multilineInput: {
    minHeight: 110,
    alignItems: 'flex-start',
    paddingTop: spacing.md,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});
