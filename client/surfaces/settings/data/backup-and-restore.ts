import { datafn } from "@nucleum/datafn/datafn.store";
import type { DatafnImportResult } from "@nucleum/datafn/datafn.type";
import {
  activateRestoredFiles,
  exportQueuedFiles,
  isFileQueueSupported,
  readQueueUploadCount,
  resolveAccountFileQueueDir,
  stageRestoredFiles,
  unstageRestoredFiles,
  type QueuedFileCopy
} from "@nucleum/shared-state/files/file-queue";
import { uploadQueuedFiles } from "@nucleum/shared-state/files/filefn-client";
import { parse, stringify } from "@21n/shared-utils/json.utils";

/**
 * Backup and restore of the device's DataFn records, together with the files
 * of the account's upload queue that have not reached FileFn yet: an offline
 * capture keeps its bytes only in that queue, so a backup of the records
 * alone would lose them. Files already in FileFn are not copied.
 *
 * A backup without queued files is the DataFn export as JSON, as before. One
 * with queued files is still one JSON object, written and read in parts so
 * no file's bytes, nor all of them together, are ever one string:
 * `{"fileQueue":<index>,"fileQueueBytes":"<base64>",<the DataFn export>}`.
 * The index lists the files and, for each original and thumbnail, the range
 * of the base64 string that holds its bytes, encoded on its own.
 */

const FILE_QUEUE_VERSION = 1;
const QUEUE_HEAD = '{"fileQueue":';
const BYTES_HEAD = ',"fileQueueBytes":"';
/** The bytes encoded at a time, a multiple of 3 so the parts join. */
const BYTES_CHUNK = 3 * 2 ** 20;
/** The base64 characters decoded at a time (BYTES_CHUNK encoded). */
const BASE64_CHUNK = (BYTES_CHUNK / 3) * 4;
/** The bytes searched at a time for the end of the index. */
const SCAN_CHUNK = 2 ** 16;

/** The range of a backup's base64 string that holds some bytes. */
type ByteRange = [start: number, end: number];

/** A queued file in a backup's index. */
type QueuedFileIndex = Omit<QueuedFileCopy, "data" | "thumbnail"> & {
  data: ByteRange;
  thumbnail?: { type: string; data: ByteRange };
};

/**
 * The index of the account upload queue a backup carries: the account the
 * files are captured under, the files, and the length of the base64 string.
 */
type FileQueueIndex = {
  version: number;
  userId: string;
  size: number;
  files: QueuedFileIndex[];
};

type QueuedFilesBackup = { userId: string; files: QueuedFileCopy[] };

/** Returns the account whose records DataFn holds, or null for the guest. */
function resolveNamespaceUserId(): string | null {
  const namespace = datafn.currentNamespace();
  return namespace?.startsWith("user:")
    ? namespace.slice("user:".length) || null
    : null;
}

/**
 * Creates a backup of the DataFn records and of the files the account they
 * belong to still holds in its upload queue.
 */
export async function createBackupBlob(): Promise<Blob> {
  const namespace = datafn.currentNamespace();
  const userId = resolveNamespaceUserId();
  const data = (await datafn.exportData()) as Record<string, unknown>;
  const files = userId
    ? await exportQueuedFiles(resolveAccountFileQueueDir(userId))
    : [];
  if (datafn.currentNamespace() !== namespace) {
    throw new Error("The account changed while the backup was made");
  }
  const records = stringify(data, { isPreventReplacer: true });
  const parts =
    userId && files.length
      ? toBackupParts(records, { userId, files })
      : [records];
  return new Blob(parts, { type: "application/json" });
}

