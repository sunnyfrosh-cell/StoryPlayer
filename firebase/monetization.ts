import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  orderBy,
  type Unsubscribe,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { videoRepository } from './firestore';
import type {
  Video,
  VideoAnalytics,
  RetentionDataPoint,
  TrafficSourceData,
  DailyViewData,
  Donation,
  CreatorWallet,
  WalletTransaction,
  WithdrawalRequest,
  PremiumMembership,
  PremiumPlan,
  AdPlacement,
  AdminReport,
  ReportTargetType,
  ReportStatus,
  Announcement,
  CreatorStudioSummary,
  GrowthDataPoint,
  User,
  UserSuspendStatus,
} from '@/types';

const ts = (v: unknown): number =>
  v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : 0;

const COLL = {
  videoAnalytics: 'videoAnalytics',
  donations: 'donations',
  walletTransactions: 'walletTransactions',
  withdrawals: 'withdrawals',
  premiumMemberships: 'premiumMemberships',
  adminReports: 'adminReports',
  announcements: 'announcements',
  adPlacements: 'adPlacements',
  users: 'users',
  videos: 'videos',
} as const;

// ============================================================
// Video Analytics Repository
// ============================================================

function generateMockRetention(): RetentionDataPoint[] {
  return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct) => ({
    percent: pct,
    retention: Math.max(20, 100 - pct * 0.7 - Math.random() * 10),
  }));
}

function generateMockTrafficSources(): TrafficSourceData[] {
  return [
    { source: 'Home feed', percentage: 38 },
    { source: 'Search', percentage: 24 },
    { source: 'Recommended', percentage: 18 },
    { source: 'Creator profile', percentage: 12 },
    { source: 'External', percentage: 8 },
  ];
}

function generateMockDailyViews(views: number): DailyViewData[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const factor = views > 0 ? views / 7 : 50;
  return days.map((d) => ({
    date: d,
    views: Math.round(factor * (0.5 + Math.random())),
  }));
}

export const videoAnalyticsRepository = {
  async getForVideo(videoId: string): Promise<VideoAnalytics | null> {
    if (!db) return null;
    const video = await videoRepository.getById(videoId);
    if (!video) return null;
    const watchTimeSeconds = video.viewsCount * video.durationSeconds * 0.6;
    const avgWatch = video.durationSeconds > 0 ? Math.round(video.durationSeconds * 0.6) : 0;
    return {
      videoId,
      views: video.viewsCount,
      uniqueViewers: Math.round(video.viewsCount * 0.75),
      likes: video.likesCount,
      comments: video.commentsCount,
      shares: video.sharesCount,
      saves: video.bookmarksCount,
      watchTimeSeconds,
      averageWatchDurationSeconds: avgWatch,
      audienceRetention: generateMockRetention(),
      trafficSources: generateMockTrafficSources(),
      dailyViews: generateMockDailyViews(video.viewsCount),
    };
  },
};

// ============================================================
// Donation Repository
// ============================================================

export interface CreateDonationInput {
  fromUserId: string;
  fromUserName: string;
  fromUserAvatarUrl: string | null;
  toCreatorId: string;
  amountUsd: number;
  message: string;
}

export const donationRepository = {
  async create(data: CreateDonationInput): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const ref = await addDoc(collection(db, COLL.donations), {
      ...data,
      status: 'completed',
      createdAt: Date.now(),
    } as Omit<Donation, 'id'>);
    return ref.id;
  },

  async listForCreator(uid: string): Promise<Donation[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLL.donations), where('toCreatorId', '==', uid), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Donation, 'id'>) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async listForUser(uid: string): Promise<Donation[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLL.donations), where('fromUserId', '==', uid), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Donation, 'id'>) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  subscribeToCreatorDonations(uid: string, callback: (donations: Donation[]) => void): Unsubscribe {
    if (!db) { callback([]); return () => {}; }
    const q = query(collection(db, COLL.donations), where('toCreatorId', '==', uid), limit(50));
    return onSnapshot(q, (snap) => {
      callback(snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Donation, 'id'>) }))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
    });
  },
};

