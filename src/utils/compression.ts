import { MuseumItem } from '../types/museum';

/**
 * Compresses an image file client-side to a max dimension of 1600px on the longest side.
 * Returns a Blob, local Object URL, and dimensions/aspect ratio.
 */
export async function compressImageFile(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.8
): Promise<MuseumItem> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        width = 800;
        height = 600;
      }

      // Calculate scaled dimensions
      let targetWidth = width;
      let targetHeight = height;

      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          targetWidth = maxDimension;
          targetHeight = Math.round((height * maxDimension) / width);
        } else {
          targetHeight = maxDimension;
          targetWidth = Math.round((width * maxDimension) / height);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Fallback to original
        resolve({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'image',
          url: objectUrl,
          aspectRatio: width / height,
          originalWidth: width,
          originalHeight: height,
          name: file.name,
          file,
        });
        return;
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              type: 'image',
              url: objectUrl,
              aspectRatio: width / height,
              originalWidth: width,
              originalHeight: height,
              name: file.name,
              file,
            });
            return;
          }

          // Create fresh compressed URL and File
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          const compressedUrl = URL.createObjectURL(blob);

          console.log(
            `[Muzeycha] Siqish yakunlandi (compress done): "${file.name}" -> ${targetWidth}x${targetHeight} (${Math.round(blob.size / 1024)} KB)`
          );

          resolve({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: 'image',
            url: compressedUrl,
            aspectRatio: targetWidth / targetHeight,
            originalWidth: targetWidth,
            originalHeight: targetHeight,
            name: file.name,
            file: compressedFile,
          });
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Bu fayl turi qo'llab-quvvatlanmaydi."));
    };

    img.src = objectUrl;
  });
}

/**
 * Processes a video file: verifies size limit (<= 30MB) and reads intrinsic dimensions.
 */
export async function processVideoFile(file: File): Promise<MuseumItem> {
  const maxBytes = 30 * 1024 * 1024; // 30 MB
  if (file.size > maxBytes) {
    throw new Error(`Video hajmi 30 MB dan oshmasligi kerak (${Math.round(file.size / (1024 * 1024))} MB).`);
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;

    video.onloadedmetadata = () => {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const aspectRatio = width / height;

      resolve({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'video',
        url: objectUrl,
        aspectRatio,
        originalWidth: width,
        originalHeight: height,
        name: file.name,
        file,
        isMuted: true,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Bu fayl turi qo'llab-quvvatlanmaydi."));
    };

    video.src = objectUrl;
  });
}

/**
 * Processes multiple files, up to 30 items.
 */
export async function processFileList(files: FileList | File[]): Promise<MuseumItem[]> {
  const fileArray = Array.from(files).slice(0, 30);
  if (fileArray.length === 0) {
    throw new Error("Hech narsa tanlanmadi. Iltimos, kamida bitta rasm tanlang.");
  }

  const results: MuseumItem[] = [];

  for (const file of fileArray) {
    const mime = file.type.toLowerCase();
    if (mime.startsWith('image/')) {
      const item = await compressImageFile(file);
      results.push(item);
    } else if (mime.startsWith('video/')) {
      const item = await processVideoFile(file);
      results.push(item);
    } else {
      throw new Error("Bu fayl turi qo'llab-quvvatlanmaydi.");
    }
  }

  return results;
}
