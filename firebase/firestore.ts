import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
  orderBy,
  startAfter,
  runTransaction,
  type Unsubscribe,
  type QueryConstraint,
  type DocumentSnapshot,
  type Transaction,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './config';
import type {
  User,
  Video,
  Comment,
  CommentLike,
  Like,
  Bookmark,
  WatchHistoryItem,
  Playlist,
  Subscription,
  AppNotification,
  VideoReport,
  VideoCategory,
  VideoVisibility,
  Follow,
  BlockedUser,
  CreatorAnalytics,
  GrowthDataPoint,
  SearchHistory,
  CommentSort,
  VideoAnalytics,
  Donation,
  CreatorWallet,
  WalletTransaction,
  WithdrawalRequest,
  AdPlacement,
  AdminReport,
  ReportTargetType,
  ReportStatus,
  Announcement,
  CreatorStudioSummary,
  UserSuspendStatus,
  Reel,
  CreateReelInput,
} from '@/types';

const COLLECTIONS = {
  users: 'users',
  videos: 'videos',
  videoViews: 'videoViews',
  comments: 'comments',
  commentLikes: 'commentLikes',
  commentReports: 'commentReports',
  likes: 'likes',
  bookmarks: 'bookmarks',
  watchHistory: 'watchHistory',
  playlists: 'playlists',
  subscriptions: 'subscriptions',
  follows: 'follows',
  notifications: 'notifications',
  reports: 'reports',
  blockedUsers: 'blockedUsers',
  searchHistory: 'searchHistory',
  videoAnalytics: 'videoAnalytics',
  donations: 'donations',
  walletTransactions: 'walletTransactions',
  withdrawals: 'withdrawals',
  premiumMemberships: 'premiumMemberships',
  adminReports: 'adminReports',
  announcements: 'announcements',
  adPlacements: 'adPlacements',
  reels: 'reels',
  reelLikes: 'reelLikes',
  reelSaves: 'reelSaves',
  reelViews: 'reelViews',
} as const;

const ts = (v: unknown): number =>
  v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : 0;

function defaultSocialLinks() {
  return { twitter: null, instagram: null, youtube: null, website: null };
}

function toUser(id: string, data: Record<string, unknown>): User {
  const social = (data.socialLinks as Record<string, string | null>) ?? {};
  return {
    id,
    email: (data.email as string) ?? '',
    username: (data.username as string) ?? 'member',
    displayName: (data.displayName as string) ?? (data.username as string) ?? 'StoryVerse member',
    avatarUrl: (data.photoURL as string | null) ?? null,
    coverUrl: (data.coverUrl as string | null) ?? null,
    bio: (data.bio as string | null) ?? null,
    location: (data.location as string | null) ?? null,
    role: (data.role as User['role']) ?? 'user',
    isVerified: (data.isVerified as boolean) ?? false,
    isCreator: (data.isCreator as boolean) ?? false,
    isPremium: (data.isPremium as boolean) ?? false,
    premiumExpiresAt: (data.premiumExpiresAt as number | null) ?? null,
    suspendStatus: (data.suspendStatus as UserSuspendStatus) ?? 'active',
    socialLinks: {
      twitter: social.twitter ?? null,
      instagram: social.instagram ?? null,
      youtube: social.youtube ?? null,
      website: social.website ?? null,
    },
    followersCount: (data.followersCount as number) ?? 0,
    followingCount: (data.followingCount as number) ?? 0,
    subscribersCount: (data.subscribersCount as number) ?? 0,
    videosCount: (data.videosCount as number) ?? 0,
    totalViews: (data.totalViews as number) ?? 0,
    totalLikes: (data.totalLikes as number) ?? 0,
    watchTimeMinutes: (data.watchTimeMinutes as number) ?? 0,
    preferredCategories: (data.preferredCategories as VideoCategory[]) ?? [],
    joinedAt: ts(data.joinedAt ?? data.createdAt),
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
  };
}

function toVideo(id: string, data: Record<string, unknown>): Video {
  return {
    id,
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    category: (data.category as Video['category']) ?? 'Entertainment',
    tags: (data.tags as string[]) ?? [],
    visibility: (data.visibility as Video['visibility']) ?? 'public',
    status: (data.status as Video['status']) ?? 'published',
    videoUrl: (data.videoUrl as string) ?? '',
    thumbnailUrl: (data.thumbnailUrl as string) ?? '',
    durationSeconds: (data.durationSeconds as number) ?? 0,
    viewsCount: (data.viewsCount as number) ?? 0,
    likesCount: (data.likesCount as number) ?? 0,
    commentsCount: (data.commentsCount as number) ?? 0,
    bookmarksCount: (data.bookmarksCount as number) ?? 0,
    isFeatured: (data.isFeatured as boolean) ?? false,
    isTrending: (data.isTrending as boolean) ?? false,
    isNew: (data.isNew as boolean) ?? false,
    trendingScore: (data.trendingScore as number) ?? 0,
    isExclusive: (data.isExclusive as boolean) ?? false,
    isSponsored: (data.isSponsored as boolean) ?? false,
    scheduledAt: (data.scheduledAt as number | null) ?? null,
    archivedAt: (data.archivedAt as number | null) ?? null,
    sharesCount: (data.sharesCount as number) ?? 0,
    creatorId: (data.creatorId as string) ?? '',
    creatorName: (data.creatorName as string) ?? '',
    creatorAvatarUrl: (data.creatorAvatarUrl as string | null) ?? null,
    creatorIsVerified: (data.creatorIsVerified as boolean) ?? false,
    likedByMe: false,
    bookmarkedByMe: false,
    subscribedToCreator: false,
    releasedAt: ts(data.releasedAt),
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
  };
}

function toReel(id: string, data: Record<string, unknown>): Reel {
  return {
    id,
    title: (data.title as string) ?? '',
    description: (data.description as string) ?? '',
    videoUrl: (data.videoUrl as string) ?? '',
    thumbnailUrl: (data.thumbnailUrl as string) ?? '',
    durationSeconds: (data.durationSeconds as number) ?? 0,
    hashtags: (data.hashtags as string[]) ?? [],
    viewsCount: (data.viewsCount as number) ?? 0,
    likesCount: (data.likesCount as number) ?? 0,
    commentsCount: (data.commentsCount as number) ?? 0,
    sharesCount: (data.sharesCount as number) ?? 0,
    savesCount: (data.savesCount as number) ?? 0,
    creatorId: (data.creatorId as string) ?? '',
    creatorName: (data.creatorName as string) ?? '',
    creatorAvatarUrl: (data.creatorAvatarUrl as string | null) ?? null,
    creatorIsVerified: (data.creatorIsVerified as boolean) ?? false,
    likedByMe: false,
    savedByMe: false,
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
  };
}

function toComment(id: string, data: Record<string, unknown>): Comment {
  return {
    id,
    videoId: (data.videoId as string) ?? '',
    authorId: (data.authorId as string) ?? '',
    authorName: (data.authorName as string) ?? '',
    authorAvatarUrl: (data.authorAvatarUrl as string | null) ?? null,
    authorIsCreator: (data.authorIsCreator as boolean) ?? false,
    body: (data.body as string) ?? '',
    likesCount: (data.likesCount as number) ?? 0,
    repliesCount: (data.repliesCount as number) ?? 0,
    isLikedByMe: false,
    isPinned: (data.isPinned as boolean) ?? false,
    isEdited: (data.isEdited as boolean) ?? false,
    parentId: (data.parentId as string | null) ?? null,
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
  };
}

// ============================================================
// User Service
// ============================================================

