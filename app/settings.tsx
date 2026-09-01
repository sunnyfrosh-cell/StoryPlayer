import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SharingShare from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Bell,
  Lock,
  Globe,
  Download,
  Play,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Moon,
  Trash2,
  UserX,
  Info,
  Megaphone,
  Eye,
  Heart,
  MessageCircle,
  UserPlus,
  BarChart3,
  Wallet,
  Crown,
  DollarSign,
  Video as VideoIcon,
  Zap,
  Shield,
  Users,
  Copyright,
  Mail,
  Bug,
  Star,
  Share2,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react-native';
import { colors, spacing, radius, typography } from '@/theme';
import { useAuth, useUser, useToast, useVideos } from '@/contexts';
import { Avatar, Badge, Modal, CustomButton } from '@/components';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

type BooleanSetter = (update: (prev: boolean) => boolean) => void;

interface SettingRow {
  label: string;
  icon: LucideIcon;
  type: 'toggle' | 'link';
  /** Accent color for the icon circle. Defaults to secondary purple. */
  accent?: string;
  /** Toggle value (for `toggle` rows). */
  value?: boolean;
  /** Toggle handler (for `toggle` rows). */
  onToggle?: () => void;
  /** Right-side value text (for `link` rows). */
  valueText?: string;
  /** Press handler (for `link` rows). */
  onPress?: () => void;
  /** Renders the label in error red and hides the chevron (e.g. Log out). */
  danger?: boolean;
}

