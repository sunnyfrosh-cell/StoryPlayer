import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { ResizeMode, Video as ExpoVideo, type AVPlaybackStatus } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Maximize,
  Minimize,
  Settings,
  Gauge,
  Play,
  Pause,
  RotateCw,
  RotateCcw,
  WifiOff,
} from 'lucide-react-native';
import { colors, spacing, radius, typography, shadows } from '@/theme';
import { formatSeconds } from '@/utils';
import { useMediaPlaybackLifecycle } from '@/contexts';

export type QualityLevel = 'auto' | 'low' | 'medium' | 'high';

export interface VideoSource {
  uri: string;
  /** Optional map of quality → URI. Falls back to `uri` when unavailable. */
  qualities?: Partial<Record<QualityLevel, string>>;
}

export interface EnhancedVideoPlayerProps {
  source: VideoSource;
  /** Initial position in seconds (for resume playback). */
  initialPositionSeconds?: number;
  /** Auto-play on mount. */
  autoPlay?: boolean;
  /** Whether this player is allowed to play while its screen is focused. */
  isActive?: boolean;
  /** Called with progress 0..1 and position/duration in seconds. */
  onProgress?: (progress: number, positionSec: number, durationSec: number) => void;
  /** Called when playback finishes — parent can auto-play next. */
  onEnd?: () => void;
  /** Called when the user toggles fullscreen. */
  onFullscreenChange?: (isFullscreen: boolean) => void;
  /** Whether to auto-advance when the video ends. */
  autoPlayNext?: boolean;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const QUALITY_LABELS: Record<QualityLevel, string> = {
  auto: 'Auto',
  low: '480p',
  medium: '720p',
  high: '1080p',
};

export function EnhancedVideoPlayer({
  source,
  initialPositionSeconds = 0,
  autoPlay = true,
  isActive = true,
  onProgress,
  onEnd,
  onFullscreenChange,
  autoPlayNext = false,
}: EnhancedVideoPlayerProps) {
  const videoRef = useRef<ExpoVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [positionSec, setPositionSec] = useState(initialPositionSeconds);
  const [durationSec, setDurationSec] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState<QualityLevel>('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [doubleTapHint, setDoubleTapHint] = useState<{ side: 'left' | 'right'; visible: boolean }>({ side: 'right', visible: false });
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  // Resolve the active URI based on the selected quality.
  const activeUri = useMemo(() => {
    if (quality === 'auto') return source.uri;
    return source.qualities?.[quality] ?? source.uri;
  }, [source, quality]);

  // Resume playback from initialPosition once the video is ready.
  const handleReadyForDisplay = useCallback(() => {
    setIsReady(true);
    if (initialPositionSeconds > 0 && videoRef.current) {
      videoRef.current.setPositionAsync(initialPositionSeconds * 1000).catch(() => {});
    }
  }, [initialPositionSeconds]);

  const handlePlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      const s = status as {
        isLoaded: boolean;
        isPlaying: boolean;
        durationMillis: number;
        positionMillis: number;
        didJustFinish: boolean;
        error?: string;
      };
      if (!s.isLoaded) return;
      setIsPlaying(s.isPlaying);
      if (s.durationMillis && s.positionMillis) {
        const pos = s.positionMillis / 1000;
        const dur = s.durationMillis / 1000;
        setPositionSec(pos);
        setDurationSec(dur);
        if (onProgress && dur > 0) {
          onProgress(pos / dur, pos, dur);
        }
      }
      if (s.didJustFinish) {
        if (autoPlayNext && onEnd) {
          onEnd();
        } else {
          setIsPlaying(false);
        }
      }
      if (s.error) {
        setIsOffline(true);
      }
    },
    [onProgress, onEnd, autoPlayNext],
  );

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pauseAsync().catch(() => {});
    } else {
      videoRef.current.playAsync().catch(() => {});
    }
  }, [isPlaying]);

  const setSpeed = useCallback((rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    videoRef.current?.setRateAsync(rate, true).catch(() => {});
  }, []);

  const changeQuality = useCallback((q: QualityLevel) => {
    setQuality(q);
    setShowSettings(false);
    // After swapping the source, seek back to the current position.
    const pos = positionSec;
    setTimeout(() => {
      videoRef.current?.setPositionAsync(pos * 1000).catch(() => {});
    }, 300);
  }, [positionSec]);

  const enterFullscreen = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch {
        // orientation lock may be unavailable on some devices
      }
    }
    setIsFullscreen(true);
    onFullscreenChange?.(true);
  }, [onFullscreenChange]);

  const exitFullscreen = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch {
        // non-fatal
      }
    }
    setIsFullscreen(false);
    onFullscreenChange?.(false);
  }, [onFullscreenChange]);

  // Restore portrait orientation on unmount and clean up.
  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web') {
        ScreenOrientation.unlockAsync().catch(() => {});
      }
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      // Unload the video player to free memory
      videoRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const pausePlayer = useCallback(() => {
    videoRef.current?.pauseAsync().catch(() => {});
  }, []);

  const playPlayer = useCallback(() => {
    if (autoPlay) {
      videoRef.current?.playAsync().catch(() => {});
    }
  }, [autoPlay]);

  useMediaPlaybackLifecycle({
    id: `watch:${activeUri}`,
    isActive,
    pause: pausePlayer,
    play: playPlayer,
  });

  const seekForward = useCallback((amount: number = 10) => {
    const target = Math.min(positionSec + amount, durationSec);
    videoRef.current?.setPositionAsync(target * 1000).catch(() => {});
  }, [positionSec, durationSec]);

  const seekBackward = useCallback((amount: number = 10) => {
    const target = Math.max(positionSec - amount, 0);
    videoRef.current?.setPositionAsync(target * 1000).catch(() => {});
  }, [positionSec, durationSec]);

  // Double-tap left/right to seek
  const handleVideoTap = useCallback((event: { nativeEvent: { locationX: number } }) => {
    const now = Date.now();
    const x = event.nativeEvent.locationX;
    const screenWidth = Dimensions.get('window').width;

    if (lastTapRef.current && now - lastTapRef.current.time < 350) {
      // Double tap — cancel pending single tap
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      const isRightHalf = x > screenWidth / 2;
      const side = isRightHalf ? 'right' : 'left';
      setDoubleTapHint({ side, visible: true });
      setTimeout(() => setDoubleTapHint({ side, visible: false }), 600);
      if (isRightHalf) {
        seekForward(10);
      } else {
        seekBackward(10);
      }
      lastTapRef.current = null;
    } else {
      // Single tap — wait to see if a double tap follows
      lastTapRef.current = { time: now, x };
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = setTimeout(() => {
        togglePlay();
        singleTapTimerRef.current = null;
      }, 350);
    }
  }, [seekForward, seekBackward, togglePlay]);

  const progressPct = durationSec > 0 ? (positionSec / durationSec) * 100 : 0;

  return (
    <View style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      <ExpoVideo
        ref={videoRef}
        source={{ uri: activeUri }}
        style={[styles.video, isFullscreen && styles.fullscreenVideo]}
        useNativeControls={false}
        resizeMode={isFullscreen ? ResizeMode.CONTAIN : ResizeMode.CONTAIN}
        isLooping={false}
        rate={playbackRate}
        shouldPlay={isPlaying}
        onPlaybackStatusUpdate={handlePlaybackStatus}
        onReadyForDisplay={handleReadyForDisplay as (e: unknown) => void}
      />

      {/* Custom controls overlay */}
      <View style={[styles.controlsOverlay, isFullscreen && { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.sm }]}> 
        {/* Tap layer for double-tap seek */}
        <Pressable style={styles.tapLayer} onPress={handleVideoTap} />
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            {isOffline ? (
              <View style={styles.offlineBadge}>
                <WifiOff size={12} color={colors.text} />
                <Text style={styles.offlineText}>Reconnecting…</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.topRight}>
            <Pressable style={styles.iconBtn} onPress={() => setShowSpeedMenu(!showSpeedMenu)} hitSlop={8}>
              <Gauge size={18} color={colors.text} />
              <Text style={styles.iconLabel}>{playbackRate}x</Text>
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => setShowSettings(!showSettings)} hitSlop={8}>
              <Settings size={18} color={colors.text} />
              <Text style={styles.iconLabel}>{QUALITY_LABELS[quality]}</Text>
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={isFullscreen ? exitFullscreen : enterFullscreen}
              hitSlop={8}
            >
              {isFullscreen ? <Minimize size={18} color={colors.text} /> : <Maximize size={18} color={colors.text} />}
            </Pressable>
          </View>
        </View>

        {/* Center play/pause + skip */}
        <View style={styles.centerControls}>
          <Pressable style={styles.centerBtn} onPress={togglePlay} hitSlop={12}>
            {isPlaying ? <Pause size={28} color={colors.text} fill={colors.text} /> : <Play size={28} color={colors.text} fill={colors.text} />}
          </Pressable>
          <View style={styles.skipRow}>
            <Pressable style={styles.centerBtnSmall} onPress={() => seekBackward(10)} hitSlop={8}>
              <RotateCcw size={18} color={colors.text} />
              <Text style={styles.skipLabel}>10s</Text>
            </Pressable>
            <Pressable style={styles.centerBtnSmall} onPress={() => seekForward(10)} hitSlop={8}>
              <RotateCw size={18} color={colors.text} />
              <Text style={styles.skipLabel}>10s</Text>
            </Pressable>
          </View>
        </View>

        {/* Double-tap seek hint */}
        {doubleTapHint.visible ? (
          <View style={[styles.seekHint, doubleTapHint.side === 'left' ? styles.seekHintLeft : styles.seekHintRight]}>
            {doubleTapHint.side === 'left' ? <RotateCcw size={32} color={colors.text} /> : <RotateCw size={32} color={colors.text} />}
            <Text style={styles.seekHintText}>{doubleTapHint.side === 'left' ? '-10s' : '+10s'}</Text>
          </View>
        ) : null}

        {/* Bottom bar: progress + time */}
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.progressTrack}
            onPress={(e) => {
              const x = e.nativeEvent.locationX;
              const trackWidth = Dimensions.get('window').width - spacing.lg * 2;
              const pct = Math.min(1, Math.max(0, x / trackWidth));
              videoRef.current?.setPositionAsync(pct * durationSec * 1000).catch(() => {});
            }}
          >
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
          </Pressable>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatSeconds(positionSec)}</Text>
            <Text style={styles.timeText}>/ {formatSeconds(durationSec)}</Text>
          </View>
        </View>
      </View>

      {/* Settings (quality) menu */}
      {showSettings ? (
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Quality</Text>
          {(Object.keys(QUALITY_LABELS) as QualityLevel[]).map((q) => (
            <Pressable
              key={q}
              style={[styles.menuItem, quality === q && styles.menuItemActive]}
              onPress={() => changeQuality(q)}
            >
              <Text style={[styles.menuItemText, quality === q && styles.menuItemTextActive]}>
                {QUALITY_LABELS[q]}
              </Text>
              {quality === q ? <Text style={styles.checkMark}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Speed menu */}
      {showSpeedMenu ? (
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Playback Speed</Text>
          {SPEED_OPTIONS.map((rate) => (
            <Pressable
              key={rate}
              style={[styles.menuItem, playbackRate === rate && styles.menuItemActive]}
              onPress={() => setSpeed(rate)}
            >
              <Text style={[styles.menuItemText, playbackRate === rate && styles.menuItemTextActive]}>
                {rate}x
              </Text>
              {playbackRate === rate ? <Text style={styles.checkMark}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Loading indicator while video buffers */}
      {!isReady ? (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.card,
    position: 'relative',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    aspectRatio: undefined,
    width: '100%',
    height: '100%',
    zIndex: 100,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.sm,
    paddingTop: Platform.select({ ios: spacing.xl, default: spacing.md }),
  },
  topLeft: { flex: 1 },
  topRight: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.base,
  },
  iconLabel: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  centerControls: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    flex: 1,
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.base,
  },
  skipLabel: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  bottomBar: {
    padding: spacing.sm,
    gap: 4,
  },
  progressTrack: {
    height: 24,
    justifyContent: 'center',
  },
  progressBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  menu: {
    position: 'absolute',
    top: Platform.select({ ios: spacing.xl, default: spacing.md }) + 48,
    right: spacing.sm,
    backgroundColor: colors.cardElevated,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minWidth: 160,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 50,
  },
  menuTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    paddingHorizontal: spacing.sm,
    paddingBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.base,
  },
  menuItemActive: {
    backgroundColor: 'rgba(124,58,237,0.18)',
  },
  menuItemText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  menuItemTextActive: {
    color: colors.secondary,
    fontFamily: 'Inter-SemiBold',
  },
  checkMark: {
    color: colors.secondary,
    fontSize: 14,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.base,
    alignSelf: 'flex-start',
  },
  offlineText: {
    color: colors.text,
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,11,15,0.5)',
  },
  loadingText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  seekHint: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    zIndex: 60,
  },
  seekHintLeft: {
    left: spacing.xl,
  },
  seekHintRight: {
    right: spacing.xl,
  },
  seekHintText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginTop: 4,
  },
});
