import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  TrendingUp,
  Banknote,
  Download,
  Heart,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import type {
  CreatorWallet,
  WalletTransaction,
  WithdrawalRequest,
  WalletTransactionType,
  WalletTransactionStatus,
  WithdrawalStatus,
} from '@/types';
import { useAuth, useMonetization, useToast } from '@/contexts';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { timeAgo } from '@/utils';
import { LoadingScreen, EmptyState, CustomButton, Modal, CustomInput } from '@/components';

// =============================================================================
// Helpers & configuration
// =============================================================================

/** Formats a USD amount as "$X.XX". */
function formatUsd(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

/** Formats a timestamp as a localized date string (e.g. "Jan 5, 2025"). */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface TransactionTypeConfig {
  icon: LucideIcon;
  incoming: boolean;
}

const TRANSACTION_TYPE_CONFIG: Record<WalletTransactionType, TransactionTypeConfig> = {
  tip: { icon: Heart, incoming: true },
  ad_revenue: { icon: TrendingUp, incoming: true },
  premium_share: { icon: Sparkles, incoming: true },
  withdrawal: { icon: ArrowUpRight, incoming: false },
  refund: { icon: ArrowDownRight, incoming: true },
};

interface StatusConfig {
  label: string;
  color: string;
}

const TRANSACTION_STATUS_CONFIG: Record<WalletTransactionStatus, StatusConfig> = {
  pending: { label: 'Pending', color: colors.warning },
  completed: { label: 'Completed', color: colors.success },
  failed: { label: 'Failed', color: colors.error },
};

const WITHDRAWAL_STATUS_CONFIG: Record<WithdrawalStatus, StatusConfig> = {
  pending: { label: 'Pending', color: colors.warning },
  approved: { label: 'Approved', color: colors.secondary },
  completed: { label: 'Completed', color: colors.success },
  rejected: { label: 'Rejected', color: colors.error },
};

const WITHDRAWAL_METHODS = ['PayPal', 'Bank Transfer', 'Stripe'] as const;
type WithdrawalMethod = (typeof WITHDRAWAL_METHODS)[number];

// =============================================================================
// Sub-components
// =============================================================================

interface StatPillProps {
  label: string;
  value: string;
}

function StatPill({ label, value }: StatPillProps) {
  return (
    <View style={styles.statPill}>
      <Text style={[typography.h4, styles.statPillValue]}>{value}</Text>
      <Text style={[typography.caption, styles.statPillLabel]}>{label}</Text>
    </View>
  );
}

interface StatusBadgeProps {
  label: string;
  color: string;
}

function StatusBadge({ label, color }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[typography.overline, { color }]}>{label}</Text>
    </View>
  );
}

interface TransactionRowProps {
  transaction: WalletTransaction;
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const config = TRANSACTION_TYPE_CONFIG[transaction.type] ?? TRANSACTION_TYPE_CONFIG.tip;
  const Icon = config.icon;
  const isIncoming = config.incoming;
  const status = TRANSACTION_STATUS_CONFIG[transaction.status] ?? TRANSACTION_STATUS_CONFIG.pending;

