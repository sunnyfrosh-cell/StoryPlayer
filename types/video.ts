export type VideoCategory =
  | 'Comedy'
  | 'Education'
  | 'Music'
  | 'Sports'
  | 'Movies'
  | 'Gaming'
  | 'Technology'
  | 'Lifestyle'
  | 'Entertainment'
  | 'News'
  | 'Travel'
  | 'Cooking';

export type VideoVisibility = 'public' | 'private' | 'unlisted';

export type VideoStatus = 'published' | 'processing' | 'draft' | 'scheduled' | 'archived';

export type VideoQuality = 'auto' | '1080p' | '720p' | '480p' | '360p';

export interface Video {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  tags: string[];
  visibility: VideoVisibility;
  status: VideoStatus;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  sharesCount: number;
  isFeatured: boolean;
  isTrending: boolean;
  isNew: boolean;
  trendingScore: number;
  isExclusive: boolean;
  isSponsored: boolean;
  scheduledAt: number | null;
  archivedAt: number | null;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  creatorIsVerified: boolean;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  subscribedToCreator: boolean;
  releasedAt: number;
  createdAt: number;
  updatedAt: number;
}

export type CommentSort = 'newest' | 'most_liked';

export interface Comment {
  id: string;
  videoId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorIsCreator: boolean;
  body: string;
  likesCount: number;
  repliesCount: number;
  isLikedByMe: boolean;
  isPinned: boolean;
  isEdited: boolean;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CommentLike {
  id: string;
  userId: string;
  commentId: string;
  createdAt: number;
}

export interface CommentReport {
  id: string;
  commentId: string;
  reporterId: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: number;
}

export interface Like {
  id: string;
  userId: string;
  videoId: string;
  createdAt: number;
}

export interface Bookmark {
  id: string;
  userId: string;
  videoId: string;
  playlistId: string | null;
  createdAt: number;
}

export interface WatchHistoryItem {
  id: string;
  userId: string;
  videoId: string;
  progress: number;
  progressSeconds: number;
  durationSeconds: number;
  completionPercentage: number;
  completed: boolean;
  lastWatchedAt: number;
}

export type PlaylistType = 'custom' | 'watch_later' | 'favorites' | 'liked';

export interface Playlist {
  id: string;
  userId: string;
  title: string;
  description: string;
  coverUrl: string | null;
  videoIds: string[];
  isPrivate: boolean;
  type: PlaylistType;
  videoCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Subscription {
  id: string;
  subscriberId: string;
  creatorId: string;
  createdAt: number;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: number;
}

export interface CategoryInfo {
  id: string;
  name: VideoCategory;
  color: string;
  iconName: string;
  videosCount: number;
}

export interface Creator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  isCreator: boolean;
  followersCount: number;
  followingCount: number;
  subscribersCount: number;
  videosCount: number;
  totalViews: number;
  totalLikes: number;
  joinedAt: number;
}

export type NotificationType =
  | 'new_video'
  | 'new_follower'
  | 'new_subscriber'
  | 'like'
  | 'comment'
  | 'reply'
  | 'video_upload_complete'
  | 'playlist_shared'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl: string | null;
  actorAvatarUrl: string | null;
  targetVideoId: string | null;
  read: boolean;
  createdAt: number;
}

export interface VideoReport {
  id: string;
  videoId: string;
  reporterId: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: number;
}

export interface BlockedUser {
  id: string;
  blockerId: string;
  blockedId: string;
  blockedName: string;
  blockedAvatarUrl: string | null;
  createdAt: number;
}

export interface CreatorAnalytics {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalWatchTimeMinutes: number;
  followersCount: number;
  subscribersCount: number;
  recentUploads: Video[];
  popularVideos: Video[];
  recentComments: Comment[];
  growthData: GrowthDataPoint[];
}

export interface GrowthDataPoint {
  label: string;
  views: number;
  subscribers: number;
}

export interface SearchHistory {
  id: string;
  userId: string;
  term: string;
  searchedAt: number;
}

export type SearchFilter = 'all' | 'videos' | 'creators' | 'playlists' | 'tags' | 'categories';

export interface SocialLinks {
  twitter: string | null;
  instagram: string | null;
  youtube: string | null;
  website: string | null;
}