// ============================================================
// Wallet Repository (placeholder - mock data)
// ============================================================

export const walletRepository = {
  async getWallet(creatorId: string): Promise<CreatorWallet> {
    const transactions = await this.listTransactions(creatorId);
    const tips = transactions.filter((t) => t.type === 'tip' && t.status === 'completed');
    const totalEarnings = tips.reduce((s, t) => s + t.amountUsd, 0);
    const withdrawals = transactions.filter((t) => t.type === 'withdrawal' && t.status === 'completed');
    const withdrawn = withdrawals.reduce((s, t) => s + t.amountUsd, 0);
    const pending = transactions.filter((t) => t.status === 'pending').reduce((s, t) => s + t.amountUsd, 0);
    const balance = totalEarnings - withdrawn;
    return {
      creatorId,
      balanceUsd: Math.max(0, balance),
      totalEarningsUsd: totalEarnings,
      pendingUsd: pending,
      withdrawnUsd: withdrawn,
      currency: 'USD',
    };
  },

  async listTransactions(creatorId: string): Promise<WalletTransaction[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLL.walletTransactions), where('creatorId', '==', creatorId), limit(50)));
    if (snap.empty) {
      return generateMockTransactions(creatorId);
    }
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<WalletTransaction, 'id'>) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async requestWithdrawal(creatorId: string, amountUsd: number, method: string): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const ref = await addDoc(collection(db, COLL.withdrawals), {
      creatorId, amountUsd, method,
      status: 'pending', requestedAt: Date.now(), processedAt: null,
    } as Omit<WithdrawalRequest, 'id'>);
    return ref.id;
  },

  async listWithdrawals(creatorId: string): Promise<WithdrawalRequest[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLL.withdrawals), where('creatorId', '==', creatorId), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<WithdrawalRequest, 'id'>) }))
      .sort((a, b) => (b.requestedAt ?? 0) - (a.requestedAt ?? 0));
  },
};

function generateMockTransactions(creatorId: string): WalletTransaction[] {
  const now = Date.now();
  const day = 86_400_000;
  return [
    { id: 'wt1', creatorId, type: 'tip', amountUsd: 5, status: 'completed', description: 'Tip from sage.builds', createdAt: now - day },
    { id: 'wt2', creatorId, type: 'ad_revenue', amountUsd: 12.50, status: 'completed', description: 'Ad revenue — January', createdAt: now - day * 3 },
    { id: 'wt3', creatorId, type: 'tip', amountUsd: 10, status: 'completed', description: 'Tip from orion_v', createdAt: now - day * 5 },
    { id: 'wt4', creatorId, type: 'premium_share', amountUsd: 8.75, status: 'completed', description: 'Premium revenue share', createdAt: now - day * 7 },
    { id: 'wt5', creatorId, type: 'withdrawal', amountUsd: 20, status: 'completed', description: 'Withdrawal to PayPal', createdAt: now - day * 10 },
    { id: 'wt6', creatorId, type: 'tip', amountUsd: 3, status: 'pending', description: 'Tip from night_thread', createdAt: now - day * 0.5 },
  ];
}

// ============================================================
// Premium Membership Repository
// ============================================================

export const PREMIUM_PLANS = [
  {
    id: 'monthly' as PremiumPlan,
    name: 'Monthly Premium',
    priceUsd: 4.99,
    period: 'per month',
    features: ['Ad-free viewing', 'Higher quality streaming', 'Exclusive creator content', 'Download videos', 'Premium badge'],
    highlight: false,
  },
  {
    id: 'yearly' as PremiumPlan,
    name: 'Yearly Premium',
    priceUsd: 39.99,
    period: 'per year',
    features: ['Everything in Monthly', 'Save 33%', 'Priority support', 'Early access to features', 'Premium badge'],
    highlight: true,
  },
];

