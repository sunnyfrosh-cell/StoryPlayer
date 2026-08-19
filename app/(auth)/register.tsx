import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Sparkles, Mail, Lock, User, ArrowRight, Check } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';
import { CustomInput, CustomButton, LoadingScreen } from '@/components';
import { useAuth, useToast } from '@/contexts';
import { validateRegisterForm, isFormValid, type RegisterFormErrors } from '@/utils';

export default function RegisterScreen() {
  const { register, loginWithGoogle, loginWithApple, isLoading } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const busy = isLoading || submitting;

  const handleRegister = async () => {
    const validation = validateRegisterForm({ username, email, password, accepted });
    setErrors(validation);
    if (!isFormValid(validation)) return;

    setFormError(undefined);
    setSubmitting(true);
    try {
      await register(email, password, username);
      toast.success('Your account is ready!');
      router.replace('/(main)/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create your account. Try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setFormError(undefined);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      router.replace('/(main)/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in is not available yet.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    setFormError(undefined);
    setSubmitting(true);
    try {
      await loginWithApple();
      router.replace('/(main)/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple sign-in is not available yet.';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (busy) return <LoadingScreen message="Creating your account…" />;

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
          <View style={styles.header}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Sparkles size={28} color={colors.text} strokeWidth={2} />
            </LinearGradient>
            <Text style={[typography.h1, styles.title]}>Join StoryVerse</Text>
            <Text style={[typography.bodySmall, styles.subtitle]}>
              Create your account and start your first adventure.
            </Text>
          </View>

          <View style={styles.form}>
            <CustomInput
              label="Username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
                if (formError) setFormError(undefined);
              }}
              placeholder="mayarivers"
              leftIcon={User}
              autoCapitalize="none"
              error={errors.username ?? formError}
            />
            <CustomInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                if (formError) setFormError(undefined);
              }}
              placeholder="you@example.com"
              leftIcon={Mail}
              keyboardType="email-address"
              error={errors.email}
            />
            <CustomInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                if (formError) setFormError(undefined);
              }}
              placeholder="Create a password"
              leftIcon={Lock}
              isPassword
              error={errors.password}
            />
            <Pressable
              style={styles.termsRow}
              onPress={() => {
                setAccepted((v) => !v);
                if (errors.accepted) setErrors((prev) => ({ ...prev, accepted: undefined }));
              }}
            >
              <View style={[styles.checkbox, accepted && styles.checkboxActive]}>
                {accepted ? <Check size={14} color={colors.text} strokeWidth={3} /> : null}
              </View>
              <Text style={[typography.caption, styles.termsText]}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </Pressable>
            {errors.accepted ? (
              <Text style={[typography.caption, styles.acceptedError]}>{errors.accepted}</Text>
            ) : null}
          </View>

          <View style={styles.actions}>
            <CustomButton
              title="Create account"
              onPress={handleRegister}
              fullWidth
              size="lg"
              rightIcon={<ArrowRight size={18} color={colors.text} />}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={[typography.caption, styles.dividerText]}>or sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <Pressable style={styles.socialBtn} onPress={handleGoogle}>
                <Text style={[typography.label, styles.socialText]}>Google</Text>
              </Pressable>
              <Pressable style={styles.socialBtn} onPress={handleApple}>
                <Text style={[typography.label, styles.socialText]}>Apple</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[typography.bodySmall, styles.footerText]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={[typography.label, styles.footerLink]}>Sign in</Text>
            </Pressable>
          </View>
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
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
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
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    color: colors.textSecondary,
    flex: 1,
  },
  acceptedError: {
    color: colors.error,
    marginLeft: spacing.xs,
    marginTop: -spacing.xs,
  },
  actions: {
    gap: spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialBtn: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialText: {
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['3xl'],
  },
  footerText: {
    color: colors.textSecondary,
  },
  footerLink: {
    color: colors.secondary,
  },
});
