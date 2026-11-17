import { type IRecordId } from "@nucleum/schema/legacy/data.type";
import { generateFileId, type FileFnClient } from "@filefn/client";

import { logger } from "@nucleum/client/runtime/logging/logger";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { datafn } from "@nucleum/datafn/datafn.store";
import { generateResourceId } from "@nucleum/datafn/id.utils";
import { Resource } from "@nucleum/datafn/resource.enum";

import { convertHeicToPng } from "@nucleum/client/runtime/media/image-codec";
import {
  DEVICE_THUMBNAIL_KIND,
  elapsedMs,
  generateThumbnail,
  HEIC_CONVERSION_FAILED_MESSAGE,
  isDeviceProcessingMode,
  isHeicFile,
  processOnDevice,
  recordFileProcessing,
  resolveFileProcessingMode,
  type DeviceArtifact,
  type IFileProcessing
} from "@nucleum/shared-state/files/file-processing";
import {
  getFileFnClient,
  resolveFileFnAccountScope
} from "@nucleum/shared-state/files/filefn-client";
import { toasts } from "@nucleum/shared-state/notifications/notification.store";
import { escapeMarkdownText } from "@21n/ui/elements/markdown/markdown.utils";

import account from "@nucleum/client/runtime/account/account.store";
import { fileTransport } from "@nucleum/client/runtime/files/file-transport";

/** FileFn upload policies the account service registers (Nucleus policies). */
const DURABLE_UPLOAD_POLICY = "nucleus-durable-default";
const TEMPORARY_UPLOAD_POLICY = "nucleus-temporary-default";

