import { datafn } from "@nucleum/datafn/datafn.store";
import type { DatafnImportResult } from "@nucleum/datafn/datafn.type";
import {
  exportQueuedFiles,
  importQueuedFiles,
  listQueuedFileIds,
  resolveAccountFileQueueDir,
  type QueuedFileCopy
} from "@nucleum/shared-state/files/file-queue";
import { uploadQueuedFiles } from "@nucleum/shared-state/files/filefn-client";
import { parse, stringify } from "@21n/shared-utils/json.utils";

/**
 * Backup and restore of the device's DataFn records, together with the files
 * of the account's upload queue that have not reached FileFn yet: an offline
 * capture keeps its bytes only in that queue, so a backup of the records
 * alone would lose them. Files already in FileFn are not copied.
 */

const FILE_QUEUE_VERSION = 1;

/** A queued file in a backup, its bytes as base64. */
type QueuedFileBackup = Omit<QueuedFileCopy, "data" | "thumbnail"> & {
  data: string;
  thumbnail?: { type: string; data: string };
};

/**
 * The account upload queue a backup carries, next to the DataFn export: the
 * account the files are captured under and the files. DataFn import reads
 * only its own keys, so older versions restore the records and ignore it.
 */
type FileQueueBackup = {
  version: number;
  userId: string;
  files: QueuedFileBackup[];
};

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
  const fileQueue: FileQueueBackup | undefined =
    userId && files.length
      ? {
          version: FILE_QUEUE_VERSION,
          userId,
          files: files.map(toBackupFile)
        }
      : undefined;
  const backup = fileQueue ? { ...data, fileQueue } : data;
  return new Blob([stringify(backup, { isPreventReplacer: true })], {
    type: "application/json"
  });
}

/**
 * Restores a backup: the DataFn records first, then the queued files into the
 * queue of the account they were captured under, so a replay never finds a
 * restored file without its record. Only that account uploads them; another
 * account's restore keeps them in that queue. Files the queue held when the
 * restore started stay as they are. The signed-in account's queue then
 * replays. Rejects, restoring nothing, when the backup's queued files cannot
 * be read, and once restored when the records could not all be.
 */
export async function restoreBackup(
  text: string,
  options: { triggerCloneUp: boolean }
): Promise<void> {
  if (!text) throw new Error("Backup file is empty");
  const backup = parse(text) as Record<string, unknown>;
  const fileQueue = readFileQueue(backup.fileQueue);
  const dir = fileQueue && resolveAccountFileQueueDir(fileQueue.userId);
  const held = dir ? await listQueuedFileIds(dir) : new Set<string>();
  const result = (await datafn.importData(backup, {
    triggerCloneUp: options.triggerCloneUp
  })) as DatafnImportResult;
  if (fileQueue && dir) {
    const added = await importQueuedFiles(dir, fileQueue.files, held);
    if (added > 0) await uploadQueuedFiles();
  }
  const skipped = [
    ...Object.values(result?.stats?.resources ?? {}),
    ...Object.values(result?.stats?.joins ?? {})
  ].reduce((total, stats) => total + (stats.skipped ?? 0), 0);
  if (result?.ok !== true || skipped > 0) {
    throw new Error(result?.errors?.[0]?.message ?? "DataFn restore failed");
  }
}

/**
 * Reads the queued files of a backup, before anything is restored, so an
 * unreadable one fails the restore; undefined for a backup without them.
 */
function readFileQueue(
  value: unknown
): { userId: string; files: QueuedFileCopy[] } | undefined {
  if (value === undefined) return undefined;
  const backup = value as Partial<FileQueueBackup> | null;
  if (
    backup?.version !== FILE_QUEUE_VERSION ||
    typeof backup.userId !== "string" ||
    !backup.userId ||
    !Array.isArray(backup.files)
  ) {
    throw new Error("The backup's pending files cannot be read");
  }
  return { userId: backup.userId, files: backup.files.map(fromBackupFile) };
}

function toBackupFile(copy: QueuedFileCopy): QueuedFileBackup {
  return {
    ...copy,
    data: toBase64(copy.data),
    thumbnail: copy.thumbnail && {
      type: copy.thumbnail.type,
      data: toBase64(copy.thumbnail.data)
    }
  };
}

function fromBackupFile(file: QueuedFileBackup): QueuedFileCopy {
  if (
    typeof file?.fileId !== "string" ||
    typeof file.data !== "string" ||
    !Array.isArray(file.started)
  ) {
    throw new Error("The backup's pending files cannot be read");
  }
  return {
    ...file,
    data: fromBase64(file.data),
    thumbnail: file.thumbnail && {
      type: file.thumbnail.type,
      data: fromBase64(file.thumbnail.data)
    }
  };
}

const BASE64_CHUNK = 0x8000;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let start = 0; start < bytes.length; start += BASE64_CHUNK) {
    binary += String.fromCharCode(
      ...bytes.subarray(start, start + BASE64_CHUNK)
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