export const userService = {
  async createUserDocument(uid: string, partial: { uid: string; email: string; username: string }) {
    if (!db) throw new Error('Firestore is not configured.');
    const now = serverTimestamp();
    const data: Record<string, unknown> = {
      uid,
      email: partial.email,
      username: partial.username,
      displayName: partial.username,
      photoURL: null,
      coverUrl: null,
      bio: null,
      location: null,
      role: 'user',
      suspendStatus: 'active',
      isVerified: false,
      isCreator: false,
      socialLinks: defaultSocialLinks(),
      followersCount: 0,
      followingCount: 0,
      subscribersCount: 0,
      videosCount: 0,
      totalViews: 0,
      totalLikes: 0,
      watchTimeMinutes: 0,
      preferredCategories: [],
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, COLLECTIONS.users, uid), data);
    return toUser(uid, data as Record<string, unknown>);
  },

  async getUser(uid: string): Promise<User | null> {
    if (!db) throw new Error('Firestore is not configured.');
    const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
    if (!snap.exists()) return null;
    return toUser(snap.id, snap.data() as Record<string, unknown>);
  },

  async updateUser(uid: string, patch: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (patch.username !== undefined) update.username = patch.username;
    if (patch.displayName !== undefined) update.displayName = patch.displayName;
    if (patch.bio !== undefined) update.bio = patch.bio;
    if (patch.avatarUrl !== undefined) update.photoURL = patch.avatarUrl;
    if (patch.coverUrl !== undefined) update.coverUrl = patch.coverUrl;
    if (patch.location !== undefined) update.location = patch.location;
    if (patch.socialLinks !== undefined) update.socialLinks = patch.socialLinks;
    if (patch.preferredCategories !== undefined) update.preferredCategories = patch.preferredCategories;
    if (patch.isCreator !== undefined) update.isCreator = patch.isCreator;
    await updateDoc(doc(db, COLLECTIONS.users, uid), update);
  },

  async isUsernameTaken(username: string, excludeUid?: string): Promise<boolean> {
    if (!db) return false;
    const q = query(collection(db, COLLECTIONS.users), where('username', '==', username), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return false;
    if (excludeUid) return snap.docs[0].id !== excludeUid;
    return true;
  },

  subscribeToUser(uid: string, callback: (user: User | null) => void): Unsubscribe {
    if (!db) {
      callback(null);
      return () => {};
    }
    return onSnapshot(doc(db, COLLECTIONS.users, uid), (snap) => {
      callback(snap.exists() ? toUser(snap.id, snap.data() as Record<string, unknown>) : null);
    });
  },

  async searchUsers(term: string, maxResults: number = 10): Promise<User[]> {
    if (!db) return [];
    const lower = term.toLowerCase().trim();
    if (!lower) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.users), limit(50)));
    return snap.docs
      .map((d) => toUser(d.id, d.data() as Record<string, unknown>))
      .filter((u) =>
        u.username.toLowerCase().includes(lower) ||
        u.displayName.toLowerCase().includes(lower),
      )
      .sort((a, b) => b.followersCount - a.followersCount)
      .slice(0, maxResults);
  },

  async getUsersByIds(uids: string[]): Promise<User[]> {
    if (!db || uids.length === 0) return [];
    const results: User[] = [];
    for (const uid of uids.slice(0, 20)) {
      const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
      if (snap.exists()) results.push(toUser(snap.id, snap.data() as Record<string, unknown>));
    }
    return results;
  },
};

// ============================================================
// Video Repository
// ============================================================

export interface CreateVideoInput {
  title: string;
  description: string;
  category: VideoCategory;
  tags: string[];
  visibility: VideoVisibility;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  creatorIsVerified: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
}

export type { CreateReelInput } from '@/types';