/**
 * Restores a backup. Its queued files are first put in the queue of the
 * account they were captured under, marked restored so no replay acts on
 * them (see stageRestoredFiles); then the records are imported; then, when
 * the signed-in account is that account, the files are handed to its
 * replay with the marks the backup held, and the queue replays. Should the
 * restore stop or fail after the records are imported (even in part), the
 * account's replay takes over each such file once a record of the account
 * references it, and the account's backups carry it meanwhile. Another
 * account's (or the guest's) restore leaves them marked restored, without
 * the marks that bind an upload to the capturing account, so they stay in
 * that queue, never uploaded, removed or discarded, until that account
 * restores the backup. A file the queue holds complete and unmarked, one an
 * earlier restore into the account wrote and has not handed over (which a
 * restore into the account hands over), or one whose upload completes while
 * the restore waits for the queue, stays as it is. Rejects, restoring nothing, when the backup or its queued files cannot
 * be read, this device cannot keep them, a file cannot be written, or the
 * account changes before the records are imported (removing the files it
 * added); and when the records could not all be imported, keeping the
 * files. `triggerCloneUp` decides, right before the records are imported
 * into the account checked unchanged, whether DataFn clones them up.
 */
export async function restoreBackup(
  file: Blob,
  options: { triggerCloneUp: () => boolean }
): Promise<void> {
  const uploadCount = readQueueUploadCount();
  if (!file.size) throw new Error("Backup file is empty");
  const namespace = datafn.currentNamespace();
  const userId = resolveNamespaceUserId();
  const { records, fileQueue } = await readBackup(file);
  if (fileQueue?.files.length && !isFileQueueSupported()) {
    throw new Error("This device cannot keep the backup's pending files");
  }
  const isOwnAccount = Boolean(fileQueue) && userId === fileQueue?.userId;
  const staged =
    fileQueue &&
    (await stageRestoredFiles(
      resolveAccountFileQueueDir(fileQueue.userId),
      fileQueue.files,
      { isOwnAccount, uploadCount }
    ));
  if (datafn.currentNamespace() !== namespace) {
    if (staged) await unstageRestoredFiles(staged);
    throw new Error("The account changed while the backup was restored");
  }
  await importRecords(records, options.triggerCloneUp);
  if (!staged || !isOwnAccount) return;
  if (staged.fileIds.length) await activateRestoredFiles(staged);
  await uploadQueuedFiles();
}

/**
 * Imports a backup's records, rejecting when they could not all be
 * imported.
 */
async function importRecords(
  records: Record<string, unknown>,
  triggerCloneUp: () => boolean
) {
  const result = (await datafn.importData(records, {
    triggerCloneUp: triggerCloneUp()
  })) as DatafnImportResult;
  const skipped = [
    ...Object.values(result?.stats?.resources ?? {}),
    ...Object.values(result?.stats?.joins ?? {})
  ].reduce((total, stats) => total + (stats.skipped ?? 0), 0);
  if (result?.ok !== true || skipped > 0) {
    throw new Error(result?.errors?.[0]?.message ?? "DataFn restore failed");
  }
}

/** The parts of a backup with queued files (see the module comment). */
function toBackupParts(records: string, queue: QueuedFilesBackup) {
  if (!records.startsWith("{")) throw new Error("DataFn export is invalid");
  const bytes: string[] = [];
  let size = 0;
  const place = (data: Uint8Array): ByteRange => {
    const start = size;
    for (let at = 0; at < data.byteLength; at += BYTES_CHUNK) {
      const part = toBase64(data.subarray(at, at + BYTES_CHUNK));
      bytes.push(part);
      size += part.length;
    }
    return [start, size];
  };
  const files = queue.files.map((copy): QueuedFileIndex => ({
    ...copy,
    data: place(copy.data),
    thumbnail: copy.thumbnail && {
      type: copy.thumbnail.type,
      data: place(copy.thumbnail.data)
    }
  }));
  const index: FileQueueIndex = {
    version: FILE_QUEUE_VERSION,
    userId: queue.userId,
    size,
    files
  };
  const rest = records === "{}" ? "}" : `,${records.slice(1)}`;
  return [QUEUE_HEAD, JSON.stringify(index), BYTES_HEAD, ...bytes, `"${rest}`];
}

/**
 * Reads a backup's records and queued files, decoding every file before
 * anything is restored, so a backup that cannot be read restores nothing.
 */
