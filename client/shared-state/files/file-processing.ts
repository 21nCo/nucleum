import type { ClientArtifactKind } from "@filefn/client";
import { getEnvVal } from "@nucleum/client/runtime/environment/variables";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  compressImageToTargetSize,
  convertHeicToPng
} from "@nucleum/client/runtime/media/image-codec";
import { generateImagePreviewFromPdf } from "@nucleum/shared-state/files/pdf-preview";

/**
 * Where an environment processes uploaded files: on the device (`local`), by
 * the account service's processing queue (`remote`), or both.
 */
export type FileProcessingMode = "local" | "remote" | "both";

const FILE_PROCESSING_MODES: readonly FileProcessingMode[] = [
  "local",
  "remote",
  "both"
];

/** Mode used when the environment sets none: local development and dev. */
export const DEFAULT_FILE_PROCESSING_MODE: FileProcessingMode = "local";

/** Kind of the thumbnail the device makes: the size the grid renders. */
export const DEVICE_THUMBNAIL_KIND: ClientArtifactKind = "thumbnail-medium";

/** Artifact kinds present on a file and how long each took to make. */
export type IFileProcessing = {
  mode: FileProcessingMode;
  artifacts: Partial<Record<ClientArtifactKind, { durationMs?: number }>>;
};

/** An artifact made or supplied on the device, ready to upload. */
export type DeviceArtifact = {
  kind: ClientArtifactKind;
  data: Blob;
  /** Time spent making it on the device; absent for a caller's own blob. */
  durationMs?: number;
};

/**
 * Returns the environment's `fileProcessingMode` (`VITE_FILE_PROCESSING_MODE`,
 * or `PLASMO_PUBLIC_FILE_PROCESSING_MODE` in the extension). An unset value
 * means `local`; an unknown value is logged and also means `local`, so a
 * misconfigured build still makes thumbnails.
 */
export function resolveFileProcessingMode(
  value: unknown = getEnvVal("FILE_PROCESSING_MODE")
): FileProcessingMode {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_FILE_PROCESSING_MODE;
  }
  const mode = String(value).trim().toLowerCase();
  const known = FILE_PROCESSING_MODES.find((item) => item === mode);
  if (known) return known;
  logger.warn({
    at: "resolveFileProcessingMode",
    message: "Unknown fileProcessingMode, using the default",
    value,
    fallback: DEFAULT_FILE_PROCESSING_MODE
  });
  return DEFAULT_FILE_PROCESSING_MODE;
}

/** True when the device makes thumbnails and converts HEIC in this mode. */
export function isDeviceProcessingMode(mode: FileProcessingMode) {
  return mode !== "remote";
}

/** True for a HEIC photo, by its name or content type. */
export function isHeicFile(fileName: string, contentType: string) {
  return (
    fileName.toLowerCase().endsWith(".heic") ||
    /^image\/hei[cf]$/i.test(contentType)
  );
}

/** Makes a thumbnail of an image or the first page of a PDF, if possible. */
export async function generateThumbnail(
  blob: Blob,
  contentType: string
): Promise<Blob | undefined> {
  if (contentType.includes("image")) {
    return compressImageToTargetSize(blob);
  }
  if (contentType.includes("pdf")) {
    const preview = await generateImagePreviewFromPdf(blob);
    return preview ? (preview as Blob) : undefined;
  }
  return undefined;
}

/** Milliseconds since `startedAt`, as the non-negative integer FileFn takes. */
export function elapsedMs(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

/**
 * Converts a HEIC photo to PNG and makes a thumbnail on the device, timing
 * each. The original stays the uploaded file, so a step that fails is logged
 * and left to remote processing instead of failing the upload.
 */
export async function processOnDevice(input: {
  blob: Blob;
  contentType: string;
  fileName: string;
  isGenerateThumbnail: boolean;
}): Promise<DeviceArtifact[]> {
  const artifacts: DeviceArtifact[] = [];
  let source = input.blob;
  let sourceType = input.contentType;
  if (isHeicFile(input.fileName, input.contentType)) {
    const startedAt = performance.now();
    try {
      const { convertedBlob } = await convertHeicToPng(input.blob);
      artifacts.push({
        kind: "converted",
        data: convertedBlob,
        durationMs: elapsedMs(startedAt)
      });
      source = convertedBlob;
      sourceType = "image/png";
    } catch (error) {
      logger.warn({ at: "processOnDevice", step: "converted", error });
    }
  }
  if (input.isGenerateThumbnail) {
    const startedAt = performance.now();
    try {
      const thumbnail = await generateThumbnail(source, sourceType);
      if (thumbnail) {
        artifacts.push({
          kind: DEVICE_THUMBNAIL_KIND,
          data: thumbnail,
          durationMs: elapsedMs(startedAt)
        });
      }
    } catch (error) {
      logger.warn({ at: "processOnDevice", step: "thumbnail", error });
    }
  }
  return artifacts;
}

/**
 * Records how long processing took for one file through the logger, the
 * client's observability path (console and the debug sink).
 */
export function recordFileProcessing(event: {
  mode: FileProcessingMode;
  fileId?: string;
  contentType: string;
  deviceDurationMs: number;
  artifacts: IFileProcessing["artifacts"];
}) {
  logger.info({ at: "file.processing", ...event });
}
