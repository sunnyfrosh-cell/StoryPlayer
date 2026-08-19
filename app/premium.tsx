import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Crown,
  Check,
  Sparkles,
  Download,
  Shield,
  BadgeCheck,
  Zap,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuth, useMonetization, useToast } from '@/contexts';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { LoadingScreen, CustomButton } from '@/components';
import type { PremiumMembership, PremiumPlan } from '@/types';
import { PREMIUM_PLANS } from '@/firebase';

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: Shield,
    title: 'Ad-free viewing',
    description: 'Watch without interruptions from ads.',
  },
  {
    icon: Zap,
    title: 'Higher quality streaming',
    description: 'Up to 4K Ultra HD where available.',
  },
  {
    icon: Sparkles,
    title: 'Exclusive creator content',
    description: 'Unlock premium-only videos & series.',
  },
  {
    icon: Download,
    title: 'Download videos',
    description: 'Save videos to watch offline anywhere.',
  },
  {
    icon: BadgeCheck,
    title: 'Premium badge',
    description: 'Stand out with a premium badge on your profile.',
  },
];

const PLAN_LABEL: Record<PremiumPlan, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString();
}

export default function PremiumScreen() {
  const { firebaseUser } = useAuth();
  const { getPremiumMembership, subscribePremium, cancelPremium } = useMonetization();
  const toast = useToast();

  const [membership, setMembership] = useState<PremiumMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscribingPlan, setSubscribingPlan] = useState<PremiumPlan | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const refreshMembership = useCallback(async () => {
    if (!firebaseUser) {
      setMembership(null);
      setIsLoading(false);
      return;
    }
    try {
      const result = await getPremiumMembership(firebaseUser.uid);
      setMembership(result);
    } catch (err) {
      // Non-fatal: show membership as inactive and continue rendering the page.
      setMembership(null);
      console.warn('[PremiumScreen] Failed to load membership:', err);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser, getPremiumMembership]);

  useEffect(() => {
    refreshMembership();
  }, [refreshMembership]);

  const isPremiumActive = membership?.status === 'active';

  const handleSubscribe = useCallback(
    (plan: PremiumPlan) => {
      if (!firebaseUser) {
        toast.error('Please sign in to subscribe.');
        return;
      }
      Alert.alert(
        'Confirm subscription',
        `Start your ${PLAN_LABEL[plan]} Premium membership? This is a preview — no payment will be charged.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Subscribe',
            style: 'default',
            onPress: async () => {
              setSubscribingPlan(plan);
              try {
                await subscribePremium(firebaseUser.uid, plan);
                await refreshMembership();
                toast.success('Welcome to StoryVerse Premium! 🎉');
              } catch (err) {
                toast.error(
                  err instanceof Error
                    ? err.message
                    : 'Could not start your subscription. Try again.',
                );
              } finally {
                setSubscribingPlan(null);
              }
            },
          },
        ],
      );
    },
    [firebaseUser, subscribePremium, refreshMembership, toast],
  );

  const handleCancel = useCallback(() => {
    if (!firebaseUser) return;
    Alert.alert(
      'Cancel auto-renew',
      'Your premium benefits will continue until the end of the current billing period, but your plan will not renew automatically. Continue?',
      [
        { text: 'Keep Premium', style: 'cancel' },
        {
          text: 'Cancel auto-renew',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await cancelPremium(firebaseUser.uid);
              await refreshMembership();
              toast.success('Auto-renew cancelled. Premium active until expiry.');
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : 'Could not cancel auto-renew. Try again.',
              );
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  }, [firebaseUser, cancelPremium, refreshMembership, toast]);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return <LoadingScreen message="Loading Premium…" />;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Premium
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroIconWrap}>
            <Crown size={34} color={colors.text} />
          </View>
          <Text style={styles.heroTitle}>StoryVerse Premium</Text>
          <Text style={styles.heroTagline}>
            Unlock the best viewing experience
          </Text>
        </LinearGradient>

        {/* Active membership banner */}
        {isPremiumActive && membership ? (
          <View style={styles.activeBanner}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeBannerGradient}
            >
              <View style={styles.activeBannerTop}>
                <View style={styles.crownBadge}>
                  <Crown size={20} color={colors.text} />
                </View>
                <View style={styles.activeBannerText}>
                  <Text style={styles.activeBannerTitle}>You&apos;re Premium!</Text>
                  <Text style={styles.activeBannerSub}>
                    {PLAN_LABEL[membership.plan]} plan
                    {membership.autoRenew ? ' · Auto-renew on' : ' · Auto-renew off'}
                  </Text>
                </View>
              </View>

              <View style={styles.activeDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Plan</Text>
                  <Text style={styles.detailValue}>{PLAN_LABEL[membership.plan]}</Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Start date</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(membership.startedAt)}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Expires</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(membership.expiresAt)}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={handleCancel}
                disabled={isCancelling}
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
                  isCancelling && styles.cancelButtonDisabled,
                ]}
              >
                <Text style={styles.cancelButtonText}>
                  {isCancelling ? 'Cancelling…' : 'Cancel auto-renew'}
                </Text>
              </Pressable>
            </LinearGradient>
          </View>
        ) : null}

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium benefits</Text>
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <View key={benefit.title} style={styles.benefitRow}>
                <View style={styles.benefitIconWrap}>
                  <Icon size={20} color={colors.secondaryLight} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>
                    {benefit.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose your plan</Text>
          <View style={styles.plansContainer}>
            {PREMIUM_PLANS.map((plan) => {
              const isHighlighted = plan.highlight;
              const isThisSubscribing = subscribingPlan === plan.id;
              const alreadyOnPlan = isPremiumActive && membership?.plan === plan.id;

              return (
                <View
                  key={plan.id}
                  style={[
                    styles.planCard,
                    isHighlighted ? styles.planCardHighlighted : styles.planCardPlain,
                  ]}
                >
                  {isHighlighted ? (
                    <LinearGradient
                      colors={[colors.gradientStart, colors.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.planGradientBorder}
                    >
                      <View style={styles.planInner}>
                        <View style={styles.saveBadge}>
                          <Star size={11} color={colors.textInverse} />
                          <Text style={styles.saveBadgeText}>Save 33%</Text>
                        </View>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <Text style={styles.planPrice}>
                          ${plan.priceUsd.toFixed(2)}
                        </Text>
                        <Text style={styles.planPeriod}>{plan.period}</Text>

                        <View style={styles.featureList}>
                          {plan.features.map((feature) => (
                            <View key={feature} style={styles.featureRow}>
                              <Check size={16} color={colors.success} />
                              <Text style={styles.featureText}>{feature}</Text>
                            </View>
                          ))}
                        </View>

                        <CustomButton
                          title={
                            alreadyOnPlan
                              ? 'Current plan'
                              : isThisSubscribing
                                ? 'Subscribing…'
                                : 'Subscribe'
                          }
                          onPress={() => handleSubscribe(plan.id)}
                          loading={isThisSubscribing}
                          disabled={alreadyOnPlan || isThisSubscribing}
                          fullWidth
                          style={styles.planButton}
                        />
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.planInner}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planPrice}>${plan.priceUsd.toFixed(2)}</Text>
                      <Text style={styles.planPeriod}>{plan.period}</Text>

                      <View style={styles.featureList}>
                        {plan.features.map((feature) => (
                          <View key={feature} style={styles.featureRow}>
                            <Check size={16} color={colors.success} />
                            <Text style={styles.featureText}>{feature}</Text>
                          </View>
                        ))}
                      </View>

                      <CustomButton
                        title={
                          alreadyOnPlan
                            ? 'Current plan'
                            : isThisSubscribing
                              ? 'Subscribing…'
                              : 'Subscribe'
                        }
                        onPress={() => handleSubscribe(plan.id)}
                        variant="outline"
                        loading={isThisSubscribing}
                        disabled={alreadyOnPlan || isThisSubscribing}
                        fullWidth
                        style={styles.planButton}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Footer note */}
        <View style={styles.footerNote}>
          <Sparkles size={16} color={colors.textMuted} />
          <Text style={styles.footerText}>
            StoryVerse Premium is an in-app subscription. Manage or cancel anytime from your app store settings.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    borderRadius: radius['2xl'],
    ...shadows.glow,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h2,
    fontFamily: typography.fontFamilyDisplayBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  heroTagline: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },

  // Active membership banner
  activeBanner: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  activeBannerGradient: {
    padding: spacing.lg,
  },
  activeBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  crownBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  activeBannerText: {
    flex: 1,
  },
  activeBannerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  activeBannerSub: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  activeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: radius.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    ...typography.overline,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    ...typography.label,
    color: colors.text,
  },
  detailDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginHorizontal: spacing.sm,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    ...typography.label,
    color: colors.text,
  },

  // Section
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },

  // Benefits
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    ...typography.label,
    color: colors.text,
  },
  benefitDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Plans
  plansContainer: {
    gap: spacing.md,
  },
  planCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  planCardPlain: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardHighlighted: {
    ...shadows.glow,
  },
  planGradientBorder: {
    padding: 2,
    borderRadius: radius.xl,
  },
  planInner: {
    backgroundColor: colors.card,
    borderRadius: radius.xl - 2,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  saveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  saveBadgeText: {
    ...typography.overline,
    color: colors.textInverse,
  },
  planName: {
    ...typography.h4,
    color: colors.text,
  },
  planPrice: {
    ...typography.display,
    fontFamily: typography.fontFamilyDisplayBold,
    fontSize: 36,
    lineHeight: 42,
    color: colors.text,
  },
  planPeriod: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  featureList: {
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  planButton: {
    marginTop: spacing.xs,
  },

  // Footer
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