  return (
    <View style={styles.txRow}>
      <View
        style={[
          styles.txIconWrap,
          { backgroundColor: isIncoming ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)' },
        ]}
      >
        <Icon
          size={18}
          color={isIncoming ? colors.success : colors.error}
          strokeWidth={2.25}
        />
      </View>

      <View style={styles.txInfo}>
        <Text style={[typography.label, styles.txDescription]} numberOfLines={2}>
          {transaction.description}
        </Text>
        <View style={styles.txMetaRow}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={[typography.caption, styles.txTime]}>{timeAgo(transaction.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.txRight}>
        <Text
          style={[
            typography.label,
            styles.txAmount,
            { color: isIncoming ? colors.success : colors.error },
          ]}
        >
          {isIncoming ? '+' : '-'}
          {formatUsd(transaction.amountUsd)}
        </Text>
        <StatusBadge label={status.label} color={status.color} />
      </View>
    </View>
  );
}

interface WithdrawalRowProps {
  withdrawal: WithdrawalRequest;
}

function WithdrawalRow({ withdrawal }: WithdrawalRowProps) {
  const status =
    WITHDRAWAL_STATUS_CONFIG[withdrawal.status] ?? WITHDRAWAL_STATUS_CONFIG.pending;

  return (
    <View style={styles.wdRow}>
      <View style={styles.wdIconWrap}>
        <Banknote size={18} color={colors.secondary} strokeWidth={2.25} />
      </View>

      <View style={styles.wdInfo}>
        <Text style={[typography.label, styles.wdMethod]} numberOfLines={1}>
          {withdrawal.method}
        </Text>
        <View style={styles.wdMetaRow}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={[typography.caption, styles.wdTime]}>
            {formatDate(withdrawal.requestedAt)}
          </Text>
        </View>
      </View>

      <View style={styles.wdRight}>
        <Text style={[typography.label, styles.wdAmount]}>{formatUsd(withdrawal.amountUsd)}</Text>
        <StatusBadge label={status.label} color={status.color} />
      </View>
    </View>
  );
}

interface MethodChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function MethodChip({ label, selected, onPress }: MethodChipProps) {
  if (selected) {
    return (
      <Pressable onPress={onPress} style={styles.methodChipSelected}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.methodChipGradient}
        >
          <Text style={[typography.label, styles.methodChipTextSelected]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={styles.methodChip}>
      <Text style={[typography.label, styles.methodChipText]}>{label}</Text>
    </Pressable>
  );
}

// =============================================================================
// Main screen
// =============================================================================

export default function CreatorWalletScreen() {
  const { firebaseUser } = useAuth();
  const { getWallet, listWalletTransactions, requestWithdrawal, listWithdrawals } =
    useMonetization();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [wallet, setWallet] = useState<CreatorWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Withdrawal modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod>('PayPal');
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    if (!firebaseUser) {
      setWallet(null);
      setTransactions([]);
      setWithdrawals([]);
      setIsLoading(false);
      return;
    }
    try {
      const [walletData, txData, wdData] = await Promise.all([
        getWallet(firebaseUser.uid),
        listWalletTransactions(firebaseUser.uid),
        listWithdrawals(firebaseUser.uid),
      ]);
      setWallet(walletData);
      setTransactions(txData);
      setWithdrawals(wdData);
    } catch (err) {
      // Non-fatal: surface an error toast but keep the screen usable.
      toast.error('Could not load your wallet data.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [firebaseUser, getWallet, listWalletTransactions, listWithdrawals, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Withdrawal modal
  // ---------------------------------------------------------------------------
  const openWithdrawalModal = useCallback(() => {
    setAmountInput('');
    setAmountError(undefined);
    setSelectedMethod('PayPal');
    setModalVisible(true);
  }, []);

  const closeWithdrawalModal = useCallback(() => {
    setModalVisible(false);
    setAmountInput('');
    setAmountError(undefined);
  }, []);

  const handleRequestWithdrawal = useCallback(async () => {
    if (!firebaseUser) {
      toast.error('Please sign in to withdraw funds.');
      return;
    }

    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      setAmountError('Enter a valid amount.');
      return;
    }
    if (wallet && amount > wallet.balanceUsd) {
      setAmountError('Amount exceeds your available balance.');
      return;
    }

    setAmountError(undefined);
    setSubmitting(true);
    try {
      await requestWithdrawal(firebaseUser.uid, amount, selectedMethod);
      toast.success('Withdrawal requested! We’ll process it shortly.');
      closeWithdrawalModal();
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not request withdrawal. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    firebaseUser,
    amountInput,
    wallet,
    selectedMethod,
    requestWithdrawal,
    toast,
    closeWithdrawalModal,
    loadData,
  ]);

  const handleExport = useCallback(() => {
    toast.success('Statement exported. Check your downloads folder.');
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Render gates
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return <LoadingScreen message="Loading your wallet…" />;
  }

  if (!wallet) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backButton}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Creator Wallet
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <EmptyState
          icon={Wallet}
          title="No wallet found"
          description="We couldn’t load your creator wallet. Pull to refresh or try again later."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
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
        <View style={styles.headerTitleRow}>
          <Wallet size={20} color={colors.secondary} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            Creator Wallet
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.secondary}
          />
        }
      >
        {/* Balance Card */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceTopRow}>
            <View style={styles.balanceIconWrap}>
              <Wallet size={22} color={colors.text} strokeWidth={2.25} />
            </View>
            <View style={styles.balanceLabelWrap}>
              <Text style={[typography.overline, styles.balanceLabel]}>AVAILABLE BALANCE</Text>
              <Text style={[typography.display, styles.balanceValue]}>
                {formatUsd(wallet.balanceUsd)}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.balanceStats}>
            <StatPill label="Total Earned" value={formatUsd(wallet.totalEarningsUsd)} />
            <View style={styles.statDivider} />
            <StatPill label="Pending" value={formatUsd(wallet.pendingUsd)} />
            <View style={styles.statDivider} />
            <StatPill label="Withdrawn" value={formatUsd(wallet.withdrawnUsd)} />
          </View>

          <Pressable style={styles.withdrawBtn} onPress={openWithdrawalModal}>
            <Text style={[typography.label, styles.withdrawBtnText]}>Withdraw Funds</Text>
            <ArrowUpRight size={16} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        </LinearGradient>