export const premiumRepository = {
  async getMembership(uid: string): Promise<PremiumMembership | null> {
    if (!db) return null;
    const snap = await getDocs(query(collection(db, COLL.premiumMemberships), where('userId', '==', uid), limit(1)));
    if (snap.empty) return null;
    const data = snap.docs[0].data() as Omit<PremiumMembership, 'id'>;
    return { id: snap.docs[0].id, ...data };
  },

  async subscribe(uid: string, plan: PremiumPlan): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    const now = Date.now();
    const expiresAt = plan === 'yearly' ? now + 365 * 86_400_000 : now + 30 * 86_400_000;
    const priceUsd = plan === 'yearly' ? 39.99 : 4.99;
    const existing = await getDocs(query(collection(db, COLL.premiumMemberships), where('userId', '==', uid), limit(1)));
    if (!existing.empty) {
      await updateDoc(existing.docs[0].ref, { plan, status: 'active', expiresAt, priceUsd, autoRenew: true });
    } else {
      await addDoc(collection(db, COLL.premiumMemberships), {
        userId: uid, plan, status: 'active', startedAt: now, expiresAt, priceUsd, autoRenew: true,
      } as Omit<PremiumMembership, 'id'>);
    }
    await updateDoc(doc(db, COLL.users, uid), { isPremium: true, premiumExpiresAt: expiresAt });
  },

  async cancel(uid: string): Promise<void> {
    if (!db) return;
    const snap = await getDocs(query(collection(db, COLL.premiumMemberships), where('userId', '==', uid), limit(1)));
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, { autoRenew: false });
    }
  },
};

// ============================================================
// Admin / Moderation Repository
// ============================================================

export interface CreateAdminReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  description: string;
}

export const adminRepository = {
  async createReport(data: CreateAdminReportInput): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const ref = await addDoc(collection(db, COLL.adminReports), {
      ...data,
      status: 'pending' as ReportStatus,
      reviewedBy: null,
      createdAt: Date.now(),
      reviewedAt: null,
    } as Omit<AdminReport, 'id'>);
    return ref.id;
  },

  async listReports(statusFilter?: ReportStatus): Promise<AdminReport[]> {
    if (!db) return [];
    const constraints: QueryConstraint[] = [];
    if (statusFilter) constraints.push(where('status', '==', statusFilter));
    constraints.push(limit(50));
    const snap = await getDocs(query(collection(db, COLL.adminReports), ...constraints));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<AdminReport, 'id'>) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async updateReportStatus(id: string, status: ReportStatus, reviewedBy: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLL.adminReports, id), { status, reviewedBy, reviewedAt: Date.now() });
  },

  async suspendUser(uid: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLL.users, uid), { suspendStatus: 'suspended' as UserSuspendStatus });
  },

  async unsuspendUser(uid: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLL.users, uid), { suspendStatus: 'active' as UserSuspendStatus });
  },

  async verifyCreator(uid: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLL.users, uid), { isVerified: true, isCreator: true });
  },

  async unverifyCreator(uid: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLL.users, uid), { isVerified: false });
  },

  async featureVideo(videoId: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLL.videos, videoId), { isFeatured: true, updatedAt: Date.now() });
  },

  async unfeatureVideo(videoId: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLL.videos, videoId), { isFeatured: false, updatedAt: Date.now() });
  },

  async listAllUsers(max: number = 50): Promise<User[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLL.users), limit(max)));
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        email: (data.email as string) ?? '',
        username: (data.username as string) ?? 'member',
        displayName: (data.displayName as string) ?? 'member',
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
        socialLinks: { twitter: null, instagram: null, youtube: null, website: null },
        followersCount: (data.followersCount as number) ?? 0,
        followingCount: (data.followingCount as number) ?? 0,
        subscribersCount: (data.subscribersCount as number) ?? 0,
        videosCount: (data.videosCount as number) ?? 0,
        totalViews: (data.totalViews as number) ?? 0,
        totalLikes: (data.totalLikes as number) ?? 0,
        watchTimeMinutes: (data.watchTimeMinutes as number) ?? 0,
        preferredCategories: (data.preferredCategories as User['preferredCategories']) ?? [],
        joinedAt: ts(data.joinedAt ?? data.createdAt),
        createdAt: ts(data.createdAt),
        updatedAt: ts(data.updatedAt),
      } as User;
    });
  },
};

