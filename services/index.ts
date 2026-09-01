export {
  cloudinaryService,
  uploadImage,
  uploadAvatar,
  uploadVideo,
  uploadVideoThumbnail,
  uploadCoverImage,
  deleteImage,
  isCloudinaryConfigured,
  getCloudinaryConfigDiagnostics,
  CLOUDINARY_CONFIG,
  UploadError,
  getCloudinaryVideoThumbnailUrl,
} from './cloudinary';
export type { UploadResult, UploadOptions, UploadErrorType } from './cloudinary';
export {
  optimizedCloudinaryService,
  uploadCompressedImage,
  uploadImageMultipleSizes,
  uploadVideoWithThumbnail,
  getOptimizedImageUrl,
  getVideoThumbnailUrl,
} from './cloudinaryOptimized';
export type { CompressedUploadOptions, MultiSizeResult, VideoUploadOptions, VideoUploadResult } from './cloudinaryOptimized';
