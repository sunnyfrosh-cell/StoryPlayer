import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { User, Achievement, UserStats, Video } from '@/types';
import { mockAchievements } from '@/constants';
import { useAuth } from './AuthContext';
import {
  userService,
  videoRepository,
} from '@/firebase';
import { mapFirebaseError } from '@/firebase/errors';

export interface UserContextValue {
  profile: User | null;
  stats: UserStats;
  achievements: Achievement[];
  isLoading: boolean;
  error: string | null;
  updateProfile: (patch: Partial<Pick<User, 'username' | 'displayName' | 'bio' | 'avatarUrl' | 'coverUrl' | 'location' | 'socialLinks' | 'preferredCategories' | 'isCreator'>>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, firebaseUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(user);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [achievements] = useState<Achievement[]>(mockAchievements);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setProfile(user);
  }, [user]);

  useEffect(() => {
    if (!firebaseUser) {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
      return;
    }
    const unsub = userService.subscribeToUser(firebaseUser.uid, (next) => {
      if (next) setProfile(next);
    });
    unsubRef.current = unsub;
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [firebaseUser]);

  const [myVideos, setMyVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    videoRepository.getByCreator(firebaseUser.uid).then(setMyVideos).catch((err: unknown) => {
      console.error('[UserContext] loadMyVideos failed:', err);
    });
  }, [firebaseUser, profile?.updatedAt]);

  const stats = useMemo<UserStats>(
    () => ({
      videosWatched: profile?.watchTimeMinutes ? Math.floor(profile.watchTimeMinutes / 8) : 0,
      minutesWatched: profile?.watchTimeMinutes ?? 0,
      streakDays: 0,
      videosUploaded: myVideos.length,
      totalViews: myVideos.reduce((sum, v) => sum + v.viewsCount, 0),
      totalLikes: myVideos.reduce((sum, v) => sum + v.likesCount, 0),
      followersCount: profile?.followersCount ?? 0,
      followingCount: profile?.followingCount ?? 0,
      subscribersCount: profile?.subscribersCount ?? 0,
    }),
    [profile, achievements, myVideos],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Pick<User, 'username' | 'displayName' | 'bio' | 'avatarUrl' | 'coverUrl' | 'location' | 'socialLinks' | 'preferredCategories' | 'isCreator'>>) => {
      if (!firebaseUser) return;
      setIsLoading(true);
      setError(null);
      try {
        await userService.updateUser(firebaseUser.uid, patch);
        setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
      } catch (err) {
        const message = mapFirebaseError(err);
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [firebaseUser],
  );

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const fresh = await userService.getUser(firebaseUser.uid);
      if (fresh) setProfile(fresh);
    } catch (err) {
      setError(mapFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser]);

  const value = useMemo<UserContextValue>(
    () => ({ profile, stats, achievements, isLoading, error, updateProfile, refreshProfile }),
    [profile, stats, achievements, isLoading, error, updateProfile, refreshProfile],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider');
  }
  return ctx;
}
