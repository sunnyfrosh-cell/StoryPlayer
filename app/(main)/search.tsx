import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search as SearchIcon,
  X,
  TrendingUp,
  Clock,
  Users,
  Hash,
  Mic,
  SlidersHorizontal,
  Video as VideoIcon,
  Bookmark,
  Play,
} from 'lucide-react-native';
import type { Video, VideoCategory, SearchFilter, Playlist, User } from '@/types';
import { useVideos, useAuth } from '@/contexts';
import { videoRepository, userService, playlistRepository } from '@/firebase';
import { colors, spacing, radius, typography } from '@/theme';
import { formatCount } from '@/utils';
import { VideoCard, EmptyState, Avatar } from '@/components';
import { mockTrendingSearches, mockCategoryCategories } from '@/constants';
import { useDebounce } from '@/hooks/useDebounce';

const FILTER_TABS = [
  { key: 'all' as const, label: 'All', icon: SlidersHorizontal },
  { key: 'videos' as const, label: 'Videos', icon: VideoIcon },
  { key: 'creators' as const, label: 'Creators', icon: Users },
  { key: 'playlists' as const, label: 'Playlists', icon: Bookmark },
  { key: 'tags' as const, label: 'Tags', icon: Hash },
  { key: 'categories' as const, label: 'Categories', icon: Play },
];

