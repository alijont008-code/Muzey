import { CLOUDINARY_CONFIG, isCloudinaryConfigured } from '../config/cloudinary';

/**
 * Wraps any promise with an explicit timeout.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 15000,
  stepName: string = 'Amal'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${stepName} 15 soniya ichida yakunlanmadi (timeout).`));
    }, ms);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

/**
 * Helper to convert an image file to a compressed base64 data URL.
 * Used as an instant reliable fallback so users can always share without hanging.
 */
export async function fileToOptimizedDataUrl(file: File, maxDim: number = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to simple FileReader
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(img, 0, 0, w, h);

      // JPEG 0.75 gives high quality with very small footprint
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads a file (image or video) to Cloudinary via unsigned upload preset.
 * Enforces 15s timeout and automatic fallback.
 */
export async function uploadToCloudinary(file: File, itemName: string): Promise<string> {
  // Check if user has filled in Cloudinary config
  if (!isCloudinaryConfigured()) {
    console.warn(
      `[Muzeycha] Cloudinary sozlanmagan (placeholder turibdi). Zaxira yo'liga o'tilmoqda: "${itemName}"`
    );
    if (file.type.startsWith('image/')) {
      return await fileToOptimizedDataUrl(file);
    }
    throw new Error(
      "Cloudinary sozlanmagan. Iltimos, src/config/cloudinary.ts fayliga Cloud Name va Upload Preset kiriting."
    );
  }

  const cloudName = CLOUDINARY_CONFIG.cloudName.trim();
  const uploadPreset = CLOUDINARY_CONFIG.uploadPreset.trim();
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    console.log(`[Muzeycha] Cloudinary'ga yuklash boshlandi: "${itemName}"...`);
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      const msg = errorJson?.error?.message || `HTTP xatolik: ${response.status}`;
      throw new Error(`Cloudinary xatosi: ${msg}`);
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error("Cloudinary'dan URL olinmadi.");
    }

    console.log(`[Muzeycha] Cloudinary yuklash tugadi: "${itemName}" -> ${data.secure_url}`);
    return data.secure_url;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.warn(
      `[Muzeycha] Cloudinary yuklashda muammo bo'ldi ("${itemName}"):`,
      err instanceof Error ? err.message : err
    );

    // Fallback path: If it's an image, optimize to base64 so upload NEVER freezes!
    if (file.type.startsWith('image/')) {
      console.log(`[Muzeycha] Zaxira usulida siqilgan base64 saqlanmoqda: "${itemName}"`);
      return await fileToOptimizedDataUrl(file);
    }

    throw err;
  }
}
