import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Shield,
  Flag,
  Users,
  Video as VideoIcon,
  Bell,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  BadgeCheck,
  Star,
  Megaphone,
  ChevronRight,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuth, useMonetization, useToast, useUser } from '@/contexts';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatCount, timeAgo } from '@/utils';
import { LoadingScreen, EmptyState, Avatar, Modal, CustomButton, CustomInput, Badge } from '@/components';
import type {
  AdminReport,
  User,
  Announcement,
  ReportStatus,
  ReportTargetType,
} from '@/types';

// =============================================================================
// Tab definitions
// =============================================================================

type AdminTab = 'reports' | 'users' | 'announcements';

interface TabDef {
  key: AdminTab;
  label: string;
  icon: LucideIcon;
}

const TABS: TabDef[] = [
  { key: 'reports', label: 'Reports', icon: Flag },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
];

// =============================================================================
// Report status helpers
// =============================================================================

type ReportFilter = 'all' | ReportStatus;

const REPORT_FILTERS: ReportFilter[] = ['all', 'pending', 'approved', 'rejected'];

const REPORT_TARGET_LABEL: Record<ReportTargetType, string> = {
  video: 'Video',
  comment: 'Comment',
  user: 'User',
};

const REPORT_TARGET_ICON: Record<ReportTargetType, LucideIcon> = {
  video: VideoIcon,
  comment: Bell,
  user: Users,
};

function reportStatusBadge(status: ReportStatus): { label: string; color: string } {
  switch (status) {
    case 'approved':
      return { label: 'Approved', color: colors.success };
    case 'rejected':
      return { label: 'Rejected', color: colors.error };
    default:
      return { label: 'Pending', color: colors.warning };
  }
}

// =============================================================================
// Main screen
// =============================================================================

