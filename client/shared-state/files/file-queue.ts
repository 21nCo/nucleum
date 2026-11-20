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
/** Started markers: `started-<attempt>`, one per attempt (`started` earlier). */
const STARTED_FILE = "started";
/**
 * Marks an account's file whose thumbnail the replay sent, or gave up on, so
 * a later pass or backup does not send or copy it again.
 */
const THUMBNAIL_SENT_FILE = "sent-thumbnail";
/**
 * Restore marks, each created empty, so its name alone carries its meaning
 * and an interrupted write never leaves one half written. A restore writing
 * a file creates `restoring-<generation>` first, with a new generation ID
 * that names this copy of the file for as long as it is queued, and
 * `published-<generation>` last, once the rest of the entry is written:
 * until then the entry is unpublished, and URL resolution, backups and the
 * replay ignore it, the replay removing it once no restore can still be
 * writing it. A published one is held for its account, never uploaded,
 * removed or discarded, until the account adopts it, once a record of the
 * account references it (`adopted-<generation>`, or an adoption row when
 * that mark cannot be created; see adoptEntry); the replay's rules then
 * apply. Restore sessions also hold files with hold rows (see HoldRow).
 */
const RESTORING_PREFIX = "restoring-";
const PUBLISHED_PREFIX = "published-";
const ADOPTED_PREFIX = "adopted-";
/**
 * Marks a published file held for its account that a restore which went on
 * to import its records relied on (see settleRestoredFiles), so no earlier
 * restore's rollback removes it.
 */
const SETTLED_PREFIX = "settled-";
/** The generation of a file no restore wrote. */
const BASE_GENERATION = "base";

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
    const entry = await getPublishedEntryDir(dir, entryName);
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
    if (!pending || (await isThumbnailOnly(dir, entryName, pending))) {
      return null;
    }
    blob = new Blob([pending.fileData], { type: pending.mimeType });
  }
  return blob ? URL.createObjectURL(blob) : undefined;
}

/**
 * Returns an entry's directory once it is published (see RESTORING_PREFIX),
 * or null when it is missing, unpublished or cannot be read.
 */
async function getPublishedEntryDir(dir: string, entryName: string) {
  const entry = await getEntryDir(dir, entryName);
  try {
    return entry && readMarks(await readNames(entry)).isPublished
      ? entry
      : null;
  } catch {
    return null;
  }
}

/**
 * Whether a queued file holds its thumbnail only, its original in FileFn
 * (see QueuedFileCopy), so its original resolves through FileFn.
 */
