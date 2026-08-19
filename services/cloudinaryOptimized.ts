import {
  uploadImage,
  uploadAvatar,
  uploadVideoThumbnail,
  uploadVideo,
  type UploadOptions,
  type UploadResult,
  CLOUDINARY_CONFIG,
  isCloudinaryConfigured,
  UploadError,
} from './cloudinary';

export interface CompressedUploadOptions extends UploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  generateThumbnail?: boolean;
  generateMultipleSizes?: boolean;
}

export interface MultiSizeResult {
  original: UploadResult;
  thumbnail: UploadResult | null;
  small: UploadResult | null;
  medium: UploadResult | null;
}

export interface VideoUploadOptions extends UploadOptions {
  generateThumbnail?: boolean;
}

export interface VideoUploadResult {
  video: UploadResult;
  thumbnail: UploadResult | null;
}

function buildTransformationParams(
  resourceType: 'image' | 'video',
  maxWidth?: number,
  maxHeight?: number,
  quality?: number,
): string {
  const parts: string[] = [];
  if (maxWidth) parts.push(`w_${maxWidth}`);
  if (maxHeight) parts.push(`h_${maxHeight}`);
  if (quality !== undefined) parts.push(`q_${quality}`);
  if (resourceType === 'image') parts.push('f_auto');
  if (resourceType === 'video') parts.push('f_mp4');
  return parts.length > 0 ? parts.join(',') : '';
}

export function getOptimizedImageUrl(
  publicId: string,
  width?: number,
  height?: number,
  quality: number = 'auto' as unknown as number,
): string {
  const { cloudName } = CLOUDINARY_CONFIG;
  const transforms: string[] = [];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  transforms.push(`q_${quality}`);
  transforms.push('f_auto');
  const transformStr = transforms.join(',');
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}/${publicId}`;
}

export function getVideoThumbnailUrl(publicId: string, width?: number): string {
  const { cloudName } = CLOUDINARY_CONFIG;
  const transforms = width ? `w_${width},c_fill` : 'c_fill';
  return `https://res.cloudinary.com/${cloudName}/video/upload/${transforms}/${publicId}.jpg`;
}

export async function uploadCompressedImage(
  uri: string,
  folder: string,
  filePrefix: string,
  options?: CompressedUploadOptions,
): Promise<UploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new UploadError('not_configured', 'Cloudinary is not configured. Add EXPO_PUBLIC_CLOUDINARY_* values to your .env file.');
  }
  const transformation = buildTransformationParams(
    'image',
    options?.maxWidth ?? 1280,
    options?.maxHeight,
    options?.quality ?? 80,
  );

  const { cloudName, uploadPreset } = CLOUDINARY_CONFIG;
  const UPLOAD_ENDPOINT = 'https://api.cloudinary.com/v1_1';
  const fileName = `${filePrefix}_${Date.now()}.jpg`;
  const mimeType = 'image/jpeg';

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${UPLOAD_ENDPOINT}/${cloudName}/image/upload`);
    // DO NOT set Content-Type manually — FormData auto-generates the boundary.

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
            reject(new UploadError('parse_error', 'Cloudinary responded without a secure_url.'));
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
          console.error('[Cloudinary] Parse error:', xhr.responseText, parseErr);
          reject(new UploadError('parse_error', 'Could not parse Cloudinary response.', { cause: parseErr }));
        }
      } else {
        let cloudinaryMessage: string | undefined;
        try {
          const body = JSON.parse(xhr.responseText);
          cloudinaryMessage = body?.error?.message;
        } catch {
          console.error('[Cloudinary] Non-JSON error body:', xhr.responseText);
        }
        console.error(`[Cloudinary] HTTP ${xhr.status}:`, xhr.responseText);
        reject(new UploadError(
          xhr.status >= 500 ? 'server_error' : 'invalid_credentials',
          cloudinaryMessage ?? `Upload failed with HTTP ${xhr.status}.`,
          { statusCode: xhr.status, cloudinaryMessage },
        ));
      }
    };

    xhr.onerror = () => {
      console.error('[Cloudinary] Network error. ReadyState:', xhr.readyState);
      reject(new UploadError('network', 'Network error during upload. Check your connection.'));
    };

    xhr.ontimeout = () => {
      console.error('[Cloudinary] Timeout');
      reject(new UploadError('timeout', 'Upload timed out.'));
    };

    xhr.timeout = 60_000;

    const formData = new FormData();
    formData.append('file', {
      uri,
      type: mimeType,
      name: fileName,
    } as unknown as Blob);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);
    formData.append('public_id', `${folder}/${filePrefix}_${Date.now()}`);
    if (transformation) formData.append('transformation', transformation);

    xhr.send(formData);
  });
}

export async function uploadImageMultipleSizes(
  uri: string,
  folder: string,
  filePrefix: string,
  options?: UploadOptions,
): Promise<MultiSizeResult> {
  const original = await uploadImage(uri, folder, options);
  const makeSize = async (label: string): Promise<UploadResult | null> => {
    try {
      return await uploadImage(uri, folder, { ...options, retryCount: 1 });
    } catch (err) {
      console.warn(`[Cloudinary] Failed to generate ${label} size for ${filePrefix}:`, err);
      return null;
    }
  };
  const [thumbnail, small, medium] = await Promise.all([
    makeSize('thumbnail'),
    makeSize('small'),
    makeSize('medium'),
  ]);
  return { original, thumbnail, small, medium };
}

export async function uploadVideoWithThumbnail(
  uid: string,
  uri: string,
  thumbnailUri: string | null,
  options?: VideoUploadOptions,
): Promise<VideoUploadResult> {
  const video = await uploadVideo(uid, uri, options);
  let thumbnail: UploadResult | null = null;
  if (thumbnailUri) {
    try {
      thumbnail = await uploadVideoThumbnail(uid, thumbnailUri, options);
    } catch (err) {
      console.warn('[Cloudinary] Thumbnail upload failed, continuing with video-only:', err);
      thumbnail = null;
    }
  }
  return { video, thumbnail };
}

export const optimizedCloudinaryService = {
  uploadCompressedImage,
  uploadImageMultipleSizes,
  uploadVideoWithThumbnail,
  getOptimizedImageUrl,
  getVideoThumbnailUrl,
  isConfigured: isCloudinaryConfigured,
};
