import {
  FileFnHttpError,
  OPFSStore,
  type FileFnClient,
  type PendingUpload,
  type UploadResult
} from "@filefn/client";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { DEVICE_THUMBNAIL_KIND } from "@nucleum/shared-state/files/file-processing";

/**
 * The FileFn OPFS queue of files kept on the device until they upload: files
 * captured offline by a cloud account, in the account's queue, and files
 * captured by a local-only user, in the device's local queue, which the first
 * cloud account that signs in uploads. Each file is one FileFn `OPFSStore`
 * entry named after its `fileId`, so staging the same file again (a migration
 * resumed after an interruption) overwrites it rather than adding another.
 */

const QUEUE_DIR_PREFIX = "nucleum-file-queue";
/** Queue of files captured while no cloud account was signed in. */
export const LOCAL_FILE_QUEUE_DIR = `${QUEUE_DIR_PREFIX}-local`;
const QUEUE_LOCK_PREFIX = "nucleum-file-queue-replay";
const ENTRY_PREFIX = "queued_";
const THUMBNAIL_PREFIX = "thumbnail-";
const THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** FileFn upload policies the account service registers (Nucleus policies). */
export const DURABLE_UPLOAD_POLICY = "nucleus-durable-default";
export const TEMPORARY_UPLOAD_POLICY = "nucleus-temporary-default";

/** A file to keep on the device until it uploads. */
export type QueuedFileInput = {
  fileId: string;
  fileName: string;
  contentType: string;
  blob: Blob;
  thumbnailBlob?: Blob;
  isTemp?: boolean;
};

/** Returns the queue of a cloud account's files captured offline. */
export function resolveAccountFileQueueDir(userId: string): string {
  return `${QUEUE_DIR_PREFIX}-account-${encodeURIComponent(userId)}`;
}

/** True when the device has the origin private file system the queue uses. */
export function isFileQueueSupported(): boolean {
  return OPFSStore.isSupported();
}

const stores = new Map<string, OPFSStore>();

function getStore(dir: string) {
  let store = stores.get(dir);
  if (!store) {
    store = new OPFSStore({ rootDir: dir });
    stores.set(dir, store);
  }
  return store;
}

function toEntryName(fileId: string) {
  return `${ENTRY_PREFIX}${fileId}`;
}

/**
 * Keeps a file and its thumbnail in a queue until it uploads. Staging the
 * same `fileId` again replaces the entry. A thumbnail that cannot be kept is
 * logged and left out; the original is what the file needs.
 */
export async function enqueueFile(
  dir: string,
  input: QueuedFileInput
): Promise<void> {
  const entryName = toEntryName(input.fileId);
  const pending: PendingUpload = {
    uploadSessionId: entryName,
    fileId: input.fileId,
    policy: input.isTemp ? TEMPORARY_UPLOAD_POLICY : DURABLE_UPLOAD_POLICY,
    fileName: input.fileName,
    size: input.blob.size,
    mimeType: input.contentType,
    fileData: await input.blob.arrayBuffer(),
    createdAt: new Date().toISOString(),
    retryCount: 0
  };
  await getStore(dir).stagePendingUpload(pending);
  if (!input.thumbnailBlob) return;
  try {
    const entry = await getEntryDir(dir, entryName);
    if (!entry) throw new Error("The staged file's entry is missing");
    const type = THUMBNAIL_TYPES.includes(input.thumbnailBlob.type)
      ? input.thumbnailBlob.type
      : "image/jpeg";
    const handle = await entry.getFileHandle(
      `${THUMBNAIL_PREFIX}${type.split("/")[1]}`,
      { create: true }
    );
    const writable = await handle.createWritable();
    await writable.write(await input.thumbnailBlob.arrayBuffer());
    await writable.close();
  } catch (error) {
    logger.warn({
      at: "fileQueue.enqueue.thumbnail",
      fileId: input.fileId,
      error
    });
  }
}

/** Removes a file from a queue, if it is there. */
export async function dequeueFile(dir: string, fileId: string): Promise<void> {
  const entryName = toEntryName(fileId);
  await getStore(dir).deletePendingUpload(entryName);
}