async function readBackup(file: Blob): Promise<{
  records: Record<string, unknown>;
  fileQueue?: QueuedFilesBackup;
}> {
  const head = await file.slice(0, QUEUE_HEAD.length).text();
  if (head !== QUEUE_HEAD) {
    const records = parse(await file.text()) as Record<string, unknown>;
    if (records && typeof records === "object" && "fileQueue" in records) {
      throw unreadable();
    }
    return { records };
  }
  const indexEnd = await findIndexEnd(file);
  const index = readIndex(await file.slice(QUEUE_HEAD.length, indexEnd).text());
  const bytesStart = indexEnd + BYTES_HEAD.length;
  const tail = await file.slice(bytesStart + index.size).text();
  if (!tail.startsWith('"')) throw unreadable();
  const rest = tail.slice(1);
  if (rest !== "}" && !rest.startsWith(",")) throw unreadable();
  const records = (rest === "}" ? {} : parse(`{${rest.slice(1)}`)) as Record<
    string,
    unknown
  >;
  const files: QueuedFileCopy[] = [];
  for (const entry of index.files) {
    files.push({
      ...entry,
      data: await readBytes(file, bytesStart, entry.data),
      thumbnail: entry.thumbnail && {
        type: entry.thumbnail.type,
        data: await readBytes(file, bytesStart, entry.thumbnail.data)
      }
    });
  }
  return { records, fileQueue: { userId: index.userId, files } };
}

function unreadable() {
  return new Error("The backup's pending files cannot be read");
}

/** Finds where a backup's index ends: the first BYTES_HEAD after it. */
async function findIndexEnd(file: Blob): Promise<number> {
  const needle = new TextEncoder().encode(BYTES_HEAD);
  const step = SCAN_CHUNK - needle.length + 1;
  for (let at = QUEUE_HEAD.length; at < file.size; at += step) {
    const bytes = new Uint8Array(
      await file.slice(at, at + SCAN_CHUNK).arrayBuffer()
    );
    const found = indexOfBytes(bytes, needle);
    if (found >= 0) return at + found;
  }
  throw unreadable();
}

function indexOfBytes(bytes: Uint8Array, needle: Uint8Array) {
  const first = needle[0];
  for (
    let at = bytes.indexOf(first);
    at >= 0;
    at = bytes.indexOf(first, at + 1)
  ) {
    if (at + needle.length > bytes.length) return -1;
    if (needle.every((byte, offset) => bytes[at + offset] === byte)) return at;
  }
  return -1;
}

function readIndex(text: string): FileQueueIndex {
  let index: Partial<FileQueueIndex> | null;
  try {
    index = JSON.parse(text) as Partial<FileQueueIndex> | null;
  } catch {
    throw unreadable();
  }
  const size = index?.size;
  const isRange = (range: unknown) =>
    Array.isArray(range) &&
    range.length === 2 &&
    range.every(Number.isSafeInteger) &&
    0 <= range[0] &&
    range[0] <= range[1] &&
    range[1] <= (size as number) &&
    (range[1] - range[0]) % 4 === 0;
  if (
    index?.version !== FILE_QUEUE_VERSION ||
    typeof index.userId !== "string" ||
    !index.userId ||
    !Number.isSafeInteger(size) ||
    !Array.isArray(index.files) ||
    !index.files.every(
      (entry) =>
        typeof entry?.fileId === "string" &&
        Array.isArray(entry.started) &&
        isRange(entry.data) &&
        (entry.thumbnail === undefined ||
          (typeof entry.thumbnail?.type === "string" &&
            isRange(entry.thumbnail.data)))
    )
  ) {
    throw unreadable();
  }
  return index as FileQueueIndex;
}

/** Decodes the bytes a range of a backup's base64 string holds, by parts. */
async function readBytes(
  file: Blob,
  bytesStart: number,
  [start, end]: ByteRange
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  let length = 0;
  for (let at = start; at < end; at += BASE64_CHUNK) {
    const text = await file
      .slice(bytesStart + at, bytesStart + Math.min(end, at + BASE64_CHUNK))
      .text();
    let part: Uint8Array;
    try {
      part = fromBase64(text);
    } catch {
      throw unreadable();
    }
    parts.push(part);
    length += part.byteLength;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

const BINARY_CHUNK = 0x8000;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += BINARY_CHUNK) {
    binary += String.fromCharCode(
      ...bytes.subarray(start, start + BINARY_CHUNK)
    );
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
