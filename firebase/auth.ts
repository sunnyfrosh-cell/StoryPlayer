import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged,
  reload,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './config';
import { userService } from './firestore';
import type { User } from '@/types';
import type { AuthResult } from './types';

export const authService = {
  onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  },

  async register(email: string, password: string, username: string): Promise<AuthResult> {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await userService.createUserDocument(cred.user.uid, {
      uid: cred.user.uid,
      email: cred.user.email ?? email.trim(),
      username: username.trim(),
    });
    return { uid: cred.user.uid };
  },

  async login(email: string, password: string): Promise<AuthResult> {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { uid: cred.user.uid };
  },

  async logout(): Promise<void> {
    if (!auth) return;
    await signOut(auth);
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (!auth) throw new Error('Firebase Auth is not configured.');
    await sendPasswordResetEmail(auth, email.trim());
  },

  async updatePassword(newPassword: string): Promise<void> {
    if (!auth?.currentUser) throw new Error('No signed-in user.');
    await updatePassword(auth.currentUser, newPassword);
  },

  async reloadCurrentUser(): Promise<FirebaseUser | null> {
    if (!auth?.currentUser) return null;
    await reload(auth.currentUser);
    return auth.currentUser;
  },

  getCurrentUser(): FirebaseUser | null {
    return auth?.currentUser ?? null;
  },
};

export function firebaseUserToAppUser(fbUser: FirebaseUser, profile: User | null): User {
  return {
    id: fbUser.uid,
    email: fbUser.email ?? profile?.email ?? '',
    username: profile?.username ?? fbUser.displayName ?? 'member',
    displayName: profile?.displayName ?? fbUser.displayName ?? profile?.username ?? 'StoryVerse member',
    avatarUrl: profile?.avatarUrl ?? fbUser.photoURL,
    bio: profile?.bio ?? null,
    location: profile?.location ?? null,
    role: profile?.role ?? 'user',
    isVerified: profile?.isVerified ?? false,
    isCreator: profile?.isCreator ?? false,
    isPremium: profile?.isPremium ?? false,
    premiumExpiresAt: profile?.premiumExpiresAt ?? null,
    suspendStatus: profile?.suspendStatus ?? "active",
    socialLinks: profile?.socialLinks ?? { twitter: null, instagram: null, youtube: null, website: null },
    coverUrl: profile?.coverUrl ?? null,
    followersCount: profile?.followersCount ?? 0,
    followingCount: profile?.followingCount ?? 0,
    subscribersCount: profile?.subscribersCount ?? 0,
    videosCount: profile?.videosCount ?? 0,
    totalViews: profile?.totalViews ?? 0,
    totalLikes: profile?.totalLikes ?? 0,
    watchTimeMinutes: profile?.watchTimeMinutes ?? 0,
    preferredCategories: profile?.preferredCategories ?? [],
    joinedAt: profile?.joinedAt ?? fbUser.metadata.creationTime
      ? new Date(fbUser.metadata.creationTime!).getTime()
      : Date.now(),
    createdAt: profile?.createdAt ?? fbUser.metadata.creationTime
      ? new Date(fbUser.metadata.creationTime!).getTime()
      : Date.now(),
    updatedAt: profile?.updatedAt ?? Date.now(),
  };
}
