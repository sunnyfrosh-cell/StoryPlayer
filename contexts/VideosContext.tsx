import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  Video,
  AppNotification,
  WatchHistoryItem,
  Bookmark,
  Like,
  Subscription,
  Playlist,
  Follow,
  Comment,
  BlockedUser,
  SearchHistory,
  CommentSort,
  CreatorAnalytics,
  VideoCategory,
} from '@/types';
import { mockCategoryCategories } from '@/constants';
import { useAuth } from './AuthContext';
import {
  videoRepository,
  bookmarkRepository,
  notificationRepository,
  watchHistoryRepository,
  likeRepository,
  playlistRepository,
  subscriptionRepository,
  followRepository,
  commentRepository,
  blockedUserRepository,
  searchHistoryRepository,
  creatorAnalyticsRepository,
  userService,
  type CreateVideoInput,
  type CreateCommentInput,
  type CreatePlaylistInput,
  type PaginatedResult,
} from '@/firebase';
import { mapFirebaseError } from '@/firebase/errors';
import type { DocumentSnapshot } from 'firebase/firestore';
import { getCachedFeed, cacheFeed, getCachedWatchHistory, cacheWatchHistory } from '@/utils/cache';

export interface VideosContextValue {
  videos: Video[];
  trending: Video[];
  latest: Video[];
  recommended: Video[];
  featured: Video[];
  myVideos: Video[];
  popularCreators: PopularCreator[];
  continueWatching: WatchHistoryItem[];
  bookmarks: Bookmark[];
  likedVideoIds: string[];
  subscriptions: Subscription[];
  follows: Follow[];
  followingIds: string[];
  subscribedCreatorIds: string[];
  playlists: Playlist[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  blockedUsers: BlockedUser[];
  searchHistory: SearchHistory[];
  isLoading: boolean;
  error: string | null;
  getVideoById: (id: string) => Promise<Video | undefined>;
  toggleBookmark: (videoId: string) => void;
  isBookmarked: (videoId: string) => boolean;
  toggleLike: (videoId: string) => Promise<boolean>;
  isLiked: (videoId: string) => boolean;
  toggleSubscription: (creatorId: string) => Promise<boolean>;
  isSubscribed: (creatorId: string) => boolean;
  toggleFollow: (creatorId: string) => Promise<boolean>;
  isFollowing: (creatorId: string) => boolean;
  createVideo: (input: CreateVideoInput) => Promise<string>;
  recordWatchProgress: (videoId: string, progress: number, progressSeconds: number, durationSeconds: number) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  refresh: () => Promise<void>;
  getPaginatedVideos: (pageSize: number, lastDoc: DocumentSnapshot | null) => Promise<PaginatedResult<Video>>;
  getCategoryVideos: (category: VideoCategory) => Promise<Video[]>;
  getComments: (videoId: string, sort: CommentSort) => Promise<Comment[]>;
  getReplies: (parentId: string) => Promise<Comment[]>;
  addComment: (input: CreateCommentInput) => Promise<string>;
  editComment: (id: string, videoId: string, body: string) => Promise<void>;
  deleteComment: (id: string, videoId: string) => Promise<void>;
  toggleCommentLike: (commentId: string) => Promise<boolean>;
  pinComment: (id: string, videoId: string, pinned: boolean) => Promise<void>;
  reportComment: (commentId: string, reason: string, description: string) => Promise<void>;
  createPlaylist: (input: CreatePlaylistInput) => Promise<string>;
  renamePlaylist: (playlistId: string, title: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addVideoToPlaylist: (playlistId: string, videoId: string) => Promise<void>;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => Promise<void>;
  blockUser: (blockedId: string, blockedName: string, blockedAvatarUrl: string | null) => Promise<void>;
  unblockUser: (id: string) => Promise<void>;
  addSearchTerm: (term: string) => void;
  clearSearchHistory: () => void;
  getCreatorAnalytics: (creatorId: string) => Promise<CreatorAnalytics>;
  getUserProfile: (uid: string) => Promise<import('@/types').User | null>;
}

export interface PopularCreator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  videosCount: number;
  followersCount: number;
  isVerified: boolean;
}

const VideosContext = createContext<VideosContextValue | undefined>(undefined);

export function VideosProvider({ children }: { children: ReactNode }) {
  const { firebaseUser } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [trending, setTrending] = useState<Video[]>([]);
  const [latest, setLatest] = useState<Video[]>([]);
  const [recommended, setRecommended] = useState<Video[]>([]);
  const [featured, setFeatured] = useState<Video[]>([]);
  const [myVideos, setMyVideos] = useState<Video[]>([]);
  const [popularCreators, setPopularCreators] = useState<PopularCreator[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [likedVideoIds, setLikedVideoIds] = useState<string[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchHistoryItem[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    // Show cached feed immediately for instant startup
    const cached = await getCachedFeed();
    if (cached.length > 0) {
      setVideos(cached);
      setTrending(cached.slice(0, 10));
      setLatest(cached.slice().reverse());
      setRecommended(cached.slice(2, 10));
      setFeatured(cached.slice(0, 5));
      setIsLoading(false);
    }
    const cachedHistory = await getCachedWatchHistory();
    if (cachedHistory.length > 0) {
      setContinueWatching(cachedHistory as WatchHistoryItem[]);
    }
    // Fetch fresh data in background
    setError(null);
    try {
      const [all, trendingData, latestData, recData, featuredData, creatorsData] = await Promise.all([
        videoRepository.getAll(),
        videoRepository.getTrending(),
        videoRepository.getLatest(),
        videoRepository.getRecommended(),
        videoRepository.getFeatured(),
        videoRepository.getPopularCreators(firebaseUser?.uid ?? null),
      ]);
      setVideos(all);
      setTrending(trendingData);
      setLatest(latestData);
      setRecommended(recData);
      setFeatured(featuredData);
      setPopularCreators(creatorsData);
      // Persist to cache for next startup
      cacheFeed(all).catch(() => {});
    } catch (err) {
      setError(mapFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser?.uid]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const refresh = useCallback(async () => {
    await loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!firebaseUser) {
      setBookmarks([]);
      setLikedVideoIds([]);
      setNotifications([]);
      setContinueWatching([]);
      setMyVideos([]);
      setSubscriptions([]);
      setFollows([]);
      setPlaylists([]);
      setBlockedUsers([]);
      setSearchHistory([]);
      return;
    }
    const uid = firebaseUser.uid;
    // Critical listeners (needed immediately)
    const unsubBookmarks = bookmarkRepository.subscribeToUserBookmarks(uid, setBookmarks);
    const unsubLikes = likeRepository.subscribeToUserLikes(uid, (likes: Like[]) => {
      setLikedVideoIds(likes.map((l) => l.videoId));
    });
    const unsubHistory = watchHistoryRepository.subscribeToUserHistory(uid, (items) => {
      setContinueWatching(items);
      cacheWatchHistory(items as unknown[]).catch(() => {});
    });
    // Delay non-critical listeners to speed up startup
    const delayedTimers: ReturnType<typeof setTimeout>[] = [];
    delayedTimers.push(setTimeout(() => {
      videoRepository.getByCreator(uid).then(setMyVideos).catch((err: unknown) => {
        console.error('[VideosContext] loadMyVideos failed:', err);
      });
    }, 500));
    delayedTimers.push(setTimeout(() => {
      // These are subscribed via separate variables to clean up
    }, 0));
    const unsubNotifs = notificationRepository.subscribeToUserNotifications(uid, setNotifications);
    const unsubSubs = subscriptionRepository.subscribeToUserSubscriptions(uid, setSubscriptions);
    const unsubFollows = followRepository.subscribeToUserFollows(uid, setFollows);
    // Delay playlists, blocked users, search history
    let unsubPlaylists: (() => void) | null = null;
    let unsubBlocked: (() => void) | null = null;
    let unsubSearch: (() => void) | null = null;
    delayedTimers.push(setTimeout(() => {
      unsubPlaylists = playlistRepository.subscribeToUserPlaylists(uid, setPlaylists);
      unsubBlocked = blockedUserRepository.subscribeToUserBlocked(uid, setBlockedUsers);
      unsubSearch = searchHistoryRepository.subscribeToUserSearchHistory(uid, setSearchHistory);
    }, 1000));
    return () => {
      unsubBookmarks();
      unsubNotifs();
      unsubHistory();
      unsubSubs();
      unsubFollows();
      unsubPlaylists?.();
      unsubBlocked?.();
      unsubSearch?.();
      delayedTimers.forEach(clearTimeout);
    };
  }, [firebaseUser]);

  const getVideoById = useCallback(
    async (id: string): Promise<Video | undefined> => {
      const local = videos.find((v) => v.id === id);
      if (local) return local;
      const remote = await videoRepository.getById(id);
      if (remote) {
        setVideos((prev) => (prev.find((v) => v.id === id) ? prev : [...prev, remote]));
      }
      return remote ?? undefined;
    },
    [videos],
  );

  const toggleBookmark = useCallback(
    (videoId: string) => {
      if (!firebaseUser) return;
      const existing = bookmarks.find((b) => b.videoId === videoId);
      if (existing) {
        bookmarkRepository.remove(existing.id).catch((err: unknown) => {
          console.error('[VideosContext] removeBookmark failed:', err);
        });
      } else {
        bookmarkRepository.add(firebaseUser.uid, videoId).catch((err: unknown) => {
          console.error('[VideosContext] addBookmark failed:', err);
        });
      }
    },
    [firebaseUser, bookmarks],
  );

  const isBookmarked = useCallback(
    (videoId: string) => bookmarks.some((b) => b.videoId === videoId),
    [bookmarks],
  );

  const toggleLike = useCallback(
    async (videoId: string): Promise<boolean> => {
      if (!firebaseUser) return false;
      try {
        const nowLiked = await likeRepository.toggle(firebaseUser.uid, videoId);
        setLikedVideoIds((prev) =>
          nowLiked ? [...prev, videoId] : prev.filter((id) => id !== videoId),
        );
        const applyCount = (items: Video[]) => items.map((item) => item.id === videoId
          ? { ...item, likesCount: Math.max(0, item.likesCount + (nowLiked ? 1 : -1)), likedByMe: nowLiked }
          : item);
        setVideos((prev) => applyCount(prev));
        setTrending((prev) => applyCount(prev));
        setLatest((prev) => applyCount(prev));
        setRecommended((prev) => applyCount(prev));
        setFeatured((prev) => applyCount(prev));
        setMyVideos((prev) => applyCount(prev));
        return nowLiked;
      } catch {
        return false;
      }
    },
    [firebaseUser],
  );

  const isLiked = useCallback(
    (videoId: string) => likedVideoIds.includes(videoId),
    [likedVideoIds],
  );

  const toggleSubscription = useCallback(
    async (creatorId: string): Promise<boolean> => {
      if (!firebaseUser) return false;
      try {
        return await subscriptionRepository.toggle(firebaseUser.uid, creatorId);
      } catch {
        return false;
      }
    },
    [firebaseUser],
  );

  const isSubscribed = useCallback(
    (creatorId: string) => subscriptions.some((s) => s.creatorId === creatorId),
    [subscriptions],
  );

  const toggleFollow = useCallback(
    async (creatorId: string): Promise<boolean> => {
      if (!firebaseUser) return false;
      try {
        return await followRepository.toggle(firebaseUser.uid, creatorId);
      } catch {
        return false;
      }
    },
    [firebaseUser],
  );

  const isFollowing = useCallback(
    (creatorId: string) => follows.some((f) => f.followingId === creatorId),
    [follows],
  );

  const createVideo = useCallback(
    async (input: CreateVideoInput): Promise<string> => {
      const id = await videoRepository.create(input);
      const created = await videoRepository.getById(id);
      if (created) {
        setMyVideos((prev) => [created, ...prev]);
        setVideos((prev) => [created, ...prev]);
        setLatest((prev) => [created, ...prev]);
      }
      return id;
    },
    [],
  );

  const recordWatchProgress = useCallback(
    (videoId: string, progress: number, progressSeconds: number, durationSeconds: number) => {
      if (!firebaseUser) return;
      watchHistoryRepository.upsert(firebaseUser.uid, {
        videoId,
        progress,
        progressSeconds,
        durationSeconds,
        completionPercentage: durationSeconds > 0 ? Math.round((progressSeconds / durationSeconds) * 100) : 0,
        completed: progress >= 0.95,
        lastWatchedAt: Date.now(),
      }).catch((err: unknown) => {
        console.error('[VideosContext] recordWatchProgress failed:', err);
      });
    },
    [firebaseUser],
  );

  const markNotificationRead = useCallback((id: string) => {
    notificationRepository.markRead(id).catch((err: unknown) => {
      console.error('[VideosContext] markNotificationRead failed:', err);
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    if (!firebaseUser) return;
    notificationRepository.markAllRead(firebaseUser.uid).catch((err: unknown) => {
      console.error('[VideosContext] markAllNotificationsRead failed:', err);
    });
  }, [firebaseUser]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const followingIds = useMemo(() => follows.map((f) => f.followingId), [follows]);
  const subscribedCreatorIds = useMemo(() => subscriptions.map((s) => s.creatorId), [subscriptions]);

  const getPaginatedVideos = useCallback(
    (pageSize: number, lastDoc: DocumentSnapshot | null) => videoRepository.getPaginated(pageSize, lastDoc),
    [],
  );

  const getCategoryVideos = useCallback(
    (category: VideoCategory) => videoRepository.getByCategory(category, 20),
    [],
  );

  const getComments = useCallback(
    (videoId: string, sort: CommentSort) => commentRepository.listForVideo(videoId, sort),
    [],
  );

  const getReplies = useCallback(
    (parentId: string) => commentRepository.listReplies(parentId),
    [],
  );

  const addComment = useCallback(
    (input: CreateCommentInput) => commentRepository.add(input),
    [],
  );

  const editComment = useCallback(
    (id: string, videoId: string, body: string) => commentRepository.edit(id, videoId, body),
    [],
  );

  const deleteComment = useCallback(
    (id: string, videoId: string) => commentRepository.delete(id, videoId),
    [],
  );

  const toggleCommentLike = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!firebaseUser) return false;
      return commentRepository.toggleLike(firebaseUser.uid, commentId);
    },
    [firebaseUser],
  );

  const pinComment = useCallback(
    (id: string, videoId: string, pinned: boolean) => commentRepository.togglePin(id, videoId, pinned),
    [],
  );

  const reportComment = useCallback(
    (commentId: string, reason: string, description: string) => {
      if (!firebaseUser) return Promise.resolve();
      return commentRepository.report(commentId, firebaseUser.uid, reason, description).then(() => undefined);
    },
    [firebaseUser],
  );

  const createPlaylist = useCallback(
    (input: CreatePlaylistInput) => {
      if (!firebaseUser) return Promise.resolve('');
      return playlistRepository.create(firebaseUser.uid, input);
    },
    [firebaseUser],
  );

  const renamePlaylist = useCallback(
    (playlistId: string, title: string) => playlistRepository.rename(playlistId, title),
    [],
  );

  const deletePlaylist = useCallback(
    (playlistId: string) => playlistRepository.delete(playlistId),
    [],
  );

  const addVideoToPlaylist = useCallback(
    (playlistId: string, videoId: string) => playlistRepository.addVideo(playlistId, videoId),
    [],
  );

  const removeVideoFromPlaylist = useCallback(
    (playlistId: string, videoId: string) => playlistRepository.removeVideo(playlistId, videoId),
    [],
  );

  const blockUser = useCallback(
    (blockedId: string, blockedName: string, blockedAvatarUrl: string | null) => {
      if (!firebaseUser) return Promise.resolve();
      return blockedUserRepository.block(firebaseUser.uid, blockedId, blockedName, blockedAvatarUrl).then(() => undefined);
    },
    [firebaseUser],
  );

  const unblockUser = useCallback(
    (id: string) => blockedUserRepository.unblock(id),
    [],
  );

  const addSearchTerm = useCallback(
    (term: string) => {
      if (!firebaseUser || !term.trim()) return;
      searchHistoryRepository.add(firebaseUser.uid, term.trim()).catch((err: unknown) => {
        console.error('[VideosContext] addSearchTerm failed:', err);
      });
    },
    [firebaseUser],
  );

  const clearSearchHistory = useCallback(() => {
    if (!firebaseUser) return;
    searchHistoryRepository.clearAll(firebaseUser.uid).catch((err: unknown) => {
      console.error('[VideosContext] clearSearchHistory failed:', err);
    });
  }, [firebaseUser]);

  const getCreatorAnalytics = useCallback(
    (creatorId: string) => creatorAnalyticsRepository.getAnalytics(creatorId),
    [],
  );

  const getUserProfile = useCallback(
    (uid: string) => userService.getUser(uid),
    [],
  );

  const value = useMemo<VideosContextValue>(
    () => ({
      videos, trending, latest, recommended, featured, myVideos, popularCreators,
      continueWatching, bookmarks, likedVideoIds, subscriptions, follows, followingIds,
      subscribedCreatorIds, playlists, notifications, unreadNotificationCount,
      blockedUsers, searchHistory, isLoading, error,
      getVideoById, toggleBookmark, isBookmarked, toggleLike, isLiked,
      toggleSubscription, isSubscribed, toggleFollow, isFollowing,
      createVideo, recordWatchProgress, markNotificationRead, markAllNotificationsRead, refresh,
      getPaginatedVideos, getCategoryVideos,
      getComments, getReplies, addComment, editComment, deleteComment, toggleCommentLike,
      pinComment, reportComment,
      createPlaylist, renamePlaylist, deletePlaylist, addVideoToPlaylist, removeVideoFromPlaylist,
      blockUser, unblockUser, addSearchTerm, clearSearchHistory,
      getCreatorAnalytics, getUserProfile,
    }),
    [
      videos, trending, latest, recommended, featured, myVideos, popularCreators,
      continueWatching, bookmarks, likedVideoIds, subscriptions, follows, followingIds,
      subscribedCreatorIds, playlists, notifications, unreadNotificationCount,
      blockedUsers, searchHistory, isLoading, error,
      getVideoById, toggleBookmark, isBookmarked, toggleLike, isLiked,
      toggleSubscription, isSubscribed, toggleFollow, isFollowing,
      createVideo, recordWatchProgress, markNotificationRead, markAllNotificationsRead, refresh,
      getPaginatedVideos, getCategoryVideos,
      getComments, getReplies, addComment, editComment, deleteComment, toggleCommentLike,
      pinComment, reportComment,
      createPlaylist, renamePlaylist, deletePlaylist, addVideoToPlaylist, removeVideoFromPlaylist,
      blockUser, unblockUser, addSearchTerm, clearSearchHistory,
      getCreatorAnalytics, getUserProfile,
    ],
  );

  return <VideosContext.Provider value={value}>{children}</VideosContext.Provider>;
}

export function useVideos() {
  const ctx = useContext(VideosContext);
  if (!ctx) {
    throw new Error('useVideos must be used within VideosProvider');
  }
  return ctx;
}

export function getCategoryCategories(): typeof mockCategoryCategories {
  return mockCategoryCategories;
}
