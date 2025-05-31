import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import QRCode from "qrcode";

/**
 * To add animate class which gets autoremoved after 300ms
 * @param animateClass
 * @param id
 * @returns resolved promise
 */
export function addAnimateClass(
  animateClass: string,
  id: string
): Promise<void> {
  return new Promise((resolve) => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.add(animateClass);
      setTimeout(() => {
        element.classList.remove(animateClass);
        resolve();
      }, 300);
    }
  });
}

/**
 * @deprecated
 * An asynchronous bounce animate function to bounce left or right an element mentioned by an id
 * @param direction
 * @param id
 */
export function bounce(direction: "l" | "r", id: string): Promise<void> {
  return new Promise((resolve) => {
    let element = document.getElementById(id)!;
    if (direction === "l") {
      element.classList.add("animate-bounce-l");
      setTimeout(() => {
        element.classList.remove("animate-bounce-l");
        resolve();
      }, 500);
    } else {
      element.classList.add("animate-bounce-r");
      setTimeout(() => {
        element.classList.remove("animate-bounce-r");
        resolve();
      }, 500);
    }
  });
}
/**
 * Utility function to combine class names
 * @param inputs
 * @returns
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * bg - background utility function
 * @param parentBackgroundIndex
 * @param isActive
 * @returns
 */
export function bg(
  parentBackgroundIndex: number = 1,
  isActive: boolean = false
) {
  const index = Math.floor(parentBackgroundIndex);
  const resultIndex = isActive ? index + 2 : index + 1;
  const cls = `bg-bgs${resultIndex}`;
  if (parentBackgroundIndex % 1 === 0 || resultIndex > 1) {
    return cls;
  } else {
    return cls + "/" + Math.round((parentBackgroundIndex % 1) * 100);
  }
}
/**
 * Active background utility function
 */
export function abg(isActive: boolean = true, parentBgIndex: number = 0) {
  return isActive ? "bg-aps1 text-abg" : bg(parentBgIndex);
}
/**
 * A utility function to create an empty transition to be used for conditional transitions
 * @returns
 */
export function emptyTranstition() {
  return {
    duration: 1,
    css: () => `transition: none;`
  };
}

export async function paintQRCode(
  canvas: HTMLCanvasElement,
  url: string,
  width: number
) {
  if (!canvas || !url || !width) return;
  await QRCode.toCanvas(canvas, url, {
    width: width,
    margin: 0,
    color: {
      dark: "#000000",
      light: "#ffffff"
    }
  });
}

export function convertToRGBA(color: string, opacity: number) {
  if (color.startsWith("rgba")) {
    return color.replace(/[\d.]+\)$/g, `${opacity})`);
  }
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  const tempElem = document.createElement("div");
  tempElem.style.color = color;
  document.body.appendChild(tempElem);
  const rgbColor = getComputedStyle(tempElem).color;
  document.body.removeChild(tempElem);
  return rgbColor.replace("rgb", "rgba").replace(")", `, ${opacity})`);
}

export async function getImageColors(img: HTMLImageElement) {
  const imageData = await getImageData(img);
  return parseImageColorsv2(imageData, 5);
}

export async function getImageColorsFromFile(
  file: File,
  numClusters: number = 5
) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const MAX_DIMENSION = 100;
    const scale = Math.min(
      MAX_DIMENSION / img.width,
      MAX_DIMENSION / img.height
    );
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height).data;
    return parseImageColorsv2(imageData, numClusters);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * @deprecated use {@link parseImageColorsv2} instead
 * @param imageData
 * @param numClusters
 * @returns
 */
