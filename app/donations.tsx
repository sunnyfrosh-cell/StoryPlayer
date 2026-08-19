import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  DollarSign,
  Send,
  Sparkles,
  MessageSquare,
  Clock,
} from 'lucide-react-native';
import { useAuth, useMonetization, useToast } from '@/contexts';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { LoadingScreen, EmptyState, Avatar, CustomButton, Modal } from '@/components';
import { timeAgo } from '@/utils';
import type { Donation } from '@/types';

const PRESET_AMOUNTS = [1, 3, 5, 10, 25];

export default function DonationsScreen() {
  const { firebaseUser } = useAuth();
  const { sendDonation, listDonationsForCreator } = useMonetization();
  const toast = useToast();
  const searchParams = useLocalSearchParams<{ creatorId?: string }>();

  const isTipMode = Boolean(searchParams.creatorId);

  // ---------------------------------------------------------------------------
  // Received-donations mode state
  // ---------------------------------------------------------------------------
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ---------------------------------------------------------------------------
  // Tip-form mode state
  // ---------------------------------------------------------------------------
  const [presetAmount, setPresetAmount] = useState<number | null>(5);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sentAmount, setSentAmount] = useState(0);

  // Effective amount derived from preset or custom input
  const effectiveAmount =
    presetAmount !== null
      ? presetAmount
      : customAmount.trim()
        ? parseFloat(customAmount)
        : null;
  const isAmountValid = effectiveAmount !== null && effectiveAmount > 0;

  // ---------------------------------------------------------------------------
  // Load received donations (creator mode)
  // ---------------------------------------------------------------------------
  const loadDonations = useCallback(async () => {
    if (!firebaseUser) {
      setDonations([]);
      setIsLoading(false);
      return;
    }
    try {
      const result = await listDonationsForCreator(firebaseUser.uid);
      setDonations(result);
    } catch (err) {
      setDonations([]);
      console.warn('[DonationsScreen] Failed to load donations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser, listDonationsForCreator]);

  useEffect(() => {
    if (!isTipMode) {
      loadDonations();
    } else {
      setIsLoading(false);
    }
  }, [isTipMode, loadDonations]);

  const handleRefresh = useCallback(async () => {
    if (!firebaseUser) return;
    setIsRefreshing(true);
    try {
      const result = await listDonationsForCreator(firebaseUser.uid);
      setDonations(result);
    } catch (err) {
      console.warn('[DonationsScreen] Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [firebaseUser, listDonationsForCreator]);

  // ---------------------------------------------------------------------------
  // Send tip
  // ---------------------------------------------------------------------------
  const handleSendTip = useCallback(async () => {
    if (!firebaseUser) {
      toast.error('Please sign in to send a tip.');
      return;
    }
    if (!searchParams.creatorId) {
      toast.error('No creator selected.');
      return;
    }
    if (!isAmountValid || effectiveAmount === null) {
      toast.error('Choose an amount to tip.');
      return;
    }

    setIsSending(true);
    try {
      await sendDonation({
        fromUserId: firebaseUser.uid,
        fromUserName: firebaseUser.displayName ?? 'Anonymous',
        fromUserAvatarUrl: null,
        toCreatorId: searchParams.creatorId,
        amountUsd: effectiveAmount,
        message: message.trim(),
      });
      setSentAmount(effectiveAmount);
      setShowSuccess(true);
      // Reset form
      setPresetAmount(5);
      setCustomAmount('');
      setMessage('');
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not send your tip. Try again.',
      );
    } finally {
      setIsSending(false);
    }
  }, [
    firebaseUser,
    searchParams.creatorId,
    isAmountValid,
    effectiveAmount,
    message,
    sendDonation,
    toast,
  ]);

  const handleSelectPreset = useCallback((amount: number) => {
    setPresetAmount(amount);
    setCustomAmount('');
  }, []);

  const handleCustomAmountChange = useCallback((text: string) => {
    // Allow only numeric / decimal input
    const sanitized = text.replace(/[^0-9.]/g, '');
    setCustomAmount(sanitized);
    setPresetAmount(null);
  }, []);

  const handleCloseSuccess = useCallback(() => {
    setShowSuccess(false);
    router.back();
  }, []);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return <LoadingScreen message="Loading donations…" />;
  }

  const totalReceived = donations.reduce((sum, d) => sum + d.amountUsd, 0);

  // ---------------------------------------------------------------------------
  // Render: Tip-form mode
  // ---------------------------------------------------------------------------
  if (isTipMode) {
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
            Support Creator
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroIconWrap}>
              <Heart size={32} color={colors.text} fill={colors.text} />
            </View>
            <Text style={styles.heroTitle}>Send a Tip</Text>
            <Text style={styles.heroTagline}>
              Show your appreciation for the content you love
            </Text>
          </LinearGradient>

          {/* Preset amounts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose an amount</Text>
            <View style={styles.chipRow}>
              {PRESET_AMOUNTS.map((amount) => {
                const selected = presetAmount === amount;
                return (
                  <Pressable
                    key={amount}
                    onPress={() => handleSelectPreset(amount)}
                    style={[
                      styles.chip,
                      selected ? styles.chipSelected : styles.chipPlain,
                    ]}
                  >
                    {selected ? (
                      <LinearGradient
                        colors={[colors.gradientStart, colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.chipGradient}
                      >
                        <DollarSign size={14} color={colors.text} />
                        <Text style={styles.chipTextSelected}>{amount}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.chipInner}>
                        <DollarSign size={14} color={colors.secondaryLight} />
                        <Text style={styles.chipText}>{amount}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Custom amount */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom amount</Text>
            <View style={styles.customAmountWrap}>
              <View style={styles.currencyBadge}>
                <DollarSign size={18} color={colors.secondaryLight} />
              </View>
              <TextInput
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={styles.customInput}
                accessibilityLabel="Custom tip amount in dollars"
              />
            </View>
          </View>

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message (optional)</Text>
            <View style={styles.messageWrap}>
              <MessageSquare
                size={18}
                color={colors.textMuted}
                style={styles.messageIcon}
              />
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Add a thank-you message..."
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.messageInput}
                accessibilityLabel="Thank-you message"
                maxLength={280}
              />
            </View>
          </View>

          {/* Send button */}
          <CustomButton
            title={isSending ? 'Sending…' : 'Send Tip'}
            onPress={handleSendTip}
            loading={isSending}
            disabled={!isAmountValid || isSending}
            fullWidth
            leftIcon={<Send size={18} color={colors.text} />}
            style={styles.sendButton}
          />

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Sparkles size={15} color={colors.textMuted} />
            <Text style={styles.disclaimerText}>
              Tips are processed securely via the App Store. Your card details are never shared with creators.
            </Text>
          </View>
        </ScrollView>

        {/* Success modal */}
        <Modal
          visible={showSuccess}
          onClose={handleCloseSuccess}
          title="Thank You!"
          footer={
            <CustomButton
              title="Done"
              onPress={handleCloseSuccess}
              fullWidth
            />
          }
        >
          <View style={styles.successBody}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successIconWrap}
            >
              <Heart size={36} color={colors.text} fill={colors.text} />
            </LinearGradient>
            <Text style={styles.successTitle}>Tip Sent!</Text>
            <Text style={styles.successText}>
              Your tip of ${sentAmount.toFixed(2)} has been sent to the creator.
              Thank you for supporting StoryVerse!
            </Text>
          </View>
        </Modal>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Received-donations mode
  // ---------------------------------------------------------------------------
  const renderDonationItem = ({ item }: { item: Donation }) => {
    const initials = item.fromUserName.slice(0, 2).toUpperCase();
    return (
      <View style={styles.donationCard}>
        <Avatar uri={item.fromUserAvatarUrl} size={44} initials={initials} />
        <View style={styles.donationBody}>
          <View style={styles.donationHeader}>
            <Text style={styles.donationName} numberOfLines={1}>
              {item.fromUserName}
            </Text>
            <Text style={styles.donationAmount}>
              ${item.amountUsd.toFixed(2)}
            </Text>
          </View>
          {item.message ? (
            <Text style={styles.donationMessage} numberOfLines={3}>
              {item.message}
            </Text>
          ) : null}
          <View style={styles.donationMeta}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={styles.donationTime}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

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
          Donations Received
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {donations.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.secondary}
              colors={[colors.secondary]}
            />
          }
        >
          {/* Total card even when empty */}
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalCard}
          >
            <Text style={styles.totalLabel}>Total Received</Text>
            <Text style={styles.totalAmount}>${totalReceived.toFixed(2)}</Text>
            <Text style={styles.totalSub}>0 tips</Text>
          </LinearGradient>
          <EmptyState
            icon={Heart}
            title="No donations yet"
            description="Tips from your supporters will show up here. Keep creating great content!"
          />
        </ScrollView>
      ) : (
        <FlatList
          data={donations}
          keyExtractor={(item) => item.id}
          renderItem={renderDonationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.secondary}
              colors={[colors.secondary]}
            />
          }
          ListHeaderComponent={
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.totalCard}
            >
              <Text style={styles.totalLabel}>Total Received</Text>
              <Text style={styles.totalAmount}>
                ${totalReceived.toFixed(2)}
              </Text>
              <Text style={styles.totalSub}>
                {donations.length} {donations.length === 1 ? 'tip' : 'tips'}
              </Text>
            </LinearGradient>
          }
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
        />
      )}
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

  // Section
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },

  // Amount chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.base,
    minWidth: 64,
  },
  chipPlain: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: {
    ...shadows.glow,
  },
  chipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radius.base,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  chipText: {
    ...typography.label,
    color: colors.text,
  },
  chipTextSelected: {
    ...typography.label,
    color: colors.text,
  },

  // Custom amount
  customAmountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.base,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
  },
  currencyBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: 'rgba(168, 85, 247, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  customInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    ...typography.h4,
  },

  // Message
  messageWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.base,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 96,
  },
  messageIcon: {
    marginTop: 2,
    marginRight: spacing.sm,
  },
  messageInput: {
    flex: 1,
    color: colors.text,
    ...typography.bodySmall,
    minHeight: 24,
    textAlignVertical: 'top',
  },

  // Send button
  sendButton: {
    marginTop: spacing.xs,
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  disclaimerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Success modal
  successBody: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  successTitle: {
    ...typography.h3,
    color: colors.text,
  },
  successText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Total card (received mode)
  totalCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius['2xl'],
    marginBottom: spacing.lg,
    ...shadows.glow,
  },
  totalLabel: {
    ...typography.overline,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  totalAmount: {
    ...typography.display,
    fontFamily: typography.fontFamilyDisplayBold,
    fontSize: 40,
    color: colors.text,
  },
  totalSub: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: spacing.xs,
  },

  // Donation list
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  listSeparator: {
    height: spacing.sm,
  },
  donationCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md,
  },
  donationBody: {
    flex: 1,
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 2,
  },
  donationName: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  donationAmount: {
    ...typography.h4,
    color: colors.secondaryLight,
  },
  donationMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  donationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  donationTime: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // Empty
  emptyScroll: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['4xl'],
  },
});
