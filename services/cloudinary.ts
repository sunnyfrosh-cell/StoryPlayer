export const CLOUDINARY_CONFIG = {
  cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
  uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '',
  apiKey: process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY ?? '',
};

const UPLOAD_ENDPOINT = 'https://api.cloudinary.com/v1_1';

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CONFIG.cloudName && CLOUDINARY_CONFIG.uploadPreset);
}

export function getCloudinaryConfigDiagnostics(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!CLOUDINARY_CONFIG.cloudName) missing.push('EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME');
  if (!CLOUDINARY_CONFIG.uploadPreset) missing.push('EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
  return { configured: missing.length === 0, missing };
}

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  retryCount?: number;
  /** Optional AbortSignal — when aborted, the in-flight XHR is cancelled. */
  signal?: AbortSignal;
}

export interface UploadResult {
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  durationSeconds?: number;
}

export type UploadErrorType =
  | 'not_configured'
  | 'no_internet'
  | 'invalid_uri'
  | 'invalid_credentials'
  | 'invalid_preset'
  | 'file_too_large'
  | 'server_error'
  | 'timeout'
  | 'parse_error'
  | 'network'
  | 'unknown';

export class UploadError extends Error {
  type: UploadErrorType;
  statusCode?: number;
  cloudinaryMessage?: string;
  originalError?: unknown;

  constructor(
    type: UploadErrorType,
    message: string,
    opts?: { statusCode?: number; cloudinaryMessage?: string; cause?: unknown },
  ) {
    super(message);
    this.name = 'UploadError';
    this.type = type;
    if (opts?.statusCode !== undefined) this.statusCode = opts.statusCode;
    if (opts?.cloudinaryMessage) this.cloudinaryMessage = opts.cloudinaryMessage;
    if (opts?.cause !== undefined) this.originalError = opts.cause;
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidUri(uri: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  if (uri.startsWith('file://') || uri.startsWith('content://')) return true;
  if (uri.startsWith('http://') || uri.startsWith('https://')) return true;
  if (uri.startsWith('blob:') || uri.startsWith('data:')) return true;
  return false;
}

async function checkInternetConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch('https://res.cloudinary.com', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok || response.status > 0;
  } catch {
    return false;
  }
}

function getMimeType(uri: string, resourceType: 'image' | 'video'): string {
  if (resourceType === 'video') {
    const ext = uri.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      webm: 'video/webm',
      mkv: 'video/x-matroska',
    };
    return map[ext] ?? 'video/mp4';
  }
  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    heic: 'image/heic',
  };
  return map[ext] ?? 'image/jpeg';
}

function getFileName(uri: string, prefix: string, resourceType: 'image' | 'video'): string {
  const ext = uri.split('.').pop() ?? (resourceType === 'video' ? 'mp4' : 'jpg');
  return `${prefix}_${Date.now()}.${ext}`;
}