// ============================================================
// Announcement Repository
// ============================================================

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  imageUrl: string | null;
  createdBy: string;
}

export const announcementRepository = {
  async create(data: CreateAnnouncementInput): Promise<string> {
    if (!db) throw new Error('Firestore is not configured.');
    const ref = await addDoc(collection(db, COLL.announcements), {
      ...data, isActive: true, createdAt: Date.now(),
    } as Omit<Announcement, 'id'>);
    return ref.id;
  },

  async listActive(): Promise<Announcement[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLL.announcements), where('isActive', '==', true), limit(10)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async listAll(): Promise<Announcement[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLL.announcements), limit(50)));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Announcement, 'id'>) }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async deactivate(id: string): Promise<void> {
    if (!db) return;
    await updateDoc(doc(db, COLL.announcements, id), { isActive: false });
  },

  async delete(id: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, COLL.announcements, id));
  },
};

// ============================================================
// Ad Placement Repository (placeholder)
// ============================================================

export const adRepository = {
  async listActive(): Promise<AdPlacement[]> {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, COLL.adPlacements), where('isActive', '==', true), limit(10)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdPlacement, 'id'>) }));
  },
};

// ============================================================
// Creator Studio Repository
// ============================================================

export const creatorStudioRepository = {
  async getSummary(creatorId: string): Promise<CreatorStudioSummary> {
    if (!db) {
      return {
        totalUploads: 0, totalViews: 0, totalWatchTimeMinutes: 0,
        subscribers: 0, followers: 0, likesReceived: 0, commentsReceived: 0,
        estimatedEarningsUsd: 0, monthlyGrowth: [], weeklyGrowth: [],
        mostViewedVideos: [], recentUploads: [],
      };
    }
    const [userSnap, videosSnap] = await Promise.all([
      getDoc(doc(db, COLL.users, creatorId)),
      getDocs(query(collection(db, COLL.videos), where('creatorId', '==', creatorId), limit(50))),
    ]);
    const userData = userSnap.exists() ? userSnap.data() as Record<string, unknown> : null;
    const videos = videosSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
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
        sharesCount: (data.sharesCount as number) ?? 0,
        isFeatured: (data.isFeatured as boolean) ?? false,
        isTrending: (data.isTrending as boolean) ?? false,
        isNew: (data.isNew as boolean) ?? false,
        trendingScore: (data.trendingScore as number) ?? 0,
        isExclusive: (data.isExclusive as boolean) ?? false,
        isSponsored: (data.isSponsored as boolean) ?? false,
        scheduledAt: (data.scheduledAt as number | null) ?? null,
        archivedAt: (data.archivedAt as number | null) ?? null,
        creatorId: (data.creatorId as string) ?? '',
        creatorName: (data.creatorName as string) ?? '',
        creatorAvatarUrl: (data.creatorAvatarUrl as string | null) ?? null,
        creatorIsVerified: (data.creatorIsVerified as boolean) ?? false,
        likedByMe: false, bookmarkedByMe: false, subscribedToCreator: false,
        releasedAt: ts(data.releasedAt),
        createdAt: ts(data.createdAt),
        updatedAt: ts(data.updatedAt),
      } as Video;
    });
    const totalViews = videos.reduce((s, v) => s + v.viewsCount, 0);
    const totalLikes = videos.reduce((s, v) => s + v.likesCount, 0);
    const totalComments = videos.reduce((s, v) => s + v.commentsCount, 0);
    const totalWatchTime = videos.reduce((s, v) => s + v.viewsCount * v.durationSeconds, 0);
    const mostViewed = [...videos].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 5);
    const recentUploads = [...videos].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    const earnings = totalViews * 0.002 + totalLikes * 0.01;
    return {
      totalUploads: videos.length,
      totalViews,
      totalWatchTimeMinutes: Math.round(totalWatchTime / 60),
      subscribers: (userData?.subscribersCount as number) ?? 0,
      followers: (userData?.followersCount as number) ?? 0,
      likesReceived: totalLikes,
      commentsReceived: totalComments,
      estimatedEarningsUsd: Math.round(earnings * 100) / 100,
      monthlyGrowth: generateGrowthData('monthly', totalViews, (userData?.subscribersCount as number) ?? 0),
      weeklyGrowth: generateGrowthData('weekly', totalViews, (userData?.subscribersCount as number) ?? 0),
      mostViewedVideos: mostViewed,
      recentUploads,
    };
  },
};