async function isThumbnailOnly(
  dir: string,
  entryName: string,
  pending: PendingUpload
) {
  return (
    !pending.fileData.byteLength &&
    (await hasEntryFile(dir, entryName, UPLOADED_FILE))
  );
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

/**
 * A file of an account's queue as a backup carries it: its bytes, thumbnail,
 * the authority it is captured at (`claim`), whether its record saved, and
 * the started markers that bind an upload that may have begun to its
 * authority (name and contents). A file whose original FileFn confirmed
 * (`uploadedVersionId`, the version it got) while its thumbnail is still to
 * be sent carries the thumbnail only, with no original bytes.
 */
export type QueuedFileCopy = {
  fileId: string;
  fileName: string;
  contentType: string;
  policy: string;
  createdAt: string;
  retryCount: number;
  data: Uint8Array;
  uploadedVersionId?: string;
  thumbnail?: { type: string; data: Uint8Array };
  claim?: QueuedFileClaim;
  isCommitted: boolean;
  started: { name: string; text: string }[];
};

const STARTED_NAME = /^started(?:-[\w-]+)?$/;
/** The files of a FileFn OPFSStore entry: its metadata and its bytes. */
const METADATA_FILE = "metadata.json";
const DATA_FILE = "data.bin";

/**
 * Copies the files an account's queue still holds, so a backup carries the
 * bytes of files that have not reached FileFn, with the snapshot `snapshot`
 * takes (the records that reference them): under the queue's lock, taken
 * before the snapshot and held through the copy, so no replay removes a file
 * between the two reads; one that left the queue without its upload logged
 * meanwhile (another tab, without Web Locks) takes the snapshot again, and
 * after SNAPSHOT_ATTEMPTS rejects. Leaves out an original FileFn confirmed at a known
 * version, as the file's uploaded mark or the upload log records it
 * (keeping a thumbnail still to be sent; one whose version neither records
 * is copied whole), an unpublished file (see RESTORING_PREFIX), and one that
 * leaves the queue while it is read. A published file a restore wrote is
 * copied whether or not its account adopted it. A file whose metadata, bytes
 * or marks cannot be read rejects, and never counts as absent.
 */
export async function exportQueuedFiles<T>(
  dir: string,
  snapshot: () => Promise<T>
): Promise<{ records: T; files: QueuedFileCopy[] }> {
  if (!isFileQueueSupported()) return { records: await snapshot(), files: [] };
  const signal = new AbortController().signal;
  for (let attempt = 0; attempt < SNAPSHOT_ATTEMPTS; attempt++) {
    const exported = await withQueueLock(dir, signal, async () => {
      const listed = await listEntryNames(dir);
      const records = await snapshot();
      const uploads = await readUploadLog(dir);
      const files: QueuedFileCopy[] = [];
      for (const entryName of await listEntryNames(dir)) {
        const copy = await copyEntry(dir, entryName, uploads);
        if (copy) files.push(copy);
      }
      const remaining = new Set(await listEntryNames(dir));
      const logged = await readUploadLog(dir);
      const isChanged = listed.some(
        (name) =>
          !remaining.has(name) && !logged[name.slice(ENTRY_PREFIX.length)]
      );
      return isChanged ? undefined : { records, files };
    });
    if (exported) return exported;
  }
  throw new Error("The upload queue changed while the backup was made");
}

/**
 * How many times a backup takes its snapshot again when a file leaves the
 * queue unuploaded between its reads (another tab, without Web Locks).
 */
const SNAPSHOT_ATTEMPTS = 3;

async function listEntryNames(dir: string) {
  const names = await getStore(dir).listPendingUploads();
  return names.filter((name) => name.startsWith(ENTRY_PREFIX));
}

async function copyEntry(dir: string, entryName: string, uploads: UploadLog) {
  try {
    const entry = await getEntryDir(dir, entryName, true);
    const names = await readNames(entry);
    if (!entry || !readMarks(names).isPublished) return undefined;
    const pending = await readPendingStrict(entry);
    if (!pending) return undefined;
    const marked = names.includes(UPLOADED_FILE)
      ? await readEntryText(dir, entryName, UPLOADED_FILE, true)
      : undefined;
    const uploaded = marked || uploads[pending.fileId]?.versionId;
    const thumbnail = await readThumbnail(entry);
    const isThumbnailSent = !thumbnail || names.includes(THUMBNAIL_SENT_FILE);
    if ((marked !== undefined || uploaded) && isThumbnailSent) {
      return undefined;
    }
    const started: QueuedFileCopy["started"] = [];
    for (const name of names) {
      if (!STARTED_NAME.test(name)) continue;
      const text = await readEntryText(dir, entryName, name, true);
      if (text !== undefined) started.push({ name, text });
    }
    return {
      fileId: pending.fileId,
      fileName: pending.fileName,
      contentType: pending.mimeType,
      policy: pending.policy,
      createdAt: pending.createdAt,
      retryCount: pending.retryCount,
      data: uploaded ? new Uint8Array() : new Uint8Array(pending.fileData),
      uploadedVersionId: uploaded,
      thumbnail: thumbnail && {
        type: thumbnail.type,
        data: new Uint8Array(await thumbnail.arrayBuffer())
      },
      claim: await readClaim(dir, entryName, true),
      isCommitted: names.includes(COMMITTED_FILE),
      started
    };
  } catch (error) {
    if (!(await getEntryDir(dir, entryName, true))) return undefined;
    throw error;
  }
}

/**
 * Reads a queued file's metadata and bytes, or undefined while its staging
 * has not finished: its metadata file is not there, or is still empty (the
 * FileFn store writes the bytes first, then the metadata, which is empty
 * until its write closes). Any other read error, including one once the
 * metadata file is found, or metadata that cannot be parsed, rejects rather
 * than counting as absent.
 */
async function readPendingStrict(
  entry: FileSystemDirectoryHandle
): Promise<(PendingUpload & { fileId: string }) | undefined> {
  let handle: FileSystemFileHandle;
  try {
    handle = await entry.getFileHandle(METADATA_FILE);
  } catch (error) {
    if ((error as Error)?.name === "NotFoundError") return undefined;
    throw error;
  }
  const text = await (await handle.getFile()).text();
  if (!text) return undefined;
  const metadata = JSON.parse(text) as PendingUpload;
  if (typeof metadata?.fileId !== "string") {
    throw new Error("A queued file's metadata is invalid");
  }
  const data = await (await entry.getFileHandle(DATA_FILE)).getFile();
  return {
    ...metadata,
    fileId: metadata.fileId,
    fileData: await data.arrayBuffer()
  };
}

/** The names in a directory, none without one; a read error rejects. */
async function readNames(handle: FileSystemDirectoryHandle | null) {
  const names: string[] = [];
  for await (const name of handle
    ? (handle as unknown as { keys(): AsyncIterable<string> }).keys()
    : []) {
    names.push(name);
  }
  return names;
}

/**
 * Reads an entry's restore marks (see RESTORING_PREFIX) from its names: its
 * generation (BASE_GENERATION when no restore wrote it), whether it is
 * published, whether its adopted and settled marks are there, and whether
 * its original and thumbnail were both delivered.
 */
function readMarks(names: readonly string[]) {
  const generations = names
    .filter((name) => name.startsWith(RESTORING_PREFIX))
    .map((name) => name.slice(RESTORING_PREFIX.length));
  const [generation = BASE_GENERATION] = generations;
  const isRestored = generations.length > 0;
  return {
    generation,
    isPublished:
      !isRestored ||
      (generations.length === 1 &&
        names.includes(`${PUBLISHED_PREFIX}${generation}`)),
    isAdopted: !isRestored || names.includes(`${ADOPTED_PREFIX}${generation}`),
    isSettled: names.includes(`${SETTLED_PREFIX}${generation}`),
    isDelivered:
      names.includes(UPLOADED_FILE) &&
      (names.includes(THUMBNAIL_SENT_FILE) ||
        !names.some((name) => name.startsWith(THUMBNAIL_PREFIX)))
  };
}

/**
 * Reads how restores hold a queued file: its restore marks, whether its
 * account adopted it (its adopted mark or an adoption row), and whether a
 * live hold row of a session other than `except` holds its generation;
 * undefined when the queue does not hold it. A read error other than a
 * missing file rejects.
 */
async function readRestore(dir: string, fileId: string) {
  const entry = await getEntryDir(dir, toEntryName(fileId), true);
  if (!entry) return undefined;
  const marks = readMarks(await readNames(entry));
  const { rows, adoptions } = await readHolds(dir);
  const adoption = [ADOPTION_ROW, fileId, marks.generation].join("~");
  return {
    ...marks,
    isAdopted: marks.isAdopted || adoptions.has(adoption),
    isHeld: (except?: string) =>
      rows.some(
        (row) =>
          row.isLive &&
          row.fileId === fileId &&
          row.generation === marks.generation &&
          row.session !== except
      )
  };
}

/**
 * Restore holds: rows beside a queue, in `<queue>.holds`, each an empty file
 * named `hold~<session>~<fileId>~<generation>~<expires at, in ms>`, created
 * and removed under the queue's lock. A restore session holds each file it
 * writes or keeps, at the generation it wrote or found, from staging until
 * it settles or rolls back, when it removes its own rows only (see
 * settleRestoredFiles); no replay acts on a file while a live row holds its
 * generation. A row a session left (its page closed) holds no longer than
 * RESTORE_HOLD_LIFETIME_MS, and a replay removes it once it expired.
 * Adoption rows, `adopted~<fileId>~<generation>`, record an adoption whose
 * mark could not be created in the entry (see adoptEntry).
 */
type HoldRow = {
  name: string;
  session: string;
  fileId: string;
  generation: string;
  isLive: boolean;
};

const HOLD_ROW = "hold";
const ADOPTION_ROW = "adopted";
/** How long a restore's hold row holds its file at most (see HoldRow). */
export const RESTORE_HOLD_LIFETIME_MS = 24 * 60 * 60_000;

/** Returns a queue's holds directory, or null when it has none yet. */
async function getHoldsDir(dir: string, isCreated = false) {
  const root = await navigator.storage.getDirectory();
  try {
    return await root.getDirectoryHandle(`${dir}.holds`, {
      create: isCreated
    });
  } catch (error) {
    if (isCreated || (error as Error)?.name !== "NotFoundError") throw error;
    return null;
  }
}

/** Reads a queue's hold and adoption rows; a read error rejects. */
async function readHolds(dir: string) {
  const handle = await getHoldsDir(dir);
  const rows: HoldRow[] = [];
  const adoptions = new Set<string>();
  for (const name of await readNames(handle)) {
    const [kind, session, fileId, generation, expires] = name.split("~");
    if (kind === ADOPTION_ROW) adoptions.add(name);
    if (kind !== HOLD_ROW) continue;
    const left = Number(expires) - Date.now();
    const isLive = left > 0 && left <= RESTORE_HOLD_LIFETIME_MS;
    rows.push({ name, session, fileId, generation, isLive });
  }
  return { handle, rows, adoptions };
}

/** Holds a file's generation for a restore session, creating its row. */
async function holdEntry(
  { dir, session }: RestoredQueuedFiles,
  fileId: string,
  generation: string
) {
  const expiresAt = Date.now() + RESTORE_HOLD_LIFETIME_MS;
  const name = [HOLD_ROW, session, fileId, generation, expiresAt].join("~");
  const handle = await getHoldsDir(dir, true);
  await handle!.getFileHandle(name, { create: true });
}

/**
 * Removes the hold rows `isRemoved` selects: a session's own (see
 * releaseHolds), or the expired ones a replay removes. One that cannot be
 * removed is logged, and holds no longer than RESTORE_HOLD_LIFETIME_MS.
 * Never rejects.
 */
async function removeHolds(dir: string, isRemoved: (row: HoldRow) => boolean) {
  try {
    const { handle, rows } = await readHolds(dir);
    for (const row of rows) {
      if (!isRemoved(row)) continue;
      await removeEntryFile(handle, row.name).catch((error: unknown) => {
        logger.warn({ at: "fileQueue.holds", row: row.name, error });
      });
    }
  } catch (error) {
    logger.warn({ at: "fileQueue.holds", dir, error });
  }
}

/**
 * Removes a restore session's own hold rows, but those of the files in
 * `retained`, which then hold them until they expire; never rejects.
 */
function releaseHolds(
  { dir, session }: RestoredQueuedFiles,
  retained: ReadonlySet<string> = new Set()
) {
  return removeHolds(
    dir,
    (row) => row.session === session && !retained.has(row.fileId)
  );
}

/**
 * Hands a published file a restore wrote, at `generation`, to its account's
 * replay: creates its adopted mark or, when that cannot be created, an
 * adoption row beside the queue, so a replay finds it adopted even when its
 * record is deleted before the replay sees it. Rejects only when neither
 * can be created.
 */
async function adoptEntry(dir: string, fileId: string, generation: string) {
  try {
    const entry = await getEntryDir(dir, toEntryName(fileId), true);
    await entry?.getFileHandle(`${ADOPTED_PREFIX}${generation}`, {
      create: true
    });
  } catch (error) {
    logger.warn({ at: "fileQueue.adopt", fileId, error });
    const handle = await getHoldsDir(dir, true);
    await handle!.getFileHandle([ADOPTION_ROW, fileId, generation].join("~"), {
      create: true
    });
  }
}

/** Removes a file's entry file, if it is there; any other error rejects. */
async function removeEntryFile(
  entry: FileSystemDirectoryHandle | null,
  name: string
) {
  await entry?.removeEntry(name).catch((error: unknown) => {
    if ((error as Error)?.name !== "NotFoundError") throw error;
  });
}

/**
 * The uploads an account's replay completed, by file: the version FileFn
 * gave the original, recorded once it uploaded, before its thumbnail is sent
 * and before the file leaves the queue. The log is a file of the origin
 * private file system beside the queue, outside its entries, so it outlives
 * the file leaving the queue, a reload and the tab; it is written and read
 * under the queue's Web Lock. A restore does not stage again a file it
 * records (see stageRestoredFiles), as its original reached FileFn. A
 * discarded file leaves the log, so a later restore stages it again, and the
 * log keeps the UPLOAD_LOG_LIMIT latest uploads.
 */
type UploadLog = Record<string, LoggedUpload>;
type LoggedUpload = { versionId: string; at: number };

const UPLOAD_LOG_LIMIT = 500;

function toUploadLogName(dir: string) {
  return `${dir}.uploads.json`;
}

function isUploadLog(value: UploadLog) {
  return (
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (upload) =>
        typeof upload?.versionId === "string" && typeof upload.at === "number"
    )
  );
}

