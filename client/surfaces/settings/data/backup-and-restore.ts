import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import type { DatafnImportResult } from "@nucleum/datafn/datafn.type";
import {
  exportQueuedFiles,
  isFileQueueSupported,
  LOCAL_FILE_QUEUE_DIR,
  renewRestoredFiles,
  resolveAccountFileQueueDir,
  restoreLocalQueuedFiles,
  settleRestoredFiles,
  stageRestoredFiles,
  toRecordsView,
  unstageRestoredFiles,
  type QueuedFileCopy
} from "@nucleum/shared-state/files/file-queue";
import { get } from "svelte/store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  captureFileQueueClaim,
  captureSettledFileFnOwner,
  uploadQueuedFiles
} from "@nucleum/shared-state/files/filefn-client";
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
 * The index of the upload queue a backup carries: the account the files are
 * captured under (null for a guest backup's held local files, see
 * withLocalFileBytes), the files, and the length of the base64 string.
 */
type FileQueueIndex = {
  version: number;
  userId: string | null;
  size: number;
  files: QueuedFileIndex[];
};

type QueuedFilesBackup = { userId: string | null; files: QueuedFileCopy[] };

/** Returns the account whose records DataFn holds, or null for the guest. */
function resolveNamespaceUserId(): string | null {
  const namespace = datafn.currentNamespace();
  return namespace?.startsWith("user:")
    ? namespace.slice("user:".length) || null
    : null;
}

/**
 * Creates a backup of the DataFn records and of the files the account they
 * belong to still holds in its upload queue, the records exported under the
 * queue's lock that the copy of the files holds, so no replay removes a
 * file the records reference between the two (see exportQueuedFiles). A
 * queued file that cannot be read rejects, as does a backup during which
 * DataFn switched to another account's records, even one switched back,
 * so a backup never carries one account's records with another's files. A
 * guest backup leaves out a local file of another guest namespace that
 * cannot be read and that none of its records references.
 */
export async function createBackupBlob(): Promise<Blob> {
  const namespace = datafn.currentNamespace();
  const userId = resolveNamespaceUserId();
  const runtime = watchRuntime();
  const exportRecords = async () =>
    (await datafn.exportData()) as Record<string, unknown>;
  let exported: { records: Record<string, unknown>; files: QueuedFileCopy[] };
  try {
    exported = userId
      ? await exportQueuedFiles(
          resolveAccountFileQueueDir(userId),
          exportRecords
        )
      : namespace?.startsWith("guest:")
        ? withLocalFileBytes(
            await exportQueuedFiles(
              LOCAL_FILE_QUEUE_DIR,
              exportRecords,
              true,
              (fileId, { namespace: owner }, records) =>
                owner !== namespace &&
                !listFileRecords(records).some((r) => r.fileId === fileId)
            ),
            namespace
          )
        : { records: await exportRecords(), files: [] };
  } finally {
    runtime.stop();
  }
  const { records: data, files } = exported;
  if (runtime.isSwitched() || datafn.currentNamespace() !== namespace) {
    throw new Error("The account changed while the backup was made");
  }
  const records = stringify(data, { isPreventReplacer: true });
  const parts = files.length
    ? toBackupParts(records, { userId, files })
    : [records];
  return new Blob(parts, { type: "application/json" });
}

function listFileRecords(records: Record<string, unknown>) {
  const resources = records.resources as Record<string, unknown> | undefined;
  const found = Array.isArray(resources?.file) ? resources.file : [];
  return found as Record<string, unknown>[];
}

/**
 * Puts the bytes of each local file a guest record references into that
 * record, and keeps every other local file that has not reached its account
 * (no uploaded mark: one claimed, whose guest record was deleted, or one of
 * a guest namespace that never starts again) as a held file of the backup,
 * with its record copy and marks, restored still held (see
 * restoreLocalQueuedFiles). One of the backed-up namespace `namespace`
 * whose record is gone is marked deleted, if no mark tells that yet (its
 * guest change may not be copied yet), so it never publishes its copy.
 */
