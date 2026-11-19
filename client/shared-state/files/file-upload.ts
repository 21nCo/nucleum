import { type IRecordId } from "@nucleum/schema/legacy/data.type";
import { generateFileId } from "@filefn/client";

import { logger } from "@nucleum/client/runtime/logging/logger";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { get } from "svelte/store";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { resolveDatafnNamespace } from "@nucleum/datafn/runtime-policy";
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
  DURABLE_UPLOAD_POLICY,
  enqueueFile,
  dequeueFile,
  isAppOffline,
  isFileQueueSupported,
  markQueuedFileCommitted,
  resolveAccountFileQueueDir,
  TEMPORARY_UPLOAD_POLICY,
  UNCOMMITTED_GRACE_MS
} from "@nucleum/shared-state/files/file-queue";
import {
  assertFileFnOwner,
  captureFileFnOwner,
  captureFileQueueClaim,
  confirmFileFnOwner,
  discardFileFnFile,
  getOwnedFileFnClient,
  resolveFileFnAccountScope,
  uploadQueuedFiles,
  type FileFnOwner,
  type OwnedFileFnClient
} from "@nucleum/shared-state/files/filefn-client";
import { toasts } from "@nucleum/shared-state/notifications/notification.store";
import { escapeMarkdownText } from "@21n/ui/elements/markdown/markdown.utils";

import account from "@nucleum/client/runtime/account/account.store";
import { fileTransport } from "@nucleum/client/runtime/files/file-transport";

/** Upload failures uploadFileV2 has already shown to the user. */
const shownUploadFailures = new WeakSet<object>();

/**
 * True when uploadFileV2 has already shown this failure to the user, so a
 * caller shows its own message only for failures outside the upload.
 */