export const videoRepository = {
  async getPaginated(pageSize: number, lastDoc?: DocumentSnapshot | null): Promise<PaginatedResult<Video>> {
    if (!db) return { items: [], hasMore: false, lastDoc: null };
    const constraints: QueryConstraint[] = [
      where('visibility', '==', 'public'),
      where('status', '==', 'published'),
      limit(pageSize + 1),
    ];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), ...constraints));
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const videos = pageDocs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt - a.createdAt);
    return { items: videos, hasMore, lastDoc: pageDocs[pageDocs.length - 1] ?? null };
  },

  async getAll(): Promise<Video[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('visibility', '==', 'public'), limit(50)));
    return snap.docs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getById(id: string): Promise<Video | null> {
    if (!db) return null;
    const snap = await getDoc(doc(db, COLLECTIONS.videos, id));
    return snap.exists() ? toVideo(snap.id, snap.data() as Record<string, unknown>) : null;
  },

  async getFeatured(): Promise<Video[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('isFeatured', '==', true), where('visibility', '==', 'public'), limit(6)));
    return snap.docs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.viewsCount - a.viewsCount);
  },

  async getTrending(): Promise<Video[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('isTrending', '==', true), where('visibility', '==', 'public'), limit(10)));
    return snap.docs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.trendingScore - a.trendingScore);
  },

  async getLatest(): Promise<Video[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('visibility', '==', 'public'), where('status', '==', 'published'), limit(10)));
    return snap.docs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getRecommended(): Promise<Video[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('visibility', '==', 'public'), limit(20)));
    return snap.docs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => (b.likesCount + b.viewsCount * 0.1) - (a.likesCount + a.viewsCount * 0.1))
      .slice(0, 10);
  },

  async getByCategory(category: VideoCategory, max: number = 20): Promise<Video[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('category', '==', category), where('visibility', '==', 'public'), limit(max)));
    return snap.docs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.viewsCount - a.viewsCount);
  },

  async getByCategoryPaginated(category: VideoCategory, pageSize: number, lastDoc?: DocumentSnapshot | null): Promise<PaginatedResult<Video>> {
    if (!db) return { items: [], hasMore: false, lastDoc: null };
    const constraints: QueryConstraint[] = [
      where('category', '==', category),
      where('visibility', '==', 'public'),
      limit(pageSize + 1),
    ];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), ...constraints));
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const videos = pageDocs.map((d) => toVideo(d.id, d.data() as Record<string, unknown>));
    return { items: videos, hasMore, lastDoc: pageDocs[pageDocs.length - 1] ?? null };
  },

  async getByCreator(uid: string): Promise<Video[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('creatorId', '==', uid), limit(50)));
    return snap.docs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getByCreatorPaginated(uid: string, pageSize: number, lastDoc?: DocumentSnapshot | null): Promise<PaginatedResult<Video>> {
    if (!db) return { items: [], hasMore: false, lastDoc: null };
    const constraints: QueryConstraint[] = [
      where('creatorId', '==', uid),
      limit(pageSize + 1),
    ];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), ...constraints));
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const videos = pageDocs.map((d) => toVideo(d.id, d.data() as Record<string, unknown>));
    return { items: videos, hasMore, lastDoc: pageDocs[pageDocs.length - 1] ?? null };
  },

  async getRelated(video: Video, count: number = 10): Promise<Video[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('category', '==', video.category), where('visibility', '==', 'public'), limit(20)));
    return snap.docs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .filter((v) => v.id !== video.id)
      .sort((a, b) => b.viewsCount - a.viewsCount)
      .slice(0, count);
  },

  async getPopularCreators(uid: string | null): Promise<{ id: string; username: string; displayName: string; avatarUrl: string | null; videosCount: number; followersCount: number; isVerified: boolean }[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('visibility', '==', 'public'), limit(50)));
    const creatorMap = new Map<string, { id: string; username: string; displayName: string; avatarUrl: string | null; videosCount: number; followersCount: number; isVerified: boolean }>();
    snap.docs.forEach((d) => {
      const v = toVideo(d.id, d.data() as Record<string, unknown>);
      if (v.creatorId === uid) return;
      const existing = creatorMap.get(v.creatorId);
      if (existing) {
        existing.videosCount += 1;
      } else {
        creatorMap.set(v.creatorId, {
          id: v.creatorId,
          username: v.creatorName,
          displayName: v.creatorName,
          avatarUrl: v.creatorAvatarUrl,
          videosCount: 1,
          followersCount: 0,
          isVerified: v.creatorIsVerified,
        });
      }
    });
    const creatorIds = Array.from(creatorMap.keys()).slice(0, 10);
    const users = await userService.getUsersByIds(creatorIds);
    users.forEach((u) => {
      const entry = creatorMap.get(u.id);
      if (entry) {
        entry.followersCount = u.followersCount;
        entry.isVerified = u.isVerified;
        entry.username = u.username;
        entry.displayName = u.displayName;
        entry.avatarUrl = u.avatarUrl;
      }
    });
    return Array.from(creatorMap.values())
      .sort((a, b) => b.followersCount - a.followersCount)
      .slice(0, 10);
  },

  async search(term: string): Promise<Video[]> {
    if (!db) return [];
    const lower = term.toLowerCase().trim();
    if (!lower) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('visibility', '==', 'public'), limit(50)));
    return snap.docs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .filter((v) =>
        v.title.toLowerCase().includes(lower) ||
        v.category.toLowerCase().includes(lower) ||
        v.creatorName.toLowerCase().includes(lower) ||
        v.tags.some((t) => t.toLowerCase().includes(lower)),
      )
      .sort((a, b) => b.viewsCount - a.viewsCount);
  },

  async searchByTag(tag: string): Promise<Video[]> {
    if (!db) return [];
    const lower = tag.toLowerCase().trim();
    if (!lower) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.videos), where('visibility', '==', 'public'), limit(50)));
    return snap.docs
      .map((d) => toVideo(d.id, d.data() as Record<string, unknown>))
      .filter((v) => v.tags.some((t) => t.toLowerCase().includes(lower)))
      .sort((a, b) => b.viewsCount - a.viewsCount);
  },

  async create(input: CreateVideoInput): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const now = Date.now();
    const trendingScore = Math.floor(Math.random() * 100);
    const ref = await addDoc(collection(db, COLLECTIONS.videos), {
      title: input.title,
      description: input.description,
      category: input.category,
      tags: input.tags,
      visibility: input.visibility,
      status: 'published',
      videoUrl: input.videoUrl,
      thumbnailUrl: input.thumbnailUrl,
      durationSeconds: input.durationSeconds,
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      bookmarksCount: 0,
      isFeatured: false,
      isTrending: false,
      isNew: true,
      trendingScore,
      isExclusive: false,
      isSponsored: false,
      scheduledAt: null,
      archivedAt: null,
      sharesCount: 0,
      creatorId: input.creatorId,
      creatorName: input.creatorName,
      creatorAvatarUrl: input.creatorAvatarUrl,
      creatorIsVerified: input.creatorIsVerified,
      releasedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await updateDoc(doc(db, COLLECTIONS.users, input.creatorId), {
      videosCount: increment(1),
      isCreator: true,
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async update(id: string, patch: Partial<Video>): Promise<void> {
    if (!db) return;
    const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.thumbnailUrl !== undefined) update.thumbnailUrl = patch.thumbnailUrl;
    if (patch.visibility !== undefined) update.visibility = patch.visibility;
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.tags !== undefined) update.tags = patch.tags;
    if (patch.isFeatured !== undefined) update.isFeatured = patch.isFeatured;
    if (patch.isTrending !== undefined) update.isTrending = patch.isTrending;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.scheduledAt !== undefined) update.scheduledAt = patch.scheduledAt;
    if (patch.archivedAt !== undefined) update.archivedAt = patch.archivedAt;
    if (patch.isExclusive !== undefined) update.isExclusive = patch.isExclusive;
    if (patch.isSponsored !== undefined) update.isSponsored = patch.isSponsored;
    await updateDoc(doc(db, COLLECTIONS.videos, id), update);
  },

  async delete(id: string, creatorId: string): Promise<void> {
    if (!db) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, COLLECTIONS.videos, id));
    const [commentsSnap, likesSnap, bookmarksSnap, historySnap] = await Promise.all([
      getDocs(query(collection(db, COLLECTIONS.comments), where('videoId', '==', id), limit(100))),
      getDocs(query(collection(db, COLLECTIONS.likes), where('videoId', '==', id), limit(100))),
      getDocs(query(collection(db, COLLECTIONS.bookmarks), where('videoId', '==', id), limit(100))),
      getDocs(query(collection(db, COLLECTIONS.watchHistory), where('videoId', '==', id), limit(100))),
    ]);
    [...commentsSnap.docs, ...likesSnap.docs, ...bookmarksSnap.docs, ...historySnap.docs].forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await updateDoc(doc(db, COLLECTIONS.users, creatorId), { videosCount: increment(-1), updatedAt: serverTimestamp() });
  },

  async incrementViews(id: string, viewerId?: string): Promise<void> {
    if (!db) return;
    const now = Date.now();
    const dayMs = 86_400_000;

    // Resolve effective viewer identity: authenticated uid or guest device id
    let effectiveViewerId = viewerId;
    if (!effectiveViewerId) {
      try {
        let guestId = await AsyncStorage.getItem('guest_viewer_id');
        if (!guestId) {
          guestId = `guest_${now}_${Math.random().toString(36).slice(2, 10)}`;
          await AsyncStorage.setItem('guest_viewer_id', guestId);
        }
        effectiveViewerId = guestId;
      } catch {
        return; // can't track without an id
      }
    }

    // Fetch the video to check creator and existence
    const videoRef = doc(db, COLLECTIONS.videos, id);
    const videoSnap = await getDoc(videoRef);
    if (!videoSnap.exists()) return;
    const videoData = videoSnap.data() as Record<string, unknown>;
    const creatorId = (videoData.creatorId as string) ?? '';

    // Do NOT count views when the creator watches their own video
    if (creatorId && creatorId === effectiveViewerId) return;

    // Check for existing view record within the last 24 hours
    const viewDocId = `${effectiveViewerId}_${id}`;
    const database = db;
    const viewRef = doc(database, COLLECTIONS.videoViews, viewDocId);

    try {
      await runTransaction(database, async (tx: Transaction) => {
        const existingView = await tx.get(viewRef);
        const creatorRef = creatorId ? doc(database, COLLECTIONS.users, creatorId) : null;
        const creatorSnap = creatorRef ? await tx.get(creatorRef) : null;
        if (existingView.exists()) {
          const lastViewedAt = (existingView.data() as Record<string, unknown>).viewedAt as number ?? 0;
          // Already viewed within 24h — skip increment
          if (now - lastViewedAt < dayMs) return;
          // Update timestamp for next window
          tx.update(viewRef, { viewedAt: now });
          return; // still don't increment — one view per 24h per user
        }
        // WRITE PHASE: all reads above are complete.
        // No prior view record — create one and increment counters atomically
        tx.set(viewRef, {
          videoId: id,
          viewerId: effectiveViewerId,
          viewedAt: now,
          isGuest: !viewerId,
        });
        tx.update(videoRef, {
          viewsCount: increment(1),
          trendingScore: increment(1),
        });
        if (creatorRef && creatorSnap?.exists()) {
          tx.update(creatorRef, { totalViews: increment(1) });
        }
      });
    } catch (err) {
      console.error('[videoRepository.incrementViews] transaction failed:', err);
    }
  },

  async incrementShares(id: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLLECTIONS.videos, id), { sharesCount: increment(1) });
  },

  async archive(id: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLLECTIONS.videos, id), { status: 'archived', archivedAt: Date.now(), updatedAt: Date.now() });
  },

  async unarchive(id: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLLECTIONS.videos, id), { status: 'published', archivedAt: null, updatedAt: Date.now() });
  },

  async schedule(id: string, scheduledAt: number): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLLECTIONS.videos, id), { status: 'scheduled', scheduledAt, updatedAt: Date.now() });
  },

  async getByCreatorExcludingArchived(uid: string): Promise<Video[]> {
    const all = await this.getByCreator(uid);
    return all.filter((v) => v.archivedAt === null && v.status !== 'archived');
  },

  subscribeToVideo(id: string, callback: (video: Video | null) => void): Unsubscribe {
    if (!db) {
      callback(null);
      return () => {};
    }
    return onSnapshot(doc(db, COLLECTIONS.videos, id), (snap) => {
      callback(snap.exists() ? toVideo(snap.id, snap.data() as Record<string, unknown>) : null);
    });
  },
};

// ============================================================
// Comment Repository
// ============================================================

export interface CreateCommentInput {
  videoId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorIsCreator: boolean;
  body: string;
  parentId: string | null;
}

