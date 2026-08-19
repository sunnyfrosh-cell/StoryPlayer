import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { colors, spacing, radius, typography } from '@/theme';
import { CustomInput, CustomButton, LoadingScreen } from '@/components';
import { useAuth, useToast } from '@/contexts';
import { validateLoginForm, isFormValid, type LoginFormErrors } from '@/utils';

export default function LoginScreen() {
  const { login, loginWithGoogle, loginWithApple, isLoading } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const busy = isLoading || submitting;

  const handleLogin = async () => {
    const validation = validateLoginForm({ email, password });
    setErrors(validation);
    if (!isFormValid(validation)) return;

    setFormError(undefined);
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.replace('/(main)/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not sign in. Please try again.';
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

  if (busy) return <LoadingScreen message="Signing you in…" />;

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
            <Text style={[typography.h1, styles.title]}>Welcome back</Text>
            <Text style={[typography.bodySmall, styles.subtitle]}>
              Pick up where you left off.
            </Text>
          </View>

          <View style={styles.form}>
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
              error={errors.email ?? formError}
            />
            <CustomInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                if (formError) setFormError(undefined);
              }}
              placeholder="••••••••"
              leftIcon={Lock}
              isPassword
              error={errors.password}
            />
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotWrap}
            >
              <Text style={[typography.label, styles.forgot]}>Forgot password?</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <CustomButton
              title="Sign in"
              onPress={handleLogin}
              fullWidth
              size="lg"
              rightIcon={<ArrowRight size={18} color={colors.text} />}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={[typography.caption, styles.dividerText]}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <SocialButton label="Google" onPress={handleGoogle} />
              <SocialButton label="Apple" onPress={handleApple} />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[typography.bodySmall, styles.footerText]}>
              New to StoryVerse?{' '}
            </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={[typography.label, styles.footerLink]}>Create an account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function SocialButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.socialBtn} onPress={onPress}>
      <Text style={[typography.label, styles.socialText]}>{label}</Text>
    </Pressable>
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
  forgotWrap: {
    alignSelf: 'flex-end',
  },
  forgot: {
    color: colors.secondary,
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
