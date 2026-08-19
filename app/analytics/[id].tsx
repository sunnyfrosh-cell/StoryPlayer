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
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useVideos, useMonetization, useToast } from '@/contexts';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatCount, timeAgo } from '@/utils';
import { LoadingScreen, EmptyState } from '@/components';
import type {
  VideoAnalytics,
  Video,
  RetentionDataPoint,
  TrafficSourceData,
  DailyViewData,
} from '@/types';

/* ================================================================== *
 * Constants & helpers
 * ================================================================== */

const RETENTION_CHART_HEIGHT = 150;
const DAILY_CHART_HEIGHT = 130;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Formats total watch seconds as "Xh Ym". */
function formatWatchTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/** Formats average watch seconds as "Xm Ys". */
function formatAvgDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/** Returns a 3-letter weekday abbreviation from an ISO date string. */
function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(-2);
  return DAY_LABELS[d.getDay()];
}

/* ================================================================== *
 * Sub-components
 * ================================================================== */

interface MetricItem {
  key: string;
  label: string;
  value: number;
  Icon: LucideIcon;
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Icon size={18} color={colors.secondary} strokeWidth={2} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIconWrap}>
        <Icon size={20} color={colors.secondary} strokeWidth={2} />
      </View>
      <Text style={styles.metricValue}>{formatCount(value)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MetricsGrid({ items }: { items: MetricItem[] }) {
  const rows: MetricItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return (
    <View style={styles.metricsGrid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.metricRow}>
          {row.map((item) => (
            <MetricCard
              key={item.key}
              icon={item.Icon}
              label={item.label}
              value={item.value}
            />
          ))}
          {row.length === 1 ? <View style={styles.metricCardSpacer} /> : null}
        </View>
      ))}
    </View>
  );
}

