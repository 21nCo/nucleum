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
  return isActive
    ? `bg-bgs${parentBackgroundIndex + 2}`
    : `bg-bgs${parentBackgroundIndex + 1}`;
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
  return parseImageColors(imageData, 5);
}

export function parseImageColors(
  imageData: Uint8ClampedArray,
  numClusters = 5
) {
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