export const commentRepository = {
  async listForVideo(videoId: string, sort: CommentSort = 'newest'): Promise<Comment[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.comments), where('videoId', '==', videoId), limit(100)));
    const comments = snap.docs.map((d) => toComment(d.id, d.data() as Record<string, unknown>));
    if (sort === 'most_liked') {
      comments.sort((a, b) => b.likesCount - a.likesCount);
    } else {
      comments.sort((a, b) => b.createdAt - a.createdAt);
    }
    return comments;
  },

  async listReplies(parentId: string): Promise<Comment[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.comments), where('parentId', '==', parentId), limit(50)));
    return snap.docs
      .map((d) => toComment(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  async add(data: CreateCommentInput): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const now = Date.now();
    const database = db;
    const newCommentRef = doc(collection(database, COLLECTIONS.comments));
    const videoRef = doc(database, COLLECTIONS.videos, data.videoId);
    const parentRef = data.parentId ? doc(database, COLLECTIONS.comments, data.parentId) : null;

    try {
      await runTransaction(database, async (tx: Transaction) => {
        const videoSnap = await tx.get(videoRef);
        const parentSnap = parentRef ? await tx.get(parentRef) : null;

        // WRITE PHASE: all reads above are complete.
        tx.set(newCommentRef, {
          videoId: data.videoId,
          authorId: data.authorId,
          authorName: data.authorName,
          authorAvatarUrl: data.authorAvatarUrl,
          authorIsCreator: data.authorIsCreator,
          body: data.body,
          likesCount: 0,
          repliesCount: 0,
          isPinned: false,
          isEdited: false,
          parentId: data.parentId,
          createdAt: now,
          updatedAt: now,
        });
        if (videoSnap.exists()) {
          tx.update(videoRef, { commentsCount: increment(1) });
        }
        if (parentRef && parentSnap?.exists()) {
          tx.update(parentRef, { repliesCount: increment(1) });
        }
      });
    } catch (err) {
      console.error('[commentRepository.add] transaction failed:', err);
      throw err;
    }
    return newCommentRef.id;
  },

  async edit(id: string, videoId: string, newBody: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLLECTIONS.comments, id), { body: newBody, isEdited: true, updatedAt: Date.now() });
  },

  async delete(id: string, videoId: string): Promise<void> {
    if (!db) return;
    const database = db;
    const commentRef = doc(database, COLLECTIONS.comments, id);
    const videoRef = doc(database, COLLECTIONS.videos, videoId);

    // Gather replies and likes before the transaction
    const [repliesSnap, likesSnap] = await Promise.all([
      getDocs(query(collection(database, COLLECTIONS.comments), where('parentId', '==', id), limit(50))),
      getDocs(query(collection(database, COLLECTIONS.commentLikes), where('commentId', '==', id), limit(100))),
    ]);
    const replyCount = repliesSnap.size;

    const commentSnap = await getDoc(commentRef);
    const commentData = commentSnap.exists() ? commentSnap.data() as Record<string, unknown> : null;
    const parentId = commentData?.parentId as string | null;

    try {
      await runTransaction(database, async (tx: Transaction) => {
        const vSnap = await tx.get(videoRef);
        const parentRef = parentId ? doc(database, COLLECTIONS.comments, parentId) : null;
        const pSnap = parentRef ? await tx.get(parentRef) : null;

        // WRITE PHASE: all reads above are complete.
        tx.delete(commentRef);
        // Delete all replies
        repliesSnap.docs.forEach((d) => tx.delete(d.ref));
        // Delete all comment likes
        likesSnap.docs.forEach((d) => tx.delete(d.ref));
        // Decrement video commentsCount atomically
        if (vSnap.exists()) {
          tx.update(videoRef, { commentsCount: increment(-(1 + replyCount)) });
        }
        if (parentRef && pSnap?.exists()) {
          tx.update(parentRef, { repliesCount: increment(-1) });
        }
      });
    } catch (err) {
      console.error('[commentRepository.delete] transaction failed:', err);
      throw err;
    }
  },

  async togglePin(id: string, videoId: string, pinned: boolean): Promise<void> {
    if (!db) return;
    if (pinned) {
      const existingPinned = await getDocs(query(collection(db, COLLECTIONS.comments), where('videoId', '==', videoId), where('isPinned', '==', true), limit(1)));
      const unpinBatch = writeBatch(db);
      existingPinned.docs.forEach((d) => unpinBatch.update(d.ref, { isPinned: false }));
      await unpinBatch.commit();
    }
    await updateDoc(doc(db, COLLECTIONS.comments, id), { isPinned: pinned, updatedAt: Date.now() });
  },

  async report(commentId: string, reporterId: string, reason: string, description: string): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const ref = await addDoc(collection(db, COLLECTIONS.commentReports), {
      commentId, reporterId, reason, description,
      status: 'pending', createdAt: Date.now(),
    });
    return ref.id;
  },

  async isLikedByUser(uid: string, commentId: string): Promise<boolean> {
    if (!db) return false;
    const snap = await getDocs(query(collection(db, COLLECTIONS.commentLikes), where('userId', '==', uid), where('commentId', '==', commentId), limit(1)));
    return !snap.empty;
  },

  async toggleLike(uid: string, commentId: string): Promise<boolean> {
    if (!db) return false;
    const database = db;
    const existingSnap = await getDocs(query(collection(database, COLLECTIONS.commentLikes), where('userId', '==', uid), where('commentId', '==', commentId), limit(1)));
    const commentRef = doc(database, COLLECTIONS.comments, commentId);
    const isLiked = !existingSnap.empty;

    try {
      await runTransaction(database, async (tx: Transaction) => {
        const cSnap = await tx.get(commentRef);
        
        // WRITE PHASE: all reads above are complete.
        if (isLiked && existingSnap.docs[0]) {
          tx.delete(existingSnap.docs[0].ref);
          if (cSnap.exists()) {
            tx.update(commentRef, { likesCount: increment(-1) });
          }
        } else {
          const newLikeRef = doc(collection(database, COLLECTIONS.commentLikes));
          tx.set(newLikeRef, { userId: uid, commentId, createdAt: Date.now() } as Omit<CommentLike, 'id'>);
          if (cSnap.exists()) {
            tx.update(commentRef, { likesCount: increment(1) });
          }
        }
      });
    } catch (err) {
      console.error('[commentRepository.toggleLike] transaction failed:', err);
      return isLiked; // return previous state on failure
    }
    return !isLiked;
  },

  subscribeToVideoComments(videoId: string, callback: (comments: Comment[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.comments), where('videoId', '==', videoId), limit(100));
    return onSnapshot(q, (snap) => {
      callback(snap.docs
        .map((d) => toComment(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt - a.createdAt));
    });
  },
};

// ============================================================
// Like Repository
// ============================================================

export const likeRepository = {
  async isLiked(uid: string, videoId: string): Promise<boolean> {
    if (!db) return false;
    const snap = await getDocs(query(collection(db, COLLECTIONS.likes), where('userId', '==', uid), where('videoId', '==', videoId), limit(1)));
    return !snap.empty;
  },

  async toggle(uid: string, videoId: string): Promise<boolean> {
    if (!db) return false;
    const database = db;
    const existingSnap = await getDocs(query(collection(database, COLLECTIONS.likes), where('userId', '==', uid), where('videoId', '==', videoId), limit(1)));
    const videoRef = doc(database, COLLECTIONS.videos, videoId);
    const isLiked = !existingSnap.empty;

    try {
      await runTransaction(database, async (tx: Transaction) => {
        // READ PHASE: Get all documents before any writes
        const vSnap = await tx.get(videoRef);
        if (!vSnap.exists()) return;
        const creatorId = (vSnap.data() as Record<string, unknown>).creatorId as string | undefined;
        
        let creatorSnap = null;
        if (creatorId) {
          const creatorRef = doc(database, COLLECTIONS.users, creatorId);
          creatorSnap = await tx.get(creatorRef);
        }
        
        // WRITE PHASE: Execute all writes after all reads
        if (isLiked && existingSnap.docs[0]) {
          // Unlike
          tx.delete(existingSnap.docs[0].ref);
          tx.update(videoRef, { likesCount: increment(-1) });
          if (creatorId && creatorSnap?.exists()) {
            const creatorRef = doc(database, COLLECTIONS.users, creatorId);
            tx.update(creatorRef, { totalLikes: increment(-1) });
          }
        } else {
          // Like
          const newLikeRef = doc(collection(database, COLLECTIONS.likes));
          tx.set(newLikeRef, { userId: uid, videoId, createdAt: Date.now() } as Omit<Like, 'id'>);
          tx.update(videoRef, { likesCount: increment(1) });
          if (creatorId && creatorSnap?.exists()) {
            const creatorRef = doc(database, COLLECTIONS.users, creatorId);
            tx.update(creatorRef, { totalLikes: increment(1) });
          }
        }
      });
    } catch (err) {
      console.error('[likeRepository.toggle] transaction failed:', err);
      return isLiked; // return previous state on failure
    }
    return !isLiked;
  },

  async listLikedVideos(uid: string): Promise<Like[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.likes), where('userId', '==', uid), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Like, 'id'>) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async getLikedVideoIds(uid: string): Promise<string[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.likes), where('userId', '==', uid), limit(100)));
    return snap.docs.map((d) => (d.data() as { videoId: string }).videoId);
  },

  subscribeToUserLikes(uid: string, callback: (likes: Like[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.likes), where('userId', '==', uid), limit(50));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Like, 'id'>) })));
    });
  },
};

