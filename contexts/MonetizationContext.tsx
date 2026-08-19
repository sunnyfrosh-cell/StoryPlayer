import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  VideoAnalytics,
  Donation,
  CreatorWallet,
  WalletTransaction,
  WithdrawalRequest,
  PremiumMembership,
  PremiumPlan,
  AdminReport,
  ReportStatus,
  Announcement,
  CreatorStudioSummary,
  User,
  Video,
} from '@/types';
import { useAuth } from './AuthContext';
import {
  videoAnalyticsRepository,
  donationRepository,
  walletRepository,
  premiumRepository,
  adminRepository,
  announcementRepository,
  creatorStudioRepository,
  discoveryRepository,
  type CreateDonationInput,
  type CreateAdminReportInput,
  type CreateAnnouncementInput,
} from '@/firebase';

export interface MonetizationContextValue {
  getVideoAnalytics: (videoId: string) => Promise<VideoAnalytics | null>;
  getCreatorStudioSummary: (creatorId: string) => Promise<CreatorStudioSummary>;
  getRecommended: (uid: string | null) => Promise<Video[]>;
  sendDonation: (data: CreateDonationInput) => Promise<string>;
  listDonationsForCreator: (uid: string) => Promise<Donation[]>;
  listDonationsForUser: (uid: string) => Promise<Donation[]>;
  getWallet: (creatorId: string) => Promise<CreatorWallet>;
  listWalletTransactions: (creatorId: string) => Promise<WalletTransaction[]>;
  requestWithdrawal: (creatorId: string, amountUsd: number, method: string) => Promise<string>;
  listWithdrawals: (creatorId: string) => Promise<WithdrawalRequest[]>;
  getPremiumMembership: (uid: string) => Promise<PremiumMembership | null>;
  subscribePremium: (uid: string, plan: PremiumPlan) => Promise<void>;
  cancelPremium: (uid: string) => Promise<void>;
  createAdminReport: (data: CreateAdminReportInput) => Promise<string>;
  listAdminReports: (statusFilter?: ReportStatus) => Promise<AdminReport[]>;
  updateReportStatus: (id: string, status: ReportStatus) => Promise<void>;
  suspendUser: (uid: string) => Promise<void>;
  unsuspendUser: (uid: string) => Promise<void>;
  verifyCreator: (uid: string) => Promise<void>;
  unverifyCreator: (uid: string) => Promise<void>;
  featureVideo: (videoId: string) => Promise<void>;
  unfeatureVideo: (videoId: string) => Promise<void>;
  listAllUsers: (max?: number) => Promise<User[]>;
  createAnnouncement: (data: CreateAnnouncementInput) => Promise<string>;
  listAnnouncements: () => Promise<Announcement[]>;
  listActiveAnnouncements: () => Promise<Announcement[]>;
  deactivateAnnouncement: (id: string) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
}

const MonetizationContext = createContext<MonetizationContextValue | undefined>(undefined);

