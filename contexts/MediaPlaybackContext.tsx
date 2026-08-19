import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

type MediaController = {
  pause: () => void;
  play: () => void;
};

type MediaPlaybackContextValue = {
  appIsActive: boolean;
  register: (id: string, controller: MediaController) => () => void;
  pauseAll: () => void;
  pauseOthers: (id: string) => void;
};

const MediaPlaybackContext = createContext<MediaPlaybackContextValue | null>(null);

export function MediaPlaybackProvider({ children }: { children: ReactNode }) {
  const playersRef = useRef(new Map<string, MediaController>());
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');

  const pauseAll = useCallback(() => {
    playersRef.current.forEach((controller) => controller.pause());
  }, []);

  const pauseOthers = useCallback((id: string) => {
    playersRef.current.forEach((controller, playerId) => {
      if (playerId !== id) controller.pause();
    });
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const active = nextState === 'active';
      setAppIsActive(active);
      if (!active) pauseAll();
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [pauseAll]);

  const register = useCallback((id: string, controller: MediaController) => {
    playersRef.current.set(id, controller);
    return () => {
      playersRef.current.delete(id);
    };
  }, []);

  const value = useMemo(
    () => ({ appIsActive, register, pauseAll, pauseOthers }),
    [appIsActive, register, pauseAll, pauseOthers],
  );

  return (
    <MediaPlaybackContext.Provider value={value}>
      {children}
    </MediaPlaybackContext.Provider>
  );
}

export function useMediaPlaybackLifecycle({
  id,
  isActive,
  pause,
  play,
}: {
  id: string;
  isActive: boolean;
  pause: () => void;
  play: () => void;
}) {
  const context = useContext(MediaPlaybackContext);
  if (!context) {
    throw new Error('useMediaPlaybackLifecycle must be used inside MediaPlaybackProvider');
  }

  const isFocused = useIsFocused();
  const pauseRef = useRef(pause);
  const playRef = useRef(play);
  pauseRef.current = pause;
  playRef.current = play;

  useEffect(() => {
    return context.register(id, {
      pause: () => pauseRef.current(),
      play: () => playRef.current(),
    });
  }, [context.register, id]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        pauseRef.current();
      };
    }, []),
  );

  useEffect(() => {
    if (isActive && isFocused && context.appIsActive) {
      context.pauseOthers(id);
      playRef.current();
    } else {
      pauseRef.current();
    }
  }, [context.appIsActive, context.pauseOthers, id, isActive, isFocused]);

  useEffect(() => {
    return () => {
      pauseRef.current();
    };
  }, []);
}

export function useMediaPlaybackManager() {
  const context = useContext(MediaPlaybackContext);
  if (!context) {
    throw new Error('useMediaPlaybackManager must be used inside MediaPlaybackProvider');
  }
  return context;
}