export default function SearchScreen() {
  const searchParams = useLocalSearchParams<{ category?: string }>();
  const { videos, addSearchTerm, clearSearchHistory, searchHistory } = useVideos();
  const { firebaseUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');
  const [videoResults, setVideoResults] = useState<Video[]>([]);
  const [creatorResults, setCreatorResults] = useState<User[]>([]);
  const [playlistResults, setPlaylistResults] = useState<Playlist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Categories are filtered locally from mock data — no async needed
  const filteredCategories = useMemo(() => {
    if (!query.trim()) return mockCategoryCategories;
    const lower = query.toLowerCase().trim();
    return mockCategoryCategories.filter((c) => c.name.toLowerCase().includes(lower));
  }, [query]);

  // Merge remote video results with local matches, deduplicating by id
  const mergeLocalVideos = useCallback(
    (remote: Video[], term: string): Video[] => {
      const lower = term.toLowerCase().trim();
      const remoteIds = new Set(remote.map((v) => v.id));
      const localMatches = videos.filter(
        (v) =>
          !remoteIds.has(v.id) &&
          (v.title.toLowerCase().includes(lower) ||
            v.category.toLowerCase().includes(lower) ||
            v.creatorName.toLowerCase().includes(lower) ||
            v.tags.some((t) => t.toLowerCase().includes(lower))),
      );
      return [...remote, ...localMatches];
    },
    [videos],
  );

  const performSearch = useCallback(
    async (term: string, filter: SearchFilter) => {
      const trimmed = term.trim();
      if (!trimmed) {
        setVideoResults([]);
        setCreatorResults([]);
        setPlaylistResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        if (filter === 'all') {
          const [remoteVideos, users] = await Promise.all([
            videoRepository.search(trimmed),
            userService.searchUsers(trimmed),
          ]);
          setVideoResults(mergeLocalVideos(remoteVideos, trimmed));
          setCreatorResults(users);
        } else if (filter === 'videos') {
          const remoteVideos = await videoRepository.search(trimmed);
          setVideoResults(mergeLocalVideos(remoteVideos, trimmed));
        } else if (filter === 'creators') {
          const users = await userService.searchUsers(trimmed);
          setCreatorResults(users);
        } else if (filter === 'playlists') {
          const playlists = await playlistRepository.search(trimmed);
          setPlaylistResults(playlists);
        } else if (filter === 'tags') {
          const taggedVideos = await videoRepository.searchByTag(trimmed);
          setVideoResults(taggedVideos);
        }
        // 'categories' is handled locally via filteredCategories — no async call needed

        if (firebaseUser) {
          addSearchTerm(trimmed);
        }
      } catch {
        if (filter === 'all' || filter === 'videos' || filter === 'tags') {
          setVideoResults([]);
        }
        if (filter === 'all' || filter === 'creators') {
          setCreatorResults([]);
        }
        if (filter === 'playlists') {
          setPlaylistResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    },
    [mergeLocalVideos, addSearchTerm, firebaseUser],
  );

  // Debounced instant search — triggers search automatically as the user types
  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2 && activeFilter !== 'categories') {
      performSearch(debouncedQuery, activeFilter);
    } else if (debouncedQuery.trim().length === 0) {
      setVideoResults([]);
      setCreatorResults([]);
      setPlaylistResults([]);
      setHasSearched(false);
    }
  }, [debouncedQuery, activeFilter, performSearch]);

  // Initial category filter from URL params (e.g. /search?category=Gaming)
  useEffect(() => {
    const initialCategory = searchParams.category as VideoCategory | undefined;
    if (initialCategory) {
      setQuery(initialCategory);
      setActiveFilter('categories');
      setHasSearched(true);
    }
  }, [searchParams.category]);

  const handleSubmitSearch = useCallback(() => {
    if (query.trim()) {
      performSearch(query, activeFilter);
    }
  }, [query, activeFilter, performSearch]);

  const handleSuggestionPress = useCallback(
    (term: string) => {
      setQuery(term);
      performSearch(term, activeFilter);
    },
    [activeFilter, performSearch],
  );

  const handleFilterChange = useCallback(
    (filter: SearchFilter) => {
      setActiveFilter(filter);
      // Re-run search with the new filter if we already have a query
      if (hasSearched && query.trim() && filter !== 'categories') {
        performSearch(query, filter);
      }
    },
    [hasSearched, query, performSearch],
  );

  const clearQuery = useCallback(() => {
    setQuery('');
    setVideoResults([]);
    setCreatorResults([]);
    setPlaylistResults([]);
    setHasSearched(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.secondary} />
      <Text style={styles.loadingText}>Searching…</Text>
    </View>
  );

  const renderSuggestions = () => (
    <View style={styles.suggestionsWrap}>
      {searchHistory.length > 0 && (
        <View style={styles.suggestionSection}>
          <View style={styles.suggestionHeader}>
            <Clock size={18} color={colors.secondary} />
            <Text style={styles.suggestionTitle}>Recent Searches</Text>
            <Pressable onPress={clearSearchHistory} hitSlop={8} style={styles.clearAllBtn}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
          </View>
          <View style={styles.chipList}>
            {searchHistory.map((item) => (
              <Pressable
                key={item.id}
                style={styles.chip}
                onPress={() => handleSuggestionPress(item.term)}
              >
                <Clock size={14} color={colors.textMuted} />
                <Text style={styles.chipText} numberOfLines={1}>
                  {item.term}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.suggestionSection}>
        <View style={styles.suggestionHeader}>
          <TrendingUp size={18} color={colors.secondary} />
          <Text style={styles.suggestionTitle}>Trending Searches</Text>
        </View>
        <View style={styles.chipList}>
          {mockTrendingSearches.map((term, idx) => (
            <Pressable
              key={`trending-${idx}`}
              style={styles.chip}
              onPress={() => handleSuggestionPress(term)}
            >
              <TrendingUp size={14} color={colors.secondary} />
              <Text style={styles.chipText} numberOfLines={1}>
                {term}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  const renderVideoGrid = (data: Video[]) => (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      numColumns={2}
      scrollEnabled={false}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContent}
      renderItem={({ item }) => (
        <VideoCard
          video={item}
          onPress={(v) => router.push(`/watch/${v.id}`)}
          width={160}
          variant="portrait"
        />
      )}
    />
  );

  const renderVideoResults = () => {
    if (videoResults.length === 0) {
      return (
        <EmptyState
          icon={VideoIcon}
          title="No videos found"
          description={`No videos match "${query}"`}
        />
      );
    }
    return renderVideoGrid(videoResults);
  };

  const renderTagResults = () => {
    if (videoResults.length === 0) {
      return (
        <EmptyState
          icon={Hash}
          title="No tags found"
          description={`No videos tagged with "${query}"`}
        />
      );
    }
    return renderVideoGrid(videoResults);
  };

  const renderCreatorItem = ({ item }: { item: User }) => (
    <Pressable
      style={styles.creatorItem}
      onPress={() => router.push(`/profile?creatorId=${item.id}`)}
    >
      <Avatar uri={item.avatarUrl} size={48} initials={item.displayName} />
      <View style={styles.creatorMeta}>
        <Text style={styles.creatorName} numberOfLines={1}>
          {item.displayName}
        </Text>
        <Text style={styles.creatorStats}>
          {formatCount(item.followersCount)} followers · {formatCount(item.videosCount)} videos
        </Text>
      </View>
    </Pressable>
  );

  const renderCreatorResults = () => {
    if (creatorResults.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="No creators found"
          description={`No creators match "${query}"`}
        />
      );
    }
    return (
      <FlatList
        data={creatorResults}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        renderItem={renderCreatorItem}
      />
    );
  };

  const renderPlaylistResults = () => {
    if (playlistResults.length === 0) {
      return (
        <EmptyState
          icon={Bookmark}
          title="No playlists found"
          description={`No playlists match "${query}"`}
        />
      );
    }
    return (
      <FlatList
        data={playlistResults}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.playlistItem}
            onPress={() => router.push(`/playlist/${item.id}`)}
          >
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.playlistCover} />
            ) : (
              <View style={[styles.playlistCover, styles.playlistCoverFallback]}>
                <Bookmark size={20} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.playlistMeta}>
              <Text style={styles.playlistTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.playlistStats}>
                {item.videoCount} {item.videoCount === 1 ? 'video' : 'videos'}
              </Text>
              <View
                style={[
                  styles.privacyBadge,
                  item.isPrivate ? styles.privacyPrivate : styles.privacyPublic,
                ]}
              >
                <Text
                  style={[
                    styles.privacyText,
                    { color: item.isPrivate ? colors.error : colors.success },
                  ]}
                >
                  {item.isPrivate ? 'Private' : 'Public'}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    );
  };

  const renderAllResults = () => {
    const hasVideos = videoResults.length > 0;
    const hasCreators = creatorResults.length > 0;

    if (!hasVideos && !hasCreators) {
      return (
        <EmptyState
          icon={SearchIcon}
          title="No results found"
          description={`No results for "${query}"`}
        />
      );
    }

    return (
      <View>
        {hasVideos && (
          <View style={styles.resultSection}>
            <View style={styles.resultSectionHeader}>
              <VideoIcon size={16} color={colors.secondary} />
              <Text style={styles.resultSectionTitle}>Videos</Text>
              <Text style={styles.resultCount}>{videoResults.length}</Text>
            </View>
            {renderVideoGrid(videoResults.slice(0, 6))}
          </View>
        )}

        {hasCreators && (
          <View style={styles.resultSection}>
            <View style={styles.resultSectionHeader}>
              <Users size={16} color={colors.secondary} />
              <Text style={styles.resultSectionTitle}>Creators</Text>
              <Text style={styles.resultCount}>{creatorResults.length}</Text>
            </View>
            <FlatList
              data={creatorResults.slice(0, 5)}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              renderItem={renderCreatorItem}
            />
          </View>
        )}
      </View>
    );
  };

  const renderCategoryGrid = () => {
    if (filteredCategories.length === 0) {
      return (
        <EmptyState
          icon={SearchIcon}
          title="No categories found"
          description={`No categories match "${query}"`}
        />
      );
    }
    return (
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.categoryItem}
            onPress={() => {
              setQuery(item.name);
              setActiveFilter('videos');
              performSearch(item.name, 'videos');
            }}
          >
            <View style={[styles.categoryIcon, { backgroundColor: `${item.color}22` }]}>
              <VideoIcon size={22} color={item.color} />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categoryCount}>{item.videosCount} videos</Text>
          </Pressable>
        )}
      />
    );
  };

  const renderContent = () => {
    // Categories tab — always show categories (filtered by query if present)
    if (activeFilter === 'categories') {
      if (isSearching) return renderLoading();
      return renderCategoryGrid();
    }

    // Other tabs — show suggestions when no search has been performed
    if (!hasSearched) {
      return renderSuggestions();
    }

    if (isSearching) {
      return renderLoading();
    }

    switch (activeFilter) {
      case 'all':
        return renderAllResults();
      case 'videos':
        return renderVideoResults();
      case 'creators':
        return renderCreatorResults();
      case 'playlists':
        return renderPlaylistResults();
      case 'tags':
        return renderTagResults();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <SearchIcon size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search videos, creators, playlists…"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={handleSubmitSearch}
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor={colors.secondary}
          />
          {query.length > 0 ? (
            <Pressable onPress={clearQuery} hitSlop={12} style={styles.iconButton}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          ) : (
            <Pressable hitSlop={12} style={styles.iconButton}>
              <Mic size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleFilterChange(tab.key)}
              >
                <Icon size={14} color={isActive ? colors.secondary : colors.textMuted} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main content */}
      <FlatList
        data={[{ key: 'content' }]}
        keyExtractor={(item) => item.key}
        renderItem={() => renderContent()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    height: 48,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginLeft: 2,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontFamily: typography.body.fontFamily,
    padding: 0,
  },
  iconButton: {
    padding: spacing.xs,
  },
  tabsContainer: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: 'rgba(124,58,237,0.4)',
  },
  tabText: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.secondary,
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  suggestionsWrap: {
    padding: spacing.base,
    gap: spacing.xl,
  },
  suggestionSection: {
    gap: spacing.md,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  suggestionTitle: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
  },
  clearAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  clearAllText: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '600',
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  resultSection: {
    marginBottom: spacing.lg,
  },
  resultSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
  },
  resultSectionTitle: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
  },
  resultCount: {
    ...typography.caption,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  gridRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  gridContent: {
    gap: spacing.sm,
  },
  listContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  creatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  creatorMeta: {
    flex: 1,
    gap: 2,
  },
  creatorName: {
    ...typography.label,
    color: colors.text,
  },
  creatorStats: {
    ...typography.caption,
    color: colors.textMuted,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playlistCover: {
    width: 64,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  playlistCoverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistMeta: {
    flex: 1,
    gap: 4,
  },
  playlistTitle: {
    ...typography.label,
    color: colors.text,
  },
  playlistStats: {
    ...typography.caption,
    color: colors.textMuted,
  },
  privacyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  privacyPrivate: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  privacyPublic: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  privacyText: {
    ...typography.overline,
  },
  categoryItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    ...typography.label,
    color: colors.text,
  },
  categoryCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
