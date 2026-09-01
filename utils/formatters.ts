import { getCloudinaryVideoThumbnailUrl } from '@/services';

export function formatCount(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `${n}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function normalizeMediaUri(uri?: string | null): string | undefined {
  if (typeof uri !== 'string') return undefined;
  const trimmed = uri.trim();
  return trimmed ? trimmed : undefined;
}

export function getImageSource(uri?: string | null): { uri: string } | undefined {
  const normalized = normalizeMediaUri(uri);
  return normalized ? { uri: normalized } : undefined;
}

export function getVideoThumbnailSource(thumbnailUrl?: string | null, videoUrl?: string | null): { uri: string } | undefined {
  const direct = normalizeMediaUri(thumbnailUrl);
  if (direct) return { uri: direct };

  if (videoUrl) {
    const derived = getCloudinaryVideoThumbnailUrl(videoUrl);
    if (derived) return { uri: derived };
  }

  return undefined;
}