/**
 * Reads a queue's upload log; one missing or invalid reads empty, and any
 * other read error rejects.
 */
async function readUploadLog(dir: string): Promise<UploadLog> {
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(toUploadLogName(dir));
    const text = await (await handle.getFile()).text();
    return parseJson<UploadLog>(text, isUploadLog) ?? {};
  } catch (error) {
    if ((error as Error)?.name === "NotFoundError") return {};
    throw error;
  }
}

/**
 * Records a file's uploaded version in its queue's upload log, or without
 * one removes the file from it.
 */
async function writeUploadLog(dir: string, fileId: string, versionId?: string) {
  const log = await readUploadLog(dir);
  if (!versionId && !(fileId in log)) return;
  delete log[fileId];
  if (versionId) log[fileId] = { versionId, at: Date.now() };
  const kept = Object.entries(log)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, UPLOAD_LOG_LIMIT);
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(toUploadLogName(dir), {
    create: true
  });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(Object.fromEntries(kept)));
  await writable.close();
}

/**
 * Records a replay's upload (or discard, without `versionId`) in its queue's
 * upload log. The log only spares a later restore staging the file again,
 * so a log that cannot be read or written is logged and the replay goes on:
 * it sends the thumbnail, marks the file uploaded and removes it, or removes
 * a discarded file, as without a log.
 */