function generateGrowthData(period: 'monthly' | 'weekly', currentViews: number, currentSubs: number): GrowthDataPoint[] {
  if (period === 'monthly') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const factor = currentViews > 0 ? currentViews / 6 : 100;
    const subsFactor = currentSubs > 0 ? currentSubs / 6 : 10;
    return months.map((label, i) => ({
      label, views: Math.round(factor * (0.3 + i * 0.15)), subscribers: Math.round(subsFactor * (0.2 + i * 0.16)),
    }));
  }
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const factor = currentViews > 0 ? currentViews / 30 : 50;
  const subsFactor = currentSubs > 0 ? currentSubs / 30 : 3;
  return days.map((label, i) => ({
    label, views: Math.round(factor * (0.6 + i * 0.07)), subscribers: Math.round(subsFactor * (0.5 + i * 0.08)),
  }));
}

// ============================================================
// Discovery Repository
// ============================================================

export const discoveryRepository = {
  async getRecommended(uid: string | null): Promise<Video[]> {
    if (!db) return [];
    let user: User | null = null;
    if (uid) {
      const snap = await getDoc(doc(db, COLL.users, uid));
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        user = {
          preferredCategories: (data.preferredCategories as User['preferredCategories']) ?? [],
        } as User;
      }
    }
    const allSnap = await getDocs(query(collection(db, COLL.videos), where('visibility', '==', 'public'), where('status', '==', 'published'), limit(30)));
    const all = allSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return { id: d.id, data } as { id: string; data: Record<string, unknown> };
    });
    const scored = all.map(({ id, data }) => {
      const category = (data.category as string) ?? '';
      const viewsCount = (data.viewsCount as number) ?? 0;
      const likesCount = (data.likesCount as number) ?? 0;
      let score = viewsCount * 0.1 + likesCount;
      if (user?.preferredCategories.includes(category as User['preferredCategories'][number])) {
        score += 500;
      }
      return { id, data, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 10).map(({ id, data }) => {
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
        sharesCount: (data.sharesCount as number) ?? 0,
        isFeatured: (data.isFeatured as boolean) ?? false,
        isTrending: (data.isTrending as boolean) ?? false,
        isNew: (data.isNew as boolean) ?? false,
        trendingScore: (data.trendingScore as number) ?? 0,
        isExclusive: (data.isExclusive as boolean) ?? false,
        isSponsored: (data.isSponsored as boolean) ?? false,
        scheduledAt: (data.scheduledAt as number | null) ?? null,
        archivedAt: (data.archivedAt as number | null) ?? null,
        creatorId: (data.creatorId as string) ?? '',
        creatorName: (data.creatorName as string) ?? '',
        creatorAvatarUrl: (data.creatorAvatarUrl as string | null) ?? null,
        creatorIsVerified: (data.creatorIsVerified as boolean) ?? false,
        likedByMe: false, bookmarkedByMe: false, subscribedToCreator: false,
        releasedAt: ts(data.releasedAt),
        createdAt: ts(data.createdAt),
        updatedAt: ts(data.updatedAt),
      } as Video;
    });
  },
};
