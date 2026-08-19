export { firebaseConfig, isFirebaseConfigured } from './config';
export { auth, db } from './config';
export { authService, firebaseUserToAppUser } from './auth';
export {
  userService,
  videoRepository,
  commentRepository,
  likeRepository,
  bookmarkRepository,
  watchHistoryRepository,
  playlistRepository,
  subscriptionRepository,
  followRepository,
  notificationRepository,
  reportRepository,
  blockedUserRepository,
  searchHistoryRepository,
  creatorAnalyticsRepository,
  reelRepository,
  COLLECTION_NAMES,
  type CreateVideoInput,
  type CreateCommentInput,
  type CreatePlaylistInput,
  type CreateReelInput,
  type PaginatedResult,
} from './firestore';
export {
  videoAnalyticsRepository,
  donationRepository,
  walletRepository,
  premiumRepository,
  adminRepository,
  announcementRepository,
  adRepository,
  creatorStudioRepository,
  discoveryRepository,
  PREMIUM_PLANS,
  type CreateDonationInput,
  type CreateAdminReportInput,
  type CreateAnnouncementInput,
} from './monetization';
export type { AuthResult } from './types';
