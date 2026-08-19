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
  MessageCircle,
  Upload,
  ArrowLeft,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { CreatorAnalytics, Video, Comment } from '@/types';
import { useVideos, useAuth, useToast } from '@/contexts';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatCount, timeAgo } from '@/utils';
import { LoadingScreen, EmptyState } from '@/components';

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
  data: { label: string; views: number; subscribers: number }[];
}

function GrowthChart({ data }: GrowthChartProps) {
  const maxViews = Math.max(...data.map((d) => d.views), 1);
  return (
    <View style={styles.chartContainer}>
      <Text style={[typography.h4, styles.chartTitle]}>Growth Overview</Text>
      <View style={styles.chartBars}>
        {data.map((point, i) => {
          const heightPct = (point.views / maxViews) * 100;
          return (
            <View key={point.label} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={[styles.barFill, { height: `${Math.max(heightPct, 8)}%` }]}
                />
              </View>
              <Text style={[typography.caption, styles.barLabel]}>{point.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface PopularVideoRowProps {
  video: Video;
  rank: number;
}

function PopularVideoRow({ video, rank }: PopularVideoRowProps) {
  return (
    <Pressable style={styles.popularRow} onPress={() => router.push(`/watch/${video.id}`)}>
      <Text style={[typography.h4, styles.rank]}>{rank}</Text>
      <View style={styles.popularInfo}>
        <Text style={[typography.label, styles.popularTitle]} numberOfLines={2}>
          {video.title}
        </Text>
        <Text style={[typography.caption, styles.popularMeta]}>
          {formatCount(video.viewsCount)} views · {formatCount(video.likesCount)} likes
        </Text>
      </View>
    </Pressable>
  );
}

export default function CreatorDashboardScreen() {
  const { firebaseUser } = useAuth();
  const { getCreatorAnalytics } = useVideos();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const data = await getCreatorAnalytics(firebaseUser.uid);
      setAnalytics(data);
    } catch {
      toast.error('Could not load dashboard data.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [firebaseUser, getCreatorAnalytics, toast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnalytics();
  }, [loadAnalytics]);

  if (isLoading) return <LoadingScreen message="Loading your dashboard..." />;
  if (!analytics) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No data yet"
        description="Upload your first video to see analytics here."
        actionLabel="Upload Video"
        onAction={() => router.push('/upload')}
      />
    );
  }

  const statCards: StatCardProps[] = [
    { label: 'Total Videos', value: formatCount(analytics.totalVideos), icon: VideoIcon },
    { label: 'Total Views', value: formatCount(analytics.totalViews), icon: Eye },
    { label: 'Followers', value: formatCount(analytics.followersCount), icon: Users },
    { label: 'Subscribers', value: formatCount(analytics.subscribersCount), icon: UserPlus },
    { label: 'Likes Received', value: formatCount(analytics.totalLikes), icon: Heart },
    { label: 'Comments', value: formatCount(analytics.totalComments), icon: MessageCircle },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleRow}>
          <BarChart3 size={20} color={colors.secondary} />
          <Text style={[typography.h2, styles.headerTitle]}>Creator Dashboard</Text>
        </View>
        <Pressable onPress={() => router.push('/upload')} hitSlop={12} style={styles.uploadBtn}>
          <Upload size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.secondary} />}
      >
        <View style={styles.statsGrid}>
          {statCards.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </View>

        {analytics.growthData.length > 0 ? (
          <GrowthChart data={analytics.growthData} />
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={colors.secondary} />
            <Text style={[typography.h4, styles.sectionTitle]}>Most Popular Videos</Text>
          </View>
          {analytics.popularVideos.length > 0 ? (
            <View style={styles.popularList}>
              {analytics.popularVideos.map((video, i) => (
                <PopularVideoRow key={video.id} video={video} rank={i + 1} />
              ))}
            </View>
          ) : (
            <Text style={[typography.caption, styles.emptyText]}>No videos yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <VideoIcon size={18} color={colors.secondary} />
            <Text style={[typography.h4, styles.sectionTitle]}>Recent Uploads</Text>
          </View>
          {analytics.recentUploads.length > 0 ? (
            <FlatList
              data={analytics.recentUploads}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railContent}
              ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
              renderItem={({ item }) => (
                <Pressable style={styles.recentCard} onPress={() => router.push(`/watch/${item.id}`)}>
                  <View style={styles.recentThumb}>
                    <View style={styles.recentThumbOverlay}>
                      <Text style={[typography.overline, styles.recentDuration]}>
                        {Math.floor(item.durationSeconds / 60)}m
                      </Text>
                    </View>
                  </View>
                  <Text style={[typography.caption, styles.recentTitle]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[typography.caption, styles.recentMeta]}>
                    {formatCount(item.viewsCount)} views · {timeAgo(item.createdAt)}
                  </Text>
                </Pressable>
              )}
            />
          ) : (
            <Text style={[typography.caption, styles.emptyText]}>No uploads yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MessageCircle size={18} color={colors.secondary} />
            <Text style={[typography.h4, styles.sectionTitle]}>Latest Comments</Text>
          </View>
          {analytics.recentComments.length > 0 ? (
            <View style={styles.commentList}>
              {analytics.recentComments.map((comment: Comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={[typography.label, styles.commentAuthor]}>
                    {comment.authorName}
                  </Text>
                  <Text style={[typography.bodySmall, styles.commentBody]} numberOfLines={3}>
                    {comment.body}
                  </Text>
                  <Text style={[typography.caption, styles.commentMeta]}>
                    {timeAgo(comment.createdAt)} · {formatCount(comment.likesCount)} likes
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[typography.caption, styles.emptyText]}>No comments yet.</Text>
          )}
        </View>

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { color: colors.text },
  uploadBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.glow,
  },
  content: { paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'] },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.base, gap: spacing.xs,
  },
  statIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: 'rgba(168,85,247,0.16)', alignItems: 'center', justifyContent: 'center',
  },
  statValue: { color: colors.text },
  statLabel: { color: colors.textSecondary },
  chartContainer: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.base,
    marginBottom: spacing.lg,
  },
  chartTitle: { color: colors.text, marginBottom: spacing.md },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140 },
  barColumn: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barTrack: { width: 24, height: 110, justifyContent: 'flex-end', backgroundColor: colors.surface, borderRadius: radius.sm, overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: radius.sm },
  barLabel: { color: colors.textMuted, fontSize: 11 },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sectionTitle: { color: colors.text },
  popularList: { gap: spacing.sm },
  popularRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md,
  },
  rank: { color: colors.secondary, width: 24, textAlign: 'center' },
  popularInfo: { flex: 1, gap: 2 },
  popularTitle: { color: colors.text },
  popularMeta: { color: colors.textMuted },
  railContent: { paddingHorizontal: 0 },
  recentCard: { width: 180, gap: spacing.xs },
  recentThumb: {
    width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md,
    backgroundColor: colors.cardElevated, overflow: 'hidden',
  },
  recentThumbOverlay: {
    flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', padding: spacing.xs,
    backgroundColor: 'rgba(11,11,15,0.3)',
  },
  recentDuration: { color: colors.text, backgroundColor: 'rgba(11,11,15,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  recentTitle: { color: colors.text },
  recentMeta: { color: colors.textMuted },
  commentList: { gap: spacing.sm },
  commentItem: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  commentAuthor: { color: colors.secondaryLight },
  commentBody: { color: colors.textSecondary },
  commentMeta: { color: colors.textMuted },
  emptyText: { color: colors.textMuted, paddingHorizontal: spacing.base },
});