export default function SettingsScreen() {
  const { firebaseUser, logout } = useAuth();
  const { profile } = useUser();
  const toast = useToast();
  const { blockedUsers, unblockUser } = useVideos();
  const insets = useSafeAreaInsets();

  // Account & Privacy
  const [privateAccount, setPrivateAccount] = useState(false);
  const [showWatchHistory, setShowWatchHistory] = useState(true);
  const [showLikedVideos, setShowLikedVideos] = useState(true);
  const [showSubscriptions, setShowSubscriptions] = useState(true);

  // Notifications
  const [notifyNewVideos, setNotifyNewVideos] = useState(true);
  const [notifyNewFollowers, setNotifyNewFollowers] = useState(true);
  const [notifyNewSubscribers, setNotifyNewSubscribers] = useState(true);
  const [notifyLikes, setNotifyLikes] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifySystem, setNotifySystem] = useState(true);

  // Monetization
  const [dataSaver, setDataSaver] = useState(false);

  // Blocked users modal
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  // Content preferences are edited on dedicated navigation screens.
  const [language, setLanguage] = useState('English');
  const [theme, setTheme] = useState('Dark');
  const [downloadQuality, setDownloadQuality] = useState('Auto');
  const [playbackSpeed, setPlaybackSpeed] = useState('1x');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const preferenceKeys = [
        'storyverse.preference.language',
        'storyverse.preference.theme',
        'storyverse.preference.downloadQuality',
        'storyverse.preference.playbackSpeed',
      ];

      Promise.all(preferenceKeys.map((key) => AsyncStorage.getItem(key)))
        .then(([languagePreference, themePreference, downloadQualityPreference, playbackSpeedPreference]) => {
          if (!active) return;

          if (languagePreference != null && languagePreference !== '') {
            setLanguage(languagePreference);
          }
          if (themePreference != null && themePreference !== '') {
            setTheme(themePreference);
          }
          if (downloadQualityPreference != null && downloadQualityPreference !== '') {
            setDownloadQuality(downloadQualityPreference);
          }
          if (playbackSpeedPreference != null && playbackSpeedPreference !== '') {
            setPlaybackSpeed(playbackSpeedPreference);
          }
        })
        .catch((error) => {
          if (active) {
            console.error('[Settings] Failed to load preferences:', error);
            toast.error('Could not load saved preferences');
          }
        });

      return () => { active = false; };
    }, [toast]),
  );

  const openPreference = useCallback((preference: string, value: string) => {
    router.push({
      pathname: '/settings-preference',
      params: { preference, value },
    });
  }, []);

  const toggleWithToast = useCallback(
    (setter: BooleanSetter) => () => {
      setter((prev) => !prev);
      toast.success('Setting updated');
    },
    [toast],
  );

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear cache',
      'This will remove cached images and temporary files. Your downloads and account data will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => toast.success('Cache cleared') },
      ],
    );
  }, [toast]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out of StoryVerse?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/splash');
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : 'Could not sign out. Try again.',
              );
            }
          },
        },
      ],
    );
  }, [logout, toast]);

  const handleUnblock = useCallback(
    async (id: string) => {
      try {
        await unblockUser(id);
        toast.success('User unblocked');
      } catch {
        toast.error('Could not unblock user');
      }
    },
    [unblockUser, toast],
  );

  const privacyRows: SettingRow[] = [
    {
      label: 'Private account',
      icon: Lock,
      type: 'toggle',
      accent: colors.primary,
      value: privateAccount,
      onToggle: toggleWithToast(setPrivateAccount),
    },
    {
      label: 'Show watch history',
      icon: Eye,
      type: 'toggle',
      value: showWatchHistory,
      onToggle: toggleWithToast(setShowWatchHistory),
    },
    {
      label: 'Show liked videos',
      icon: Heart,
      type: 'toggle',
      value: showLikedVideos,
      onToggle: toggleWithToast(setShowLikedVideos),
    },
    {
      label: 'Show subscriptions',
      icon: UserPlus,
      type: 'toggle',
      value: showSubscriptions,
      onToggle: toggleWithToast(setShowSubscriptions),
    },
    {
      label: 'Blocked users',
      icon: UserX,
      type: 'link',
      accent: colors.error,
      valueText: `${blockedUsers.length}`,
      onPress: () => setShowBlockedModal(true),
    },
  ];

  const contentRows: SettingRow[] = [
    {
      label: 'Language',
      icon: Globe,
      type: 'link',
      valueText: language,
      onPress: () => openPreference('language', language),
    },
    {
      label: 'Theme',
      icon: Moon,
      type: 'link',
      valueText: theme,
      onPress: () => openPreference('theme', theme),
    },
    {
      label: 'Download quality',
      icon: Download,
      type: 'link',
      valueText: downloadQuality,
      onPress: () => openPreference('downloadQuality', downloadQuality),
    },
    {
      label: 'Video playback',
      icon: Play,
      type: 'link',
      valueText: `Default speed: ${playbackSpeed}`,
      onPress: () => openPreference('playbackSpeed', playbackSpeed),
    },
  ];

  const creatorRows: SettingRow[] = profile?.isCreator
    ? [
        {
          label: 'Creator Studio',
          icon: BarChart3,
          type: 'link',
          accent: colors.primary,
          onPress: () => router.push('/studio'),
        },
        {
          label: 'Content Manager',
          icon: VideoIcon,
          type: 'link',
          accent: colors.primary,
          onPress: () => router.push('/content-manager'),
        },
        {
          label: 'Video Analytics',
          icon: BarChart3,
          type: 'link',
          accent: colors.primary,
          onPress: () => router.push('/dashboard'),
        },
        {
          label: 'Creator Wallet',
          icon: Wallet,
          type: 'link',
          accent: colors.primary,
          onPress: () => router.push('/wallet'),
        },
      ]
    : [];

  const monetizationRows: SettingRow[] = [
    {
      label: 'Premium Membership',
      icon: Crown,
      type: 'link',
      accent: colors.secondary,
      onPress: () => router.push('/premium'),
    },
    {
      label: 'Tip a Creator',
      icon: DollarSign,
      type: 'link',
      accent: colors.success,
      onPress: () => router.push('/donations'),
    },
    {
      label: 'Data Saver',
      icon: Zap,
      type: 'toggle',
      value: dataSaver,
      onToggle: toggleWithToast(setDataSaver),
    },
    {
      label: 'Download Quality',
      icon: Download,
      type: 'link',
      valueText: downloadQuality,
      onPress: () => openPreference('downloadQuality', downloadQuality),
    },
  ];

  const notificationRows: SettingRow[] = [
    {
      label: 'New videos',
      icon: Play,
      type: 'toggle',
      value: notifyNewVideos,
      onToggle: toggleWithToast(setNotifyNewVideos),
    },
    {
      label: 'New followers',
      icon: UserPlus,
      type: 'toggle',
      value: notifyNewFollowers,
      onToggle: toggleWithToast(setNotifyNewFollowers),
    },
    {
      label: 'New subscribers',
      icon: Bell,
      type: 'toggle',
      value: notifyNewSubscribers,
      onToggle: toggleWithToast(setNotifyNewSubscribers),
    },
    {
      label: 'Likes',
      icon: Heart,
      type: 'toggle',
      value: notifyLikes,
      onToggle: toggleWithToast(setNotifyLikes),
    },
    {
      label: 'Comments',
      icon: MessageCircle,
      type: 'toggle',
      value: notifyComments,
      onToggle: toggleWithToast(setNotifyComments),
    },
    {
      label: 'Replies',
      icon: MessageCircle,
      type: 'toggle',
      value: notifyReplies,
      onToggle: toggleWithToast(setNotifyReplies),
    },
    {
      label: 'System announcements',
      icon: Megaphone,
      type: 'toggle',
      value: notifySystem,
      onToggle: toggleWithToast(setNotifySystem),
    },
  ];

  const storageRows: SettingRow[] = [
    {
      label: 'Storage usage',
      icon: Download,
      type: 'link',
      valueText: '124 MB',
      onPress: () =>
        Alert.alert(
          'Storage usage',
          'StoryVerse is using 124 MB on your device.\n\n- Cached images: 89 MB\n- Offline downloads: 25 MB\n- Temporary files: 10 MB\n\nUse “Clear cache” to free up space.',
          [{ text: 'OK' }],
        ),
    },
    {
      label: 'Clear cache',
      icon: Trash2,
      type: 'link',
      accent: colors.warning,
      onPress: handleClearCache,
    },
  ];

  const handleRateApp = useCallback(() => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/app/storyverse/id000000000',
      android: 'https://play.google.com/store/apps/details?id=com.storyverse.app',
      default: 'https://storyverse.app',
    });
    Linking.openURL(url).catch(() => toast.error('Could not open app store'));
  }, [toast]);

  const handleShareApp = useCallback(async () => {
    try {
      await SharingShare.shareAsync('https://storyverse.app', {
        dialogTitle: 'Check out StoryVerse!',
        mimeType: 'text/plain',
      });
    } catch {
      toast.info('Share link copied to clipboard');
    }
  }, [toast]);

  const aboutRows: SettingRow[] = [
    {
      label: 'About StoryVerse',
      icon: Info,
      type: 'link',
      onPress: () => router.push('/help'),
    },
    {
      label: 'Help Center',
      icon: HelpCircle,
      type: 'link',
      onPress: () => router.push('/help'),
    },
    {
      label: 'FAQ',
      icon: HelpCircle,
      type: 'link',
      onPress: () => router.push('/faq'),
    },
    {
      label: 'Send Feedback',
      icon: MessageSquare,
      type: 'link',
      onPress: () => router.push('/contact-support'),
    },
    {
      label: 'Report a Bug',
      icon: Bug,
      type: 'link',
      accent: colors.warning,
      onPress: () => router.push('/report-bug'),
    },
    {
      label: 'Contact Support',
      icon: Mail,
      type: 'link',
      onPress: () => router.push('/contact-support'),
    },
    {
      label: 'Rate StoryVerse',
      icon: Star,
      type: 'link',
      accent: colors.warning,
      onPress: handleRateApp,
    },
    {
      label: 'Share App',
      icon: Share2,
      type: 'link',
      onPress: handleShareApp,
    },
    {
      label: 'Terms of Service',
      icon: FileText,
      type: 'link',
      onPress: () => router.push('/legal?section=terms'),
    },
    {
      label: 'Privacy Policy',
      icon: Shield,
      type: 'link',
      onPress: () => router.push('/legal?section=privacy'),
    },
    {
      label: 'Community Guidelines',
      icon: Users,
      type: 'link',
      onPress: () => router.push('/legal?section=guidelines'),
    },
    {
      label: 'Copyright Info',
      icon: Copyright,
      type: 'link',
      onPress: () => router.push('/legal?section=copyright'),
    },
  ];

  const sessionRows: SettingRow[] = [
    {
      label: 'Delete account',
      icon: Trash2,
      type: 'link',
      accent: colors.error,
      danger: true,
      onPress: () =>
        Alert.alert(
          'Delete account',
          'This will permanently delete your account and all associated data. This action cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => toast.info('Account deletion requires verification. Contact support to proceed.'),
            },
          ],
        ),
    },
    {
      label: 'Log out',
      icon: LogOut,
      type: 'link',
      accent: colors.error,
      danger: true,
      onPress: handleLogout,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[typography.h3, styles.headerTitle]}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Profile summary */}
        <View style={styles.profileCard}>
          <Avatar uri={profile?.avatarUrl ?? null} size={56} ring />
          <View style={styles.profileBody}>
            <Text style={[typography.h4, styles.profileName]}>
              {profile?.displayName ?? 'StoryVerse member'}
            </Text>
            <Text style={[typography.caption, styles.profileEmail]}>
              {profile?.email ?? firebaseUser?.email ?? ''}
            </Text>
          </View>
          <Badge
            label={profile?.isCreator ? 'Creator' : 'Member'}
            variant={profile?.isCreator ? 'primary' : 'soft'}
          />
        </View>

        <Section title="Account & Privacy" rows={privacyRows} />
        <Section title="Content Preferences" rows={contentRows} />
        {profile?.isCreator ? <Section title="Creator" rows={creatorRows} /> : null}
        <Section title="Monetization" rows={monetizationRows} />
        <Section title="Notifications" rows={notificationRows} />
        <Section title="Storage & Data" rows={storageRows} />
        <Section title="About" rows={aboutRows} />
        <Section title="Session" rows={sessionRows} />

        <Text style={[typography.caption, styles.versionText]}>
          StoryVerse v1.0.0
        </Text>
      </ScrollView>

      {/* Blocked users modal */}
      <Modal
        visible={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        title="Blocked users"
      >
        {blockedUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <UserX size={40} color={colors.textMuted} />
            <Text style={[typography.h4, styles.emptyTitle]}>No blocked users</Text>
            <Text style={[typography.caption, styles.emptyText]}>
              People you block will appear here. They won&apos;t be able to find your
              profile or content.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.blockedList}
            contentContainerStyle={styles.blockedListContent}
            showsVerticalScrollIndicator={false}
          >
            {blockedUsers.map((user) => (
              <View key={user.id} style={styles.blockedRow}>
                <Avatar uri={user.blockedAvatarUrl} size={40} />
                <Text style={[typography.body, styles.blockedName]} numberOfLines={1}>
                  {user.blockedName}
                </Text>
                <CustomButton
                  title="Unblock"
                  variant="outline"
                  size="sm"
                  onPress={() => handleUnblock(user.id)}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </Modal>

    </View>
  );
}

interface SectionProps {
  title: string;
  rows: SettingRow[];
}

function Section({ title, rows }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={[typography.overline, styles.sectionTitle]}>{title.toUpperCase()}</Text>
      <View style={styles.sectionCard}>
        {rows.map((row, index) => (
          <RowItem key={row.label} row={row} isLast={index === rows.length - 1} />
        ))}
      </View>
    </View>
  );
}

interface RowItemProps {
  row: SettingRow;
  isLast: boolean;
}

function RowItem({ row, isLast }: RowItemProps) {
  const Icon = row.icon;
  const accent = row.accent ?? colors.secondary;

  return (
    <Pressable
      onPress={row.type === 'link' ? row.onPress : undefined}
      disabled={row.type !== 'link'}
      style={[styles.row, !isLast && styles.rowBorder]}
    >
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.rowIcon,
            { backgroundColor: row.accent ? `${row.accent}22` : 'rgba(168,85,247,0.16)' },
          ]}
        >
          <Icon size={18} color={accent} strokeWidth={2} />
        </View>
        <View style={styles.rowBody}>
          <Text
            style={[typography.body, styles.rowLabel, row.danger && styles.dangerLabel]}
            numberOfLines={1}
          >
            {row.label}
          </Text>
        </View>
      </View>

      {row.type === 'toggle' ? (
        <Switch
          value={row.value}
          onValueChange={row.onToggle}
          trackColor={{ false: colors.surface, true: colors.primary }}
          thumbColor={colors.text}
        />
      ) : (
        <View style={styles.rowRight}>
          {row.valueText ? (
            <Text style={[typography.caption, styles.rowValue]}>{row.valueText}</Text>
          ) : null}
          {row.danger ? null : <ChevronRight size={18} color={colors.textMuted} />}
        </View>
      )}
    </Pressable>
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
    paddingTop: 0,
    paddingBottom: spacing.md,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    color: colors.text,
    fontFamily: 'Sora-Bold',
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    padding: spacing.base,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
  },
  profileBody: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: colors.text,
  },
  profileEmail: {
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: colors.text,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowValue: {
    color: colors.textSecondary,
  },
  dangerLabel: {
    color: colors.error,
  },
  versionText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  // Blocked users modal
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  blockedList: {
    marginTop: spacing.xs,
    maxHeight: 420,
  },
  blockedListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
  },
  blockedName: {
    flex: 1,
    color: colors.text,
  },
});