/** Uploads and stores file content independently of account lifecycle. */
export const fileUpload = {
  /** Legacy signed upload URL, used only by `uploadFile` (see there). */
  getSignedUrl(contentType: string, fileName: string, isTemp: boolean) {
    const acc = account.get();
    const userId = acc.userInfo?.id.split(":")[1] ?? "";
    return fileTransport.getSignedUrl(userId, contentType, fileName, isTemp);
  },
  /**
   * Legacy signed-URL upload, kept only for Pointron import's
   * `tempUploadToS3` until TIDY-553 moves it to FileFn.
   * @deprecated - use uploadFileV2 instead
   * @param contentType
   * @param fileName
   * @param blob
   * @param isTemp
   * @returns
   */
  async uploadFile(
    contentType: string,
    fileName: string,
    blob: any,
    isTemp: boolean = false
  ) {
    const signedUrlResponse = await this.getSignedUrl(
      contentType,
      fileName,
      isTemp
    );
    if (signedUrlResponse?.uploadURL) {
      await fileTransport.uploadFile(
        signedUrlResponse.uploadURL,
        contentType,
        blob
      );
      return signedUrlResponse;
    } else return null;
  },
  /**
   * Uploads a file and saves its DataFn `file` record, returning `[record]`.
   *
   * A signed-in cloud account that is online uploads through FileFn under a
   * client-chosen `fileId`, and the record keeps that `fileId` instead of a
   * URL. When the environment's `fileProcessingMode` is `local` or `both`, a
   * HEIC photo is converted to PNG and a thumbnail is made on the device, and
   * both upload as client artifacts of the file version; `remote` leaves them
   * to the account service. A thumbnail the caller passes is uploaded in every
   * mode. A local-only account, or a cloud account that is offline, keeps the
   * bytes on the record as before (moved to the FileFn offline queue by
   * TIDY-544).
   *
   * A failed upload or record save is shown to the user as an error toast and
   * rethrown: a failed online upload no longer falls back to keeping the file
   * on the device. In `local` mode a HEIC photo that cannot be converted fails
   * the upload too, and the uploaded original is deleted. A caller that shows
   * its own error, or uploads a file the user did not choose, passes
   * `isErrorToastSuppressed` and the error is only rethrown.
   */
  async uploadFileV2(
    contentType: string,
    fileName: string,
    blob: Blob,
    params: {
      isTemp?: boolean;
      thumbnailBlob?: Blob;
      isGenerateThumbnail?: boolean;
      isErrorToastSuppressed?: boolean;
    } = {}
  ) {
    const { isErrorToastSuppressed, ...options } = params;
    const displayName = fileName;
    fileName = fileName
      .replace(/\s+/g, "_")
      .replace(/[()@#$%&*!?<>{}[\]\\\/\^~`+=;:,'"|]/g, "_");
    try {
      const id = generateResourceId(Resource.file, {
        id: contentType.split("/")[0] + "_" + generateSimpleRandomId()
      });
      logger.log({ at: "uploadFileV2", id, contentType, fileName });
      const input = { id, contentType, fileName, blob, ...options };
      if (resolveFileFnAccountScope(account.get()) && !isDeviceOffline()) {
        return await uploadThroughFileFn(input);
      }
      return await saveOnDevice(input);
    } catch (error) {
      logger.error({ at: "uploadFileV2", error });
      if (!isErrorToastSuppressed) {
        // Toasts render Markdown as HTML, so the file name must show as literal text.
        toasts.error(
          `Couldn't upload ${escapeMarkdownText(displayName)}. Please try again.`
        );
      }
      throw error;
    }
  },
  /** Saves the file's bytes and thumbnail on its DataFn record. */
  async saveLocalFile(params: {
    id: IRecordId;
    fileName: string;
    contentType: string;
    blob: Blob;
    thumbnailBlob?: Blob;
  }) {
    const arrayBuffer = await params.blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let thumbnailUint8Array: Uint8Array | undefined;
    if (params.thumbnailBlob) {
      const thumbnailArrayBuffer = await params.thumbnailBlob.arrayBuffer();
      thumbnailUint8Array = new Uint8Array(thumbnailArrayBuffer);
    }
    const file = {
      id: params.id,
      label: params.fileName,
      name: params.fileName,
      type: params.contentType,
      data: uint8Array,
      size: uint8Array.length,
      thumbnailData: thumbnailUint8Array
    };
    const mutationResult = (await datafn.file.mutate({
      operation: "insert",
      id: params.id,
      record: file
    })) as { ok?: boolean; error?: unknown };
    if (mutationResult.ok === false) {
      throw mutationResult.error ?? new Error("File metadata save failed");
    }
    return [file];
  },
  /**
   * Used to upload a file to s3 temp bucket
   * @param input the file that needs to be uploaded to the S3 temp bucket
   */
  async tempUploadToS3(input: any) {
    let itemLocalURL = new Blob([input], { type: input.type });
    let customName = input.name.split(".")[0].replace(/\s+/g, "");
    const result = await this.uploadFile(
      input.type,
      customName,
      itemLocalURL,
      true
    );
    let url = result.uploadURL.split("?")[0];
    return [url, customName, itemLocalURL];
  }
};

type FileUploadInput = {
  id: IRecordId;
  contentType: string;
  fileName: string;
  blob: Blob;
  isTemp?: boolean;
  thumbnailBlob?: Blob;
  isGenerateThumbnail?: boolean;
};

/** True when the browser reports no network connection. */
function isDeviceOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Keeps the file's bytes on its DataFn record, converting a HEIC photo to PNG
 * and making a thumbnail on the device first.
 */
async function saveOnDevice(input: FileUploadInput) {
  let { blob, contentType, fileName } = input;
  const artifacts: IFileProcessing["artifacts"] = {};
  if (isHeicFile(fileName, contentType)) {
    const startedAt = performance.now();
    try {
      blob = (await convertHeicToPng(blob)).convertedBlob;
    } catch (error) {
      logger.error({
        at: "uploadFileV2",
        error,
        message: "HEIC conversion failed"
      });
      throw new Error(HEIC_CONVERSION_FAILED_MESSAGE, { cause: error });
    }
    contentType = "image/png";
    fileName = fileName.replace(/\.heic$/i, ".png");
    artifacts.converted = { durationMs: elapsedMs(startedAt) };
  }
  let thumbnailBlob = input.thumbnailBlob;
  if (input.isGenerateThumbnail && !thumbnailBlob) {
    const startedAt = performance.now();
    thumbnailBlob = await generateThumbnail(blob, contentType);
    if (thumbnailBlob) {
      artifacts[DEVICE_THUMBNAIL_KIND] = { durationMs: elapsedMs(startedAt) };
    }
  }
  recordFileProcessing({
    mode: "local",
    contentType,
    deviceDurationMs: sumDurations(artifacts),
    artifacts
  });
  return fileUpload.saveLocalFile({
    id: input.id,
    fileName,
    contentType,
    blob,
    thumbnailBlob
  });
}

/**
 * Uploads the original through FileFn under a client-chosen `fileId` while
 * the device processes it (unless the mode is `remote`), uploads the device
 * artifacts, then saves the DataFn record with `fileId` and `processing`.
 * In `local` mode nothing remote makes a HEIC photo's converted variant, so a
 * HEIC upload there fails when the device cannot convert it or the converted
 * artifact does not upload. That failure, or a record that cannot be saved,
 * deletes the uploaded file, so no FileFn file is left that no record
 * references.
 */
async function uploadThroughFileFn(input: FileUploadInput) {
  const client = await getFileFnClient();
  if (!client) {
    throw new Error("FileFn is unavailable for the signed-in account");
  }
  const mode = resolveFileProcessingMode();
  const file =
    input.blob.type === input.contentType
      ? input.blob
      : new Blob([input.blob], { type: input.contentType });
  const handle = client.uploadFile({
    policy: input.isTemp ? TEMPORARY_UPLOAD_POLICY : DURABLE_UPLOAD_POLICY,
    file,
    fileName: input.fileName,
    fileId: generateFileId()
  });
  const deviceProcessing = isDeviceProcessingMode(mode)
    ? processOnDevice({
        blob: input.blob,
        contentType: input.contentType,
        fileName: input.fileName,
        isGenerateThumbnail: Boolean(
          input.isGenerateThumbnail && !input.thumbnailBlob
        ),
        isConversionRequired: mode === "local"
      })
    : Promise.resolve<DeviceArtifact[]>([]);
  const [upload, processed] = await Promise.allSettled([
    handle.done(),
    deviceProcessing
  ]);
  if (upload.status === "rejected") throw upload.reason;
  const uploaded = upload.value;
  if (processed.status === "rejected") {
    await discardUploadedFile(client, uploaded.fileId);
    throw processed.reason;
  }
  const deviceArtifacts = processed.value;
  const artifacts = input.thumbnailBlob
    ? [
        ...deviceArtifacts,
        { kind: DEVICE_THUMBNAIL_KIND, data: input.thumbnailBlob }
      ]
    : deviceArtifacts;
  let processing: IFileProcessing;
  try {
    processing = {
      mode,
      artifacts: await uploadArtifacts(
        client,
        uploaded,
        artifacts,
        mode === "local" ? LOCAL_REQUIRED_ARTIFACT_KINDS : []
      )
    };
  } catch (error) {
    await discardUploadedFile(client, uploaded.fileId);
    throw error;
  }
  recordFileProcessing({
    mode,
    fileId: uploaded.fileId,
    contentType: input.contentType,
    deviceDurationMs: sumDurations(processing.artifacts),
    artifacts: processing.artifacts
  });
  const record = {
    id: input.id,
    label: input.fileName,
    name: input.fileName,
    type: input.contentType,
    size: input.blob.size,
    fileId: uploaded.fileId,
    processing
  };
  try {
    const result = (await datafn.file.mutate({
      operation: "insert",
      id: input.id,
      record
    })) as { ok?: boolean; error?: unknown };
    if (result.ok === false) {
      throw result.error ?? new Error("File metadata save failed");
    }
  } catch (error) {
    await discardUploadedFile(client, uploaded.fileId);
    throw error;
  }
  return [record];
}

/**
 * Artifact kinds that must upload in `local` mode, where no remote processing
 * makes them: without the converted PNG a HEIC photo has no variant a browser
 * can show.
 */
const LOCAL_REQUIRED_ARTIFACT_KINDS: readonly DeviceArtifact["kind"][] = [
  "converted"
];

/**
 * Uploads device artifacts of a file version, returning the kinds that
 * uploaded with their durations. A failed artifact of a kind in
 * `requiredKinds` throws once every upload has settled. Any other failed
 * artifact is logged and left out: the original is already stored, and the
 * file still shows without it (remote processing makes it in `both` mode).
 */
async function uploadArtifacts(
  client: FileFnClient,
  uploaded: { fileId: string; versionId: string },
  artifacts: DeviceArtifact[],
  requiredKinds: readonly DeviceArtifact["kind"][]
) {
  const present: IFileProcessing["artifacts"] = {};
  const requiredFailures: { kind: string; error: unknown }[] = [];
  await Promise.all(
    artifacts.map(async (artifact) => {
      try {
        await client.uploadArtifact({
          fileId: uploaded.fileId,
          versionId: uploaded.versionId,
          kind: artifact.kind,
          data: artifact.data,
          mimeType:
            artifact.data.type ||
            (artifact.kind === "converted" ? "image/png" : "image/jpeg"),
          durationMs: artifact.durationMs
        });
        present[artifact.kind] =
          artifact.durationMs === undefined
            ? {}
            : { durationMs: artifact.durationMs };
      } catch (error) {
        logger.warn({
          at: "uploadFileV2.artifact",
          fileId: uploaded.fileId,
          kind: artifact.kind,
          error
        });
        if (requiredKinds.includes(artifact.kind)) {
          requiredFailures.push({ kind: artifact.kind, error });
        }
      }
    })
  );
  const [requiredFailure] = requiredFailures;
  if (requiredFailure) {
    throw new Error(`The ${requiredFailure.kind} artifact did not upload`, {
      cause: requiredFailure.error
    });
  }
  return present;
}

/** Deletes an uploaded file that no record will reference. */
async function discardUploadedFile(client: FileFnClient, fileId: string) {
  try {
    await client.deleteFile(fileId);
  } catch (error) {
    logger.warn({ at: "uploadFileV2.discard", fileId, error });
  }
}

function sumDurations(artifacts: IFileProcessing["artifacts"]) {
  return Object.values(artifacts).reduce(
    (total, artifact) => total + (artifact?.durationMs ?? 0),
    0
  );
}
