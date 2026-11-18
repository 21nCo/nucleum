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
 *
 * An entry uploads only once it is marked committed, after the record that
 * references it is saved, so a file whose record never saved never reaches an
 * account. An account's entry is removed once it uploads, as the account's
 * record already references it. A local entry also keeps a copy of its
 * local-only record as it currently is (see device-file-queue), which the
 * upload publishes as a record of the account. The first account ready to
 * upload it claims it, so only that account ever uploads it, and once
 * published it stays on the device, marked uploaded, so the local-only record
 * still renders after the account signs out.
 */

const QUEUE_DIR_PREFIX = "nucleum-file-queue";
/** Queue of files captured while no cloud account was signed in. */
export const LOCAL_FILE_QUEUE_DIR = `${QUEUE_DIR_PREFIX}-local`;
const QUEUE_LOCK_PREFIX = "nucleum-file-queue-replay";
const ENTRY_PREFIX = "queued_";
const THUMBNAIL_PREFIX = "thumbnail-";
const THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"];
const RECORD_FILE = "record.json";
const UPLOADED_FILE = "uploaded";
const COMMITTED_FILE = "committed";
const CLAIM_FILE = "claim.json";
const STALE_FILE = "stale";

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
  /** The local-only record of a file in the local queue (see enqueueFile). */
  record?: QueuedFileRecord;
};

/** The fields of the DataFn `file` record a queued local file belongs to. */
export type QueuedFileRecord = { id: string } & Record<string, unknown>;

/** The cloud account, at its FileFn authority, that a local file uploads to. */
export type QueuedFileClaim = { userId: string; baseUrl: string };

/**
 * Publishes the record of a local file that uploaded, so the account holds a
 * record of every local file it uploads. `isReady` is checked before each
 * upload; a pass stops while it is false, keeping the files for a later one.
 * `owner` claims each local file before its upload.
 */
export type QueuedFilePublisher = {
  owner: QueuedFileClaim;
  isReady(): boolean;
  publish(record: QueuedFileRecord, uploaded: UploadResult): Promise<void>;
};

/**
 * The records of the account whose queue replays (see replayFileQueue):
 * whether one references a file, undefined while they cannot be read, and
 * the delete of an uploaded file whose record was deleted during its upload.
 */
export type QueuedFileReferences = {
  isReferenced(fileId: string): Promise<boolean | undefined>;
  discard(fileId: string): Promise<void>;
};

/** What a queue holds of a file, for reconciling it with its record. */
export type QueuedFileEntry = {
  fileId: string;
  createdAt: string;
  /** The ID of the record a local file was staged or last copied with. */
  recordId?: string;
  isCommitted: boolean;
  isUploaded: boolean;
  claim?: QueuedFileClaim;
};

/** Returns the queue of a cloud account's files captured offline. */
export function resolveAccountFileQueueDir(userId: string): string {
  return `${QUEUE_DIR_PREFIX}-account-${encodeURIComponent(userId)}`;
}

/**
 * Returns the queues whose files a cloud account, or with none (null) the
 * device, renders from the device: the account's own queue and the device's
 * local queue.
 */