function RetentionChart({ data }: { data: RetentionDataPoint[] }) {
  if (!data.length) {
    return <Text style={styles.chartEmpty}>No retention data available</Text>;
  }
  return (
    <View>
      <View style={styles.barChartRow}>
        {data.map((point, index) => {
          const height = Math.max(2, (point.retention / 100) * RETENTION_CHART_HEIGHT);
          return (
            <View key={index} style={styles.retentionBarWrap}>
              <LinearGradient
                colors={[colors.primaryLight, colors.primary]}
                style={[styles.retentionBar, { height }]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.chartAxisRow}>
        <Text style={styles.chartAxisLabel}>0%</Text>
        <Text style={styles.chartAxisLabel}>100% of video</Text>
      </View>
    </View>
  );
}

function TrafficSources({ data }: { data: TrafficSourceData[] }) {
  if (!data.length) {
    return <Text style={styles.chartEmpty}>No traffic source data</Text>;
  }
  const sorted = [...data].sort((a, b) => b.percentage - a.percentage);
  return (
    <View style={styles.trafficList}>
      {sorted.map((item, index) => (
        <View key={index} style={styles.trafficRow}>
          <View style={styles.trafficHeader}>
            <Text style={styles.trafficSource} numberOfLines={1}>
              {item.source}
            </Text>
            <Text style={styles.trafficPercent}>{item.percentage}%</Text>
          </View>
          <View style={styles.trafficTrack}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.trafficFill,
                { width: `${Math.min(item.percentage, 100)}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function DailyViewsChart({ data }: { data: DailyViewData[] }) {
  if (!data.length) {
    return <Text style={styles.chartEmpty}>No daily views data</Text>;
  }
  const maxViews = Math.max(...data.map((d) => d.views), 1);
  return (
    <View style={styles.dailyChartRow}>
      {data.map((item, index) => {
        const height = Math.max(4, (item.views / maxViews) * DAILY_CHART_HEIGHT);
        return (
          <View key={index} style={styles.dailyBarColumn}>
            <Text style={styles.dailyBarValue}>{formatCount(item.views)}</Text>
            <View style={styles.dailyBarTrack}>
              <LinearGradient
                colors={[colors.secondary, colors.secondaryDark]}
                style={[styles.dailyBar, { height }]}
              />
            </View>
            <Text style={styles.dailyBarLabel}>{formatDayLabel(item.date)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ================================================================== *
 * Main screen
 * ================================================================== */

export default function VideoAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getVideoById } = useVideos();
  const { getVideoAnalytics } = useMonetization();
  const toast = useToast();

  const [video, setVideo] = useState<Video | null>(null);
  const [analytics, setAnalytics] = useState<VideoAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (videoId: string, showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);
      try {
        const [videoResult, analyticsResult] = await Promise.all([
          getVideoById(videoId),
          getVideoAnalytics(videoId),
        ]);
        setVideo(videoResult ?? null);
        setAnalytics(analyticsResult);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load analytics';
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getVideoById, getVideoAnalytics, toast],
  );

  useEffect(() => {
    if (!id) return;
    loadData(id);
  }, [id, loadData]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setIsRefreshing(true);
    loadData(id, false);
  }, [id, loadData]);

  /* ---- Loading state ---- */
  if (isLoading) {
    return <LoadingScreen message="Loading analytics…" />;
  }

  /* ---- Error / no-data state ---- */
  if (!analytics) {
    const hasError = Boolean(error);
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundElevated]}
        style={styles.root}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={12}
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.headerTitle}>Video Analytics</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={BarChart3}
            title={hasError ? 'Something went wrong' : 'No analytics yet'}
            description={
              hasError
                ? error!
                : 'Analytics data for this video is not yet available.'
            }
            actionLabel={hasError ? 'Try again' : 'Go back'}
            onAction={
              hasError ? () => id && loadData(id) : () => router.back()
            }
          />
        </View>
      </LinearGradient>
    );
  }

  /* ---- Data ready ---- */
  const metricItems: MetricItem[] = [
    { key: 'views', label: 'Views', value: analytics.views, Icon: Eye },
    {
      key: 'uniqueViewers',
      label: 'Unique Viewers',
      value: analytics.uniqueViewers,
      Icon: TrendingUp,
    },
    { key: 'likes', label: 'Likes', value: analytics.likes, Icon: Heart },
    {
      key: 'comments',
      label: 'Comments',
      value: analytics.comments,
      Icon: MessageCircle,
    },
    { key: 'shares', label: 'Shares', value: analytics.shares, Icon: Share2 },
    { key: 'saves', label: 'Saves', value: analytics.saves, Icon: Bookmark },
  ];

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundElevated]}
      style={styles.root}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Video Analytics</Text>
        <View style={styles.headerIconWrap}>
          <BarChart3 size={20} color={colors.secondary} strokeWidth={2} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
      >
        {/* Video preview */}
        <View style={styles.previewCard}>
          <LinearGradient
            colors={[colors.primaryDark, colors.backgroundElevated]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.thumbnail}
          >
            <View style={styles.thumbnailTopRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {video?.category ?? 'Video'}
                </Text>
              </View>
              {video?.isTrending ? (
                <View style={styles.trendingBadge}>
                  <TrendingUp size={11} color={colors.text} strokeWidth={2.5} />
                  <Text style={styles.trendingBadgeText}>Trending</Text>
                </View>
              ) : null}
            </View>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.thumbnailOverlay}
            >
              <Text style={styles.previewTitle} numberOfLines={2}>
                {video?.title ?? 'Untitled Video'}
              </Text>
              {video ? (
                <Text style={styles.previewMeta} numberOfLines={1}>
                  {video.creatorName} · {timeAgo(video.releasedAt)}
                </Text>
              ) : null}
            </LinearGradient>
          </LinearGradient>
        </View>

        {/* Overview metrics */}
        <View style={styles.card}>
          <SectionTitle icon={Eye} title="Overview" />
          <MetricsGrid items={metricItems} />
        </View>

        {/* Watch time */}
        <View style={styles.card}>
          <SectionTitle icon={Clock} title="Watch Time" />
          <View style={styles.watchTimeRow}>
            <View style={styles.watchTimeBlock}>
              <Text style={styles.watchTimeLabel}>Total Watch Time</Text>
              <Text style={styles.watchTimeValue}>
                {formatWatchTime(analytics.watchTimeSeconds)}
              </Text>
            </View>
            <View style={styles.watchTimeDivider} />
            <View style={styles.watchTimeBlock}>
              <Text style={styles.watchTimeLabel}>Avg. Watch Duration</Text>
              <Text style={styles.watchTimeValue}>
                {formatAvgDuration(analytics.averageWatchDurationSeconds)}
              </Text>
            </View>
          </View>
        </View>

        {/* Audience retention */}
        <View style={styles.card}>
          <SectionTitle icon={TrendingUp} title="Audience Retention" />
          <Text style={styles.chartCaption}>
            How viewership holds over the video duration
          </Text>
          <RetentionChart data={analytics.audienceRetention} />
        </View>

        {/* Traffic sources */}
        <View style={styles.card}>
          <SectionTitle icon={PieChart} title="Traffic Sources" />
          <TrafficSources data={analytics.trafficSources} />
        </View>

        {/* Daily views */}
        <View style={styles.card}>
          <SectionTitle icon={BarChart3} title="Daily Views" />
          <Text style={styles.chartCaption}>Views over the last 7 days</Text>
          <DailyViewsChart data={analytics.dailyViews} />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

/* ================================================================== *
 * Styles
 * ================================================================== */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  /* Scroll */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.md,
  },
  emptyWrap: {
    flex: 1,
  },

  /* Video preview */
  previewCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  thumbnail: {
    aspectRatio: 16 / 9,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  thumbnailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  categoryBadgeText: {
    ...typography.overline,
    color: colors.text,
    textTransform: 'uppercase',
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  trendingBadgeText: {
    ...typography.overline,
    color: colors.text,
  },
  thumbnailOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  previewTitle: {
    ...typography.h4,
    color: colors.text,
  },
  previewMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* Generic card */
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md,
    ...shadows.sm,
  },

  /* Section title */
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  chartCaption: {
    ...typography.caption,
    color: colors.textMuted,
  },

  /* Metrics grid */
  metricsGrid: {
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.base,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricCardSpacer: {
    flex: 1,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    ...typography.h3,
    color: colors.text,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  /* Watch time */
  watchTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  watchTimeBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  watchTimeDivider: {
    width: StyleSheet.hairlineWidth,
    height: 44,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  watchTimeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  watchTimeValue: {
    ...typography.h3,
    color: colors.text,
  },

  /* Retention chart */
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: RETENTION_CHART_HEIGHT,
    gap: 3,
  },
  retentionBarWrap: {
    flex: 1,
  },
  retentionBar: {
    width: '100%',
    borderRadius: 3,
  },
  chartAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  chartAxisLabel: {
    ...typography.overline,
    color: colors.textMuted,
  },

  /* Traffic sources */
  trafficList: {
    gap: spacing.md,
  },
  trafficRow: {
    gap: spacing.xs,
  },
  trafficHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trafficSource: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
  },
  trafficPercent: {
    ...typography.label,
    color: colors.secondary,
  },
  trafficTrack: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  trafficFill: {
    height: '100%',
    borderRadius: radius.full,
  },

  /* Daily views chart */
  dailyChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dailyBarColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  dailyBarValue: {
    ...typography.overline,
    color: colors.textSecondary,
  },
  dailyBarTrack: {
    width: '70%',
    height: DAILY_CHART_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dailyBar: {
    width: '100%',
    borderRadius: radius.sm,
  },
  dailyBarLabel: {
    ...typography.overline,
    color: colors.textMuted,
  },

  /* Chart empty state text */
  chartEmpty: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
