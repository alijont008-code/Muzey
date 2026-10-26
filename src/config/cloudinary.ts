/**
 * Cloudinary Configuration for Muzeycha
 *
 * To enable Cloudinary image/video hosting:
 * 1. Log in to https://cloudinary.com
 * 2. Find your "Cloud Name" on your dashboard and paste it into `cloudName`
 * 3. Go to Settings -> Upload -> Upload presets -> "Add upload preset"
 * 4. Change "Signing Mode" to "Unsigned" and click Save
 * 5. Copy the preset name and paste it into `uploadPreset` below
 */

export const CLOUDINARY_CONFIG = {
  cloudName: 'YOUR_CLOUDINARY_CLOUD_NAME', // <-- PASTE YOUR CLOUDINARY CLOUD NAME HERE
  uploadPreset: 'YOUR_CLOUDINARY_UPLOAD_PRESET', // <-- PASTE YOUR UNSIGNED UPLOAD PRESET HERE
};

export function isCloudinaryConfigured(): boolean {
  return (
    Boolean(CLOUDINARY_CONFIG.cloudName) &&
    CLOUDINARY_CONFIG.cloudName !== 'YOUR_CLOUDINARY_CLOUD_NAME' &&
    Boolean(CLOUDINARY_CONFIG.uploadPreset) &&
    CLOUDINARY_CONFIG.uploadPreset !== 'YOUR_CLOUDINARY_UPLOAD_PRESET'
  );
}