export default function AdminScreen() {
  const { firebaseUser } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    listAdminReports,
    updateReportStatus,
    suspendUser,
    unsuspendUser,
    verifyCreator,
    unverifyCreator,
    listAllUsers,
    createAnnouncement,
    listAnnouncements,
    deactivateAnnouncement,
    deleteAnnouncement,
  } = useMonetization();
  const { profile } = useUser();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('reports');

  // Reports
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all');
  const [reportsLoading, setReportsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);

  // ---- Data loaders --------------------------------------------------------

  const loadReports = useCallback(
    async (status: ReportFilter) => {
      try {
        const filter = status === 'all' ? undefined : status;
        const result = await listAdminReports(filter);
        setReports(result);
      } catch (err) {
        toast.error('Could not load reports');
      } finally {
        setReportsLoading(false);
      }
    },
    [listAdminReports, toast],
  );

  const loadUsers = useCallback(async () => {
    try {
      const result = await listAllUsers();
      setUsers(result);
    } catch (err) {
      toast.error('Could not load users');
    } finally {
      setUsersLoading(false);
    }
  }, [listAllUsers, toast]);

  const loadAnnouncements = useCallback(async () => {
    try {
      const result = await listAnnouncements();
      setAnnouncements(result);
    } catch (err) {
      toast.error('Could not load announcements');
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [listAnnouncements, toast]);

  // Initial load per active tab
  useEffect(() => {
    if (activeTab === 'reports') {
      setReportsLoading(true);
      loadReports(reportFilter);
    } else if (activeTab === 'users') {
      setUsersLoading(true);
      loadUsers();
    } else if (activeTab === 'announcements') {
      setAnnouncementsLoading(true);
      loadAnnouncements();
    }
  }, [activeTab, reportFilter, loadReports, loadUsers, loadAnnouncements]);

  // ---- Pull to refresh -----------------------------------------------------

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'reports') {
      await loadReports(reportFilter);
    } else if (activeTab === 'users') {
      await loadUsers();
    } else {
      await loadAnnouncements();
    }
    setRefreshing(false);
  }, [activeTab, reportFilter, loadReports, loadUsers, loadAnnouncements]);

  // ---- Report actions ------------------------------------------------------

  const handleReportStatus = useCallback(
    (id: string, status: ReportStatus) => {
      const verb = status === 'approved' ? 'approve' : 'reject';
      Alert.alert(
        `${verb[0].toUpperCase() + verb.slice(1)} report`,
        `Are you sure you want to ${verb} this report?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: verb[0].toUpperCase() + verb.slice(1),
            style: status === 'rejected' ? 'destructive' : 'default',
            onPress: async () => {
              try {
                await updateReportStatus(id, status);
                setReports((prev) =>
                  prev.map((r) => (r.id === id ? { ...r, status } : r)),
                );
                toast.success(`Report ${status}`);
              } catch (err) {
                toast.error('Could not update report');
              }
            },
          },
        ],
      );
    },
    [updateReportStatus, toast],
  );

  // ---- User actions --------------------------------------------------------

  const confirmUserAction = useCallback(
    (
      uid: string,
      action: () => Promise<void>,
      kind: 'suspend' | 'unsuspend' | 'verify' | 'unverify',
      confirmTitle: string,
      confirmMessage: string,
      successMessage: string,
      confirmStyle: 'default' | 'destructive' = 'default',
    ) => {
      Alert.alert(confirmTitle, confirmMessage, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: confirmStyle,
          onPress: async () => {
            try {
              await action();
              // Optimistically reflect change locally
              setUsers((prev) =>
                prev.map((u) => {
                  if (u.id !== uid) return u;
                  switch (kind) {
                    case 'suspend':
                      return { ...u, suspendStatus: 'suspended' as const };
                    case 'unsuspend':
                      return { ...u, suspendStatus: 'active' as const };
                    case 'verify':
                      return { ...u, isVerified: true, isCreator: true };
                    case 'unverify':
                      return { ...u, isVerified: false };
                  }
                }),
              );
              toast.success(successMessage);
            } catch (err) {
              toast.error('Action failed');
            }
          },
        },
      ]);
    },
    [toast],
  );

  const handleSuspend = useCallback(
    (user: User) => {
      confirmUserAction(
        user.id,
        () => suspendUser(user.id),
        'suspend',
        'Suspend user',
        `Suspend ${user.displayName}? They will lose access to the platform until reinstated.`,
        'User suspended',
        'destructive',
      );
    },
    [suspendUser, confirmUserAction],
  );

  const handleUnsuspend = useCallback(
    (user: User) => {
      confirmUserAction(
        user.id,
        () => unsuspendUser(user.id),
        'unsuspend',
        'Reinstate user',
        `Reinstate ${user.displayName}? Their account access will be restored.`,
        'User reinstated',
      );
    },
    [unsuspendUser, confirmUserAction],
  );

  const handleVerify = useCallback(
    (user: User) => {
      confirmUserAction(
        user.id,
        () => verifyCreator(user.id),
        'verify',
        'Verify creator',
        `Grant verified creator status to ${user.displayName}?`,
        'Creator verified',
      );
    },
    [verifyCreator, confirmUserAction],
  );

  const handleUnverify = useCallback(
    (user: User) => {
      confirmUserAction(
        user.id,
        () => unverifyCreator(user.id),
        'unverify',
        'Remove verification',
        `Remove verified status from ${user.displayName}?`,
        'Verification removed',
        'destructive',
      );
    },
    [unverifyCreator, confirmUserAction],
  );

  // ---- Announcement actions ------------------------------------------------

  const handleCreateAnnouncement = useCallback(async () => {
    const title = announcementTitle.trim();
    const body = announcementBody.trim();
    if (!title || !body) {
      toast.error('Title and body are required');
      return;
    }
    setCreatingAnnouncement(true);
    try {
      await createAnnouncement({
        title,
        body,
        imageUrl: null,
        createdBy: firebaseUser?.uid ?? '',
      });
      toast.success('Announcement published');
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setShowAnnouncementModal(false);
      await loadAnnouncements();
    } catch (err) {
      toast.error('Could not create announcement');
    } finally {
      setCreatingAnnouncement(false);
    }
  }, [announcementTitle, announcementBody, createAnnouncement, toast, loadAnnouncements]);

  const handleDeactivate = useCallback(
    (announcement: Announcement) => {
      Alert.alert(
        'Deactivate announcement',
        `"${announcement.title}" will no longer be shown to users. You can delete it afterwards.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              try {
                await deactivateAnnouncement(announcement.id);
                setAnnouncements((prev) =>
                  prev.map((a) =>
                    a.id === announcement.id ? { ...a, isActive: false } : a,
                  ),
                );
                toast.success('Announcement deactivated');
              } catch (err) {
                toast.error('Could not deactivate');
              }
            },
          },
        ],
      );
    },
    [deactivateAnnouncement, toast],
  );

  const handleDelete = useCallback(
    (announcement: Announcement) => {
      Alert.alert(
        'Delete announcement',
        `Permanently delete "${announcement.title}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteAnnouncement(announcement.id);
                setAnnouncements((prev) =>
                  prev.filter((a) => a.id !== announcement.id),
                );
                toast.success('Announcement deleted');
              } catch (err) {
                toast.error('Could not delete');
              }
            },
          },
        ],
      );
    },
    [deleteAnnouncement, toast],
  );

  // ---- Access guard --------------------------------------------------------

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return <AccessDeniedScreen />;
  }

  // ---- Render helpers ------------------------------------------------------

  const isLoading =
    (activeTab === 'reports' && reportsLoading) ||
    (activeTab === 'users' && usersLoading) ||
    (activeTab === 'announcements' && announcementsLoading);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AdminHeader />
        <LoadingScreen message="Loading admin panel…" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              {active ? (
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabGradient}
                >
                  <Icon size={18} color={colors.text} />
                  <Text style={[typography.label, styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.tabInner}>
                  <Icon size={18} color={colors.textMuted} />
                  <Text style={[typography.label, styles.tabLabel]}>{tab.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      <FlatList
        data={[{}] as Record<string, never>[]}
        renderItem={() => null}
        keyExtractor={(_, index) => `wrapper_${index}`}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
        ListHeaderComponent={
          activeTab === 'reports' ? (
            <ReportsView
              reports={reports}
              filter={reportFilter}
              onFilterChange={setReportFilter}
              onApprove={(id) => handleReportStatus(id, 'approved')}
              onReject={(id) => handleReportStatus(id, 'rejected')}
            />
          ) : activeTab === 'users' ? (
            <UsersView
              users={users}
              currentUid={firebaseUser?.uid}
              onSuspend={handleSuspend}
              onUnsuspend={handleUnsuspend}
              onVerify={handleVerify}
              onUnverify={handleUnverify}
            />
          ) : (
            <AnnouncementsView
              announcements={announcements}
              onCreate={() => setShowAnnouncementModal(true)}
              onDeactivate={handleDeactivate}
              onDelete={handleDelete}
            />
          )
        }
      />

      {/* New announcement modal */}
      <Modal
        visible={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        title="New Announcement"
        footer={
          <View style={styles.modalFooter}>
            <CustomButton
              title="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => setShowAnnouncementModal(false)}
              style={styles.modalFooterBtn}
            />
            <CustomButton
              title={creatingAnnouncement ? 'Publishing…' : 'Publish'}
              size="sm"
              onPress={handleCreateAnnouncement}
              loading={creatingAnnouncement}
              disabled={creatingAnnouncement}
              style={styles.modalFooterBtn}
            />
          </View>
        }
      >
        <View style={styles.modalBody}>
          <CustomInput
            label="Title"
            value={announcementTitle}
            onChangeText={setAnnouncementTitle}
            placeholder="Announcement title"
            autoCapitalize="sentences"
          />
          <CustomInput
            label="Body"
            value={announcementBody}
            onChangeText={setAnnouncementBody}
            placeholder="Write your announcement…"
            autoCapitalize="sentences"
            multiline
            style={styles.announcementBodyInput}
          />
        </View>
      </Modal>
    </View>
  );
}

// =============================================================================
// Header
// =============================================================================

function AdminHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.backButton}
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={24} color={colors.text} />
      </Pressable>
      <View style={styles.headerCenter}>
        <Shield size={18} color={colors.secondary} />
        <Text style={styles.headerTitle}>Admin Panel</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
}

// =============================================================================
// Access denied screen
// =============================================================================

function AccessDeniedScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.accessDenied}>
        <LinearGradient
          colors={['rgba(239,68,68,0.18)', 'rgba(239,68,68,0.0)']}
          style={styles.lockIconWrap}
        >
          <Shield size={40} color={colors.error} strokeWidth={1.75} />
        </LinearGradient>
        <Text style={[typography.h3, styles.accessDeniedTitle]}>Access Denied</Text>
        <Text style={[typography.bodySmall, styles.accessDeniedText]}>
          You don&apos;t have permission to access the admin panel. This area is
          restricted to administrators only.
        </Text>
        <CustomButton
          title="Back to safety"
          variant="outline"
          size="md"
          leftIcon={<ArrowLeft size={18} color={colors.primary} />}
          onPress={() => router.back()}
          style={styles.accessDeniedBtn}
        />
      </View>
    </View>
  );
}

// =============================================================================
// Reports view
// =============================================================================

interface ReportsViewProps {
  reports: AdminReport[];
  filter: ReportFilter;
  onFilterChange: (filter: ReportFilter) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function ReportsView({ reports, filter, onFilterChange, onApprove, onReject }: ReportsViewProps) {
  return (
    <View>
      {/* Status filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {REPORT_FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => onFilterChange(f)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text
                style={[
                  typography.label,
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {f[0].toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {reports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No reports"
          description="There are no reports matching this filter right now."
        />
      ) : (
        <View style={styles.listGap}>
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onApprove={() => onApprove(report.id)}
              onReject={() => onReject(report.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface ReportCardProps {
  report: AdminReport;
  onApprove: () => void;
  onReject: () => void;
}

function ReportCard({ report, onApprove, onReject }: ReportCardProps) {
  const TargetIcon = REPORT_TARGET_ICON[report.targetType];
  const status = reportStatusBadge(report.status);
  const isPending = report.status === 'pending';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.reportTargetRow}>
          <View
            style={[
              styles.targetIconWrap,
              { backgroundColor: `${status.color}22` },
            ]}
          >
            <TargetIcon size={18} color={status.color} />
          </View>
          <View style={styles.reportTargetBody}>
            <Text style={[typography.label, styles.reportTargetLabel]}>
              {REPORT_TARGET_LABEL[report.targetType]} reported
            </Text>
            <Text style={[typography.caption, styles.reportMeta]}>
              by {report.reporterName} · {timeAgo(report.createdAt)}
            </Text>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status.color },
            ]}
          />
        </View>

        <View style={styles.reportReasonRow}>
          <AlertTriangle size={14} color={colors.warning} />
          <Text style={[typography.bodySmall, styles.reportReason]}>
            {report.reason}
          </Text>
        </View>

        {report.description ? (
          <Text style={[typography.caption, styles.reportDescription]} numberOfLines={3}>
            {report.description}
          </Text>
        ) : null}

        <View style={styles.reportStatusRow}>
          <Badge
            label={status.label}
            variant={report.status === 'approved' ? 'primary' : 'soft'}
            icon={
              report.status === 'approved' ? (
                <CheckCircle size={12} color={colors.text} />
              ) : report.status === 'rejected' ? (
                <XCircle size={12} color={colors.error} />
              ) : (
                <AlertTriangle size={12} color={colors.warning} />
              )
            }
          />
          <Text style={[typography.overline, styles.reportTargetId]} numberOfLines={1}>
            ID: {report.targetId.slice(-8)}
          </Text>
        </View>
      </View>

      {isPending ? (
        <View style={styles.actionRow}>
          <Pressable
            onPress={onApprove}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.approveBtn,
              pressed && styles.actionBtnPressed,
            ]}
          >
            <CheckCircle size={18} color={colors.success} />
            <Text style={[typography.label, styles.approveBtnText]}>Approve</Text>
          </Pressable>
          <Pressable
            onPress={onReject}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.rejectBtn,
              pressed && styles.actionBtnPressed,
            ]}
          >
            <XCircle size={18} color={colors.error} />
            <Text style={[typography.label, styles.rejectBtnText]}>Reject</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.resolvedRow}>
          {report.status === 'approved' ? (
            <CheckCircle size={16} color={colors.success} />
          ) : (
            <XCircle size={16} color={colors.error} />
          )}
          <Text style={[typography.caption, styles.resolvedText]}>
            {report.status === 'approved' ? 'Report approved' : 'Report rejected'}
            {report.reviewedAt ? ` · ${timeAgo(report.reviewedAt)}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Users view
// =============================================================================

interface UsersViewProps {
  users: User[];
  currentUid?: string;
  onSuspend: (user: User) => void;
  onUnsuspend: (user: User) => void;
  onVerify: (user: User) => void;
  onUnverify: (user: User) => void;
}

function UsersView({
  users,
  currentUid,
  onSuspend,
  onUnsuspend,
  onVerify,
  onUnverify,
}: UsersViewProps) {
  if (users.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No users found"
        description="User accounts will appear here once registered."
      />
    );
  }

  return (
    <View style={styles.listGap}>
      <View style={styles.sectionSummary}>
        <Users size={16} color={colors.textMuted} />
        <Text style={[typography.caption, styles.sectionSummaryText]}>
          {formatCount(users.length)} {users.length === 1 ? 'user' : 'users'}
        </Text>
      </View>
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          isSelf={user.id === currentUid}
          onSuspend={() => onSuspend(user)}
          onUnsuspend={() => onUnsuspend(user)}
          onVerify={() => onVerify(user)}
          onUnverify={() => onUnverify(user)}
        />
      ))}
    </View>
  );
}

