import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, Mail, MailCheck } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';
import { CustomInput, CustomButton, LoadingScreen } from '@/components';
import { useAuth, useToast } from '@/contexts';
import { validateEmail } from '@/utils';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset, isLoading } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSend = async () => {
    const result = validateEmail(email);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    setError(undefined);
    try {
      await requestPasswordReset(email);
      setSent(true);
      toast.success('Reset link sent to your inbox.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send a reset link. Try again.';
      setError(message);
      toast.error(message);
    }
  };

  if (isLoading) return <LoadingScreen message="Sending reset link…" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
      colors={[colors.background, '#140A24']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.header}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              {sent ? (
                <MailCheck size={28} color={colors.text} strokeWidth={2} />
              ) : (
                <Mail size={28} color={colors.text} strokeWidth={2} />
              )}
            </LinearGradient>
            <Text style={[typography.h1, styles.title]}>
              {sent ? 'Check your inbox' : 'Reset password'}
            </Text>
            <Text style={[typography.bodySmall, styles.subtitle]}>
              {sent
                ? `We sent a reset link to ${email}. It may take a minute to arrive.`
                : 'Enter your account email and we will send you a reset link.'}
            </Text>
          </View>

          {!sent ? (
            <View style={styles.form}>
              <CustomInput
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(undefined);
                }}
                placeholder="you@example.com"
                leftIcon={Mail}
                keyboardType="email-address"
                error={error}
              />
              <CustomButton
                title="Send reset link"
                onPress={handleSend}
                fullWidth
                size="lg"
              />
            </View>
          ) : (
            <View style={styles.form}>
              <CustomButton
                title="Back to sign in"
                onPress={() => router.replace('/(auth)/login')}
                fullWidth
                size="lg"
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['3xl'],
  },
  backBtn: {
    marginBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing['3xl'],
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontFamily: 'Sora-Bold',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  form: {
    gap: spacing.lg,
  },
});
