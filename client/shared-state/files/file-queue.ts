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
const THUMBNAIL_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const RECORD_FILE = "record.json";
const UPLOADED_FILE = "uploaded";
const COMMITTED_FILE = "committed";
const CLAIM_FILE = "claim.json";
const STALE_FILE = "stale";
const STARTED_FILE = "started";

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
  /** The account and FileFn authority an account's file is captured at. */
  claim?: QueuedFileClaim;
};

/** The fields of the DataFn `file` record a queued local file belongs to. */
export type QueuedFileRecord = { id: string } & Record<string, unknown>;

/** The cloud account, at its FileFn authority, that a local file uploads to. */
export type QueuedFileClaim = { userId: string; baseUrl: string };
/** The claim of an attempt that may have started a file's upload. */
type StartedMarker = QueuedFileClaim & { attempt?: string };

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
 * The records of the account whose queue replays (see replayFileQueue), at
 * the `owner` authority: whether they still are the owner's there, checked
 * without waiting, bringing them fully up to date with the authority (false
 * while they cannot be), whether one references a file, undefined while they
 * cannot be read, and the delete of an uploaded file whose record was
 * deleted, at that authority.
 */
export type QueuedFileReferences = {
  owner: QueuedFileClaim;
  isCurrent(): boolean;
  sync(): Promise<boolean>;
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
 * metadata a local file is published with, or the authority an account's
 * file is captured at, is written after the original, and a failure to write
 * it removes the entry and rejects, so an entry the replay reads has both.
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
  if (input.record || input.claim) {
    try {
      if (input.claim) await claimEntry(dir, entryName, input.claim);
      if (input.record) {
        await writeEntryFile(
          dir,
          entryName,
          RECORD_FILE,
          JSON.stringify(input.record)
        );
      }
    } catch (error) {
      await store.deletePendingUpload(entryName).catch(() => undefined);
      throw error;
    }
  }
  if (!input.thumbnailBlob) return;
  try {
    const type = THUMBNAIL_TYPES.has(input.thumbnailBlob.type)
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
  releaseQueuedFileUrls((key) => key === `${dir}\n${entryName}`);
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

/**
 * Returns an entry's directory, or null when it is missing; with `isStrict`,
 * any other read error rejects instead of counting as missing.
 */
async function getEntryDir(
  dir: string,
  entryName: string,
  isStrict = false
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const queue = await root.getDirectoryHandle(dir);
    return await queue.getDirectoryHandle(entryName);
  } catch (error) {
    if (isStrict && (error as Error)?.name !== "NotFoundError") throw error;
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

/**
 * Reads a file of an entry, or undefined when the entry has none (see
 * getEntryDir for `isStrict`).
 */
async function readEntryText(
  dir: string,
  entryName: string,
  name: string,
  isStrict = false
): Promise<string | undefined> {
  const entry = await getEntryDir(dir, entryName, isStrict);
  if (!entry) return undefined;
  try {
    return await (
      await entry.getFileHandle(name)
    )
      .getFile()
      .then((file) => file.text());
  } catch (error) {
    if (isStrict && (error as Error)?.name !== "NotFoundError") throw error;
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
  isValid: (value: T) => boolean,
  isStrict = false
): Promise<T | undefined> {
  return parseJson(
    await readEntryText(dir, entryName, name, isStrict),
    isValid
  );
}

function parseJson<T>(
  text: string | undefined,
  isValid: (value: T) => boolean
): T | undefined {
  try {
    const value = text ? (JSON.parse(text) as T) : undefined;
    return value && isValid(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function readClaim(dir: string, entryName: string, isStrict = false) {
  return readEntryJson(dir, entryName, CLAIM_FILE, isClaim, isStrict);
}

function isClaim(claim: QueuedFileClaim) {
  return typeof claim.userId === "string" && typeof claim.baseUrl === "string";
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
      type: THUMBNAIL_TYPES.has(type) ? type : "image/jpeg"
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
 * A download shares one held URL per file, revoked when it leaves the queue
 * or a lookup reads other queues (see releaseQueuedFileUrls).
 */
export async function resolveQueuedFileUrl(
  dirs: readonly string[],
  fileId: string,
  variant: "thumbnail" | "full" | "download"
): Promise<string | undefined | null> {
  if (!isFileQueueSupported()) return null;
  const entryName = toEntryName(fileId);
  releaseQueuedFileUrls((key) => !dirs.includes(key.split("\n")[0]));
  for (const dir of dirs) {
    const entry = await getEntryDir(dir, entryName);
    const key = `${dir}\n${entryName}`;
    if (!entry) releaseQueuedFileUrls((held) => held === key);
    if (!entry) continue;
    const isHeld = variant === "download";
    const held =
      (isHeld && heldUrls.get(key)) || readUrl(dir, entry, entryName, variant);
    if (isHeld) heldUrls.set(key, held);
    try {
      const url = await held;
      if (isHeld && heldUrls.get(key) !== held) return null;
      if (url !== null) return url;
      if (heldUrls.get(key) === held) heldUrls.delete(key);
    } catch (error) {
      if (heldUrls.get(key) === held) heldUrls.delete(key);
      logger.warn({ at: "fileQueue.resolve", fileId, error });
      return undefined;
    }
  }
  return null;
}

async function readUrl(
  dir: string,
  entry: FileSystemDirectoryHandle,
  entryName: string,
  variant: string
) {
  let blob: Blob | undefined;
  if (variant === "thumbnail") {
    blob = await readThumbnail(entry);
  } else {
    const pending = await getStore(dir).getPendingUpload(entryName);
    if (!pending) return null;
    blob = new Blob([pending.fileData], { type: pending.mimeType });
  }
  return blob ? URL.createObjectURL(blob) : undefined;
}

const heldUrls = new Map<string, Promise<string | undefined | null>>();

/** Revokes the held download URLs whose keys (queue, entry) it selects. */
export function releaseQueuedFileUrls(isReleased: (key: string) => boolean) {
  for (const [key, held] of heldUrls) {
    if (!isReleased(key)) continue;
    heldUrls.delete(key);
    void held.then((url) => url && URL.revokeObjectURL(url)).catch(String);
  }
}

/** Returns whether any of the queues holds a file. */
export async function hasQueuedFiles(dirs: readonly string[]) {
  if (!isFileQueueSupported()) return false;
  for (const dir of dirs) {
    try {
      const root = await navigator.storage.getDirectory();
      const queue = await root.getDirectoryHandle(dir);
      const keys = (
        queue as unknown as { keys(): AsyncIterableIterator<string> }
      ).keys();
      if (!(await keys.next()).done) return true;
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
/** Delays of the retries after passes that left files to upload. */
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000];
const retryCounts = new Map<string, number>();
/** How long an account's file without a record may still be saving. */
export const UNCOMMITTED_GRACE_MS = 24 * 60 * 60_000;
/** The count of requests each client sent (see countSentRequests). */
const sentRequests = new WeakMap<FileFnClient, { count: number }>();

/**
 * Lets a replay tell that `client` sent no request during an upload, whose
 * started marker it may then remove; without a count, it may have sent one.
 */
export function countSentRequests(
  client: FileFnClient,
  sent: { count: number }
) {
  sentRequests.set(client, sent);
}

/**
 * What a pass did with an entry: finished with it for now, left it to upload
 * on a retry, or stopped the pass.
 */
type EntryOutcome = "done" | "retry" | "stop";
type ReplayPass = {
  dir: string;
  store: OPFSStore;
  request: ReplayRequest;
  /** Whether the records were brought up to date since the last upload. */
  isSynced: boolean;
};

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
 * client's signal aborts. A pass that fails still runs the one requested
 * meanwhile, and one that left files to upload while online is retried a
 * few times at growing delays. An upload starts only while the device is
 * online, checked in the same step, so a client never stages it offline.
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
 * With references (an account's queue), a file whose upload started (marked
 * with its authority first) is left untouched at any other authority; one
 * that never started is the replay's. Each decision reads the records
 * fully brought up to date since the pass last uploaded, and again after
 * each upload before the file is removed. A file uploads only while a record
 * of the account references it, which also commits one whose mark was lost.
 * A committed file whose record was deleted, or an uncommitted one older
 * than a day, is removed without an upload (a pass runs at that deadline),
 * and one whose upload started is discarded first; each discard and removal
 * runs only while the records are still the owner's at that authority,
 * checked in the same step. A marker that cannot be read keeps the file. A
 * pass stops while the records cannot be brought up to date or read.
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
    next: first as ReplayRequest | null,
    done: Promise.resolve()
  };
  replays.set(dir, state);
  state.done = (async () => {
    try {
      while (state.next) {
        const current: ReplayRequest = state.next;
        state.next = null;
        if (!current.signal.aborted) await replayPass(dir, current);
      }
    } finally {
      replays.delete(dir);
    }
  })();
  return state.done;
}

/** Runs a pass, scheduling a retry when it left files to upload. */
async function replayPass(dir: string, request: ReplayRequest) {
  let isRetried = true;
  try {
    isRetried = Boolean(
      await withQueueLock(dir, request.signal, () => drainQueue(dir, request))
    );
  } catch (error) {
    if (!request.signal.aborted) logger.warn({ at: "fileQueue.replay", error });
  }
  const count = retryCounts.get(dir) ?? 0;
  if (!isRetried) retryCounts.delete(dir);
  if (!isRetried || request.signal.aborted || count >= RETRY_DELAYS_MS.length) {
    return;
  }
  retryCounts.set(dir, count + 1);
  const { client, signal, publisher, references } = request;
  const timer = setTimeout(() => {
    void replayFileQueue(dir, client, signal, publisher, references);
  }, RETRY_DELAYS_MS[count]);
  signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
}

/** The timers that run a queue's pass at its earliest grace deadline. */
const graceTimers = new Map<string, { at: number; signal: AbortSignal }>();

/**
 * Runs a pass over the queue once a recent file without a record outlives
 * its grace, so it is removed without another trigger: one timer per queue,
 * at the earliest deadline, outside the retry budget.
 */
function scheduleGraceDeadline(
  { dir, request }: ReplayPass,
  createdAt: string
) {
  const at = Date.parse(createdAt) + UNCOMMITTED_GRACE_MS + 1_000;
  const current = graceTimers.get(dir);
  if (!Number.isFinite(at) || request.signal.aborted) return;
  if (current?.signal === request.signal && current.at <= at) return;
  const { client, signal, publisher, references } = request;
  const scheduled = { at, signal };
  graceTimers.set(dir, scheduled);
  const delay = Math.min(at - Date.now(), 2 ** 31 - 1);
  const timer = setTimeout(() => {
    if (graceTimers.get(dir) !== scheduled) return;
    graceTimers.delete(dir);
    void replayFileQueue(dir, client, signal, publisher, references);
  }, delay);
  signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
}

async function withQueueLock<T>(
  dir: string,
  signal: AbortSignal,
  run: () => Promise<T>
): Promise<T | undefined> {
  const locks: LockManager | undefined = globalThis.navigator?.locks;
  if (!locks) return run();
  return locks
    .request(`${QUEUE_LOCK_PREFIX}:${dir}`, { signal }, run)
    .catch((error: unknown) => {
      if (!signal.aborted) throw error;
      return undefined;
    });
}

/** Runs a pass over a queue; resolves whether it left files to retry. */
async function drainQueue(dir: string, request: ReplayRequest) {
  if (!isFileQueueSupported()) return false;
  const pass: ReplayPass = {
    dir,
    store: getStore(dir),
    request,
    isSynced: false
  };
  let isRetried = false;
  for (const entryName of await pass.store.listPendingUploads()) {
    if (request.signal.aborted || globalThis.navigator?.onLine === false) {
      return false;
    }
    if (!entryName.startsWith(ENTRY_PREFIX)) continue;
    const outcome = await replayEntry(pass, entryName).catch(
      (error: unknown): EntryOutcome => {
        if (request.signal.aborted) return "stop";
        logger.warn({ at: "fileQueue.replay", entryName, error });
        return "retry";
      }
    );
    if (outcome === "stop") return !request.signal.aborted;
    isRetried ||= outcome === "retry";
  }
  return isRetried;
}

async function replayEntry(
  pass: ReplayPass,
  entryName: string
): Promise<EntryOutcome> {
  const { dir, store } = pass;
  const { publisher, references } = pass.request;
  const pending = await store.getPendingUpload(entryName);
  const fileId = pending?.fileId;
  if (!pending || !fileId) return "done";
  if (references) {
    return replayAccountEntry(pass, references, { ...pending, fileId });
  }
  if (!(await hasEntryFile(dir, entryName, COMMITTED_FILE))) return "done";
  if (publisher && !(await isPublishable(dir, entryName, publisher)))
    return "done";
  if (publisher && !publisher.isReady()) return "stop";
  if (publisher) await claimEntry(dir, entryName, publisher.owner);
  const result = await uploadEntry(pass, { ...pending, fileId });
  if (publisher) {
    await publishEntry(dir, entryName, publisher, result);
  } else {
    await store.deletePendingUpload(entryName);
    releaseQueuedFileUrls((key) => key === `${dir}\n${entryName}`);
  }
  logger.info({ at: "fileQueue.replay", fileId: result.fileId });
  return "done";
}

/**
 * Replays a file of an account's queue (see replayFileQueue). Its marker and
 * committed mark are read before its record, so a capture saving its record
 * meanwhile keeps the file; an empty or invalid marker (an interrupted write)
 * is the owner's attempt.
 */
async function replayAccountEntry(
  pass: ReplayPass,
  references: QueuedFileReferences,
  pending: PendingUpload & { fileId: string }
): Promise<EntryOutcome> {
  const { dir } = pass;
  const { fileId, uploadSessionId: entryName } = pending;
  const started = await readEntryText(dir, entryName, STARTED_FILE, true);
  const marked = parseJson(started, isClaim);
  if (marked && !isSameClaim(marked, references.owner)) return "done";
  const isCommitted = await hasEntryFile(dir, entryName, COMMITTED_FILE);
  const isRecent = !(
    Date.now() - Date.parse(pending.createdAt) >=
    UNCOMMITTED_GRACE_MS
  );
  const isReferenced = await isReferencedNow(pass, references, fileId);
  if (isReferenced === undefined) return "stop";
  if (!isReferenced) {
    if (started === undefined && !isCommitted && isRecent) {
      scheduleGraceDeadline(pass, pending.createdAt);
      return "done";
    }
    return removeAccountEntry(pass, references, fileId, started !== undefined);
  }
  if (!isCommitted) await markQueuedFileCommitted(dir, fileId);
  const result = await uploadEntry(pass, pending, {
    write: () => (marked ? undefined : markStarted(dir, entryName, references)),
    isReady: () => !pass.request.signal.aborted && references.isCurrent(),
    undo: (attempt) => unmarkStarted(dir, entryName, attempt)
  });
  const isStillReferenced = await isReferencedNow(pass, references, fileId);
  if (isStillReferenced === undefined) return "stop";
  logger.info({ at: "fileQueue.replay", fileId: result.fileId });
  return removeAccountEntry(pass, references, fileId, !isStillReferenced);
}

/**
 * Marks a file started at the owner's authority by a new attempt, unless a
 * valid marker exists by now: one of the owner's is kept, another's stops it.
 */
async function markStarted(
  dir: string,
  entryName: string,
  { owner }: QueuedFileReferences
) {
  const text = await readEntryText(dir, entryName, STARTED_FILE, true);
  const marked = parseJson(text, isClaim);
  if (marked && isSameClaim(marked, owner)) return undefined;
  if (marked) throw new DOMException("Started elsewhere", "NetworkError");
  const attempt = crypto.randomUUID();
  const marker = JSON.stringify({ ...owner, attempt });
  await writeEntryFile(dir, entryName, STARTED_FILE, marker).catch(
    async (error: unknown) => {
      await unmarkStarted(dir, entryName);
      throw error;
    }
  );
  return attempt;
}

/**
 * Removes a file's started marker while it is still the attempt's own or,
 * without an attempt, while it is invalid (a failed write). Without Web Locks
 * another tab's pass may have relied on the attempt's marker to send, so an
 * attempt's marker is kept.
 */
async function unmarkStarted(dir: string, entryName: string, attempt?: string) {
  try {
    const text = await readEntryText(dir, entryName, STARTED_FILE, true);
    const marked = parseJson<StartedMarker>(text, isClaim);
    if (attempt ? marked?.attempt !== attempt : marked) return;
    if (attempt && !globalThis.navigator?.locks) return;
    await (await getEntryDir(dir, entryName))?.removeEntry(STARTED_FILE);
  } catch (error) {
    logger.warn({ at: "fileQueue.replay.started", entryName, error });
  }
}

/**
 * Whether a record of the account references the file, on records brought
 * fully up to date since the pass last uploaded, or undefined while they
 * cannot be brought up to date or read.
 */
async function isReferencedNow(
  pass: ReplayPass,
  references: QueuedFileReferences,
  fileId: string
) {
  if (!pass.isSynced && !(await references.sync())) return undefined;
  pass.isSynced = true;
  return references.isReferenced(fileId);
}

/**
 * Removes a file from an account's queue, discarding it first when its
 * upload may have reached FileFn, each only while the records are still the
 * owner's at the authority, checked in the same step.
 */
async function removeAccountEntry(
  pass: ReplayPass,
  references: QueuedFileReferences,
  fileId: string,
  isDiscarded: boolean
): Promise<EntryOutcome> {
  if (isDiscarded) {
    if (!references.isCurrent()) return "stop";
    await references.discard(fileId);
  }
  if (!references.isCurrent()) return "stop";
  await dequeueFile(pass.dir, fileId);
  return "done";
}

/** Uploads a queued file and its thumbnail. */
async function uploadEntry(
  pass: ReplayPass,
  pending: PendingUpload & { fileId: string },
  mark?: StartMark
) {
  pass.isSynced = false;
  const { client } = pass.request;
  const result = await uploadQueuedFile(client, pass.store, pending, mark);
  await uploadQueuedThumbnail(
    client,
    pass.dir,
    pending.uploadSessionId,
    result
  );
  return result;
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

/**
 * Marks a file started at its owner's authority before the request, sent only
 * while `isReady` (same step); an attempt whose client sent no request undoes
 * the marker it wrote, identified by the `write` result.
 */
type StartMark = {
  write(): Promise<string | undefined> | undefined;
  isReady(): boolean;
  undo(attempt: string): Promise<void>;
};

/** Throws while the device is offline or the attempt is no longer ready. */
function assertSendable(mark?: StartMark) {
  if (globalThis.navigator?.onLine === false || mark?.isReady() === false) {
    throw new DOMException("The upload cannot start", "NetworkError");
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
  pending: PendingUpload & { fileId: string },
  mark?: StartMark
): Promise<UploadResult> {
  const sent = sentRequests.get(client);
  const sentBefore = sent?.count;
  let attempt: string | undefined;
  let isSending = false;
  try {
    assertSendable();
    attempt = await mark?.write();
    assertSendable(mark);
    isSending = true;
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
    const isUnsent = !isSending || (sent && sent.count === sentBefore);
    if (attempt && isUnsent) await mark?.undo(attempt);
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

/**
 * Uploads a queued thumbnail; one that cannot be read or fails is logged and
 * left out.
 */
async function uploadQueuedThumbnail(
  client: FileFnClient,
  dir: string,
  entryName: string,
  uploaded: UploadResult
) {
  try {
    const entry = await getEntryDir(dir, entryName);
    const thumbnail = entry ? await readThumbnail(entry) : undefined;
    if (!thumbnail) return;
    await client.uploadArtifact({
      fileId: uploaded.fileId,
      versionId: uploaded.versionId,
      kind: DEVICE_THUMBNAIL_KIND,
      data: thumbnail,
      mimeType: thumbnail.type
    });
  } catch (error) {
    logger.warn({
      at: "fileQueue.replay.thumbnail",
      fileId: uploaded.fileId,
      error
    });
  }
}