async function logUpload(dir: string, fileId: string, versionId?: string) {
  try {
    await writeUploadLog(dir, fileId, versionId);
  } catch (error) {
    logger.warn({ at: "fileQueue.replay.uploadLog", fileId, error });
  }
}

/** A queued file at the generation a restore wrote or found it. */
type QueuedGeneration = { fileId: string; generation: string };

/** The files a restore session put or kept in a queue (see stageRestoredFiles). */
export type RestoredQueuedFiles = {
  dir: string;
  /** The restore session, whose hold rows hold the files (see HoldRow). */
  session: string;
  /** The files the restore wrote, each at the new generation it wrote. */
  written: QueuedGeneration[];
  /** The files the restore found held and kept as they were. */
  kept: QueuedGeneration[];
};

/**
 * Puts files a backup carried into a queue, under the queue's lock, each as
 * a new generation (see RESTORING_PREFIX) published only once it is fully
 * written, and held by the restore session (see HoldRow) from before its
 * first byte until the restore settles (see settleRestoredFiles). A
 * published file stays held, never uploaded, removed or discarded, until
 * its account adopts it, once a record of the account references it: a
 * restore into the queue's own account adopts the files its imported records
 * reference when it settles, and the account's replay adopts any other once
 * it finds a record referencing it, also for a restore into another account
 * or the guest.
 * A file stays as the queue holds it when it is complete there (published),
 * or when the queue's upload log records its original uploaded (see
 * UploadLog), whether or not it is still there; a restore into the queue's
 * own account (`isOwnAccount`) holds a complete file it keeps, and any
 * restore holds a published file no account adopted yet, so no replay acts
 * on it and no earlier restore's rollback removes it before the restore's
 * records are imported. Any other (missing, not staged yet, or left
 * unpublished by an interrupted restore) is written again from the backup.
 * A file another restore may still be writing (without Web Locks), or that
 * cannot be read or written, rejects, after rolling back what this call
 * wrote (see unstageRestoredFiles); a read error never counts as absent.
 */
export async function stageRestoredFiles(
  dir: string,
  copies: readonly QueuedFileCopy[],
  options: { isOwnAccount: boolean }
): Promise<RestoredQueuedFiles> {
  const staged: RestoredQueuedFiles = {
    dir,
    session: crypto.randomUUID(),
    written: [],
    kept: []
  };
  if (!copies.length) return staged;
  if (!isFileQueueSupported()) {
    throw new Error("This device cannot keep the backup's pending files");
  }
  const signal = new AbortController().signal;
  await withQueueLock(dir, signal, async () => {
    try {
      const uploads = await readUploadLog(dir);
      for (const copy of copies) {
        const found = await readFoundEntry(dir, copy.fileId);
        if (
          found.state === "restored" ||
          (found.state === "complete" && options.isOwnAccount)
        ) {
          staged.kept.push({
            fileId: copy.fileId,
            generation: found.generation
          });
          await holdEntry(staged, copy.fileId, found.generation);
        }
        if (found.state !== "none" || uploads[copy.fileId]) continue;
        const generation = crypto.randomUUID();
        staged.written.push({ fileId: copy.fileId, generation });
        await holdEntry(staged, copy.fileId, generation);
        await stageRestoredEntry(dir, copy, generation, found.isPresent);
      }
    } catch (error) {
      await rollBackRestoredFiles(staged);
      throw error;
    }
  });
  return staged;
}

/**
 * How a queue holds a file a restore brings back, at its generation:
 * "complete" when it is published and no restore holds it for an account
 * (adopted, or no restore wrote it), "restored" when it is published and
 * not adopted yet, and "none" when it is missing, its staging has not
 * finished, or an interrupted restore left it unpublished. One a live hold
 * shows another restore may still be writing (without Web Locks) rejects.
 */