// ============================================================
// Bookmark Repository
// ============================================================

export const bookmarkRepository = {
  async listForUser(uid: string): Promise<Bookmark[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.bookmarks), where('userId', '==', uid), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Bookmark, 'id'>) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async add(uid: string, videoId: string, playlistId: string | null = null): Promise<void> {
    if (!db) return;
    const database = db;
    const existingSnap = await getDocs(query(collection(database, COLLECTIONS.bookmarks), where('userId', '==', uid), where('videoId', '==', videoId), limit(1)));
    if (!existingSnap.empty) return; // already bookmarked

    const videoRef = doc(database, COLLECTIONS.videos, videoId);
    try {
      await runTransaction(database, async (tx: Transaction) => {
        const vSnap = await tx.get(videoRef);
        if (!vSnap.exists()) return;
        const newBookmarkRef = doc(collection(database, COLLECTIONS.bookmarks));
        tx.set(newBookmarkRef, { userId: uid, videoId, playlistId, createdAt: Date.now() } as Omit<Bookmark, 'id'>);
        tx.update(videoRef, { bookmarksCount: increment(1) });
      });
    } catch (err) {
      console.error('[bookmarkRepository.add] transaction failed:', err);
    }
  },

  async remove(bookmarkId: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.bookmarks, bookmarkId));
  },

  async removeByVideo(uid: string, videoId: string): Promise<void> {
    if (!db) return;
    const database = db;
    const snap = await getDocs(query(collection(database, COLLECTIONS.bookmarks), where('userId', '==', uid), where('videoId', '==', videoId)));
    if (snap.empty) return;
    const videoRef = doc(database, COLLECTIONS.videos, videoId);
    try {
      await runTransaction(database, async (tx: Transaction) => {
        const vSnap = await tx.get(videoRef);

        // WRITE PHASE: all reads above are complete.
        snap.docs.forEach((d) => tx.delete(d.ref));
        if (vSnap.exists()) {
          tx.update(videoRef, { bookmarksCount: increment(-1) });
        }
      });
    } catch (err) {
      console.error('[bookmarkRepository.removeByVideo] transaction failed:', err);
    }
  },

  subscribeToUserBookmarks(uid: string, callback: (bookmarks: Bookmark[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.bookmarks), where('userId', '==', uid), limit(50));
    return onSnapshot(q, (snap) => {
      callback(snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Bookmark, 'id'>) }))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
    });
  },
};

// ============================================================
// Watch History Repository
// ============================================================

export const watchHistoryRepository = {
  async listForUser(uid: string): Promise<WatchHistoryItem[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.watchHistory), where('userId', '==', uid), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<WatchHistoryItem, 'id'>) }))
      .sort((a, b) => (b.lastWatchedAt ?? 0) - (a.lastWatchedAt ?? 0));
  },

  async upsert(uid: string, item: Omit<WatchHistoryItem, 'id' | 'userId'>): Promise<void> {
    if (!db) return;
    const snap = await getDocs(query(collection(db, COLLECTIONS.watchHistory), where('userId', '==', uid), where('videoId', '==', item.videoId), limit(1)));
    const completionPercentage = item.durationSeconds > 0 ? Math.round((item.progressSeconds / item.durationSeconds) * 100) : 0;
    const payload = { ...item, completionPercentage, completed: item.progress >= 0.95 };
    if (snap.empty) {
      await addDoc(collection(db, COLLECTIONS.watchHistory), { ...payload, userId: uid } as Omit<WatchHistoryItem, 'id'>);
    } else {
      await updateDoc(snap.docs[0].ref, payload);
    }
  },

  async getProgress(uid: string, videoId: string): Promise<WatchHistoryItem | null> {
    if (!db) return null;
    const snap = await getDocs(query(collection(db, COLLECTIONS.watchHistory), where('userId', '==', uid), where('videoId', '==', videoId), limit(1)));
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<WatchHistoryItem, 'id'>) };
  },

  async clearHistory(uid: string): Promise<void> {
    if (!db) return;
    const snap = await getDocs(query(collection(db, COLLECTIONS.watchHistory), where('userId', '==', uid), limit(100)));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  },

  async removeItem(id: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.watchHistory, id));
  },

  subscribeToUserHistory(uid: string, callback: (history: WatchHistoryItem[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.watchHistory), where('userId', '==', uid), limit(20));
    return onSnapshot(q, (snap) => {
      callback(snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<WatchHistoryItem, 'id'>) }))
        .sort((a, b) => (b.lastWatchedAt ?? 0) - (a.lastWatchedAt ?? 0)));
    });
  },
};

// ============================================================
// Playlist Repository
// ============================================================

export interface CreatePlaylistInput {
  title: string;
  description: string;
  isPrivate: boolean;
  type: 'custom' | 'watch_later' | 'favorites' | 'liked';
}

export const playlistRepository = {
  async listForUser(uid: string): Promise<Playlist[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.playlists), where('userId', '==', uid), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Playlist, 'id'>) }))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  },

  async create(uid: string, data: CreatePlaylistInput): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const now = Date.now();
    const ref = await addDoc(collection(db, COLLECTIONS.playlists), {
      userId: uid,
      title: data.title,
      description: data.description,
      coverUrl: null,
      videoIds: [],
      isPrivate: data.isPrivate,
      type: data.type,
      videoCount: 0,
      createdAt: now,
      updatedAt: now,
    } as Omit<Playlist, 'id'>);
    return ref.id;
  },

  async rename(playlistId: string, title: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLLECTIONS.playlists, playlistId), { title, updatedAt: Date.now() });
  },

  async addVideo(playlistId: string, videoId: string): Promise<void> {
    if (!db) return;
    const ref = doc(db, COLLECTIONS.playlists, playlistId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const videoIds = (data.videoIds as string[]) ?? [];
    if (videoIds.includes(videoId)) return;
    await updateDoc(ref, { videoIds: [...videoIds, videoId], videoCount: videoIds.length + 1, updatedAt: Date.now() });
  },

  async removeVideo(playlistId: string, videoId: string): Promise<void> {
    if (!db) return;
    const ref = doc(db, COLLECTIONS.playlists, playlistId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const videoIds = (data.videoIds as string[]) ?? [];
    const filtered = videoIds.filter((v) => v !== videoId);
    await updateDoc(ref, { videoIds: filtered, videoCount: filtered.length, updatedAt: Date.now() });
  },

  async delete(playlistId: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.playlists, playlistId));
  },

  async search(term: string, max: number = 10): Promise<Playlist[]> {
    if (!db) return [];
    const lower = term.toLowerCase().trim();
    if (!lower) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.playlists), where('isPrivate', '==', false), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Playlist, 'id'>) }))
      .filter((p) => p.title.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, max);
  },

  subscribeToUserPlaylists(uid: string, callback: (playlists: Playlist[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.playlists), where('userId', '==', uid), limit(50));
    return onSnapshot(q, (snap) => {
      callback(snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Playlist, 'id'>) }))
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)));
    });
  },
};

// ============================================================
// Follow Repository
// ============================================================