function classifyCloudinaryError(status: number, responseText: string): UploadError {
  let cloudinaryMessage: string | undefined;
  try {
    const errorBody = JSON.parse(responseText);
    cloudinaryMessage = errorBody?.error?.message ?? undefined;
  } catch {
    console.error('[Cloudinary] Could not parse error response body as JSON:', responseText);
  }

  if (status === 400 || status === 401 || status === 403) {
    const detail = cloudinaryMessage ?? `HTTP ${status}`;
    if (cloudinaryMessage?.toLowerCase().includes('preset') || cloudinaryMessage?.toLowerCase().includes('upload_preset')) {
      return new UploadError('invalid_preset', `Cloudinary rejected the upload preset: ${cloudinaryMessage}. Check EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.`, { statusCode: status, cloudinaryMessage });
    }
    return new UploadError('invalid_credentials', `Cloudinary authentication failed: ${detail}. Check your Cloud Name and Upload Preset.`, { statusCode: status, cloudinaryMessage });
  }

  if (status === 413) {
    const detail = cloudinaryMessage ?? 'The file exceeds the maximum upload size.';
    return new UploadError('file_too_large', detail, { statusCode: status, cloudinaryMessage });
  }

  if (status >= 500) {
    const detail = cloudinaryMessage ?? `Cloudinary server error (HTTP ${status}).`;
    return new UploadError('server_error', detail, { statusCode: status, cloudinaryMessage });
  }

  const detail = cloudinaryMessage ?? `Upload failed with HTTP ${status}.`;
  return new UploadError('server_error', detail, { statusCode: status, cloudinaryMessage });
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof UploadError) {
    return err.type === 'timeout' || err.type === 'network' || err.type === 'server_error';
  }
  return false;
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function uploadToCloudinary(
  uri: string,
  folder: string,
  filePrefix: string,
  resourceType: 'image' | 'video',
  options?: UploadOptions,
): Promise<UploadResult> {
  const { configured, missing } = getCloudinaryConfigDiagnostics();
  if (!configured) {
    throw new UploadError(
      'not_configured',
      `Cloudinary is not configured. Missing: ${missing.join(', ')}. Add these to your .env file.`,
    );
  }

  if (!isValidUri(uri)) {
    throw new UploadError('invalid_uri', `The selected file URI is not valid: "${uri}". Please reselect the file.`);
  }

  const hasInternet = await checkInternetConnection();
  if (!hasInternet) {
    throw new UploadError('no_internet', 'No internet connection. Please check your network and try again.');
  }

  const { cloudName, uploadPreset } = CLOUDINARY_CONFIG;
  const maxRetries = options?.retryCount ?? MAX_RETRIES;
  const fileName = getFileName(uri, filePrefix, resourceType);
  const mimeType = getMimeType(uri, resourceType);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check for cancellation before each attempt
    if (options?.signal?.aborted) {
      throw new UploadError('unknown', 'Upload cancelled by user.');
    }
    try {
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const url = `${UPLOAD_ENDPOINT}/${cloudName}/${resourceType}/upload`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        // Support cancellation via AbortSignal
        const onAbort = () => {
          xhr.abort();
          reject(new UploadError('unknown', 'Upload cancelled by user.'));
        };
        if (options?.signal) {
          if (options.signal.aborted) {
            onAbort();
            return;
          }
          options.signal.addEventListener('abort', onAbort, { once: true });
        }

        // DO NOT set Content-Type manually — the browser/XHR must auto-generate
        // the multipart/form-data; boundary=... header from FormData. Setting it
        // manually strips the boundary, and Cloudinary rejects the request body.
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && options?.onProgress) {
            const progress = (event.loaded / event.total) * 100;
            options.onProgress(Math.round(progress));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (!data.secure_url) {
                reject(new UploadError('parse_error', 'Cloudinary responded without a secure_url. Response: ' + xhr.responseText.slice(0, 200)));
                return;
              }
              resolve({
                secureUrl: data.secure_url as string,
                publicId: data.public_id as string,
                width: data.width,
                height: data.height,
                bytes: data.bytes,
                format: data.format,
                durationSeconds: data.duration ? Math.round(data.duration) : undefined,
              });
            } catch (parseErr) {
              console.error('[Cloudinary] Failed to parse success response:', xhr.responseText, parseErr);
              reject(new UploadError('parse_error', 'Could not parse Cloudinary response. The upload may have succeeded but the response was malformed.', { cause: parseErr }));
            }
          } else {
            const error = classifyCloudinaryError(xhr.status, xhr.responseText);
            console.error(`[Cloudinary] HTTP ${xhr.status} on attempt ${attempt + 1}:`, xhr.responseText);
            reject(error);
          }
        };

        xhr.onerror = () => {
          console.error(`[Cloudinary] Network error on attempt ${attempt + 1}. ReadyState: ${xhr.readyState}, Status: ${xhr.status}`);
          reject(new UploadError('network', 'Network error during upload. Check your internet connection and try again.'));
        };

        xhr.ontimeout = () => {
          console.error(`[Cloudinary] Timeout on attempt ${attempt + 1}`);
          reject(new UploadError('timeout', 'Upload timed out. The file may be too large or your connection too slow.'));
        };

        xhr.timeout = resourceType === 'video' ? 300_000 : 60_000;

        const formData = new FormData();
        formData.append('file', {
          uri,
          type: mimeType,
          name: fileName,
        } as unknown as Blob);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folder);
        formData.append('public_id', `${folder}/${filePrefix}_${Date.now()}`);

        xhr.send(formData);
      });

      // Clean up abort listener on success
      return result;
    } catch (err) {
      // Don't retry if the user cancelled
      if (err instanceof UploadError && err.message.includes('cancelled')) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));

      if (err instanceof UploadError && !isRetryableError(err)) {
        console.error(`[Cloudinary] Non-retryable error (${err.type}):`, err.message);
        if (err.originalError) console.error('[Cloudinary] Original error:', err.originalError);
        throw err;
      }

      if (err instanceof UploadError && err.statusCode && !shouldRetry(err.statusCode)) {
        console.error(`[Cloudinary] Non-retryable HTTP ${err.statusCode}:`, err.message);
        throw err;
      }

      console.warn(`[Cloudinary] Attempt ${attempt + 1} failed (retryable). Will ${attempt < maxRetries ? 'retry' : 'give up'}:`, lastError.message);

      if (attempt < maxRetries) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  const finalMessage = lastError instanceof UploadError
    ? lastError.message
    : lastError?.message ?? 'Upload failed after all retries.';
  const finalError = new UploadError(
    lastError instanceof UploadError ? lastError.type : 'unknown',
    finalMessage,
    { cause: lastError ?? undefined },
  );
  console.error('[Cloudinary] All retries exhausted:', finalMessage, lastError);
  throw finalError;
}