interface UserCardProps {
  user: User;
  isSelf: boolean;
  onSuspend: () => void;
  onUnsuspend: () => void;
  onVerify: () => void;
  onUnverify: () => void;
}

function UserCard({
  user,
  isSelf,
  onSuspend,
  onUnsuspend,
  onVerify,
  onUnverify,
}: UserCardProps) {
  const isSuspended = user.suspendStatus === 'suspended';
  const initials = (user.displayName || user.username || 'SV')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return (
    <View style={[styles.card, isSuspended && styles.cardSuspended]}>
      <View style={styles.userRow}>
        <Avatar uri={user.avatarUrl} size={48} initials={initials} ring={user.isVerified} />
        <View style={styles.userBody}>
          <View style={styles.userNameRow}>
            {user.isVerified ? (
              <BadgeCheck size={16} color={colors.secondary} />
            ) : null}
            <Text style={[typography.label, styles.userName]} numberOfLines={1}>
              {user.displayName || user.username}
            </Text>
            {isSelf ? (
              <View style={styles.selfTag}>
                <Text style={[typography.overline, styles.selfTagText]}>YOU</Text>
              </View>
            ) : null}
          </View>
          <Text style={[typography.caption, styles.userEmail]} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={styles.userBadges}>
            <Badge
              label={user.role}
              variant={user.role === 'admin' ? 'primary' : user.isCreator ? 'gold' : 'neutral'}
            />
            {isSuspended ? (
              <Badge
                label="suspended"
                variant="soft"
                icon={<Ban size={12} color={colors.error} />}
              />
            ) : null}
            {user.isCreator ? (
              <Badge label="creator" variant="soft" icon={<Star size={12} color={colors.secondaryLight} />} />
            ) : null}
          </View>
        </View>
      </View>

      {!isSelf ? (
        <View style={styles.userActionRow}>
          <Pressable
            onPress={isSuspended ? onUnsuspend : onSuspend}
            style={({ pressed }) => [
              styles.userAction,
              pressed && styles.userActionPressed,
            ]}
          >
            <Ban
              size={16}
              color={isSuspended ? colors.success : colors.error}
            />
            <Text
              style={[
                typography.caption,
                { color: isSuspended ? colors.success : colors.error },
              ]}
            >
              {isSuspended ? 'Reinstate' : 'Suspend'}
            </Text>
          </Pressable>

          <Pressable
            onPress={user.isVerified ? onUnverify : onVerify}
            style={({ pressed }) => [
              styles.userAction,
              pressed && styles.userActionPressed,
            ]}
          >
            <BadgeCheck
              size={16}
              color={user.isVerified ? colors.warning : colors.secondary}
            />
            <Text
              style={[
                typography.caption,
                { color: user.isVerified ? colors.warning : colors.secondary },
              ]}
            >
              {user.isVerified ? 'Unverify' : 'Verify'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.selfActionRow}>
          <Text style={[typography.overline, styles.selfActionText]}>
            ACTIONS DISABLED FOR YOUR ACCOUNT
          </Text>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Announcements view
// =============================================================================

interface AnnouncementsViewProps {
  announcements: Announcement[];
  onCreate: () => void;
  onDeactivate: (announcement: Announcement) => void;
  onDelete: (announcement: Announcement) => void;
}

function AnnouncementsView({
  announcements,
  onCreate,
  onDeactivate,
  onDelete,
}: AnnouncementsViewProps) {
  return (
    <View>
      <View style={styles.announcementHeader}>
        <View style={styles.announcementHeaderText}>
          <Text style={[typography.h4, styles.announcementTitle]}>Announcements</Text>
          <Text style={[typography.caption, styles.announcementSub]}>
            Broadcast messages to all StoryVerse users
          </Text>
        </View>
        <Pressable
          onPress={onCreate}
          style={({ pressed }) => [
            styles.createBtn,
            pressed && styles.createBtnPressed,
          ]}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createBtnGradient}
          >
            <Megaphone size={18} color={colors.text} />
            <Text style={[typography.label, styles.createBtnText]}>New</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements"
          description="Create your first announcement to broadcast a message to everyone."
          actionLabel="Create announcement"
          onAction={onCreate}
        />
      ) : (
        <View style={styles.listGap}>
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onDeactivate={() => onDeactivate(announcement)}
              onDelete={() => onDelete(announcement)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface AnnouncementCardProps {
  announcement: Announcement;
  onDeactivate: () => void;
  onDelete: () => void;
}

function AnnouncementCard({ announcement, onDeactivate, onDelete }: AnnouncementCardProps) {
  return (
    <View
      style={[styles.card, !announcement.isActive && styles.cardInactive]}
    >
      <View style={styles.announcementCardTop}>
        <View style={styles.announcementIconWrap}>
          <Megaphone size={18} color={colors.secondaryLight} />
        </View>
        <View style={styles.announcementCardHeader}>
          <View style={styles.announcementTitleRow}>
            <Text style={[typography.label, styles.announcementCardTitle]} numberOfLines={2}>
              {announcement.title}
            </Text>
          </View>
          <Badge
            label={announcement.isActive ? 'active' : 'inactive'}
            variant={announcement.isActive ? 'primary' : 'neutral'}
            icon={
              announcement.isActive ? (
                <CheckCircle size={12} color={colors.text} />
              ) : (
                <Eye size={12} color={colors.textSecondary} />
              )
            }
          />
        </View>
      </View>

      <Text style={[typography.bodySmall, styles.announcementCardBody]} numberOfLines={4}>
        {announcement.body}
      </Text>

      <View style={styles.announcementMetaRow}>
        <Bell size={12} color={colors.textMuted} />
        <Text style={[typography.overline, styles.announcementMetaText]}>
          CREATED {timeAgo(announcement.createdAt).toUpperCase()}
        </Text>
      </View>

      <View style={styles.announcementActionRow}>
        {announcement.isActive ? (
          <Pressable
            onPress={onDeactivate}
            style={({ pressed }) => [
              styles.announcementAction,
              pressed && styles.userActionPressed,
            ]}
          >
            <XCircle size={16} color={colors.warning} />
            <Text style={[typography.caption, { color: colors.warning }]}>
              Deactivate
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.announcementAction,
            pressed && styles.userActionPressed,
          ]}
        >
          <Ban size={16} color={colors.error} />
          <Text style={[typography.caption, { color: colors.error }]}>Delete</Text>
        </Pressable>
      </View>
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h4,
    fontFamily: typography.fontFamilyDisplayBold,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    borderRadius: radius.base,
    overflow: 'hidden',
  },
  tabActive: {
    ...shadows.glow,
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabLabelActive: {
    color: colors.text,
  },
  tabLabel: {
    color: colors.textMuted,
  },

  // Content
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  listGap: {
    gap: spacing.md,
  },

  // Access denied
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  lockIconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  accessDeniedTitle: {
    color: colors.text,
    fontFamily: typography.fontFamilyDisplayBold,
  },
  accessDeniedText: {
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  accessDeniedBtn: {
    marginTop: spacing.md,
  },

  // Filter chips
  filterRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.secondaryLight,
  },

  // Generic card
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    gap: spacing.sm,
  },

  // Report card
  reportTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  targetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTargetBody: {
    flex: 1,
    gap: 2,
  },
  reportTargetLabel: {
    color: colors.text,
  },
  reportMeta: {
    color: colors.textMuted,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reportReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reportReason: {
    color: colors.text,
    flex: 1,
  },
  reportDescription: {
    color: colors.textSecondary,
  },
  reportStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reportTargetId: {
    color: colors.textMuted,
    fontFamily: typography.fontFamilyRegular,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.base,
  },
  approveBtn: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  rejectBtn: {
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  actionBtnPressed: {
    opacity: 0.75,
  },
  approveBtnText: {
    color: colors.success,
  },
  rejectBtnText: {
    color: colors.error,
  },
  resolvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resolvedText: {
    color: colors.textSecondary,
  },

  // Section summary
  sectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionSummaryText: {
    color: colors.textMuted,
  },

  // User card
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userBody: {
    flex: 1,
    gap: 4,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userName: {
    color: colors.text,
    flexShrink: 1,
  },
  selfTag: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  selfTagText: {
    color: colors.secondaryLight,
  },
  userEmail: {
    color: colors.textSecondary,
  },
  userBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  cardSuspended: {
    borderColor: 'rgba(239,68,68,0.4)',
    backgroundColor: 'rgba(239,68,68,0.04)',
  },
  userActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userActionPressed: {
    opacity: 0.6,
  },
  selfActionRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  selfActionText: {
    color: colors.textMuted,
  },

  // Announcements header
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  announcementHeaderText: {
    flex: 1,
    gap: 2,
  },
  announcementTitle: {
    color: colors.text,
  },
  announcementSub: {
    color: colors.textSecondary,
  },
  createBtn: {
    borderRadius: radius.base,
    overflow: 'hidden',
  },
  createBtnPressed: {
    opacity: 0.85,
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.base,
  },
  createBtnText: {
    color: colors.text,
  },

  // Announcement card
  cardInactive: {
    opacity: 0.7,
  },
  announcementCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  announcementIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(168,85,247,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementCardHeader: {
    flex: 1,
    gap: spacing.xs,
  },
  announcementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  announcementCardTitle: {
    color: colors.text,
    flex: 1,
  },
  announcementCardBody: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  announcementMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  announcementMetaText: {
    color: colors.textMuted,
  },
  announcementActionRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  announcementAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  // Announcement modal
  modalBody: {
    gap: spacing.md,
  },
  announcementBodyInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalFooterBtn: {
    flex: 1,
  },
});
