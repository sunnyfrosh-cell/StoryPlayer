import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BarChart3,
  Video as VideoIcon,
  Eye,
  Heart,
  Users,
  UserPlus,
  TrendingUp,
  Clock,
  DollarSign,
  ArrowLeft,
  Upload,
  ChevronRight,
  MessageCircle,
  ArrowUpRight,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { CreatorStudioSummary, Video, GrowthDataPoint } from '@/types';
import { useAuth, useMonetization, useToast } from '@/contexts';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatCount, timeAgo } from '@/utils';
import { LoadingScreen, EmptyState } from '@/components';

/** Formats total watch-time minutes as "Xh Ym". */
function formatWatchTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Formats a USD amount as "$X.XX". */
function formatEarnings(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Icon size={18} color={colors.secondary} strokeWidth={2} />
      </View>
      <Text style={[typography.h3, styles.statValue]}>{value}</Text>
      <Text style={[typography.caption, styles.statLabel]}>{label}</Text>
    </View>
  );
}

interface GrowthChartProps {
  title: string;
  data: GrowthDataPoint[];
}

function GrowthChart({ title, data }: GrowthChartProps) {
  const maxViews = Math.max(...data.map((d) => d.views), 1);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <BarChart3 size={18} color={colors.secondary} />
        <Text style={[typography.h4, styles.chartTitle]}>{title}</Text>
      </View>
      {data.length > 0 ? (
        <View style={styles.chartBars}>
          {data.map((point) => {
            const heightPct = (point.views / maxViews) * 100;
            return (
              <View key={point.label} style={styles.barColumn}>
                <Text style={[typography.overline, styles.barValue]}>
                  {formatCount(point.views)}
                </Text>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={[styles.barFill, { height: `${Math.max(heightPct, 6)}%` }]}
                  />
                </View>
                <Text style={[typography.caption, styles.barLabel]}>{point.label}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[typography.caption, styles.emptyText]}>No growth data yet.</Text>
      )}
    </View>
  );
}

interface MostViewedRowProps {
  video: Video;
  rank: number;
}

function MostViewedRow({ video, rank }: MostViewedRowProps) {
  return (
    <Pressable
      style={styles.mostViewedRow}
      onPress={() => router.push(`/watch/${video.id}`)}
    >
      <Text style={[typography.h3, styles.rank]}>{rank}</Text>
      <View style={styles.thumbPlaceholder}>
        <LinearGradient
          colors={[colors.cardElevated, colors.surface]}
          style={styles.thumbGradient}
        >
          <VideoIcon size={20} color={colors.textMuted} strokeWidth={2} />
        </LinearGradient>
      </View>
      <View style={styles.mostViewedInfo}>
        <Text style={[typography.label, styles.mostViewedTitle]} numberOfLines={2}>
          {video.title}
        </Text>
        <Text style={[typography.caption, styles.mostViewedMeta]}>
          {formatCount(video.viewsCount)} views
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

interface RecentUploadCardProps {
  video: Video;
}

function RecentUploadCard({ video }: RecentUploadCardProps) {
  return (
    <Pressable
      style={styles.recentCard}
      onPress={() => router.push(`/watch/${video.id}`)}
    >
      <View style={styles.recentThumb}>
        <LinearGradient
          colors={[colors.cardElevated, colors.surface]}
          style={styles.recentThumbGradient}
        >
          <VideoIcon size={22} color={colors.textMuted} strokeWidth={2} />
        </LinearGradient>
        <View style={styles.recentThumbOverlay}>
          <Text style={[typography.overline, styles.recentDuration]}>
            {Math.floor(video.durationSeconds / 60)}m
          </Text>
        </View>
      </View>
      <Text style={[typography.caption, styles.recentTitle]} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={[typography.caption, styles.recentMeta]}>
        {formatCount(video.viewsCount)} views · {timeAgo(video.createdAt)}
      </Text>
    </Pressable>
  );
}

export default function CreatorStudioScreen() {
  const { firebaseUser } = useAuth();
  const { getCreatorStudioSummary } = useMonetization();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState<CreatorStudioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const data = await getCreatorStudioSummary(firebaseUser.uid);
      setSummary(data);
    } catch {
      toast.error('Could not load your studio data.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [firebaseUser, getCreatorStudioSummary, toast]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSummary();
  }, [loadSummary]);

  const handleWithdraw = useCallback(() => {
    router.push('/wallet');
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Loading your studio..." />;
  }

  if (!summary) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No studio data yet"
        description="Upload your first video to unlock your Creator Studio analytics."
        actionLabel="Upload Video"
        onAction={() => router.push('/upload')}
      />
    );
  }

  const statCards: StatCardProps[] = [
    { label: 'Total Uploads', value: formatCount(summary.totalUploads), icon: VideoIcon },
    { label: 'Total Views', value: formatCount(summary.totalViews), icon: Eye },
    { label: 'Watch Time', value: formatWatchTime(summary.totalWatchTimeMinutes), icon: Clock },
    { label: 'Subscribers', value: formatCount(summary.subscribers), icon: UserPlus },
    { label: 'Followers', value: formatCount(summary.followers), icon: Users },
    { label: 'Likes Received', value: formatCount(summary.likesReceived), icon: Heart },
    { label: 'Comments Received', value: formatCount(summary.commentsReceived), icon: MessageCircle },
  ];

  const mostViewed = summary.mostViewedVideos.slice(0, 5);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleRow}>
          <BarChart3 size={20} color={colors.secondary} />
          <Text style={[typography.h2, styles.headerTitle]}>Creator Studio</Text>
        </View>
        <Pressable
          onPress={() => router.push('/upload')}
          hitSlop={12}
          style={styles.uploadBtn}
        >
          <Upload size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.secondary}
          />
        }
      >
        {/* Earnings Card */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.earningsCard}
        >
          <View style={styles.earningsTopRow}>
            <View style={styles.earningsIconWrap}>
              <DollarSign size={22} color={colors.text} strokeWidth={2.5} />
            </View>
            <View style={styles.earningsLabelWrap}>
              <Text style={[typography.overline, styles.earningsLabel]}>
                ESTIMATED EARNINGS
              </Text>
              <Text style={[typography.h2, styles.earningsValue]}>
                {formatEarnings(summary.estimatedEarningsUsd)}
              </Text>
            </View>
          </View>
          <Pressable style={styles.withdrawBtn} onPress={handleWithdraw}>
            <Text style={[typography.label, styles.withdrawText]}>Withdraw</Text>
            <ArrowUpRight size={16} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </View>

        {/* Weekly Growth */}
        <GrowthChart title="Weekly Growth" data={summary.weeklyGrowth} />

        {/* Monthly Growth */}
        <GrowthChart title="Monthly Growth" data={summary.monthlyGrowth} />

        {/* Most Viewed Videos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={colors.secondary} />
            <Text style={[typography.h4, styles.sectionTitle]}>Most Viewed Videos</Text>
          </View>
          {mostViewed.length > 0 ? (
            <View style={styles.mostViewedList}>
              {mostViewed.map((video, i) => (
                <MostViewedRow key={video.id} video={video} rank={i + 1} />
              ))}
            </View>
          ) : (
            <Text style={[typography.caption, styles.emptyText]}>No videos yet.</Text>
          )}
        </View>

        {/* Recent Uploads */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <VideoIcon size={18} color={colors.secondary} />
            <Text style={[typography.h4, styles.sectionTitle]}>Recent Uploads</Text>
          </View>
          {summary.recentUploads.length > 0 ? (
            <FlatList
              data={summary.recentUploads}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railContent}
              ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
              renderItem={({ item }) => <RecentUploadCard video={item} />}
            />
          ) : (
            <Text style={[typography.caption, styles.emptyText]}>No uploads yet.</Text>
          )}
        </View>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

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
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.text,
  },
  uploadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },

  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
  },

  // Earnings Card
  earningsCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  earningsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  earningsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.base,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsLabelWrap: {
    flex: 1,
    gap: 2,
  },
  earningsLabel: {
    color: 'rgba(255,255,255,0.85)',
  },
  earningsValue: {
    color: colors.text,
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
  withdrawText: {
    color: colors.primary,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.xs,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(168,85,247,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: colors.text,
  },
  statLabel: {
    color: colors.textSecondary,
  },

  // Growth Charts
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chartTitle: {
    color: colors.text,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  barValue: {
    color: colors.textMuted,
  },
  barTrack: {
    width: 24,
    height: 110,
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radius.sm,
  },
  barLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
  },

  // Most Viewed
  mostViewedList: {
    gap: spacing.sm,
  },
  mostViewedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rank: {
    color: colors.secondary,
    width: 24,
    textAlign: 'center',
  },
  thumbPlaceholder: {
    width: 64,
    height: 40,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  thumbGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mostViewedInfo: {
    flex: 1,
    gap: 2,
  },
  mostViewedTitle: {
    color: colors.text,
  },
  mostViewedMeta: {
    color: colors.textMuted,
  },

  // Recent Uploads
  railContent: {
    paddingHorizontal: 0,
  },
  recentCard: {
    width: 180,
    gap: spacing.xs,
  },
  recentThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    backgroundColor: colors.cardElevated,
    overflow: 'hidden',
  },
  recentThumbGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentThumbOverlay: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(11,11,15,0.7)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recentDuration: {
    color: colors.text,
  },
  recentTitle: {
    color: colors.text,
  },
  recentMeta: {
    color: colors.textMuted,
  },

  emptyText: {
    color: colors.textMuted,
    paddingHorizontal: spacing.base,
  },
});