export function isUploadFailureShown(error: unknown): boolean {
  return typeof error === "object" && error !== null
    ? shownUploadFailures.has(error)
    : false;
}

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
   * mode. A cloud account that is offline (no network, or the app's offline
   * mode is on) keeps the file in the FileFn OPFS queue and saves the record
   * with its `fileId` and no bytes (see saveOnDevice); the queue uploads it
   * later.
   *
   * A failed upload or record save is shown to the user as an error toast and
   * rethrown: a failed online upload no longer falls back to keeping the file
   * on the device. In `local` mode a HEIC photo that cannot be converted fails
   * the upload too, and the uploaded original is deleted. A caller that shows
   * its own error, or uploads a file the user did not choose, passes
   * `isErrorToastSuppressed` and the error is only rethrown; otherwise
   * isUploadFailureShown marks it as shown. Toasts render Markdown as HTML, so
   * the file name is escaped to show as literal text.
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
      const owner = captureFileFnOwner();
      if (owner && !isAppOffline()) {
        const namespace = resolveDatafnNamespace({
          account: account.get(),
          dapId: ""
        });
        return await uploadThroughFileFn({ ...owner, namespace }, input);
      }
      return await saveOnDevice(input, owner);
    } catch (error) {
      logger.error({ at: "uploadFileV2", error });
      if (!isErrorToastSuppressed) {
        toasts.error(
          `Couldn't upload ${escapeMarkdownText(displayName)}. Please try again.`
        );
        if (typeof error === "object" && error !== null) {
          shownUploadFailures.add(error);
        }
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
    /** Throws when the record may no longer be saved, just before it is. */
    assertScope?: () => void;
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
    params.assertScope?.();
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

/**
 * Keeps a file captured offline or by a local-only user on the device,
 * converting a HEIC photo to PNG and making a thumbnail first. The file and
 * its thumbnail go to the FileFn OPFS queue under a new `fileId`, in the
 * owner's account queue while DataFn is in the owner's namespace, and the
 * record keeps that `fileId` without bytes; the queue uploads the file once
 * the account is online. A record that cannot be saved, or a sign-out,
 * another account or DataFn leaving the namespace while the file was staged,
 * or a capture resumed past half the queue's grace for unsaved files,
 * removes the file from the queue and fails the capture.
 * The file is marked committed only once its record is saved, so the queue
 * never uploads a file whose record did not save (the replay marks a file
 * whose mark was lost once it finds its record). Then the owner's queue is
 * asked to upload, so a reconnect during processing or staging, which found
 * nothing to upload, does not leave the file queued.
 * Without a cloud owner whose namespace DataFn is in and whose FileFn
 * authority is bound (the file is queued for that authority), without the
 * origin private file system, or when staging fails, the bytes stay on the
 * record as before, so the capture is never lost. On either path, a cloud
 * account or DataFn namespace other than the one the capture started in
 * fails the capture before its record is saved.
 */
async function saveOnDevice(input: FileUploadInput, owner: FileFnOwner | null) {
  const assertScope = captureDeviceScope(owner);
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
  const claim = owner ? await captureFileQueueClaim(owner) : undefined;
  const queueDir =
    claim && owner && isQueueOwnerCurrent(owner)
      ? resolveAccountFileQueueDir(owner.userId)
      : undefined;
  const metadata = {
    id: input.id,
    label: fileName,
    name: fileName,
    type: contentType,
    size: blob.size,
    processing: { mode: "local", artifacts } satisfies IFileProcessing
  };
  const saveBy = Date.now() + UNCOMMITTED_GRACE_MS / 2;
  const fileId = await stageOnDevice(queueDir, {
    fileId: generateFileId(),
    fileName,
    contentType,
    blob,
    thumbnailBlob,
    isTemp: input.isTemp,
    claim
  });
  recordFileProcessing({
    mode: "local",
    fileId,
    contentType,
    deviceDurationMs: sumDurations(artifacts),
    artifacts
  });
  if (!queueDir || !fileId || !owner) {
    return fileUpload.saveLocalFile({
      id: input.id,
      fileName,
      contentType,
      blob,
      thumbnailBlob,
      assertScope
    });
  }
  const record = { ...metadata, fileId };
  try {
    assertScope();
    if (!isQueueOwnerCurrent(owner) || Date.now() > saveBy) {
      throw new DOMException(
        "The capture outlived its account or its staged file",
        "AbortError"
      );
    }
    const result = (await datafn.file.mutate({
      operation: "insert",
      id: input.id,
      record
    })) as { ok?: boolean; error?: unknown };
    if (result.ok === false) {
      throw result.error ?? new Error("File metadata save failed");
    }
  } catch (error) {
    await dequeueFile(queueDir, fileId).catch((dequeueError: unknown) => {
      logger.error({ at: "uploadFileV2.dequeue", fileId, error: dequeueError });
    });
    throw error;
  }
  await markQueuedFileCommitted(queueDir, fileId).catch((error: unknown) => {
    logger.warn({ at: "uploadFileV2.commit", fileId, error });
  });
  if (owner) {
    void uploadQueuedFiles().catch((error: unknown) => {
      logger.error({ at: "uploadFileV2.replay", fileId, error });
    });
  }
  return [record];
}

/**
 * Captures the DataFn namespace and cloud account a capture starts in, and
 * returns a check that throws once either changed, so a capture never saves
 * its record in another account's data.
 */
function captureDeviceScope(owner: FileFnOwner | null) {
  const namespace = datafn.currentNamespace();
  return () => {
    const userId = resolveFileFnAccountScope(account.get())?.userId;
    if (datafn.currentNamespace() !== namespace || userId !== owner?.userId) {
      throw new DOMException(
        "The account that captured the file changed",
        "AbortError"
      );
    }
  };
}

/**
 * True while the owner is the signed-in cloud account and DataFn is in its
 * namespace, so a record saved now is the owner's.
 */
function isQueueOwnerCurrent(owner: FileFnOwner) {
  const namespace = `user:${owner.userId}`;
  return (
    resolveFileFnAccountScope(account.get())?.userId === owner.userId &&
    datafn.currentNamespace() === namespace &&
    get(datafnRuntime)?.namespace === namespace
  );
}

/**
 * Keeps a file in an OPFS queue, returning its `fileId`, or undefined without
 * a queue or the origin private file system, or when staging failed.
 */
async function stageOnDevice(
  queueDir: string | undefined,
  file: Parameters<typeof enqueueFile>[1]
): Promise<string | undefined> {
  if (!queueDir || !isFileQueueSupported()) return undefined;
  try {
    await enqueueFile(queueDir, file);
    return file.fileId;
  } catch (error) {
    logger.warn({ at: "uploadFileV2.enqueue", fileId: file.fileId, error });
    return undefined;
  }
}

/**
 * Uploads the original through FileFn under a client-chosen `fileId` while
 * the device processes it (unless the mode is `remote`), uploads the device
 * artifacts, then saves the DataFn record with `fileId` and `processing`.
 * In `local` mode nothing remote makes a HEIC photo's converted variant, so a
 * HEIC upload there fails when the device cannot convert it or the converted
 * artifact does not upload. That failure, or a record that cannot be saved,
 * deletes the uploaded file.
 *
 * The upload belongs to its owner, the account and FileFn client generation
 * captured when it started. Its client never follows a replacement, and the
 * record is saved only when, after re-binding the authority, the owner's
 * generation is still current, DataFn is in the owner's namespace and its
 * remote, if it has one, is at the file's FileFn authority, all checked just
 * before the insert, which binds to that DataFn context. A DataFn without a
 * remote syncs no record until it binds the account's authority again. A
 * sign-out, another account, another authority or an unreadable stored region
 * fails the upload without a record; the file is then deleted through the
 * owner's client, or the delete is recorded for the owner's next client.
 */
async function uploadThroughFileFn(owner: UploadOwner, input: FileUploadInput) {
  const owned = await getOwnedFileFnClient(owner);
  const mode = resolveFileProcessingMode();
  const file =
    input.blob.type === input.contentType
      ? input.blob
      : new Blob([input.blob], { type: input.contentType });
  const handle = owned.client.uploadFile({
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
  try {
    if (processed.status === "rejected") throw processed.reason;
    const artifacts = input.thumbnailBlob
      ? [
          ...processed.value,
          { kind: DEVICE_THUMBNAIL_KIND, data: input.thumbnailBlob }
        ]
      : processed.value;
    const processing: IFileProcessing = {
      mode,
      artifacts: await uploadArtifacts(
        owned,
        uploaded,
        artifacts,
        mode === "local" ? LOCAL_REQUIRED_ARTIFACT_KINDS : []
      )
    };
    const record = {
      id: input.id,
      label: input.fileName,
      name: input.fileName,
      type: input.contentType,
      size: input.blob.size,
      fileId: uploaded.fileId,
      processing
    };
    recordFileProcessing({
      mode,
      fileId: uploaded.fileId,
      contentType: input.contentType,
      deviceDurationMs: sumDurations(processing.artifacts),
      artifacts: processing.artifacts
    });
    await confirmFileFnOwner(owner);
    assertDatafnOwner(owner, owned);
    const result = (await datafn.file.mutate({
      operation: "insert",
      id: input.id,
      record
    })) as { ok?: boolean; error?: unknown };
    if (result.ok === false) {
      throw result.error ?? new Error("File metadata save failed");
    }
    return [record];
  } catch (error) {
    await discardFileFnFile(owner, owned, uploaded.fileId).catch(
      (discardError: unknown) => {
        logger.error({
          at: "uploadFileV2.discard",
          fileId: uploaded.fileId,
          error: discardError
        });
      }
    );
    throw error;
  }
}

/** An upload's FileFn owner and the DataFn namespace of its account. */
type UploadOwner = FileFnOwner & { namespace: string };

/**
 * Throws an AbortError unless the owner's FileFn generation is current,
 * DataFn is in the owner's namespace, and DataFn's remote, when it has one,
 * is the account authority the file is stored at, so the record is never
 * saved in another account's data or synced to another region.
 */
function assertDatafnOwner(owner: UploadOwner, owned: OwnedFileFnClient) {
  assertFileFnOwner(owner);
  const runtime = get(datafnRuntime);
  if (
    datafn.currentNamespace() !== owner.namespace ||
    runtime?.namespace !== owner.namespace
  ) {
    throw new DOMException(
      "DataFn left the account that started the upload",
      "AbortError"
    );
  }
  if (
    runtime.remoteUrl &&
    runtime.remoteUrl.replace(/\/datafn\/?$/, "") !==
      owned.baseUrl.replace(/\/files\/?$/, "")
  ) {
    throw new DOMException(
      "DataFn syncs to another account authority than the file's",
      "AbortError"
    );
  }
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
 * uploaded with their durations. Once every upload has settled, a failed
 * artifact of a kind in `requiredKinds` throws. Any other failed artifact,
 * including an AbortError, is logged and left out: the original is already
 * stored, and the file still shows without it (remote processing makes it in
 * `both` mode). A torn-down client stops the upload at the owner check
 * before the record is saved.
 */
async function uploadArtifacts(
  owned: OwnedFileFnClient,
  uploaded: { fileId: string; versionId: string },
  artifacts: DeviceArtifact[],
  requiredKinds: readonly DeviceArtifact["kind"][]
) {
  const present: IFileProcessing["artifacts"] = {};
  const requiredFailures: { kind: string; error: unknown }[] = [];
  await Promise.all(
    artifacts.map(async (artifact) => {
      try {
        await owned.client.uploadArtifact({
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

function sumDurations(artifacts: IFileProcessing["artifacts"]) {
  return Object.values(artifacts).reduce(
    (total, artifact) => total + (artifact?.durationMs ?? 0),
    0
  );
}
