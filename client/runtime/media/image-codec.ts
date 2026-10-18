async function compressImageWithCanvas(
  blob: Blob,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (resultBlob) => {
          if (!resultBlob) {
            reject(new Error("Could not generate blob"));
            return;
          }
          resolve(resultBlob);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(blob);
  });
}

/** Compresses an image through the browser canvas at the requested dimensions. */
export async function compressImage(
  blob: Blob,
  maxWidth: number = 800,
  quality: number = 0.6
): Promise<Blob> {
  return compressImageWithCanvas(blob, maxWidth, quality);
}

/** Adjusts canvas compression toward the requested file size. */
export async function compressImageToTargetSize(
  blob: Blob,
  targetSize: number = 500 * 1024,
  maxWidth: number = 800
): Promise<Blob> {
  const initialQuality = calculateInitialQuality(blob.size);

  let minQuality = 0.1;
  let maxQuality = initialQuality;
  let bestBlob: Blob | null = null;
  let bestQualityDiff = Number.MAX_VALUE;
  let attempts = 0;
  const MAX_ATTEMPTS = 6;

  while (attempts < MAX_ATTEMPTS) {
    const quality = (minQuality + maxQuality) / 2;
    const compressedBlob = await compressImageWithCanvas(
      blob,
      maxWidth,
      quality
    );
    const sizeDiff = Math.abs(compressedBlob.size - targetSize);

    if (sizeDiff < bestQualityDiff) {
      bestQualityDiff = sizeDiff;
      bestBlob = compressedBlob;
    }

    if (Math.abs(compressedBlob.size - targetSize) < targetSize * 0.1) {
      break;
    }

    if (compressedBlob.size > targetSize) {
      maxQuality = quality;
    } else {
      minQuality = quality;
    }

    attempts++;
  }

  return (
    bestBlob || (await compressImageWithCanvas(blob, maxWidth, minQuality))
  );
}

/**
 * Calculate initial quality based on input file size
 * @param size Original file size in bytes
 * @returns number Initial quality value between 0 and 1
 */
function calculateInitialQuality(size: number): number {
  const MB = 1024 * 1024;
  if (size > 30 * MB) return 0.3; // > 30MB: start with low quality
  if (size > 10 * MB) return 0.4; // 10-30MB
  if (size > 5 * MB) return 0.5; // 5-10MB
  if (size > 2 * MB) return 0.6; // 2-5MB
  if (size > 1 * MB) return 0.7; // 1-2MB
  return 0.8; // < 1MB: start with high quality
}

/** Decodes base64 content into a typed browser Blob. */
export function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

/** Converts a HEIC image with the existing browser codec. */
export async function convertHeicToPng(heicBlob: Blob): Promise<{
  convertedBlob: Blob;
  convertedFileName: string;
}> {
  try {
    const heic2any = await import("heic2any");

    const convertedBlob = (await heic2any.default({
      blob: heicBlob,
      toType: "image/png",
      quality: 1.0
    })) as Blob;

    return {
      convertedBlob,
      convertedFileName: "converted"
    };
  } catch (error) {
    console.error("Error converting HEIC to PNG:", error);
    throw new Error("Failed to convert HEIC file");
  }
}
