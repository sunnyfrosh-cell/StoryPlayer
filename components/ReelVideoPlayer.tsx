import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  memo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  StatusBar,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  Gauge,
  RotateCcw,
  Maximize,
  Minimize,
  Heart,
} from 'lucide-react-native';
import { colors, spacing, radius } from '@/theme';
import { formatSeconds } from '@/utils';
import { useMediaPlaybackLifecycle } from '@/contexts';

if (Platform.OS === 'android') {
  // noop — removed UIManager layout animation
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export interface ReelVideoPlayerProps {
  videoUrl: string;
  isActive: boolean;
  onDoubleTapLike: () => void;
  onWatchProgress?: (watchSeconds: number, durationSeconds: number) => void;
}

function ReelVideoPlayerBase({
  videoUrl,
  isActive,
  onDoubleTapLike,
  onWatchProgress,
}: ReelVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showControls, setShowControls] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasFinished, setHasFinished] = useState(false);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.muted = false;
    p.playbackRate = 1.0;
    p.timeUpdateEventInterval = 1.0;
  });
  const mountedRef = useRef(true);
  const playerRef = useRef<VideoPlayer | null>(player);

  useEffect(() => {
    playerRef.current = player;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      playerRef.current = null;
    };
  }, [player]);

  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchStartRef = useRef<number>(0);
  const seekDragRef = useRef<boolean>(false);

  const likeAnim = useSharedValue(0);
  const playPauseAnim = useSharedValue(0);
  const controlsOpacity = useSharedValue(0);
  const doubleTapHintLeft = useSharedValue(0);
  const doubleTapHintRight = useSharedValue(0);

  // Status change — track buffering/loading
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('statusChange', (payload) => {
      if (payload.status === 'readyToPlay') {
        setIsBuffering(false);
        setDuration(player.duration ?? 0);
      } else if (payload.status === 'loading') {
        setIsBuffering(true);
      }
    });
    return () => sub.remove();
  }, [player]);

  // Playing change — track play/pause state
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('playingChange', (payload) => {
      setIsPlaying(payload.isPlaying);
      if (payload.isPlaying) {
        if (watchStartRef.current === 0) {
          watchStartRef.current = Date.now();
        }
      }
    });
    return () => sub.remove();
  }, [player]);

  // Time update — track current time and watch progress
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('timeUpdate', (payload) => {
      setCurrentTime(payload.currentTime);
      const dur = player.duration ?? 0;
      if (onWatchProgress && dur > 0) {
        const elapsed = watchStartRef.current > 0 ? (Date.now() - watchStartRef.current) / 1000 : 0;
        onWatchProgress(elapsed, dur);
      }
    });
    return () => sub.remove();
  }, [player, onWatchProgress]);

  // Play to end — finished
  useEffect(() => {
    if (!player) return;
    const sub = player.addListener('playToEnd', () => {
      setHasFinished(true);
      setIsPlaying(false);
    });
    return () => sub.remove();
  }, [player]);

  const pausePlayer = useCallback(() => {
    if (!mountedRef.current || playerRef.current !== player) return;
    player.pause();
  }, [player]);

  const playPlayer = useCallback(() => {
    if (!mountedRef.current || playerRef.current !== player) return;
    watchStartRef.current = 0;
    setHasFinished(false);
    player.play();
  }, [player]);

  useMediaPlaybackLifecycle({
    id: `reel:${videoUrl}`,
    isActive,
    pause: pausePlayer,
    play: playPlayer,
  });

  // Cleanup
  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      if (Platform.OS !== 'web') {
        ScreenOrientation.unlockAsync().catch(() => {});
      }
    };
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (!showSpeedMenu) {
        controlsOpacity.value = withTiming(0, { duration: 300 });
        setShowControls(false);
      }
    }, 3500);
  }, [controlsOpacity, showSpeedMenu]);

  const togglePlayPause = useCallback(() => {
    if (!mountedRef.current || playerRef.current !== player) return;
    if (hasFinished) {
      // Replay from start
      player.currentTime = 0;
      player.play();
      setHasFinished(false);
      setIsPlaying(true);
    } else if (isPlaying) {
      pausePlayer();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
    // Play/pause pulse animation
    playPauseAnim.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 400 }),
    );
    resetControlsTimer();
  }, [player, isPlaying, hasFinished, pausePlayer, playPauseAnim, resetControlsTimer]);

  const toggleMute = useCallback(() => {
    if (!player) return;
    player.muted = !player.muted;
    setIsMuted(!isMuted);
    resetControlsTimer();
  }, [player, isMuted, resetControlsTimer]);

  const changeRate = useCallback((rate: number) => {
    if (!player) return;
    player.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    resetControlsTimer();
  }, [player, resetControlsTimer]);

  const seekBy = useCallback((seconds: number) => {
    if (!player) return;
    const newTime = Math.max(0, Math.min((player.currentTime ?? 0) + seconds, duration));
    player.currentTime = newTime;
    setCurrentTime(newTime);
    // Show seek hint
    if (seconds > 0) {
      doubleTapHintRight.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 500 }),
      );
    } else {
      doubleTapHintLeft.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 500 }),
      );
    }
    resetControlsTimer();
  }, [player, duration, doubleTapHintLeft, doubleTapHintRight, resetControlsTimer]);

  const toggleFullscreen = useCallback(async () => {
    if (Platform.OS === 'web') {
      setIsFullscreen(!isFullscreen);
      return;
    }
    try {
      if (!isFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsFullscreen(true);
        StatusBar.setHidden(true);
      } else {
        await ScreenOrientation.unlockAsync();
        setIsFullscreen(false);
        StatusBar.setHidden(false);
      }
    } catch { /* non-fatal */ }
  }, [isFullscreen]);

  // Handle single tap (toggle play/pause) and double tap (like)
  const handleTap = useCallback((event: { nativeEvent: { locationX: number } }) => {
    const now = Date.now();
    const x = event.nativeEvent.locationX;
    const w = isFullscreen ? SCREEN_H : SCREEN_W;

    if (lastTapRef.current && now - lastTapRef.current.time < 300) {
      // Double tap
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      const isRightHalf = x > w / 2;
      if (isRightHalf) {
        seekBy(10);
      } else {
        seekBy(-10);
      }
      // Also like on double tap (either side)
      onDoubleTapLike();
      // Heart animation
      likeAnim.value = withSequence(
        withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      );
      lastTapRef.current = null;
    } else {
      // Single tap — wait to see if double tap follows
      lastTapRef.current = { time: now, x };
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = setTimeout(() => {
        togglePlayPause();
        singleTapTimerRef.current = null;
      }, 300);
    }
  }, [seekBy, onDoubleTapLike, likeAnim, togglePlayPause, isFullscreen]);

  // Seek bar drag
  const seekPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
      onPanResponderGrant: () => {
        seekDragRef.current = true;
        if (mountedRef.current && playerRef.current === player) player.pause();
      },
      onPanResponderMove: (_, gestureState) => {
        if (!player || duration <= 0) return;
        const barWidth = (isFullscreen ? SCREEN_H : SCREEN_W) - spacing.md * 2;
        const progress = Math.max(0, Math.min(1, (gestureState.x0 + gestureState.dx) / barWidth));
        const newTime = progress * duration;
        setCurrentTime(newTime);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!player || duration <= 0) return;
        const barWidth = (isFullscreen ? SCREEN_H : SCREEN_W) - spacing.md * 2;
        const progress = Math.max(0, Math.min(1, (gestureState.x0 + gestureState.dx) / barWidth));
        const newTime = progress * duration;
        player.currentTime = newTime;
        setCurrentTime(newTime);
        seekDragRef.current = false;
        if (isActive && !hasFinished) {
          player.play();
          setIsPlaying(true);
        }
        resetControlsTimer();
      },
    }),
  ).current;

  // Like heart animated style
  const heartStyle = useAnimatedStyle(() => ({
    opacity: likeAnim.value,
    transform: [
      { scale: interpolate(likeAnim.value, [0, 0.5, 1], [0, 1.3, 1]) },
    ],
  }));

  // Play/pause pulse animated style
  const playPulseStyle = useAnimatedStyle(() => ({
    opacity: playPauseAnim.value,
    transform: [{ scale: interpolate(playPauseAnim.value, [0, 1], [0.8, 1.2]) }],
  }));

  // Controls opacity style
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  // Seek hint styles
  const seekHintLeftStyle = useAnimatedStyle(() => ({
    opacity: doubleTapHintLeft.value,
    transform: [{ scale: interpolate(doubleTapHintLeft.value, [0, 1], [0.5, 1]) }],
  }));
  const seekHintRightStyle = useAnimatedStyle(() => ({
    opacity: doubleTapHintRight.value,
    transform: [{ scale: interpolate(doubleTapHintRight.value, [0, 1], [0.5, 1]) }],
  }));

  const progress = duration > 0 ? currentTime / duration : 0;
  const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const playerHeight = isFullscreen ? SCREEN_W : SCREEN_H;

  return (
    <View style={[styles.container, isFullscreen && styles.fullscreenContainer, { height: playerHeight }]}>
      {/* Video view */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />

      {/* Buffering overlay — show thumbnail while loading */}
      {isBuffering && (
        <View style={styles.bufferingOverlay} pointerEvents="none">
          <View style={styles.bufferingSpinner} />
        </View>
      )}

      {/* Tap layer for play/pause and double-tap like */}
      <Pressable style={styles.tapLayer} onPress={handleTap} />

      {/* Double-tap seek hints */}
      <Animated.View style={[styles.seekHint, styles.seekHintLeft, seekHintLeftStyle]} pointerEvents="none">
        <SkipBack size={28} color={colors.text} fill={colors.text} />
        <Text style={styles.seekHintText}>-10s</Text>
      </Animated.View>
      <Animated.View style={[styles.seekHint, styles.seekHintRight, seekHintRightStyle]} pointerEvents="none">
        <SkipForward size={28} color={colors.text} fill={colors.text} />
        <Text style={styles.seekHintText}>+10s</Text>
      </Animated.View>

      {/* Double-tap like heart */}
      <Animated.View style={[styles.heartOverlay, heartStyle]} pointerEvents="none">
        <Heart size={80} color={colors.error} fill={colors.error} strokeWidth={0} />
      </Animated.View>

      {/* Play/pause feedback and paused-state control */}
      <Animated.View style={[styles.playPulse, playPulseStyle]} pointerEvents="none">
        {isPlaying ? <Pause size={44} color={colors.text} fill={colors.text} /> : <Play size={44} color={colors.text} fill={colors.text} />}
      </Animated.View>
      {!isPlaying && !hasFinished && !isBuffering && (
        <Pressable style={styles.pausedOverlay} onPress={togglePlayPause}>
          <Play size={48} color={colors.text} fill={colors.text} />
        </Pressable>
      )}

      {/* Replay overlay when finished */}
      {hasFinished && (
        <Pressable style={styles.replayOverlay} onPress={togglePlayPause}>
          <RotateCcw size={48} color={colors.text} />
        </Pressable>
      )}

      {/* Controls overlay */}
      <Animated.View style={[styles.controlsOverlay, controlsStyle]} pointerEvents={showControls ? 'auto' : 'none'}>
        {/* Bottom controls */}
        <View style={styles.bottomControls}>
          {/* Seek bar */}
          <View style={styles.seekBarWrap} {...seekPanResponder.panHandlers}>
            <View style={styles.seekBarTrack}>
              <View style={[styles.seekBarFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.seekBarThumb, { left: `${progress * 100}%` }]} />
            </View>
          </View>

          {/* Time + controls row */}
          <View style={styles.bottomRow}>
            <View style={styles.leftControls}>
              <Pressable onPress={togglePlayPause} style={styles.controlBtn}>
                {isPlaying ? <Pause size={18} color={colors.text} /> : <Play size={18} color={colors.text} />}
              </Pressable>
              <Pressable onPress={() => seekBy(-10)} style={styles.controlBtn}>
                <SkipBack size={16} color={colors.text} />
              </Pressable>
              <Pressable onPress={() => seekBy(10)} style={styles.controlBtn}>
                <SkipForward size={16} color={colors.text} />
              </Pressable>
              <Pressable onPress={toggleMute} style={styles.controlBtn}>
                {isMuted ? <VolumeX size={18} color={colors.text} /> : <Volume2 size={18} color={colors.text} />}
              </Pressable>
              <Text style={styles.timeText}>
                {formatSeconds(currentTime)} / {formatSeconds(duration)}
              </Text>
            </View>

            <View style={styles.rightControls}>
              <Pressable
                onPress={() => { setShowSpeedMenu(!showSpeedMenu); resetControlsTimer(); }}
                style={styles.controlBtn}
              >
                <Gauge size={16} color={colors.text} />
                <Text style={styles.rateText}>{playbackRate}x</Text>
              </Pressable>
              <Pressable onPress={toggleFullscreen} style={styles.controlBtn}>
                {isFullscreen ? <Minimize size={16} color={colors.text} /> : <Maximize size={16} color={colors.text} />}
              </Pressable>
            </View>
          </View>

          {/* Speed menu */}
          {showSpeedMenu && (
            <View style={styles.speedMenu}>
              {SPEEDS.map((s) => (
                <Pressable key={s} onPress={() => changeRate(s)} style={styles.speedItem}>
                  <Text style={[styles.speedText, playbackRate === s && styles.speedTextActive]}>
                    {s}x
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

export const ReelVideoPlayer = memo(ReelVideoPlayerBase);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.card,
    position: 'relative',
    overflow: 'hidden',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  video: { width: '100%', height: '100%' },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 1,
  },
  bufferingSpinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.primary + '40',
    borderTopColor: colors.primary,
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  seekHint: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
    gap: 4,
    zIndex: 3,
  },
  seekHintLeft: { left: 40 },
  seekHintRight: { right: 40 },
  seekHintText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  heartOverlay: {
    position: 'absolute',
    top: '38%',
    left: '42%',
    zIndex: 4,
  },
  playPulse: {
    position: 'absolute',
    top: '42%',
    left: '46%',
    zIndex: 4,
  },
  pausedOverlay: {
    position: 'absolute',
    top: '42%',
    left: '42%',
    zIndex: 4,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  replayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 6,
  },
  bottomControls: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  seekBarWrap: { height: 24, justifyContent: 'center' },
  seekBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
  },
  seekBarFill: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  seekBarThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginLeft: -6,
    top: -4.5,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  controlBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: spacing.xs },
  timeText: { color: colors.text, fontSize: 11 },
  rateText: { color: colors.text, fontSize: 11 },
  speedMenu: {
    position: 'absolute',
    bottom: 44,
    right: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    padding: spacing.xs,
    minWidth: 80,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speedItem: { paddingVertical: 6, paddingHorizontal: spacing.sm },
  speedText: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  speedTextActive: { color: colors.primary, fontWeight: '600' },
});