async function getEntryDir(
  dir: string,
  entryName: string
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const queue = await root.getDirectoryHandle(dir);
    return await queue.getDirectoryHandle(entryName);
  } catch {
    return null;
  }
}

async function readThumbnail(
  entry: FileSystemDirectoryHandle
): Promise<Blob | undefined> {
  for await (const name of (
    entry as unknown as { keys(): AsyncIterable<string> }
  ).keys()) {
    if (!name.startsWith(THUMBNAIL_PREFIX)) continue;
    const file = await (await entry.getFileHandle(name)).getFile();
    const type = `image/${name.slice(THUMBNAIL_PREFIX.length)}`;
    return new Blob([await file.arrayBuffer()], {
      type: THUMBNAIL_TYPES.includes(type) ? type : "image/jpeg"
    });
  }
  return undefined;
}

/**
 * Returns an object URL of a queued file's bytes from the first queue that
 * holds it: its thumbnail for `thumbnail` (undefined when none was kept, so a
 * view falls back to the original), else the original. Returns null when no
 * queue holds the file, so the caller resolves it through FileFn. Each call
 * makes a new object URL, as the record bytes did: the view that renders it
 * revokes it once it no longer shows it.
 */
export async function resolveQueuedFileUrl(
  dirs: readonly string[],
  fileId: string,
  variant: "thumbnail" | "full" | "download"
): Promise<string | undefined | null> {
  if (!isFileQueueSupported()) return null;
  const entryName = toEntryName(fileId);
  for (const dir of dirs) {
    const entry = await getEntryDir(dir, entryName);
    if (!entry) continue;
    try {
      let blob: Blob | undefined;
      if (variant === "thumbnail") {
        blob = await readThumbnail(entry);
      } else {
        const pending = await getStore(dir).getPendingUpload(entryName);
        if (!pending) continue;
        blob = new Blob([pending.fileData], { type: pending.mimeType });
      }
      return blob ? URL.createObjectURL(blob) : undefined;
    } catch (error) {
      logger.warn({ at: "fileQueue.resolve", fileId, error });
      return undefined;
    }
  }
  return null;
}

/** Returns whether any of the queues holds a file. */
export async function hasQueuedFiles(dirs: readonly string[]) {
  if (!isFileQueueSupported()) return false;
  for (const dir of dirs) {
    try {
      const root = await navigator.storage.getDirectory();
      const queue = await root.getDirectoryHandle(dir);
      for await (const _ of (
        queue as unknown as { keys(): AsyncIterable<string> }
      ).keys()) {
        return true;
      }
    } catch {
      // A queue never written has no directory.
    }
  }
  return false;
}

type ReplayRequest = { client: FileFnClient; signal: AbortSignal };
const replays = new Map<
  string,
  { next: ReplayRequest | null; done: Promise<void> }
>();

/**
 * Uploads every file in a queue through the client, one tab at a time: the
 * replay holds the queue's Web Lock, so another tab's replay waits and then
 * finds the files it uploaded gone. A tab coalesces replays requested while
 * one runs into one more pass, through the latest client asked for. Each
 * upload sends a fixed `fileId` and an idempotency key, so a replay that a
 * reload or a closed tab interrupted, or that ran in two tabs without Web
 * Locks, continues the same upload session instead of making another file
 * version; a session another replay already completed counts as uploaded
 * once FileFn has the file. A file stays queued while its upload fails, for
 * the next replay (reconnect or next client), and a pass stops when its
 * client's signal aborts.
 */
export function replayFileQueue(
  dir: string,
  client: FileFnClient,
  signal: AbortSignal
): Promise<void> {
  const running = replays.get(dir);
  if (running) {
    running.next = { client, signal };
    return running.done;
  }
  const state = {
    next: null as ReplayRequest | null,
    done: Promise.resolve()
  };
  state.done = (async () => {
    try {
      let request: ReplayRequest | null = { client, signal };
      while (request) {
        state.next = null;
        const current: ReplayRequest = request;
        if (!current.signal.aborted) {
          await withQueueLock(dir, current.signal, () =>
            drainQueue(dir, current.client, current.signal)
          );
        }
        request = state.next;
      }
    } finally {
      replays.delete(dir);
    }
  })();
  replays.set(dir, state);
  return state.done;
}