export const followRepository = {
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!db) return false;
    const snap = await getDocs(query(collection(db, COLLECTIONS.follows), where('followerId', '==', followerId), where('followingId', '==', followingId), limit(1)));
    return !snap.empty;
  },

  async toggle(followerId: string, followingId: string): Promise<boolean> {
    if (!db) return false;
    if (followerId === followingId) return false; // prevent following yourself
    const database = db;
    const existingSnap = await getDocs(query(collection(database, COLLECTIONS.follows), where('followerId', '==', followerId), where('followingId', '==', followingId), limit(1)));
    const isFollowing = !existingSnap.empty;
    const followerRef = doc(database, COLLECTIONS.users, followerId);
    const followingRef = doc(database, COLLECTIONS.users, followingId);

    try {
      await runTransaction(database, async (tx: Transaction) => {
        const followSnap = await tx.get(query(
          collection(database, COLLECTIONS.follows),
          where('followerId', '==', followerId),
          where('followingId', '==', followingId),
          limit(1),
        ));
        const fSnap = await tx.get(followingRef);
        const erSnap = await tx.get(followerRef);
        const currentlyFollowing = !followSnap.empty;

        // WRITE PHASE: all reads above are complete.
        if (currentlyFollowing) {
          // Unfollow
          tx.delete(followSnap.docs[0].ref);
          if (fSnap.exists()) tx.update(followingRef, { followersCount: increment(-1) });
          if (erSnap.exists()) tx.update(followerRef, { followingCount: increment(-1) });
        } else {
          // Follow — create relationship doc
          const newFollowRef = doc(collection(database, COLLECTIONS.follows));
          tx.set(newFollowRef, { followerId, followingId, createdAt: Date.now() } as Omit<Follow, 'id'>);
          if (fSnap.exists()) tx.update(followingRef, { followersCount: increment(1) });
          if (erSnap.exists()) tx.update(followerRef, { followingCount: increment(1) });
        }
      });
    } catch (err) {
      console.error('[followRepository.toggle] transaction failed:', err);
      return isFollowing; // return previous state on failure
    }
    return !isFollowing;
  },

  async listFollowing(uid: string): Promise<Follow[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.follows), where('followerId', '==', uid), limit(100)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, 'id'>) }));
  },

  async listFollowers(uid: string): Promise<Follow[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.follows), where('followingId', '==', uid), limit(100)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, 'id'>) }));
  },

  async getFollowingIds(uid: string): Promise<string[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.follows), where('followerId', '==', uid), limit(100)));
    return snap.docs.map((d) => (d.data() as { followingId: string }).followingId);
  },

  subscribeToUserFollows(uid: string, callback: (follows: Follow[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.follows), where('followerId', '==', uid), limit(100));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Follow, 'id'>) })));
    });
  },
};

// ============================================================
// Subscription Repository
// ============================================================

export const subscriptionRepository = {
  async isSubscribed(subscriberId: string, creatorId: string): Promise<boolean> {
    if (!db) return false;
    const snap = await getDocs(query(collection(db, COLLECTIONS.subscriptions), where('subscriberId', '==', subscriberId), where('creatorId', '==', creatorId), limit(1)));
    return !snap.empty;
  },

  async toggle(subscriberId: string, creatorId: string): Promise<boolean> {
    if (!db) return false;
    if (subscriberId === creatorId) return false; // prevent subscribing to yourself
    const database = db;
    const existingSnap = await getDocs(query(collection(database, COLLECTIONS.subscriptions), where('subscriberId', '==', subscriberId), where('creatorId', '==', creatorId), limit(1)));
    const isSubscribed = !existingSnap.empty;
    const creatorRef = doc(database, COLLECTIONS.users, creatorId);

    try {
      await runTransaction(database, async (tx: Transaction) => {
        const subscriptionSnap = await tx.get(query(
          collection(database, COLLECTIONS.subscriptions),
          where('subscriberId', '==', subscriberId),
          where('creatorId', '==', creatorId),
          limit(1),
        ));
        const cSnap = await tx.get(creatorRef);

        // WRITE PHASE: all reads above are complete.
        if (!subscriptionSnap.empty) {
          // Unsubscribe
          tx.delete(subscriptionSnap.docs[0].ref);
          if (cSnap.exists()) tx.update(creatorRef, { subscribersCount: increment(-1) });
        } else {
          // Subscribe — create one subscription per user per creator
          const newSubRef = doc(collection(database, COLLECTIONS.subscriptions));
          tx.set(newSubRef, { subscriberId, creatorId, createdAt: Date.now() } as Omit<Subscription, 'id'>);
          if (cSnap.exists()) tx.update(creatorRef, { subscribersCount: increment(1) });
        }
      });
    } catch (err) {
      console.error('[subscriptionRepository.toggle] transaction failed:', err);
      return isSubscribed; // return previous state on failure
    }
    return !isSubscribed;
  },

  async listSubscriptions(uid: string): Promise<Subscription[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.subscriptions), where('subscriberId', '==', uid), limit(100)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subscription, 'id'>) }));
  },

  async getSubscribedCreatorIds(uid: string): Promise<string[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.subscriptions), where('subscriberId', '==', uid), limit(100)));
    return snap.docs.map((d) => (d.data() as { creatorId: string }).creatorId);
  },

  subscribeToUserSubscriptions(uid: string, callback: (subscriptions: Subscription[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.subscriptions), where('subscriberId', '==', uid), limit(100));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subscription, 'id'>) })));
    });
  },
};

// ============================================================
// Notification Repository
// ============================================================

export const notificationRepository = {
  async listForUser(uid: string): Promise<AppNotification[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.notifications), where('userId', '==', uid), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async markRead(id: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLLECTIONS.notifications, id), { read: true });
  },

  async markAllRead(uid: string): Promise<void> {
    if (!db) return;
    const snap = await getDocs(query(collection(db, COLLECTIONS.notifications), where('userId', '==', uid), where('read', '==', false)));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  },

  async create(data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const ref = await addDoc(collection(db, COLLECTIONS.notifications), {
      ...data,
      read: false,
      createdAt: Date.now(),
    } as Omit<AppNotification, 'id'>);
    return ref.id;
  },

  subscribeToUserNotifications(uid: string, callback: (notifications: AppNotification[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.notifications), where('userId', '==', uid), limit(50));
    return onSnapshot(q, (snap) => {
      callback(snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) }))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
    });
  },
};

// ============================================================
// Report Repository
// ============================================================

export const reportRepository = {
  async create(data: Omit<VideoReport, 'id' | 'status' | 'createdAt'>): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const ref = await addDoc(collection(db, COLLECTIONS.reports), { ...data, status: 'pending', createdAt: Date.now() } as Omit<VideoReport, 'id'>);
    return ref.id;
  },
};

// ============================================================
// Blocked Users Repository
// ============================================================

export const blockedUserRepository = {
  async listForUser(uid: string): Promise<BlockedUser[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.blockedUsers), where('blockerId', '==', uid), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<BlockedUser, 'id'>) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async block(blockerId: string, blockedId: string, blockedName: string, blockedAvatarUrl: string | null): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const existing = await getDocs(query(collection(db, COLLECTIONS.blockedUsers), where('blockerId', '==', blockerId), where('blockedId', '==', blockedId), limit(1)));
    if (!existing.empty) return existing.docs[0].id;
    const ref = await addDoc(collection(db, COLLECTIONS.blockedUsers), {
      blockerId, blockedId, blockedName, blockedAvatarUrl, createdAt: Date.now(),
    } as Omit<BlockedUser, 'id'>);
    return ref.id;
  },

  async unblock(id: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.blockedUsers, id));
  },

  subscribeToUserBlocked(uid: string, callback: (blocked: BlockedUser[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.blockedUsers), where('blockerId', '==', uid), limit(50));
    return onSnapshot(q, (snap) => {
      callback(snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<BlockedUser, 'id'>) }))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
    });
  },
};

// ============================================================
// Search History Repository
// ============================================================

