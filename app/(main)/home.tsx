import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ImageBackground,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus, Play, TrendingUp, Flame, Sparkles, Clock, Users, ChevronRight, ChartBar as BarChart3 } from 'lucide-react-native';
import { router } from 'expo-router';
import type { Video, WatchHistoryItem, VideoCategory } from '@/types';
import { useVideos, useAuth } from '@/contexts';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatCount, getVideoThumbnailSource, timeAgo } from '@/utils';
import {
  VideoCard,
  ContinueWatchingCard,
  CategoryCard,
  LoadingScreen,
  ErrorState,
  CreatorCard,
} from '@/components';
import { mockCategoryCategories, mockContinueWatching, mockVideos } from '@/constants';

type RailIcon = typeof TrendingUp;

interface RailRow {
  type: 'hero' | 'continue' | 'rail' | 'creators' | 'categories' | 'createBanner';
  title?: string;
  subtitle?: string;
  videos?: Video[];
  icon?: RailIcon;
  action?: () => void;
}

/** Category sections rendered as individual rails below the main rails. */
const CATEGORY_SECTIONS: VideoCategory[] = [
  'Comedy',
  'Gaming',
  'Music',
  'Technology',
  'Education',
  'Movies',
  'Lifestyle',
  'Sports',
];

const RailSeparator = () => <View style={{ width: spacing.sm }} />;
const RowSeparator = () => <View style={{ height: spacing.lg }} />;