async function withQueueLock(
  dir: string,
  signal: AbortSignal,
  run: () => Promise<void>
) {
  const locks: LockManager | undefined = globalThis.navigator?.locks;
  if (!locks) return run();
  await locks
    .request(`${QUEUE_LOCK_PREFIX}:${dir}`, { signal }, run)
    .catch((error: unknown) => {
      if (!signal.aborted) throw error;
    });
}

async function drainQueue(
  dir: string,
  client: FileFnClient,
  signal: AbortSignal
) {
  if (!isFileQueueSupported()) return;
  const store = getStore(dir);
  for (const entryName of await store.listPendingUploads()) {
    if (signal.aborted || globalThis.navigator?.onLine === false) return;
    if (!entryName.startsWith(ENTRY_PREFIX)) continue;
    const pending = await store.getPendingUpload(entryName);
    const fileId = pending?.fileId;
    // An entry without metadata is still being staged, or its staging was
    // interrupted; the next replay reads it again.
    if (!pending || !fileId) continue;
    try {
      const result = await uploadQueuedFile(client, store, {
        ...pending,
        fileId
      });
      await uploadQueuedThumbnail(client, dir, entryName, result);
      await store.deletePendingUpload(entryName);
      logger.info({ at: "fileQueue.replay", fileId: result.fileId });
    } catch (error) {
      if (signal.aborted) return;
      logger.warn({ at: "fileQueue.replay", fileId: pending.fileId, error });
    }
  }
}

/** FileFn codes of a session that can no longer take parts. */
const ENDED_SESSION_CODES = new Set([
  "FILEFN_UPLOAD_EXPIRED",
  "FILEFN_UPLOAD_ABORTED"
]);

/**
 * Uploads a queued file under its `fileId`. The idempotency key carries the
 * entry's session count, so a session that expired or was aborted is
 * replaced by a new one on the next replay instead of being reused forever.
 */
async function uploadQueuedFile(
  client: FileFnClient,
  store: OPFSStore,
  pending: PendingUpload & { fileId: string }
): Promise<UploadResult> {
  try {
    return await client
      .uploadFile({
        policy: pending.policy,
        file: new File([pending.fileData], pending.fileName, {
          type: pending.mimeType
        }),
        fileName: pending.fileName,
        fileId: pending.fileId,
        idempotencyKey: `${pending.uploadSessionId}:${pending.retryCount}`
      })
      .done();
  } catch (error) {
    if (!(error instanceof FileFnHttpError)) throw error;
    if (error.code === "FILEFN_UPLOAD_ALREADY_COMPLETED") {
      const file = await client.getFile(pending.fileId);
      const versionId = file.currentVersionId;
      if (typeof versionId === "string") {
        return { fileId: pending.fileId, versionId };
      }
    }
    if (error.code && ENDED_SESSION_CODES.has(error.code)) {
      await store.incrementRetryCount(pending.uploadSessionId);
    }
    throw error;
  }
}

/** Uploads a queued thumbnail; one that fails is logged and left out. */
async function uploadQueuedThumbnail(
  client: FileFnClient,
  dir: string,
  entryName: string,
  uploaded: UploadResult
) {
  const entry = await getEntryDir(dir, entryName);
  const thumbnail = entry ? await readThumbnail(entry) : undefined;
  if (!thumbnail) return;
  await client
    .uploadArtifact({
      fileId: uploaded.fileId,
      versionId: uploaded.versionId,
      kind: DEVICE_THUMBNAIL_KIND,
      data: thumbnail,
      mimeType: thumbnail.type
    })
    .catch((error: unknown) => {
      logger.warn({
        at: "fileQueue.replay.thumbnail",
        fileId: uploaded.fileId,
        error
      });
    });
}