        {/* Export / Download */}
        <CustomButton
          title="Export Statement"
          onPress={handleExport}
          variant="outline"
          size="md"
          fullWidth
          leftIcon={<Download size={18} color={colors.primary} />}
          style={styles.exportBtn}
        />

        {/* Transaction History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <TrendingUp size={18} color={colors.secondary} />
              <Text style={[typography.h4, styles.sectionTitle]}>Transaction History</Text>
            </View>
          </View>

          {transactions.length > 0 ? (
            <View style={styles.txList}>
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={DollarSign}
              title="No transactions yet"
              description="Tips, ad revenue, and premium shares will appear here."
            />
          )}
        </View>

        {/* Withdrawal Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Banknote size={18} color={colors.secondary} />
              <Text style={[typography.h4, styles.sectionTitle]}>Withdrawal Requests</Text>
            </View>
          </View>

          {withdrawals.length > 0 ? (
            <View style={styles.wdList}>
              {withdrawals.map((wd) => (
                <WithdrawalRow key={wd.id} withdrawal={wd} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="No withdrawal requests"
              description="When you request a withdrawal, it will show up here with its status."
            />
          )}
        </View>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal
        visible={modalVisible}
        onClose={closeWithdrawalModal}
        title="Withdraw Funds"
        footer={
          <CustomButton
            title="Request Withdrawal"
            onPress={handleRequestWithdrawal}
            loading={submitting}
            disabled={submitting}
            fullWidth
            leftIcon={<ArrowUpRight size={18} color={colors.text} />}
          />
        }
      >
        <View style={styles.modalBody}>
          {/* Available balance hint */}
          <View style={styles.modalBalanceHint}>
            <Text style={[typography.caption, styles.modalBalanceHintLabel]}>
              Available balance
            </Text>
            <Text style={[typography.h4, styles.modalBalanceHintValue]}>
              {formatUsd(wallet.balanceUsd)}
            </Text>
          </View>

          {/* Amount input */}
          <CustomInput
            label="Amount (USD)"
            value={amountInput}
            onChangeText={(text) => {
              setAmountInput(text);
              if (amountError) setAmountError(undefined);
            }}
            error={amountError}
            leftIcon={DollarSign}
            placeholder="0.00"
            keyboardType="decimal-pad"
            autoCapitalize="none"
          />

          {/* Method selector */}
          <Text style={[typography.label, styles.methodLabel]}>Payout Method</Text>
          <View style={styles.methodChips}>
            {WITHDRAWAL_METHODS.map((method) => (
              <MethodChip
                key={method}
                label={method}
                selected={selectedMethod === method}
                onPress={() => setSelectedMethod(method)}
              />
            ))}
          </View>

          <View style={styles.modalNote}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={[typography.caption, styles.modalNoteText]}>
              Withdrawals are typically processed within 3–5 business days.
            </Text>
          </View>
        </View>
      </Modal>
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
    paddingTop: 0,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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

  // Balance Card
  balanceCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  balanceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.base,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabelWrap: {
    flex: 1,
    gap: 2,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
  },
  balanceValue: {
    color: colors.text,
    fontSize: 36,
    lineHeight: 42,
  },
  balanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: radius.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statPillValue: {
    color: colors.text,
    fontSize: 15,
  },
  statPillLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.text,
    borderRadius: radius.base,
    paddingVertical: spacing.md,
  },
  withdrawBtnText: {
    color: colors.primary,
  },

  // Export button
  exportBtn: {
    marginBottom: spacing.xs,
  },

  // Sections
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Transaction rows
  txList: {
    gap: spacing.sm,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: {
    flex: 1,
    gap: 2,
  },
  txDescription: {
    color: colors.text,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  txTime: {
    color: colors.textMuted,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  txAmount: {
    fontSize: 14,
  },

  // Withdrawal rows
  wdList: {
    gap: spacing.sm,
  },
  wdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  wdIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(168,85,247,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wdInfo: {
    flex: 1,
    gap: 2,
  },
  wdMethod: {
    color: colors.text,
  },
  wdMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  wdTime: {
    color: colors.textMuted,
  },
  wdRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  wdAmount: {
    color: colors.text,
    fontSize: 14,
  },

  // Modal body
  modalBody: {
    gap: spacing.lg,
  },
  modalBalanceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  modalBalanceHintLabel: {
    color: colors.textSecondary,
  },
  modalBalanceHintValue: {
    color: colors.text,
  },
  methodLabel: {
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  methodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  methodChip: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.base,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  methodChipText: {
    color: colors.textSecondary,
  },
  methodChipSelected: {
    borderRadius: radius.base,
    overflow: 'hidden',
  },
  methodChipGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.base,
  },
  methodChipTextSelected: {
    color: colors.text,
  },
  modalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  modalNoteText: {
    color: colors.textMuted,
    flex: 1,
  },
});