export const searchHistoryRepository = {
  async listForUser(uid: string): Promise<SearchHistory[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.searchHistory), where('userId', '==', uid), limit(10)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<SearchHistory, 'id'>) }))
      .sort((a, b) => (b.searchedAt ?? 0) - (a.searchedAt ?? 0));
  },

  async add(uid: string, term: string): Promise<void> {
    if (!db) return;
    const existing = await getDocs(query(collection(db, COLLECTIONS.searchHistory), where('userId', '==', uid), where('term', '==', term), limit(1)));
    if (!existing.empty) {
      await updateDoc(existing.docs[0].ref, { searchedAt: Date.now() });
      return;
    }
    await addDoc(collection(db, COLLECTIONS.searchHistory), { userId: uid, term, searchedAt: Date.now() } as Omit<SearchHistory, 'id'>);
  },

  async clearAll(uid: string): Promise<void> {
    if (!db) return;
    const snap = await getDocs(query(collection(db, COLLECTIONS.searchHistory), where('userId', '==', uid), limit(50)));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  },

  subscribeToUserSearchHistory(uid: string, callback: (history: SearchHistory[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.searchHistory), where('userId', '==', uid), limit(10));
    return onSnapshot(q, (snap) => {
      callback(snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<SearchHistory, 'id'>) }))
        .sort((a, b) => (b.searchedAt ?? 0) - (a.searchedAt ?? 0)));
    });
  },
};

// ============================================================
// Creator Analytics Repository
// ============================================================

