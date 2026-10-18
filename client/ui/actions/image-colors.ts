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
