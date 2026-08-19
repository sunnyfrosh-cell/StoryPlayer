import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Video } from '@/types';

const CACHE_KEYS = {
  videos: 'cache_videos',
  videoPrefix: 'cache_video_',
  profile: 'cache_profile',
  watchHistory: 'cache_watch_history',
  feed: 'cache_feed',
  thumbnails: 'cache_thumbnails',
} as const;

const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export async function cacheVideos(videos: Video[]): Promise<void> {
  try {
    const entry: CacheEntry<Video[]> = { data: videos, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_KEYS.videos, JSON.stringify(entry));
  } catch {
    // cache failures are non-fatal
  }
}

export async function getCachedVideos(): Promise<Video[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.videos);
    if (!raw) return [];
    const entry = JSON.parse(raw) as CacheEntry<Video[]>;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return [];
    return entry.data;
  } catch {
    return [];
  }
}

export async function cacheVideo(video: Video): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${CACHE_KEYS.videoPrefix}${video.id}`,
      JSON.stringify({ data: video, timestamp: Date.now() } satisfies CacheEntry<Video>),
    );
  } catch {
    // non-fatal
  }
}

export async function getCachedVideo(id: string): Promise<Video | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEYS.videoPrefix}${id}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<Video>;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export async function clearVideoCache(id: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${CACHE_KEYS.videoPrefix}${id}`);
  } catch {
    // non-fatal
  }
}

// --- User profile caching ---

export async function cacheUserProfile(profile: Record<string, unknown>): Promise<void> {
  try {
    const entry: CacheEntry<Record<string, unknown>> = { data: profile, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_KEYS.profile, JSON.stringify(entry));
  } catch {
    // cache failures are non-fatal
  }
}

export async function getCachedUserProfile(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.profile);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<Record<string, unknown>>;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

// --- Watch history caching ---

export async function cacheWatchHistory(items: unknown[]): Promise<void> {
  try {
    const entry: CacheEntry<unknown[]> = { data: items, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_KEYS.watchHistory, JSON.stringify(entry));
  } catch {
    // cache failures are non-fatal
  }
}

export async function getCachedWatchHistory(): Promise<unknown[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.watchHistory);
    if (!raw) return [];
    const entry = JSON.parse(raw) as CacheEntry<unknown[]>;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return [];
    return entry.data;
  } catch {
    return [];
  }
}

// --- Feed caching (recent videos for offline browsing) ---

export async function cacheFeed(videos: Video[]): Promise<void> {
  try {
    const entry: CacheEntry<Video[]> = { data: videos, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_KEYS.feed, JSON.stringify(entry));
  } catch {
    // cache failures are non-fatal
  }
}

export async function getCachedFeed(): Promise<Video[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.feed);
    if (!raw) return [];
    const entry = JSON.parse(raw) as CacheEntry<Video[]>;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return [];
    return entry.data;
  } catch {
    return [];
  }
}

// --- Thumbnail URL caching (to avoid re-fetching) ---

export async function cacheThumbnailUrls(urls: string[]): Promise<void> {
  try {
    const entry: CacheEntry<string[]> = { data: urls, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_KEYS.thumbnails, JSON.stringify(entry));
  } catch {
    // cache failures are non-fatal
  }
}

export async function getCachedThumbnailUrls(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEYS.thumbnails);
    if (!raw) return [];
    const entry = JSON.parse(raw) as CacheEntry<string[]>;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) return [];
    return entry.data;
  } catch {
    return [];
  }
}

// --- Offline indicator helper ---

/**
 * Checks whether a cache entry timestamp is stale given a TTL.
 * Defaults to the standard cache TTL (10 minutes).
 */
export function isCacheStale(timestamp: number, ttlMs: number = CACHE_TTL_MS): boolean {
  return Date.now() - timestamp > ttlMs;
}

// --- Retry helper for failed network requests ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff.
 * Default: 3 retries, 1000ms base delay (delays: 1s, 2s, 4s).
 * Throws the last error on final failure.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  throw lastError;
}
