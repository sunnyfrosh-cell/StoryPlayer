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
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '@/types';
import { authService, firebaseUserToAppUser, userService } from '@/firebase';
import { mapFirebaseError, isFirebaseConfigError } from '@/firebase/errors';
import { isFirebaseConfigured } from '@/firebase/config';

const STARTUP_TIMEOUT_MS = 10_000;

export interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  isFirebaseReady: boolean;
  startupError: string | null;
  retryStartup: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const unsubRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(false);

  const clearInitializing = useCallback((reason: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    settledRef.current = false;
    setIsInitializing(true);
    setStartupError(null);

    const configured = isFirebaseConfigured();

    if (!configured) {
      setIsFirebaseReady(false);
      if (mounted) clearInitializing('firebase-not-configured');
      return;
    }

    timeoutRef.current = setTimeout(() => {
      if (mounted && !settledRef.current) {
        console.warn('[AuthContext] Startup timeout reached — proceeding without auth.');
        setUser(null);
        setFirebaseUser(null);
        clearInitializing('timeout-no-user');
      }
    }, STARTUP_TIMEOUT_MS);

    try {
      const unsub = authService.onAuthStateChange(async (fbUser) => {
        if (!mounted) return;

        setFirebaseUser(fbUser);
        if (fbUser) {
          try {
            const profile = await userService.getUser(fbUser.uid);
            if (mounted) {
              setUser(firebaseUserToAppUser(fbUser, profile));
              clearInitializing('auth-profile-loaded');
            }
          } catch (err) {
            console.warn('[AuthContext] Profile load failed, using basic user:', err);
            if (mounted) {
              setUser(firebaseUserToAppUser(fbUser, null));
              clearInitializing('auth-profile-fallback');
            }
          }
        } else {
          if (mounted) {
            setUser(null);
            clearInitializing('auth-no-user');
          }
        }
      });
      unsubRef.current = unsub;
      setIsFirebaseReady(true);
    } catch (error) {
      console.error('[AuthContext] Failed to attach auth listener:', error);
      if (isFirebaseConfigError(error)) {
        setIsFirebaseReady(false);
      }
      if (mounted) {
        setStartupError(
          error instanceof Error ? error.message : 'Failed to initialize authentication.',
        );
        clearInitializing('auth-listener-error');
      }
    }

    return () => {
      mounted = false;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [retryCount, clearInitializing]);

  const retryStartup = useCallback(() => {
    setUser(null);
    setFirebaseUser(null);
    setStartupError(null);
    settledRef.current = false;
    setRetryCount((c) => c + 1);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.login(email, password);
    } catch (error) {
      throw new Error(mapFirebaseError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    setIsLoading(true);
    try {
      await authService.register(email, password, username);
    } catch (error) {
      throw new Error(mapFirebaseError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    throw new Error('Google sign-in is not available yet.');
  }, []);

  const loginWithApple = useCallback(async () => {
    throw new Error('Apple sign-in is not available yet.');
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
    } catch (error) {
      throw new Error(mapFirebaseError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setFirebaseUser(null);
    } catch (error) {
      throw new Error(mapFirebaseError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return;
    try {
      const profile = await userService.getUser(firebaseUser.uid);
      setUser(firebaseUserToAppUser(firebaseUser, profile));
    } catch (error) {
      throw new Error(mapFirebaseError(error));
    }
  }, [firebaseUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      isLoading,
      isInitializing,
      isAuthenticated: user !== null,
      isFirebaseReady,
      startupError,
      retryStartup,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      requestPasswordReset,
      logout,
      refreshProfile,
    }),
    [
      user,
      firebaseUser,
      isLoading,
      isInitializing,
      isFirebaseReady,
      startupError,
      retryStartup,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      requestPasswordReset,
      logout,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