export type PlaybackSpeed = '0.5' | '0.75' | '1' | '1.25' | '1.5' | '2';

export interface PlaybackSettings {
  defaultQuality: VideoQuality;
  defaultSpeed: PlaybackSpeed;
  autoplay: boolean;
  dataSaver: boolean;
}

export interface NotificationPreferences {
  newVideos: boolean;
  newFollowers: boolean;
  newSubscribers: boolean;
  likes: boolean;
  comments: boolean;
  replies: boolean;
  system: boolean;
}

export interface PrivacySettings {
  privateAccount: boolean;
  showWatchHistory: boolean;
  showLikedVideos: boolean;
  showSubscriptions: boolean;
}

export interface VideoAnalytics {
  videoId: string;
  views: number;
  uniqueViewers: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTimeSeconds: number;
  averageWatchDurationSeconds: number;
  audienceRetention: RetentionDataPoint[];
  trafficSources: TrafficSourceData[];
  dailyViews: DailyViewData[];
}

export interface RetentionDataPoint {
  percent: number;
  retention: number;
}

export interface TrafficSourceData {
  source: string;
  percentage: number;
}

export interface DailyViewData {
  date: string;
  views: number;
}

export type PremiumPlan = 'monthly' | 'yearly';

export type PremiumStatus = 'active' | 'expired' | 'none';

export interface PremiumMembership {
  id: string;
  userId: string;
  plan: PremiumPlan;
  status: PremiumStatus;
  startedAt: number;
  expiresAt: number | null;
  priceUsd: number;
  autoRenew: boolean;
}

export interface PremiumPlanInfo {
  id: PremiumPlan;
  name: string;
  priceUsd: number;
  period: string;
  features: string[];
  highlight: boolean;
}

export type DonationStatus = 'pending' | 'completed' | 'failed';

export interface Donation {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatarUrl: string | null;
  toCreatorId: string;
  amountUsd: number;
  message: string;
  status: DonationStatus;
  createdAt: number;
}

export type WalletTransactionType = 'tip' | 'ad_revenue' | 'premium_share' | 'withdrawal' | 'refund';

export type WalletTransactionStatus = 'pending' | 'completed' | 'failed';

export interface WalletTransaction {
  id: string;
  creatorId: string;
  type: WalletTransactionType;
  amountUsd: number;
  status: WalletTransactionStatus;
  description: string;
  createdAt: number;
}

export interface CreatorWallet {
  creatorId: string;
  balanceUsd: number;
  totalEarningsUsd: number;
  pendingUsd: number;
  withdrawnUsd: number;
  currency: string;
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface WithdrawalRequest {
  id: string;
  creatorId: string;
  amountUsd: number;
  method: string;
  status: WithdrawalStatus;
  requestedAt: number;
  processedAt: number | null;
}

export type AdType = 'banner' | 'video' | 'sponsored' | 'featured_creator';

export interface AdPlacement {
  id: string;
  type: AdType;
  title: string;
  imageUrl: string | null;
  targetUrl: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  createdAt: number;
}

export type ReportTargetType = 'video' | 'comment' | 'user';

export type ReportStatus = 'pending' | 'approved' | 'rejected';

export interface AdminReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  description: string;
  status: ReportStatus;
  reviewedBy: string | null;
  createdAt: number;
  reviewedAt: number | null;
}

export type UserSuspendStatus = 'active' | 'suspended';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: number;
}

export interface CreatorStudioSummary {
  totalUploads: number;
  totalViews: number;
  totalWatchTimeMinutes: number;
  subscribers: number;
  followers: number;
  likesReceived: number;
  commentsReceived: number;
  estimatedEarningsUsd: number;
  monthlyGrowth: GrowthDataPoint[];
  weeklyGrowth: GrowthDataPoint[];
  mostViewedVideos: Video[];
  recentUploads: Video[];
}

// --- Reels / Shorts ---

export interface Reel {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  hashtags: string[];
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  creatorIsVerified: boolean;
  likedByMe: boolean;
  savedByMe: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateReelInput {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  durationSeconds: number;
  hashtags: string[];
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  creatorIsVerified: boolean;
}