export function MonetizationProvider({ children }: { children: ReactNode }) {
  const { firebaseUser } = useAuth();

  const getVideoAnalytics = useCallback(
    (videoId: string) => videoAnalyticsRepository.getForVideo(videoId),
    [],
  );

  const getCreatorStudioSummary = useCallback(
    (creatorId: string) => creatorStudioRepository.getSummary(creatorId),
    [],
  );

  const getRecommended = useCallback(
    (uid: string | null) => discoveryRepository.getRecommended(uid),
    [],
  );

  const sendDonation = useCallback(
    (data: CreateDonationInput) => donationRepository.create(data),
    [],
  );

  const listDonationsForCreator = useCallback(
    (uid: string) => donationRepository.listForCreator(uid),
    [],
  );

  const listDonationsForUser = useCallback(
    (uid: string) => donationRepository.listForUser(uid),
    [],
  );

  const getWallet = useCallback(
    (creatorId: string) => walletRepository.getWallet(creatorId),
    [],
  );

  const listWalletTransactions = useCallback(
    (creatorId: string) => walletRepository.listTransactions(creatorId),
    [],
  );

  const requestWithdrawal = useCallback(
    (creatorId: string, amountUsd: number, method: string) =>
      walletRepository.requestWithdrawal(creatorId, amountUsd, method),
    [],
  );

  const listWithdrawals = useCallback(
    (creatorId: string) => walletRepository.listWithdrawals(creatorId),
    [],
  );

  const getPremiumMembership = useCallback(
    (uid: string) => premiumRepository.getMembership(uid),
    [],
  );

  const subscribePremium = useCallback(
    (uid: string, plan: PremiumPlan) => premiumRepository.subscribe(uid, plan),
    [],
  );

  const cancelPremium = useCallback(
    (uid: string) => premiumRepository.cancel(uid),
    [],
  );

  const createAdminReport = useCallback(
    (data: CreateAdminReportInput) => {
      if (!firebaseUser) return Promise.resolve('');
      return adminRepository.createReport({
        ...data,
        reporterId: firebaseUser.uid,
        reporterName: firebaseUser.displayName ?? firebaseUser.email ?? 'Unknown',
      });
    },
    [firebaseUser],
  );

  const listAdminReports = useCallback(
    (statusFilter?: ReportStatus) => adminRepository.listReports(statusFilter),
    [],
  );

  const updateReportStatus = useCallback(
    (id: string, status: ReportStatus) => {
      if (!firebaseUser) return Promise.resolve();
      return adminRepository.updateReportStatus(id, status, firebaseUser.uid);
    },
    [firebaseUser],
  );

  const suspendUser = useCallback((uid: string) => adminRepository.suspendUser(uid), []);
  const unsuspendUser = useCallback((uid: string) => adminRepository.unsuspendUser(uid), []);
  const verifyCreator = useCallback((uid: string) => adminRepository.verifyCreator(uid), []);
  const unverifyCreator = useCallback((uid: string) => adminRepository.unverifyCreator(uid), []);
  const featureVideo = useCallback((videoId: string) => adminRepository.featureVideo(videoId), []);
  const unfeatureVideo = useCallback((videoId: string) => adminRepository.unfeatureVideo(videoId), []);
  const listAllUsers = useCallback((max?: number) => adminRepository.listAllUsers(max), []);

  const createAnnouncement = useCallback(
    (data: CreateAnnouncementInput) => {
      if (!firebaseUser) return Promise.resolve('');
      return announcementRepository.create({ ...data, createdBy: firebaseUser.uid });
    },
    [firebaseUser],
  );

  const listAnnouncements = useCallback(() => announcementRepository.listAll(), []);
  const listActiveAnnouncements = useCallback(() => announcementRepository.listActive(), []);
  const deactivateAnnouncement = useCallback((id: string) => announcementRepository.deactivate(id), []);
  const deleteAnnouncement = useCallback((id: string) => announcementRepository.delete(id), []);

  const value = useMemo<MonetizationContextValue>(
    () => ({
      getVideoAnalytics, getCreatorStudioSummary, getRecommended,
      sendDonation, listDonationsForCreator, listDonationsForUser,
      getWallet, listWalletTransactions, requestWithdrawal, listWithdrawals,
      getPremiumMembership, subscribePremium, cancelPremium,
      createAdminReport, listAdminReports, updateReportStatus,
      suspendUser, unsuspendUser, verifyCreator, unverifyCreator,
      featureVideo, unfeatureVideo, listAllUsers,
      createAnnouncement, listAnnouncements, listActiveAnnouncements,
      deactivateAnnouncement, deleteAnnouncement,
    }),
    [
      getVideoAnalytics, getCreatorStudioSummary, getRecommended,
      sendDonation, listDonationsForCreator, listDonationsForUser,
      getWallet, listWalletTransactions, requestWithdrawal, listWithdrawals,
      getPremiumMembership, subscribePremium, cancelPremium,
      createAdminReport, listAdminReports, updateReportStatus,
      suspendUser, unsuspendUser, verifyCreator, unverifyCreator,
      featureVideo, unfeatureVideo, listAllUsers,
      createAnnouncement, listAnnouncements, listActiveAnnouncements,
      deactivateAnnouncement, deleteAnnouncement,
    ],
  );

  return <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>;
}

export function useMonetization() {
  const ctx = useContext(MonetizationContext);
  if (!ctx) {
    throw new Error('useMonetization must be used within MonetizationProvider');
  }
  return ctx;
}