function withLocalFileBytes(
  exported: { records: Record<string, unknown>; files: QueuedFileCopy[] },
  namespace: string
) {
  const copies = new Map(exported.files.map((copy) => [copy.fileId, copy]));
  const inlined = new Set<string>();
  for (const record of listFileRecords(exported.records)) {
    const copy = copies.get(record.fileId as string);
    if (!copy) continue;
    inlined.add(copy.fileId);
    delete record.fileId;
    record.data = copy.data;
    record.size = copy.data.length;
    if (copy.thumbnail) record.thumbnailData = copy.thumbnail.data;
  }
  const files = exported.files.filter(
    ({ fileId, marks = [] }) =>
      !inlined.has(fileId) && !marks.some(({ name }) => name === "uploaded")
  );
  for (const copy of files) {
    const marks = (copy.marks ??= []);
    const isGone = !marks.some((m) => ["deleted", "orphaned"].includes(m.name));
    if (copy.record?.namespace === namespace && isGone)
      marks.push({ name: "deleted", text: "" });
  }
  return { records: exported.records, files };
}

/**
 * Restores a backup. Its queued files are first put in the queue of the
 * account they were captured under, each published only once fully written
 * and held by this restore until it settles (see stageRestoredFiles); then
 * the records are imported; then, when the signed-in account is that
 * account, the queue replays. A file this restore wrote stays held for its
 * account, never uploaded, removed or discarded, until the account adopts
 * it once a record of the account references it: this restore adopts the
 * files its imported records reference when the account is its own (also
 * after an import that saved its records only in part), and the account's
 * replay adopts any other once it finds its record, also after a restore
 * into another account or the guest; meanwhile the account's backups carry
 * it. A file the queue holds complete, or one an earlier restore wrote that
 * no account adopted yet, is not written again (a restore into its own
 * account holds a complete one, so no replay removes it before the records
 * are imported), and one whose upload the account's replay completed (in
 * any tab, before or while the restore runs) is not staged again. Once the
 * restore settles, it holds no file any more (see settleRestoredFiles), so
 * deleting the record of a file it adopted later removes the file as for
 * any other. Rejects, restoring nothing, when the backup or its queued
 * files cannot be read, this device cannot keep them, a file cannot be
 * written, or the account changes before the records are imported (rolling
 * back the files it wrote that no other restore holds and no account
 * adopted; see unstageRestoredFiles); and when the records could not all be
 * imported, keeping the files. A guest backup's held local files are
 * written back first, still held, and kept (see restoreLocalQueuedFiles).
 * `triggerCloneUp` decides, right before the
 * records are imported into the account checked unchanged, whether DataFn
 * clones them up.
 */
export async function restoreBackup(
  file: Blob,
  options: { triggerCloneUp: () => boolean }
): Promise<void> {
  const runtime = watchRuntime();
  try {
    await restoreInRuntime(file, options, runtime.isSwitched);
  } finally {
    runtime.stop();
  }
}

/**
 * Watches DataFn's runtime until stopped: `isSwitched` tells whether it was
 * replaced meanwhile (another account, or the same account in another
 * storage or sync mode, even one switched back).
 */
function watchRuntime() {
  let switches = -1;
  const stop = datafnRuntime.subscribe(() => switches++);
  return { isSwitched: () => switches > 0, stop };
}

/**
 * Restores a backup (see restoreBackup) into the DataFn runtime it started
 * in, treating a runtime replaced meanwhile (`isSwitched`) as a changed
 * account.
 */
