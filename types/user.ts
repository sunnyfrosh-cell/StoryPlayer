import type { VideoCategory, SocialLinks, UserSuspendStatus } from './video';

export type UserRole = 'user' | 'creator' | 'admin';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  location: string | null;
  role: UserRole;
  isVerified: boolean;
  isCreator: boolean;
  isPremium: boolean;
  premiumExpiresAt: number | null;
  suspendStatus: UserSuspendStatus;
  socialLinks: SocialLinks;
  followersCount: number;
  followingCount: number;
  subscribersCount: number;
  videosCount: number;
  totalViews: number;
  totalLikes: number;
  watchTimeMinutes: number;
  preferredCategories: VideoCategory[];
  joinedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface UserStats {
  videosWatched: number;
  minutesWatched: number;
  streakDays: number;
  videosUploaded: number;
  totalViews: number;
  totalLikes: number;
  followersCount: number;
  followingCount: number;
  subscribersCount: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconName: string;
  unlockedAt: number | null;
  progress: number;
  target: number;
}