export const creatorAnalyticsRepository = {
  async getAnalytics(creatorId: string): Promise<CreatorAnalytics> {
    if (!db) {
      return {
        totalVideos: 0, totalViews: 0, totalLikes: 0, totalComments: 0, totalWatchTimeMinutes: 0,
        followersCount: 0, subscribersCount: 0,
        recentUploads: [], popularVideos: [], recentComments: [], growthData: [],
      };
    }
    const [userSnap, videosSnap, commentsSnap] = await Promise.all([
      getDoc(doc(db, COLLECTIONS.users, creatorId)),
      getDocs(query(collection(db, COLLECTIONS.videos), where('creatorId', '==', creatorId), limit(50))),
      getDocs(query(collection(db, COLLECTIONS.comments), limit(20))),
    ]);
    const user = userSnap.exists() ? toUser(userSnap.id, userSnap.data() as Record<string, unknown>) : null;
    const videos = videosSnap.docs.map((d) => toVideo(d.id, d.data() as Record<string, unknown>));
    const recentUploads = [...videos].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    const popularVideos = [...videos].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 5);
    const videoIds = new Set(videos.map((v) => v.id));
    const recentComments = commentsSnap.docs
      .map((d) => toComment(d.id, d.data() as Record<string, unknown>))
      .filter((c) => videoIds.has(c.videoId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
    const totalViews = videos.reduce((sum, v) => sum + v.viewsCount, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likesCount, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.commentsCount, 0);
    const totalWatchTimeMinutes = Math.round(videos.reduce((sum, v) => sum + v.viewsCount * v.durationSeconds, 0) / 60);
    const growthData = generateMockGrowthData(totalViews, user?.subscribersCount ?? 0);
    return {
      totalVideos: videos.length,
      totalViews,
      totalLikes,
      totalComments,
      totalWatchTimeMinutes,
      followersCount: user?.followersCount ?? 0,
      subscribersCount: user?.subscribersCount ?? 0,
      recentUploads,
      popularVideos,
      recentComments,
      growthData,
    };
  },
};

function generateMockGrowthData(currentViews: number, currentSubs: number): GrowthDataPoint[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const factor = currentViews > 0 ? currentViews / 6 : 100;
  const subsFactor = currentSubs > 0 ? currentSubs / 6 : 10;
  return months.map((label, i) => ({
    label,
    views: Math.round(factor * (0.3 + i * 0.15)),
    subscribers: Math.round(subsFactor * (0.2 + i * 0.16)),
  }));
}

// ============================================================
// Reel Repository
// ============================================================

export const reelRepository = {
  async getFeed(pageSize: number = 10, lastDoc?: DocumentSnapshot | null): Promise<PaginatedResult<Reel>> {
    if (!db) return { items: [], hasMore: false, lastDoc: null };
    const constraints: QueryConstraint[] = [limit(pageSize + 1)];
    if (lastDoc) constraints.push(startAfter(lastDoc));
    const snap = await getDocs(query(collection(db, COLLECTIONS.reels), ...constraints));
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const reels = pageDocs.map((d) => toReel(d.id, d.data() as Record<string, unknown>));
    return { items: reels, hasMore, lastDoc: pageDocs[pageDocs.length - 1] ?? null };
  },

  async getByCreator(uid: string, pageSize: number = 20): Promise<Reel[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLLECTIONS.reels), where('creatorId', '==', uid), limit(pageSize)));
    return snap.docs.map((d) => toReel(d.id, d.data() as Record<string, unknown>));
  },

  async create(data: CreateReelInput): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const now = Date.now();
    const ref = await addDoc(collection(db, COLLECTIONS.reels), {
      ...data,
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      savesCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await updateDoc(doc(db, COLLECTIONS.users, data.creatorId), { videosCount: increment(1) });
    return ref.id;
  },

  async incrementViews(id: string, viewerId?: string): Promise<void> {
    if (!db) return;
    const now = Date.now();
    const dayMs = 86_400_000;
    let effectiveViewerId = viewerId;
    if (!effectiveViewerId) {
      try {
        let guestId = await AsyncStorage.getItem('guest_reel_viewer_id');
        if (!guestId) {
          guestId = `guest_${now}_${Math.random().toString(36).slice(2, 10)}`;
          await AsyncStorage.setItem('guest_reel_viewer_id', guestId);
        }
        effectiveViewerId = guestId;
      } catch {
        return;
      }
    }
    const reelRef = doc(db, COLLECTIONS.reels, id);
    const reelSnap = await getDoc(reelRef);
    if (!reelSnap.exists()) return;
    const creatorId = (reelSnap.data() as Record<string, unknown>).creatorId as string | undefined;
    if (creatorId && creatorId === effectiveViewerId) return;
    const viewDocId = `${effectiveViewerId}_${id}`;
    const viewRef = doc(db, COLLECTIONS.reelViews, viewDocId);
    try {
      const database = db;
      await runTransaction(database, async (tx: Transaction) => {
        const existing = await tx.get(viewRef);
        if (existing.exists()) {
          const lastViewedAt = (existing.data() as Record<string, unknown>).viewedAt as number ?? 0;
          if (now - lastViewedAt < dayMs) return;
          tx.update(viewRef, { viewedAt: now });
          return;
        }
        tx.set(viewRef, { reelId: id, viewerId: effectiveViewerId, viewedAt: now, isGuest: !viewerId });
        tx.update(reelRef, { viewsCount: increment(1) });
      });
    } catch (err) {
      console.error('[reelRepository.incrementViews] transaction failed:', err);
    }
  },

  async incrementShares(id: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLLECTIONS.reels, id), { sharesCount: increment(1) });
  },

  async toggleLike(uid: string, reelId: string): Promise<boolean> {
    if (!db) return false;
    const likeRef = doc(db, COLLECTIONS.reelLikes, `${uid}_${reelId}`);
    const reelRef = doc(db, COLLECTIONS.reels, reelId);
    const database = db;
    try {
      const nextLiked = await runTransaction(database, async (tx: Transaction) => {
        const [likeSnap, reelSnap] = await Promise.all([tx.get(likeRef), tx.get(reelRef)]);
        const isLiked = likeSnap.exists();
        if (isLiked) tx.delete(likeRef);
        else tx.set(likeRef, { userId: uid, reelId, createdAt: Date.now() });
        if (reelSnap.exists()) tx.update(reelRef, { likesCount: increment(isLiked ? -1 : 1) });
        return !isLiked;
      });
      return nextLiked;
    } catch (err) {
      console.error('[reelRepository.toggleLike] transaction failed:', err);
      return false;
    }
  },

  async toggleSave(uid: string, reelId: string): Promise<boolean> {
    if (!db) return false;
    const saveRef = doc(db, COLLECTIONS.reelSaves, `${uid}_${reelId}`);
    const reelRef = doc(db, COLLECTIONS.reels, reelId);
    const database = db;
    try {
      const nextSaved = await runTransaction(database, async (tx: Transaction) => {
        const [saveSnap, reelSnap] = await Promise.all([tx.get(saveRef), tx.get(reelRef)]);
        const isSaved = saveSnap.exists();
        if (isSaved) tx.delete(saveRef);
        else tx.set(saveRef, { userId: uid, reelId, createdAt: Date.now() });
        if (reelSnap.exists()) tx.update(reelRef, { savesCount: increment(isSaved ? -1 : 1) });
        return !isSaved;
      });
      return nextSaved;
    } catch (err) {
      console.error('[reelRepository.toggleSave] transaction failed:', err);
      return false;
    }
  },

  async isLiked(uid: string, reelId: string): Promise<boolean> {
    if (!db) return false;
    const snap = await getDocs(query(collection(db, COLLECTIONS.reelLikes), where('userId', '==', uid), where('reelId', '==', reelId), limit(1)));
    return !snap.empty;
  },

  async isSaved(uid: string, reelId: string): Promise<boolean> {
    if (!db) return false;
    const snap = await getDocs(query(collection(db, COLLECTIONS.reelSaves), where('userId', '==', uid), where('reelId', '==', reelId), limit(1)));
    return !snap.empty;
  },

  subscribeToReel(reelId: string, callback: (reel: Reel | null) => void): Unsubscribe {
    if (!db) {
      callback(null);
      return () => {};
    }
    return onSnapshot(doc(db, COLLECTIONS.reels, reelId), (snap) => {
      callback(snap.exists() ? toReel(snap.id, snap.data() as Record<string, unknown>) : null);
    });
  },

  // ---- Reel Comments ----

  async addReelComment(data: {
    reelId: string;
    authorId: string;
    authorName: string;
    authorAvatarUrl: string | null;
    authorIsCreator: boolean;
    body: string;
    parentId: string | null;
  }): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const now = Date.now();
    const database = db;
    const newCommentRef = doc(collection(database, COLLECTIONS.comments));
    const reelRef = doc(database, COLLECTIONS.reels, data.reelId);
    const parentRef = data.parentId ? doc(database, COLLECTIONS.comments, data.parentId) : null;

    try {
      await runTransaction(database, async (tx: Transaction) => {
        // READ PHASE: Get all documents before any writes
        const reelSnap = await tx.get(reelRef);
        let parentSnap = null;
        if (parentRef) {
          parentSnap = await tx.get(parentRef);
        }
        
        // WRITE PHASE: Execute all writes after reads
        tx.set(newCommentRef, {
          videoId: data.reelId,
          authorId: data.authorId,
          authorName: data.authorName,
          authorAvatarUrl: data.authorAvatarUrl,
          authorIsCreator: data.authorIsCreator,
          body: data.body,
          likesCount: 0,
          repliesCount: 0,
          isPinned: false,
          isEdited: false,
          parentId: data.parentId,
          createdAt: now,
          updatedAt: now,
        });
        if (reelSnap.exists()) {
          tx.update(reelRef, { commentsCount: increment(1) });
        }
        if (parentRef && parentSnap?.exists()) {
          tx.update(parentRef, { repliesCount: increment(1) });
        }
      });
    } catch (err) {
      console.error('[reelRepository.addReelComment] transaction failed:', err);
      throw err;
    }
    return newCommentRef.id;
  },

  async deleteReelComment(commentId: string, reelId: string): Promise<void> {
    if (!db) return;
    const database = db;
    const commentRef = doc(database, COLLECTIONS.comments, commentId);
    const reelRef = doc(database, COLLECTIONS.reels, reelId);

    const [repliesSnap, likesSnap] = await Promise.all([
      getDocs(query(collection(database, COLLECTIONS.comments), where('parentId', '==', commentId), limit(50))),
      getDocs(query(collection(database, COLLECTIONS.commentLikes), where('commentId', '==', commentId), limit(100))),
    ]);
    const replyCount = repliesSnap.size;

    const commentSnap = await getDoc(commentRef);
    const commentData = commentSnap.exists() ? commentSnap.data() as Record<string, unknown> : null;
    const parentId = commentData?.parentId as string | null;

    try {
      await runTransaction(database, async (tx: Transaction) => {
        // READ PHASE: Get all documents before any writes
        const rSnap = await tx.get(reelRef);
        let pSnap = null;
        if (parentId) {
          const parentRef = doc(database, COLLECTIONS.comments, parentId);
          pSnap = await tx.get(parentRef);
        }
        
        // WRITE PHASE: Execute all writes after reads
        tx.delete(commentRef);
        repliesSnap.docs.forEach((d) => tx.delete(d.ref));
        likesSnap.docs.forEach((d) => tx.delete(d.ref));
        if (rSnap.exists()) {
          tx.update(reelRef, { commentsCount: increment(-(1 + replyCount)) });
        }
        if (parentId && pSnap?.exists()) {
          const parentRef = doc(database, COLLECTIONS.comments, parentId);
          tx.update(parentRef, { repliesCount: increment(-1) });
        }
      });
    } catch (err) {
      console.error('[reelRepository.deleteReelComment] transaction failed:', err);
      throw err;
    }
  },

  subscribeToReelComments(reelId: string, callback: (comments: Comment[]) => void): Unsubscribe {
    if (!db) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTIONS.comments), where('videoId', '==', reelId), limit(100));
    return onSnapshot(q, (snap) => {
      callback(snap.docs
        .map((d) => toComment(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt - a.createdAt));
    });
  },

  async recordQualifiedView(reelId: string, viewerId: string, watchDurationSeconds: number, videoDurationSeconds: number): Promise<boolean> {
    if (!db) return false;
    // Skip if viewer is the creator
    const reelSnap = await getDoc(doc(db, COLLECTIONS.reels, reelId));
    if (!reelSnap.exists()) return false;
    const creatorId = (reelSnap.data() as Record<string, unknown>).creatorId as string | undefined;
    if (creatorId && creatorId === viewerId) return false;

    // Require at least 3 seconds or 50% of video watched
    const minDuration = Math.min(3, videoDurationSeconds * 0.5);
    if (watchDurationSeconds < minDuration) return false;

    const now = Date.now();
    const dayMs = 86_400_000;
    const viewDocId = `${viewerId}_${reelId}`;
    const viewRef = doc(db, COLLECTIONS.reelViews, viewDocId);
    const reelRef = doc(db, COLLECTIONS.reels, reelId);

    try {
      const database = db;
      await runTransaction(database, async (tx: Transaction) => {
        const existing = await tx.get(viewRef);
        if (existing.exists()) {
          const lastViewedAt = (existing.data() as Record<string, unknown>).viewedAt as number ?? 0;
          if (now - lastViewedAt < dayMs) return;
          tx.update(viewRef, { viewedAt: now });
        } else {
          tx.set(viewRef, { reelId, viewerId, viewedAt: now, isGuest: false });
        }
        tx.update(reelRef, { viewsCount: increment(1) });
      });
      return true;
    } catch (err) {
      console.error('[reelRepository.recordQualifiedView] transaction failed:', err);
      return false;
    }
  },

  async toggleReelFollow(followerId: string, followingId: string): Promise<boolean> {
    if (!db) return false;
    const followRef = doc(db, COLLECTIONS.follows, `${followerId}_${followingId}`);
    const followerRef = doc(db, COLLECTIONS.users, followingId);
    const followingRef = doc(db, COLLECTIONS.users, followerId);

    try {
      const nextFollowing = await runTransaction(db, async (tx: Transaction) => {
        const [followSnap, followerSnap, followingSnap] = await Promise.all([
          tx.get(followRef),
          tx.get(followerRef),
          tx.get(followingRef),
        ]);
        const isFollowing = followSnap.exists();
        if (isFollowing) tx.delete(followRef);
        else tx.set(followRef, { followerId, followingId, createdAt: Date.now() });
        if (followerSnap.exists()) tx.update(followerRef, { followersCount: increment(isFollowing ? -1 : 1) });
        if (followingSnap.exists()) tx.update(followingRef, { followingCount: increment(isFollowing ? -1 : 1) });
        return !isFollowing;
      });
      return nextFollowing;
    } catch (err) {
      console.error('[reelRepository.toggleReelFollow] transaction failed:', err);
      return false;
    }
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!db) return false;
    const snap = await getDocs(query(collection(db, COLLECTIONS.follows), where('followerId', '==', followerId), where('followingId', '==', followingId), limit(1)));
    return !snap.empty;
  },
};

export const COLLECTION_NAMES = COLLECTIONS;