export function resolveFileQueueDirsOf(userId: string | null): string[] {
  return userId
    ? [resolveAccountFileQueueDir(userId), LOCAL_FILE_QUEUE_DIR]
    : [LOCAL_FILE_QUEUE_DIR];
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
 * logged and left out; the original is what the file needs. The record
 * metadata a local file is published with is written after the original, and
 * a failure to write it removes the entry and rejects, so a local entry the
 * replay reads always has both.
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
  const store = getStore(dir);
  await store.stagePendingUpload(pending);
  if (input.record) {
    try {
      await writeEntryFile(
        dir,
        entryName,
        RECORD_FILE,
        JSON.stringify(input.record)
      );
    } catch (error) {
      await store.deletePendingUpload(entryName).catch(() => undefined);
      throw error;
    }
  }
  if (!input.thumbnailBlob) return;
  try {
    const type = THUMBNAIL_TYPES.includes(input.thumbnailBlob.type)
      ? input.thumbnailBlob.type
      : "image/jpeg";
    await writeEntryFile(
      dir,
      entryName,
      `${THUMBNAIL_PREFIX}${type.split("/")[1]}`,
      await input.thumbnailBlob.arrayBuffer()
    );
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

/**
 * Marks a queued file committed once the record that references it is saved;
 * only a committed file uploads.
 */
export async function markQueuedFileCommitted(
  dir: string,
  fileId: string
): Promise<void> {
  await writeEntryFile(dir, toEntryName(fileId), COMMITTED_FILE, "");
}

/**
 * Replaces the copy of a local file's record with the record as it is now,
 * which its upload publishes, and clears a stale mark.
 */
export async function writeQueuedFileRecord(
  dir: string,
  fileId: string,
  record: QueuedFileRecord
): Promise<void> {
  const entryName = toEntryName(fileId);
  await writeEntryFile(dir, entryName, RECORD_FILE, JSON.stringify(record));
  const entry = await getEntryDir(dir, entryName);
  await entry?.removeEntry(STALE_FILE).catch(() => undefined);
}

/**
 * Marks a local file's record copy stale, when its record changed but could
 * not be read again: the file does not upload until the copy is replaced.
 */
export async function markQueuedFileStale(
  dir: string,
  fileId: string
): Promise<void> {
  await writeEntryFile(dir, toEntryName(fileId), STALE_FILE, "");
}

/** Lists the files of a queue whose staging finished. */
export async function listQueuedFiles(dir: string): Promise<QueuedFileEntry[]> {
  if (!isFileQueueSupported()) return [];
  const store = getStore(dir);
  const entries: QueuedFileEntry[] = [];
  for (const entryName of await store.listPendingUploads()) {
    if (!entryName.startsWith(ENTRY_PREFIX)) continue;
    const pending = await store.getPendingUpload(entryName);
    if (!pending?.fileId) continue;
    entries.push({
      fileId: pending.fileId,
      createdAt: pending.createdAt,
      recordId: (await readQueuedRecord(dir, entryName))?.id,
      isCommitted: await hasEntryFile(dir, entryName, COMMITTED_FILE),
      isUploaded: await hasEntryFile(dir, entryName, UPLOADED_FILE),
      claim: await readClaim(dir, entryName)
    });
  }
  return entries;
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

async function writeEntryFile(
  dir: string,
  entryName: string,
  name: string,
  data: string | ArrayBuffer
) {
  const entry = await getEntryDir(dir, entryName);
  if (!entry) throw new Error("The staged file's entry is missing");
  const handle = await entry.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

/** Reads a file of an entry, or undefined when the entry has none. */
async function readEntryText(
  dir: string,
  entryName: string,
  name: string
): Promise<string | undefined> {
  const entry = await getEntryDir(dir, entryName);
  if (!entry) return undefined;
  try {
    return await (
      await entry.getFileHandle(name)
    )
      .getFile()
      .then((file) => file.text());
  } catch {
    return undefined;
  }
}

async function hasEntryFile(dir: string, entryName: string, name: string) {
  return (await readEntryText(dir, entryName, name)) !== undefined;
}

/** Reads a JSON file of an entry, or undefined when it is missing or invalid. */
async function readEntryJson<T>(
  dir: string,
  entryName: string,
  name: string,
  isValid: (value: T) => boolean
): Promise<T | undefined> {
  const text = await readEntryText(dir, entryName, name);
  try {
    const value = text ? (JSON.parse(text) as T) : undefined;
    return value && isValid(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function readClaim(dir: string, entryName: string) {
  return readEntryJson<QueuedFileClaim>(
    dir,
    entryName,
    CLAIM_FILE,
    (claim) =>
      typeof claim.userId === "string" && typeof claim.baseUrl === "string"
  );
}

function isSameClaim(a: QueuedFileClaim, b: QueuedFileClaim) {
  return a.userId === b.userId && a.baseUrl === b.baseUrl;
}

function readQueuedRecord(dir: string, entryName: string) {
  return readEntryJson<QueuedFileRecord>(
    dir,
    entryName,
    RECORD_FILE,
    (record) => typeof record.id === "string"
  );
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
      continue;
    }
  }
  return false;
}

type ReplayRequest = {
  client: FileFnClient;
  signal: AbortSignal;
  publisher?: QueuedFilePublisher;
  references?: QueuedFileReferences;
};
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
 *
 * A file uploads only once it is committed (see markQueuedFileCommitted).
 * With a publisher (the device's local queue), it also needs a current copy
 * of its record (not marked stale), and uploads only while the publisher is
 * ready and only for the account that claimed it: the first ready account
 * claims it before the upload, so a sign-out or account switch during the
 * upload leaves it to that account's next sign-in, never to another account.
 * Its record, as copied when the upload ends, is published after the upload
 * and the entry is then marked uploaded instead of removed, so it renders on
 * the device and never uploads again. A publish interrupted or failed leaves
 * the entry for the claiming account's next replay, whose upload continues
 * the same session or finds it completed.
 *
 * With references (an account's queue), a file uploads only while a record
 * of the account references it, which also commits one whose mark was lost:
 * a committed file whose record was deleted is removed without an upload,
 * and one deleted during its upload is discarded. A pass stops while the
 * records cannot be read.
 */
export function replayFileQueue(
  dir: string,
  client: FileFnClient,
  signal: AbortSignal,
  publisher?: QueuedFilePublisher,
  references?: QueuedFileReferences
): Promise<void> {
  const first: ReplayRequest = { client, signal, publisher, references };
  const running = replays.get(dir);
  if (running) {
    running.next = first;
    return running.done;
  }
  const state = {
    next: null as ReplayRequest | null,
    done: Promise.resolve()
  };
  state.done = (async () => {
    try {
      let request: ReplayRequest | null = first;
      while (request) {
        state.next = null;
        const current: ReplayRequest = request;
        if (!current.signal.aborted) {
          await withQueueLock(dir, current.signal, () =>
            drainQueue(dir, current)
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
  { client, signal, publisher, references }: ReplayRequest
) {
  if (!isFileQueueSupported()) return;
  const store = getStore(dir);
  for (const entryName of await store.listPendingUploads()) {
    if (signal.aborted || globalThis.navigator?.onLine === false) return;
    if (!entryName.startsWith(ENTRY_PREFIX)) continue;
    const pending = await store.getPendingUpload(entryName);
    const fileId = pending?.fileId;
    if (!pending || !fileId) continue;
    let isCommitted = await hasEntryFile(dir, entryName, COMMITTED_FILE);
    if (references) {
      const isReferenced = await references.isReferenced(fileId);
      if (isReferenced === undefined) return;
      if (!isReferenced) {
        if (isCommitted) await dequeueFile(dir, fileId);
        continue;
      }
      if (!isCommitted) await markQueuedFileCommitted(dir, fileId);
      isCommitted = true;
    }
    if (!isCommitted) continue;
    if (publisher && !(await isPublishable(dir, entryName, publisher)))
      continue;
    if (publisher && !publisher.isReady()) return;
    try {
      if (publisher) await claimEntry(dir, entryName, publisher.owner);
      const result = await uploadQueuedFile(client, store, {
        ...pending,
        fileId
      });
      await uploadQueuedThumbnail(client, dir, entryName, result);
      if (publisher) {
        await publishEntry(dir, entryName, publisher, result);
      } else {
        const isReferenced = await references?.isReferenced(fileId);
        if (references && isReferenced === undefined) return;
        if (isReferenced === false) await references?.discard(fileId);
        await store.deletePendingUpload(entryName);
      }
      logger.info({ at: "fileQueue.replay", fileId: result.fileId });
    } catch (error) {
      if (signal.aborted) return;
      logger.warn({ at: "fileQueue.replay", fileId: pending.fileId, error });
    }
  }
}

/**
 * Whether a local file can upload through the publisher's account: not yet
 * uploaded, with a current copy of its record, and unclaimed or claimed by
 * that account.
 */
async function isPublishable(
  dir: string,
  entryName: string,
  publisher: QueuedFilePublisher
) {
  if (await hasEntryFile(dir, entryName, UPLOADED_FILE)) return false;
  if (await hasEntryFile(dir, entryName, STALE_FILE)) return false;
  if (!(await readQueuedRecord(dir, entryName))) return false;
  const claim = await readClaim(dir, entryName);
  return !claim || isSameClaim(claim, publisher.owner);
}

/**
 * Publishes the record of a local file that uploaded, as its copy is now,
 * then marks the file uploaded. A file whose record was removed or marked
 * stale during the upload is left for the reconciliation of its record.
 */
async function publishEntry(
  dir: string,
  entryName: string,
  publisher: QueuedFilePublisher,
  uploaded: UploadResult
) {
  if (!(await isPublishable(dir, entryName, publisher))) return;
  const record = await readQueuedRecord(dir, entryName);
  if (!record) return;
  await publisher.publish({ ...record, fileId: uploaded.fileId }, uploaded);
  await writeEntryFile(dir, entryName, UPLOADED_FILE, uploaded.versionId);
}

async function claimEntry(
  dir: string,
  entryName: string,
  owner: QueuedFileClaim
) {
  if (await readClaim(dir, entryName)) return;
  await writeEntryFile(
    dir,
    entryName,
    CLAIM_FILE,
    JSON.stringify({ userId: owner.userId, baseUrl: owner.baseUrl })
  );
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