function parseImageColors(imageData: Uint8ClampedArray, numClusters = 5) {
  const pixels: number[][] = [];
  for (let i = 0; i < imageData.length; i += 4) {
    pixels.push([
      imageData[i], // R
      imageData[i + 1], // G
      imageData[i + 2] // B
    ]);
  }

  let centroids = pixels.slice(0, numClusters);
  let oldCentroids: number[][] = [];
  let iterations = 0;
  const maxIterations = 20;

  while (iterations < maxIterations) {
    const clusters: number[][][] = Array(numClusters)
      .fill(0)
      .map(() => []);

    pixels.forEach((pixel) => {
      let minDist = Infinity;
      let closestCentroid = 0;

      centroids.forEach((centroid, i) => {
        const dist = Math.sqrt(
          Math.pow(pixel[0] - centroid[0], 2) +
            Math.pow(pixel[1] - centroid[1], 2) +
            Math.pow(pixel[2] - centroid[2], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          closestCentroid = i;
        }
      });

      clusters[closestCentroid].push(pixel);
    });

    oldCentroids = [...centroids];
    clusters.forEach((cluster, i) => {
      if (cluster.length > 0) {
        centroids[i] = cluster
          .reduce((acc, pixel) => [
            acc[0] + pixel[0],
            acc[1] + pixel[1],
            acc[2] + pixel[2]
          ])
          .map((sum) => Math.round(sum / cluster.length));
      }
    });

    iterations++;
  }

  return centroids.map((c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
}

export function parseImageColorsv2(
  imageData: Uint8ClampedArray,
  numClusters = 5
) {
  const pixels: number[][] = [];
  for (let i = 0; i < imageData.length; i += 4) {
    if (imageData[i + 3] > 128) {
      pixels.push([imageData[i], imageData[i + 1], imageData[i + 2]]);
    }
  }

  const step = Math.floor(pixels.length / numClusters);
  let centroids = Array(numClusters)
    .fill(0)
    .map((_, i) => pixels[Math.min(i * step, pixels.length - 1)]);

  let oldCentroids: number[][] = [];
  let iterations = 0;
  const maxIterations = 50;
  const convergenceThreshold = 2;

  while (iterations < maxIterations) {
    const clusters: number[][][] = Array(numClusters)
      .fill(0)
      .map(() => []);

    pixels.forEach((pixel) => {
      let minDist = Infinity;
      let closestCentroid = 0;

      centroids.forEach((centroid, i) => {
        const dist =
          Math.pow(pixel[0] - centroid[0], 2) +
          Math.pow(pixel[1] - centroid[1], 2) +
          Math.pow(pixel[2] - centroid[2], 2);
        if (dist < minDist) {
          minDist = dist;
          closestCentroid = i;
        }
      });

      clusters[closestCentroid].push(pixel);
    });

    oldCentroids = [...centroids];

    clusters.forEach((cluster, i) => {
      if (cluster.length > 0) {
        centroids[i] = cluster
          .reduce((acc, pixel) => [
            acc[0] + pixel[0],
            acc[1] + pixel[1],
            acc[2] + pixel[2]
          ])
          .map((sum) => Math.round(sum / cluster.length));
      }
    });

    const hasConverged = oldCentroids.every(
      (oldCentroid, i) =>
        Math.abs(oldCentroid[0] - centroids[i][0]) <= convergenceThreshold &&
        Math.abs(oldCentroid[1] - centroids[i][1]) <= convergenceThreshold &&
        Math.abs(oldCentroid[2] - centroids[i][2]) <= convergenceThreshold
    );

    if (hasConverged) break;
    iterations++;
  }

  const clusterSizes = Array(numClusters).fill(0);
  pixels.forEach((pixel) => {
    let closestCentroid = 0;
    let minDist = Infinity;

    centroids.forEach((centroid, i) => {
      const dist =
        Math.pow(pixel[0] - centroid[0], 2) +
        Math.pow(pixel[1] - centroid[1], 2) +
        Math.pow(pixel[2] - centroid[2], 2);
      if (dist < minDist) {
        minDist = dist;
        closestCentroid = i;
      }
    });
    clusterSizes[closestCentroid]++;
  });

  const colorsByDominance = centroids
    .map((centroid, i) => ({
      color: centroid,
      size: clusterSizes[i]
    }))
    .sort((a, b) => b.size - a.size)
    .map((item) => item.color);

  return colorsByDominance.map((c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`);
}

async function getImageData(img: HTMLImageElement): Promise<Uint8ClampedArray> {
  try {
    const response = await fetch(img.src);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const tempImage = new Image();

      tempImage.crossOrigin = "anonymous";

      tempImage.onload = () => {
        canvas.width = tempImage.width;
        canvas.height = tempImage.height;

        ctx?.drawImage(tempImage, 0, 0);
        const imageData = ctx?.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        ).data;

        URL.revokeObjectURL(blobUrl);

        if (imageData) {
          resolve(imageData);
        } else {
          reject(new Error("Failed to get image data"));
        }
      };

      tempImage.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("Failed to load image"));
      };
      tempImage.src = blobUrl;
    });
  } catch (error) {
    console.warn("Error processing image:", error);
    throw error;
  }
}

export function rgbToHex(rgbString: string) {
  const [r, g, b] = rgbString.match(/\d+/g)?.map(Number) ?? [];
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

async function compressImageWithCanvas(
  blob: Blob,
  maxWidth: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      // Calculate new dimensions maintaining aspect ratio
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

export async function compressImage(
  blob: Blob,
  maxWidth: number = 800,
  quality: number = 0.6
): Promise<Blob> {
  return compressImageWithCanvas(blob, maxWidth, quality);
}

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

export function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

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