export default function HomeScreen() {
  const {
    videos,
    trending,
    latest,
    recommended,
    featured,
    continueWatching,
    popularCreators,
    isLoading,
    error,
    refresh,
    isFollowing,
    toggleFollow,
    getCategoryVideos,
  } = useVideos();
  const { firebaseUser } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<FlatList>(null);
  const scrollPositionRef = useRef(0);

  const heroVideo = useMemo(
    () => featured[0] ?? trending[0] ?? videos[0],
    [featured, trending, videos],
  );

  const dataSource = useMemo<Video[]>(() => videos, [videos]);

  const trendingData = useMemo(
    () => (trending.length > 0 ? trending : dataSource.slice(0, 6)),
    [trending, dataSource],
  );
  const latestData = useMemo(
    () => (latest.length > 0 ? latest : dataSource.slice().reverse().slice(0, 6)),
    [latest, dataSource],
  );
  const recData = useMemo(
    () => (recommended.length > 0 ? recommended : dataSource.slice(2, 8)),
    [recommended, dataSource],
  );

  const continueData = useMemo<WatchHistoryItem[]>(() => continueWatching, [continueWatching]);

  // Async-loaded per-category videos, keyed by category name.
  const [categoryVideos, setCategoryVideos] = useState<Record<string, Video[]>>({});

  useEffect(() => {
    let mounted = true;
    CATEGORY_SECTIONS.forEach((category) => {
      getCategoryVideos(category)
        .then((vids) => {
          if (mounted) {
            setCategoryVideos((prev) => ({ ...prev, [category]: vids }));
          }
        })
        .catch(() => {
          /* silently ignore — rail simply won't render */
        });
    });
    return () => {
      mounted = false;
    };
  }, [getCategoryVideos]);

  const rows = useMemo<RailRow[]>(() => {
    const result: RailRow[] = [];

    if (heroVideo) result.push({ type: 'hero' });

    if (continueData.length > 0) {
      result.push({
        type: 'continue',
        title: 'Continue Watching',
        subtitle: 'Pick up where you left off',
      });
    }

    result.push({
      type: 'rail',
      title: 'Trending Now',
      subtitle: 'What everyone is watching',
      videos: trendingData,
      icon: TrendingUp,
      action: () => router.push('/search?filter=trending'),
    });

    if (popularCreators.length > 0) {
      result.push({
        type: 'creators',
        title: 'Popular Creators',
        subtitle: 'Discover rising stars',
      });
    }

    result.push({ type: 'categories', title: 'Browse Categories' });

    result.push({
      type: 'rail',
      title: 'Recommended',
      subtitle: 'Based on your activity',
      videos: recData,
      icon: Sparkles,
      action: () => router.push('/search?filter=recommended'),
    });

    result.push({
      type: 'rail',
      title: 'Recently Uploaded',
      subtitle: 'Fresh from creators',
      videos: latestData,
      icon: Clock,
      action: () => router.push('/search?sort=latest'),
    });

    CATEGORY_SECTIONS.forEach((category) => {
      const vids = categoryVideos[category];
      if (vids && vids.length > 0) {
        result.push({
          type: 'rail',
          title: category,
          videos: vids,
          icon: BarChart3,
          action: () => router.push(`/search?category=${category}`),
        });
      }
    });

    result.push({ type: 'createBanner' });
    return result;
  }, [
    heroVideo,
    continueData,
    trendingData,
    recData,
    latestData,
    popularCreators,
    categoryVideos,
  ]);

  const renderHero = useCallback(() => {
    if (!heroVideo) return null;
    const heroSource = getVideoThumbnailSource(heroVideo.thumbnailUrl, heroVideo.videoUrl);
    return (
      <Animated.View entering={FadeInDown.duration(600)}>
        <ImageBackground
          source={heroSource}
          style={[styles.heroBg, !heroSource && { backgroundColor: colors.card }]}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={['rgba(11,11,15,0.3)', 'rgba(11,11,15,0.7)', colors.background]}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              {heroVideo.isFeatured ? (
                <View style={styles.featuredBadge}>
                  <Flame size={14} color={colors.text} />
                  <Text style={[typography.overline, styles.featuredText]}>Featured</Text>
                </View>
              ) : null}
              <Text style={[typography.h1, styles.heroTitle]} numberOfLines={2}>
                {heroVideo.title}
              </Text>
              <Text style={[typography.body, styles.heroDesc]} numberOfLines={2}>
                {heroVideo.description}
              </Text>
              <View style={styles.heroMeta}>
                <Text style={[typography.caption, styles.heroCreator]}>{heroVideo.creatorName}</Text>
                <Text style={[typography.caption, styles.heroDot]}>·</Text>
                <Text style={[typography.caption, styles.heroViews]}>
                  {formatCount(heroVideo.viewsCount)} views
                </Text>
                <Text style={[typography.caption, styles.heroDot]}>·</Text>
                <Text style={[typography.caption, styles.heroTime]}>{timeAgo(heroVideo.createdAt)}</Text>
              </View>
              <View style={styles.heroActions}>
                <Pressable style={styles.playBtn} onPress={() => router.push(`/watch/${heroVideo.id}`)}>
                  <Play size={18} color={colors.text} fill={colors.text} />
                  <Text style={[typography.label, styles.playText]}>Watch Now</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={() => router.push('/library')}>
                  <Plus size={18} color={colors.text} />
                  <Text style={[typography.label, styles.secondaryText]}>My List</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>
    );
  }, [heroVideo]);

  const renderRailHeader = useCallback((row: RailRow) => {
    const Icon = row.icon;
    return (
      <View style={styles.railHeader}>
        <View style={styles.railTitleRow}>
          {Icon ? <Icon size={18} color={colors.secondary} /> : null}
          <Text style={[typography.h3, styles.railTitle]}>{row.title}</Text>
          {row.action ? (
            <Pressable onPress={row.action} hitSlop={8} style={styles.seeAllBtn}>
              <Text style={[typography.caption, styles.seeAllText]}>See all</Text>
              <ChevronRight size={14} color={colors.secondary} />
            </Pressable>
          ) : null}
        </View>
        {row.subtitle ? <Text style={[typography.caption, styles.railSub]}>{row.subtitle}</Text> : null}
      </View>
    );
  }, []);

  const renderRail = useCallback(
    (row: RailRow) => {
      const vids = row.videos ?? [];
      if (vids.length === 0) return null;
      return (
        <View key={`rail-${row.title}`}>
          {renderRailHeader(row)}
          <FlatList
            horizontal
            data={vids}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
            ItemSeparatorComponent={RailSeparator}
            renderItem={({ item }) => (
              <VideoCard
                video={item}
                onPress={(v) => router.push(`/watch/${v.id}`)}
                width={width * 0.44}
                variant="landscape"
              />
            )}
          />
        </View>
      );
    },
    [width, renderRailHeader],
  );

  const renderContinue = useCallback(
    (row: RailRow) => {
      const items = continueData;
      if (items.length === 0) return null;
      return (
        <View key="continue-watching">
          {renderRailHeader(row)}
          <FlatList
            horizontal
            data={items}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
            ItemSeparatorComponent={RailSeparator}
            renderItem={({ item }) => (
              <ContinueWatchingCard
                item={item}
                video={dataSource.find((v) => v.id === item.videoId)}
                onPress={(i) => router.push(`/watch/${i.videoId}`)}
                width={width * 0.72}
              />
            )}
          />
        </View>
      );
    },
    [continueData, dataSource, width, renderRailHeader],
  );

  const renderCreators = useCallback(
    (row: RailRow) => {
      if (popularCreators.length === 0) return null;
      return (
        <View key="popular-creators">
          {renderRailHeader(row)}
          <FlatList
            horizontal
            data={popularCreators}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
            ItemSeparatorComponent={RailSeparator}
            renderItem={({ item }) => (
              <CreatorCard
                creator={item}
                isFollowing={isFollowing(item.id)}
                onFollow={() => toggleFollow(item.id)}
                onPress={(creatorId) => router.push(`/profile?creatorId=${creatorId}`)}
                width={140}
              />
            )}
          />
        </View>
      );
    },
    [popularCreators, isFollowing, toggleFollow, renderRailHeader],
  );

  const renderCategories = useCallback(() => {
    return (
      <View key="categories">
        <View style={styles.railHeader}>
          <View style={styles.railTitleRow}>
            <Users size={18} color={colors.secondary} />
            <Text style={[typography.h3, styles.railTitle]}>Browse Categories</Text>
          </View>
          <Text style={[typography.caption, styles.railSub]}>Explore by topic</Text>
        </View>
        <FlatList
          horizontal
          data={mockCategoryCategories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
          ItemSeparatorComponent={RailSeparator}
          renderItem={({ item }) => (
            <CategoryCard
              name={item.name}
              color={item.color}
              iconName={item.iconName}
              videosCount={item.videosCount}
              onPress={() => router.push(`/search?category=${item.name}`)}
              width={140}
            />
          )}
        />
      </View>
    );
  }, []);

  const renderCreateBanner = useCallback(() => {
    return (
      <View key="create-banner" style={styles.bannerWrap}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextWrap}>
              <Text style={[typography.h4, styles.bannerTitle]}>Become a Creator</Text>
              <Text style={[typography.bodySmall, styles.bannerSub]}>
                Upload your first video and start building your audience
              </Text>
            </View>
            <Pressable style={styles.bannerBtn} onPress={() => router.push('/upload')}>
              <Plus size={20} color={colors.primary} />
              <Text style={[typography.label, styles.bannerBtnText]}>Upload</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: RailRow }) => {
      switch (item.type) {
        case 'hero':
          return renderHero();
        case 'continue':
          return renderContinue(item);
        case 'rail':
          return renderRail(item);
        case 'creators':
          return renderCreators(item);
        case 'categories':
          return renderCategories();
        case 'createBanner':
          return renderCreateBanner();
        default:
          return null;
      }
    },
    [
      renderHero,
      renderContinue,
      renderRail,
      renderCreators,
      renderCategories,
      renderCreateBanner,
    ],
  );

  if (isLoading && videos.length === 0) {
    return <LoadingScreen message="Loading your feed..." />;
  }
  if (error && videos.length === 0) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={scrollRef}
        data={rows}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: 0 },
        ]}
        onRefresh={refresh}
        refreshing={isLoading}
        onScroll={(e) => { scrollPositionRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        ItemSeparatorComponent={RowSeparator}
        ListHeaderComponent={<View style={{ height: insets.top }} />}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingBottom: spacing.xl * 2 },

  /* Hero */
  heroBg: { width: '100%', height: 420 },
  heroImage: { borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroGradient: { flex: 1, justifyContent: 'flex-end' },
  heroContent: { padding: spacing.xl, gap: spacing.sm },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124,58,237,0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.base,
    alignSelf: 'flex-start',
    ...shadows.glow,
  },
  featuredText: { color: colors.text, textTransform: 'uppercase' },
  heroTitle: { color: colors.text },
  heroDesc: { color: colors.textSecondary, maxWidth: '90%' },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  heroCreator: { color: colors.secondaryLight, fontWeight: '600' },
  heroDot: { color: colors.textMuted },
  heroViews: { color: colors.textSecondary },
  heroTime: { color: colors.textMuted },
  heroActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.base,
    ...shadows.glow,
  },
  playText: { color: colors.text },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  secondaryText: { color: colors.text },

  /* Rail header */
  railHeader: { paddingHorizontal: spacing.base, marginBottom: spacing.sm, gap: 2 },
  railTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  railTitle: { color: colors.text },
  railSub: { color: colors.textMuted, marginLeft: 26 },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  seeAllText: { color: colors.secondary },
  railContent: { paddingHorizontal: spacing.base },

  /* Create banner */
  bannerWrap: { paddingHorizontal: spacing.base },
  banner: { borderRadius: radius.xl, padding: spacing.lg, ...shadows.lg },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  bannerTextWrap: { flex: 1, gap: 2 },
  bannerTitle: { color: colors.text },
  bannerSub: { color: 'rgba(255,255,255,0.85)' },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
  },
  bannerBtnText: { color: colors.primary },
});