async function readFoundEntry(dir: string, fileId: string) {
  const restore = await readRestore(dir, fileId);
  const generation = restore?.generation ?? BASE_GENERATION;
  if (!restore) return { state: "none", generation, isPresent: false };
  if (!restore.isPublished) {
    if (!hasWebLocks() && restore.isHeld()) {
      throw new Error("Another restore is writing a queued file");
    }
    return { state: "none", generation, isPresent: true };
  }
  const entry = await getEntryDir(dir, toEntryName(fileId), true);
  if (!entry || !(await readPendingStrict(entry))) {
    return { state: "none", generation, isPresent: Boolean(entry) };
  }
  const state = restore.isAdopted ? "complete" : "restored";
  return { state, generation, isPresent: true };
}

/**
 * Writes a file a backup carried as a new generation, in an entry it
 * creates: its restoring mark first (removing the entry when that mark
 * cannot be created), then its bytes and the marks the backup held, and its
 * published mark last (see RESTORING_PREFIX), rejecting instead when another
 * restore wrote into the entry meanwhile (another tab, without Web Locks).
 */
async function stageRestoredEntry(
  dir: string,
  copy: QueuedFileCopy,
  generation: string,
  isPresent: boolean
) {
  const entryName = toEntryName(copy.fileId);
  if (isPresent) await dequeueFile(dir, copy.fileId);
  const root = await navigator.storage.getDirectory();
  const queue = await root.getDirectoryHandle(dir, { create: true });
  const entry = await queue.getDirectoryHandle(entryName, { create: true });
  try {
    await entry.getFileHandle(`${RESTORING_PREFIX}${generation}`, {
      create: true
    });
  } catch (error) {
    await queue.removeEntry(entryName, { recursive: true }).catch(String);
    throw error;
  }
  await getStore(dir).stagePendingUpload({
    uploadSessionId: entryName,
    fileId: copy.fileId,
    policy: copy.policy,
    fileName: copy.fileName,
    size: copy.data.byteLength,
    mimeType: copy.contentType,
    fileData: copy.data.slice().buffer as ArrayBuffer,
    createdAt: copy.createdAt,
    retryCount: copy.retryCount
  });
  for (const { name, text } of copy.started) {
    if (STARTED_NAME.test(name)) {
      await writeEntryFile(dir, entryName, name, text);
    }
  }
  if (copy.claim) await claimEntry(dir, entryName, copy.claim);
  if (copy.isCommitted) {
    await markQueuedFileCommitted(dir, copy.fileId);
  }
  if (copy.uploadedVersionId) {
    await writeEntryFile(dir, entryName, UPLOADED_FILE, copy.uploadedVersionId);
  }
  if (copy.thumbnail && THUMBNAIL_TYPES.has(copy.thumbnail.type)) {
    await writeEntryFile(
      dir,
      entryName,
      `${THUMBNAIL_PREFIX}${copy.thumbnail.type.split("/")[1]}`,
      copy.thumbnail.data.slice().buffer as ArrayBuffer
    );
  }
  const restoring = (await readNames(entry)).filter((name) =>
    name.startsWith(RESTORING_PREFIX)
  );
  if (restoring.length !== 1) {
    throw new Error("Another restore is writing a queued file");
  }
  await entry.getFileHandle(`${PUBLISHED_PREFIX}${generation}`, {
    create: true
  });
}

/**
 * Settles a restore session once it imported its records, all or in part,
 * or stopped there, under the queue's lock, for each file it wrote or kept
 * that is still published at the generation it recorded. With
 * `isReferenced`, for a restore into the queue's own account, a file a
 * record of the account references is adopted (see adoptEntry), so the
 * replay's rules apply to it, also once its record is later deleted; and
 * one whose original and thumbnail the replay delivered (marked uploaded
 * and sent) leaves the queue instead, unless another session holds it, as
 * its record now references the file FileFn holds. Any other file not
 * adopted yet stays held for its account, marked settled so no earlier
 * restore's rollback removes it. Then removes the session's own hold rows,
 * leaving other sessions', but the row of a file that cannot be read,
 * adopted or marked, which stays held until the row expires, so no earlier
 * restore's rollback removes it meanwhile, and then for the replay to adopt
 * once it finds the file referenced; never rejects.
 */
export async function settleRestoredFiles(
  staged: RestoredQueuedFiles,
  isReferenced?: (fileId: string) => Promise<boolean | undefined>
): Promise<void> {
  const { dir, written, kept, session } = staged;
  if (!written.length && !kept.length) return;
  const signal = new AbortController().signal;
  await withQueueLock(dir, signal, async () => {
    const retained = new Set<string>();
    for (const { fileId, generation } of [...written, ...kept]) {
      try {
        const restore = await readRestore(dir, fileId);
        if (!restore?.isPublished || restore.generation !== generation) {
          continue;
        }
        if (isReferenced && (await isReferenced(fileId)) === true) {
          if (restore.isDelivered && !restore.isHeld(session)) {
            await dequeueFile(dir, fileId);
          } else if (!restore.isAdopted) {
            await adoptEntry(dir, fileId, generation);
          }
        } else if (!restore.isAdopted) {
          const entry = await getEntryDir(dir, toEntryName(fileId), true);
          await entry?.getFileHandle(`${SETTLED_PREFIX}${generation}`, {
            create: true
          });
        }
      } catch (error) {
        retained.add(fileId);
        logger.warn({ at: "fileQueue.release", fileId, error });
      }
    }
    await releaseHolds(staged, retained);
  }).catch((error: unknown) => {
    logger.warn({ at: "fileQueue.release", dir, error });
  });
}

/**
 * Rolls back a restore session that failed before importing any record,
 * under the queue's lock: removes each file it wrote that is still at the
 * generation it wrote, neither adopted nor settled, and held by no other
 * session's live row; a file another restore or the replay adopted, kept,
 * settled or replaced stays as it is. One that cannot be removed stays
 * held for its account. Then removes the session's own hold rows. Never
 * rejects.
 */