export async function uploadImage(uri: string, folder = 'misc', options?: UploadOptions): Promise<UploadResult> {
  return uploadToCloudinary(uri, folder, 'img', 'image', options);
}

export async function uploadAvatar(uid: string, uri: string, options?: UploadOptions): Promise<UploadResult> {
  return uploadToCloudinary(uri, `avatars/${uid}`, 'avatar', 'image', options);
}

export async function uploadVideoThumbnail(videoId: string, uri: string, options?: UploadOptions): Promise<UploadResult> {
  return uploadToCloudinary(uri, `videos/${videoId}`, 'thumb', 'image', options);
}

export async function uploadVideo(uid: string, uri: string, options?: UploadOptions): Promise<UploadResult> {
  return uploadToCloudinary(uri, `videos/${uid}`, 'video', 'video', options);
}

export async function uploadCoverImage(uid: string, uri: string, options?: UploadOptions): Promise<UploadResult> {
  return uploadToCloudinary(uri, `covers/${uid}`, 'cover', 'image', options);
}

export async function deleteImage(publicId: string): Promise<void> {
  const { configured, missing } = getCloudinaryConfigDiagnostics();
  if (!configured) {
    throw new UploadError('not_configured', `Cloudinary is not configured. Missing: ${missing.join(', ')}.`);
  }
  const { cloudName, apiKey } = CLOUDINARY_CONFIG;
  if (!apiKey) {
    throw new UploadError('invalid_credentials', 'Cloudinary API key is required for deletion.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const url = `${UPLOAD_ENDPOINT}/${cloudName}/image/destroy`;

  try {
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text().catch((e) => {
        console.error('[Cloudinary] Failed to read delete error body:', e);
        return '';
      });
      console.error(`[Cloudinary] Delete failed (HTTP ${response.status}):`, body);
      throw new UploadError('server_error', `Failed to delete image (HTTP ${response.status}). ${body}`, { statusCode: response.status });
    }
  } catch (err) {
    if (err instanceof UploadError) throw err;
    console.error('[Cloudinary] Delete error:', err);
    throw new UploadError('network', err instanceof Error ? err.message : 'Failed to delete image from Cloudinary.', { cause: err });
  }
}

export const cloudinaryService = {
  uploadImage,
  uploadAvatar,
  uploadVideo,
  uploadVideoThumbnail,
  uploadCoverImage,
  deleteImage,
  isConfigured: isCloudinaryConfigured,
};
