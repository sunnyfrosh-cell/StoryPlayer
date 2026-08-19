import {
  uploadImage as cloudinaryUploadImage,
  uploadAvatar as cloudinaryUploadAvatar,
  uploadCoverImage as cloudinaryUploadCoverImage,
  uploadVideo as cloudinaryUploadVideo,
  uploadVideoThumbnail as cloudinaryUploadVideoThumbnail,
  deleteImage as cloudinaryDeleteImage,
  type UploadResult,
} from '@/services/cloudinary';

export const storageService = {
  async uploadAvatar(uid: string, uri: string): Promise<string> {
    const result = await cloudinaryUploadAvatar(uid, uri);
    return result.secureUrl;
  },

  async uploadCoverImage(uid: string, uri: string): Promise<string> {
    const result = await cloudinaryUploadCoverImage(uid, uri);
    return result.secureUrl;
  },

  async uploadVideo(uid: string, uri: string): Promise<UploadResult> {
    return cloudinaryUploadVideo(uid, uri);
  },

  async uploadVideoThumbnail(videoId: string, uri: string): Promise<string> {
    const result = await cloudinaryUploadVideoThumbnail(videoId, uri);
    return result.secureUrl;
  },

  async uploadImage(uri: string, folder: string): Promise<string> {
    const result = await cloudinaryUploadImage(uri, folder);
    return result.secureUrl;
  },

  async deleteFile(publicId: string): Promise<void> {
    await cloudinaryDeleteImage(publicId);
  },
};

export type { UploadResult };