export async function unstageRestoredFiles(
  staged: RestoredQueuedFiles
): Promise<void> {
  if (!staged.written.length && !staged.kept.length) return;
  const signal = new AbortController().signal;
  await withQueueLock(staged.dir, signal, () =>
    rollBackRestoredFiles(staged)
  ).catch((error: unknown) => {
    logger.warn({ at: "fileQueue.unstage", dir: staged.dir, error });
  });
}

/** Rolls back a restore session (see unstageRestoredFiles), under the lock. */
async function rollBackRestoredFiles(staged: RestoredQueuedFiles) {
  const { dir, session } = staged;
  for (const { fileId, generation } of staged.written) {
    try {
      const restore = await readRestore(dir, fileId);
      if (!restore || restore.generation !== generation) continue;
      if (restore.isAdopted || restore.isSettled || restore.isHeld(session)) {
        continue;
      }
      await dequeueFile(dir, fileId);
    } catch (error) {
      logger.warn({ at: "fileQueue.unstage", fileId, error });
    }
  }
  await releaseHolds(staged);
}

function hasWebLocks() {
  return Boolean(globalThis.navigator?.locks);
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
/** The upload requests each client sent (see countSentRequests). */
const sentRequests = new WeakMap<FileFnClient, Map<string, number>>();

/**
 * Lets a replay tell that `client` sent no request for an upload, whose marker
 * it may then remove: `sent` counts upload requests per idempotency key ("*",
 * unreadable, counts for all); without counts, an upload may have sent one.
 */
export function countSentRequests(
  client: FileFnClient,
  sent: Map<string, number>
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
 * A file a restore is writing or holds (see RESTORING_PREFIX and HoldRow)
 * is left untouched; an unpublished one no restore can still be writing is
 * removed, and a published one no hold row holds is adopted once a record
 * of the queue's account references it, and the rules below then apply. A
 * mark that cannot be read leaves the file to a retry.
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
 * each upload (which marks the file uploaded) before the file is removed. A file uploads only while a record
 * of the account references it, which also commits one whose mark was lost.
 * A committed file whose record was deleted, or an uncommitted one older
 * than a day, is removed without an upload (a pass runs at that deadline),
 * and one that may have started (per markers read after that check, always
 * without Web Locks) is discarded first; each discard and removal runs only
 * while the records are the owner's at that authority, checked in the same
 * step. A marker that cannot be read keeps the file. A pass stops while the
 * records cannot be brought up to date or read.
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

/** The page's own queue locks, for a browser without Web Locks. */
const pageLocks = new Map<string, Promise<unknown>>();

/**
 * Runs `run` under a queue's Web Lock, or without Web Locks under the
 * page's own lock of the queue, so the page's replays, backups and restores
 * of a queue never interleave.
 */
async function withQueueLock<T>(
  dir: string,
  signal: AbortSignal,
  run: () => Promise<T>
): Promise<T | undefined> {
  const locks: LockManager | undefined = globalThis.navigator?.locks;
  if (!locks) {
    const result = (pageLocks.get(dir) ?? Promise.resolve()).then(run);
    pageLocks.set(
      dir,
      result.catch(() => undefined)
    );
    return result;
  }
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
  await removeHolds(dir, (row) => !row.isLive);
  let isRetried = false;
  for (const entryName of await pass.store.listPendingUploads()) {
    if (request.signal.aborted || isAppOffline()) {
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
  if (!pending || !fileId) {
    await removeAbandonedEntry(dir, entryName.slice(ENTRY_PREFIX.length));
    return "done";
  }
  const restored = await takeOverRestoredEntry(pass, fileId);
  if (restored) return restored;
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
 * Leaves a replay to act on a file (resolving undefined) when no restore
 * holds it (see RESTORING_PREFIX and HoldRow): no restore wrote it, or its
 * account adopted it, or a record of the queue's account now references it,
 * when the replay adopts it. A file a live hold row holds is left
 * untouched, as is one held for its account that no record references, and
 * while the records cannot be brought up to date or read, the pass stops.
 * An unpublished file is removed, under Web Locks (no restore writes while
 * the replay holds the lock) or once no live hold row holds it.
 */
async function takeOverRestoredEntry(
  pass: ReplayPass,
  fileId: string
): Promise<EntryOutcome | undefined> {
  const { dir } = pass;
  const { references } = pass.request;
  const restore = await readRestore(dir, fileId);
  if (!restore) return "done";
  if (!restore.isPublished) {
    await removeAbandonedEntry(dir, fileId, restore);
    return "done";
  }
  if (restore.isHeld()) return "done";
  if (restore.isAdopted) return undefined;
  if (!references) return "done";
  const isReferenced = await isReferencedNow(pass, references, fileId);
  if (isReferenced === undefined) return "stop";
  if (!isReferenced) return "done";
  await adoptEntry(dir, fileId, restore.generation);
  return undefined;
}

/**
 * Removes a file a restore left unpublished (see RESTORING_PREFIX), also one
 * whose bytes or metadata it never wrote, once no restore can still be
 * writing it: under Web Locks, as no restore writes while the replay holds
 * the lock, and otherwise once no live hold row holds its generation.
 */
async function removeAbandonedEntry(
  dir: string,
  fileId: string,
  restore?: Awaited<ReturnType<typeof readRestore>>
) {
  const found = restore ?? (await readRestore(dir, fileId));
  if (!found || found.isPublished) return;
  if (hasWebLocks() || !found.isHeld()) await dequeueFile(dir, fileId);
}

/** Whether a restore holds a file now (see takeOverRestoredEntry). */
async function isHeldNow(dir: string, fileId: string) {
  const restore = await readRestore(dir, fileId);
  return Boolean(
    restore && (!restore.isPublished || !restore.isAdopted || restore.isHeld())
  );
}

/**
 * Replays a file of an account's queue (see replayFileQueue). Its markers and
 * committed mark are read before its record, so a capture saving its record
 * meanwhile keeps the file; an empty or invalid marker (an interrupted write)
 * may be the owner's attempt (as may any unreferenced file without Web Locks).
 * An original marked uploaded is not sent again while its thumbnail is
 * still to be sent, or when the file holds its thumbnail only (see
 * QueuedFileCopy), and a thumbnail marked sent is not sent again; a
 * thumbnail FileFn could not take is sent again on a retry, the file staying
 * queued meanwhile (see sendAccountThumbnail).
 */
async function replayAccountEntry(
  pass: ReplayPass,
  references: QueuedFileReferences,
  pending: PendingUpload & { fileId: string }
): Promise<EntryOutcome> {
  const { dir } = pass;
  const { fileId, uploadSessionId: entryName } = pending;
  const markers = await readMarkers(dir, entryName);
  if (isStartedElsewhere(markers, references)) return "done";
  const names = await readNames(await getEntryDir(dir, entryName, true));
  const isThumbnailPending =
    names.some((name) => name.startsWith(THUMBNAIL_PREFIX)) &&
    !names.includes(THUMBNAIL_SENT_FILE);
  const uploaded =
    !pending.fileData.byteLength || isThumbnailPending
      ? await readEntryText(dir, entryName, UPLOADED_FILE, true)
      : undefined;
  const isCommitted = await hasEntryFile(dir, entryName, COMMITTED_FILE);
  const isRecent = !(
    Date.now() - Date.parse(pending.createdAt) >=
    UNCOMMITTED_GRACE_MS
  );
  const isReferenced = await isReferencedNow(pass, references, fileId);
  if (isReferenced === undefined) return "stop";
  if (!isReferenced) {
    if (!markers.length && !isCommitted && isRecent && !uploaded) {
      scheduleGraceDeadline(pass, pending.createdAt);
      return "done";
    }
    const started = await readMarkers(dir, entryName);
    if (uploaded || !hasWebLocks()) started.push(undefined);
    if (isStartedElsewhere(started, references)) return "done";
    return removeAccountEntry(pass, references, fileId, started.length > 0);
  }
  if (!isCommitted) await markQueuedFileCommitted(dir, fileId);
  const result = uploaded
    ? { fileId, versionId: uploaded }
    : await uploadEntry(pass, pending, {
        write: () => markStarted(dir, entryName, references),
        isReady: () => !pass.request.signal.aborted && references.isCurrent(),
        undo: (attempt) => unmarkStarted(dir, entryName, attempt)
      });
  if (!(await sendAccountThumbnail(pass, entryName, result))) return "retry";
  if (uploaded) await logUpload(dir, fileId, uploaded);
  const isStillReferenced = await isReferencedNow(pass, references, fileId);
  if (isStillReferenced === undefined) return "stop";
  logger.info({ at: "fileQueue.replay", fileId: result.fileId });
  return removeAccountEntry(pass, references, fileId, !isStillReferenced);
}

/**
 * Marks an account's file uploaded once its upload completed, so a later
 * pass does not send it again and a backup taken while it is still queued
 * copies its thumbnail only (see exportQueuedFiles). A mark that cannot be written, as the
 * file left the queue meanwhile, is logged; the pass goes on.
 */
async function markAccountEntryUploaded(
  dir: string,
  entryName: string,
  uploaded: UploadResult
) {
  try {
    await writeEntryFile(dir, entryName, UPLOADED_FILE, uploaded.versionId);
  } catch (error) {
    logger.warn({ at: "fileQueue.replay.uploaded", entryName, error });
  }
}

/**
 * Reads a file's started markers, each parsed or undefined when empty or
 * invalid; a read error other than a missing file rejects.
 */
async function readMarkers(dir: string, entryName: string) {
  const entry = await getEntryDir(dir, entryName, true);
  const markers: (QueuedFileClaim | undefined)[] = [];
  for await (const name of entry
    ? (entry as unknown as { keys(): AsyncIterable<string> }).keys()
    : []) {
    if (!name.startsWith(STARTED_FILE)) continue;
    const text = await readEntryText(dir, entryName, name, true);
    if (text !== undefined) markers.push(parseJson(text, isClaim));
  }
  return markers;
}

function isStartedElsewhere(
  markers: (QueuedFileClaim | undefined)[],
  { owner }: QueuedFileReferences
) {
  return markers.some((marker) => marker && !isSameClaim(marker, owner));
}

/**
 * Writes a new attempt's own started marker at the owner's authority, then
 * reads every marker: one of another authority by now stops the attempt, as
 * that attempt, writing first, stops or, writing later, sees this marker.
 */
async function markStarted(
  dir: string,
  entryName: string,
  references: QueuedFileReferences
) {
  const attempt = crypto.randomUUID();
  const marker = JSON.stringify({ ...references.owner, attempt });
  try {
    await writeEntryFile(dir, entryName, `${STARTED_FILE}-${attempt}`, marker);
    if (isStartedElsewhere(await readMarkers(dir, entryName), references)) {
      throw new DOMException("Started elsewhere", "NetworkError");
    }
  } catch (error) {
    await unmarkStarted(dir, entryName, attempt);
    throw error;
  }
  return attempt;
}

/** Removes an attempt's own started marker; no other attempt removes it. */
async function unmarkStarted(dir: string, entryName: string, attempt: string) {
  try {
    const entry = await getEntryDir(dir, entryName);
    await entry?.removeEntry(`${STARTED_FILE}-${attempt}`);
  } catch (error) {
    if ((error as Error)?.name === "NotFoundError") return;
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
 * upload may have reached FileFn, then removing it from the upload log so a
 * later restore stages it again, each only while the records are still the
 * owner's at the authority, checked in the same step. A file a restore holds
 * by then (see isHeldNow) stays queued.
 */
async function removeAccountEntry(
  pass: ReplayPass,
  references: QueuedFileReferences,
  fileId: string,
  isDiscarded: boolean
): Promise<EntryOutcome> {
  if (await isHeldNow(pass.dir, fileId)) return "done";
  if (isDiscarded) {
    if (!references.isCurrent()) return "stop";
    await references.discard(fileId);
    await logUpload(pass.dir, fileId);
    if (await isHeldNow(pass.dir, fileId)) return "done";
  }
  if (!references.isCurrent()) return "stop";
  await dequeueFile(pass.dir, fileId);
  return "done";
}

/**
 * Uploads a queued file; for an account's queue, records the upload in the
 * upload log and marks the file uploaded, its thumbnail left to the caller
 * (see sendAccountThumbnail), and otherwise sends the thumbnail too.
 */
async function uploadEntry(
  pass: ReplayPass,
  pending: PendingUpload & { fileId: string },
  mark?: StartMark
) {
  pass.isSynced = false;
  const { client, references } = pass.request;
  const entryName = pending.uploadSessionId;
  const result = await uploadQueuedFile(client, pass.store, pending, mark);
  if (!references) {
    await uploadQueuedThumbnail(client, pass.dir, entryName, result);
    return result;
  }
  await logUpload(pass.dir, pending.fileId, result.versionId);
  await markAccountEntryUploaded(pass.dir, entryName, result);
  return result;
}

/**
 * Sends the thumbnail of an account's file whose original uploaded, unless
 * it is marked sent, then marks it sent (see THUMBNAIL_SENT_FILE); resolves
 * false when it is to be sent again on a retry.
 */
async function sendAccountThumbnail(
  { dir, request }: ReplayPass,
  entryName: string,
  uploaded: UploadResult
) {
  if (await hasEntryFile(dir, entryName, THUMBNAIL_SENT_FILE)) return true;
  if (
    !(await uploadQueuedThumbnail(
      request.client,
      dir,
      entryName,
      uploaded,
      true
    ))
  ) {
    return false;
  }
  await writeEntryFile(dir, entryName, THUMBNAIL_SENT_FILE, "").catch(
    (error: unknown) => {
      logger.warn({ at: "fileQueue.replay.thumbnail", entryName, error });
    }
  );
  return true;
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
 * Marks a file started at its owner's authority with the attempt's own marker
 * before the request, sent only while `isReady` (same step); an attempt whose
 * client sent no request undoes its marker, identified by the `write` result.
 */
type StartMark = {
  write(): Promise<string>;
  isReady(): boolean;
  undo(attempt: string): Promise<void>;
};

let isOfflineModeOn = (): boolean => false;

/** Sets how isAppOffline reads offline mode, so the queue imports no store. */
export function readOfflineModeWith(read: () => boolean) {
  isOfflineModeOn = read;
}

/** True while the device has no network or the app's offline mode is on. */
export function isAppOffline(): boolean {
  const isNetworkOffline = globalThis.navigator?.onLine === false;
  return isNetworkOffline || isOfflineModeOn();
}

/** Throws while the app is offline or the attempt is no longer ready. */
function assertSendable(mark?: StartMark) {
  if (isAppOffline() || mark?.isReady() === false) {
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
  const key = `${pending.uploadSessionId}:${pending.retryCount}`;
  const sent = sentRequests.get(client);
  const countSent = () => sent && (sent.get(key) ?? 0) + (sent.get("*") ?? 0);
  const sentBefore = countSent();
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
        idempotencyKey: key
      })
      .done();
  } catch (error) {
    const isUnsent = !isSending || (sent && countSent() === sentBefore);
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
 * Uploads a queued thumbnail, resolving whether it is done with. One that
 * cannot be read is logged and left out, as is one whose upload fails,
 * unless `isRetried`: then only one FileFn rejects for good is left out, and
 * any other failure resolves false, for a retry to send it again.
 */
async function uploadQueuedThumbnail(
  client: FileFnClient,
  dir: string,
  entryName: string,
  uploaded: UploadResult,
  isRetried = false
): Promise<boolean> {
  let thumbnail: Blob | undefined;
  try {
    const entry = await getEntryDir(dir, entryName);
    thumbnail = entry ? await readThumbnail(entry) : undefined;
    if (!thumbnail) return true;
    await client.uploadArtifact({
      fileId: uploaded.fileId,
      versionId: uploaded.versionId,
      kind: DEVICE_THUMBNAIL_KIND,
      data: thumbnail,
      mimeType: thumbnail.type
    });
    return true;
  } catch (error) {
    logger.warn({
      at: "fileQueue.replay.thumbnail",
      fileId: uploaded.fileId,
      error
    });
    return !thumbnail || !isRetried || isRejectedForGood(error);
  }
}

/**
 * Whether FileFn rejected a request in a way a retry does not change: not an
 * authorization failure, which renewed credentials may change.
 */
function isRejectedForGood(error: unknown) {
  if (!(error instanceof FileFnHttpError)) return false;
  const { status } = error;
  return (
    status >= 400 && status < 500 && ![401, 403, 408, 429].includes(status)
  );
}