async function restoreInRuntime(
  file: Blob,
  options: { triggerCloneUp: () => boolean },
  isSwitched: () => boolean
) {
  if (!file.size) throw new Error("Backup file is empty");
  const namespace = datafn.currentNamespace();
  const userId = resolveNamespaceUserId();
  const runtime = get(datafnRuntime);
  const view = toRecordsView(runtime);
  const { records, fileQueue: read } = await readBackup(file);
  if (read?.files.length && !isFileQueueSupported()) {
    throw new Error("This device cannot keep the backup's pending files");
  }
  if (read?.userId === null) await restoreLocalQueuedFiles(read.files);
  const fileQueue = read?.userId
    ? { userId: read.userId, files: read.files }
    : undefined;
  const authority = fileQueue?.files.length
    ? await resolveRecordsAuthority(userId, runtime?.remoteUrl)
    : undefined;
  const isOwnAccount = Boolean(fileQueue) && userId === fileQueue?.userId;
  const staged =
    fileQueue &&
    (await stageRestoredFiles(
      resolveAccountFileQueueDir(fileQueue.userId),
      fileQueue.files,
      { isOwnAccount, account: userId, view, authority }
    ));
  const isChanged = () =>
    datafn.currentNamespace() !== namespace || isSwitched();
  if (staged && !isChanged()) {
    await renewRestoredFiles(staged).catch(async (error: unknown) => {
      await unstageRestoredFiles(staged);
      throw error;
    });
  }
  if (isChanged()) {
    if (staged) await unstageRestoredFiles(staged);
    throw new Error("The account changed while the backup was restored");
  }
  let isImported = false;
  try {
    await importRecords(records, options.triggerCloneUp);
    isImported = true;
  } finally {
    if (staged) {
      const isReferenced = (fileId: string) =>
        isReferencedIn(namespace, isSwitched, fileId);
      await settleRestoredFiles(
        staged,
        isOwnAccount ? isReferenced : undefined,
        async (fileId) => isImported || isReferenced(fileId)
      );
    }
  }
  if (isOwnAccount) await uploadQueuedFiles();
}

/**
 * Returns the FileFn authority of the account whose records the restore
 * imports, when the DataFn authority they sync with (`remoteUrl`) is that
 * same authority, else undefined (also when it cannot be read), so a
 * restore's protection of a file names only the authority its records sync
 * with (see stageRestoredFiles); it is still reconciled in its own DataFn
 * scope only.
 */
async function resolveRecordsAuthority(
  userId: string | null,
  remoteUrl: string | null | undefined
) {
  try {
    const owner = await captureSettledFileFnOwner();
    if (!owner || owner.userId !== userId) return undefined;
    const claim = await captureFileQueueClaim(owner);
    const base = claim?.baseUrl.replace(/\/files\/?$/, "");
    return base && remoteUrl?.replace(/\/datafn\/?$/, "") === base
      ? claim?.baseUrl
      : undefined;
  } catch (error) {
    logger.warn({ at: "backup.restore.authority", error });
    return undefined;
  }
}

/**
 * Whether a record of the namespace's account references a file, or
 * undefined once the namespace or the runtime changed (`isSwitched`) or the
 * records cannot be read.
 */
async function isReferencedIn(
  namespace: ReturnType<typeof datafn.currentNamespace>,
  isSwitched: () => boolean,
  fileId: string
) {
  const isChanged = () =>
    datafn.currentNamespace() !== namespace || isSwitched();
  if (isChanged()) return undefined;
  const result = await datafn.file.query({
    filters: { fileId },
    limit: 1,
    metadata: {
      includeTrashed: true,
      includeArchived: true,
      includeAncestorInactive: true
    }
  });
  if (isChanged()) return undefined;
  return Array.isArray(result.data) ? result.data.length > 0 : undefined;
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
    (index.userId !== null &&
      (typeof index.userId !== "string" || !index.userId)) ||
    !Number.isSafeInteger(size) ||
    !Array.isArray(index.files) ||
    !index.files.every(
      (entry) =>
        typeof entry?.fileId === "string" &&
        Array.isArray(entry.started) &&
        (entry.uploadedVersionId === undefined ||
          typeof entry.uploadedVersionId === "string") &&
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
