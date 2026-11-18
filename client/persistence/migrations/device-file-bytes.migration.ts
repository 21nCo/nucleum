import { FallbackTracker } from "@nucleum/persistence/migrations/fallback-tracker";
import { requirePersistenceLogger } from "@nucleum/persistence/logging-host";

/** Name the migration is tracked under, once per DataFn namespace. */
export const DEVICE_FILE_BYTES_MIGRATION = "device-file-bytes-to-opfs";

const MIGRATION_LOCK_PREFIX = "nucleum-device-file-bytes-migration";

/** A `file` record as the migration reads it. */
export type DeviceFileBytesRecord = {
  id: string;
  fileId?: string | null;
  data?: unknown;
  thumbnailData?: unknown;
};

/** Storage the migration moves a namespace's file bytes between. */
export type DeviceFileBytesMigrationHost = {
  /** DataFn namespace whose records move; the migration runs once per one. */
  namespace: string;
  /** IDs of the namespace's `file` records. */
  listRecordIds(): Promise<string[]>;
  readRecord(id: string): Promise<DeviceFileBytesRecord | undefined>;
  /**
   * Keeps the record's bytes and thumbnail in the FileFn OPFS queue under
   * `fileId`, replacing what an interrupted run kept there.
   */
  stage(record: DeviceFileBytesRecord, fileId: string): Promise<void>;
  /** Saves the record with `fileId` and without its bytes. */
  commit(record: DeviceFileBytesRecord, fileId: string): Promise<void>;
  /** Removes a file the migration kept but no record references. */
  unstage(fileId: string): Promise<void>;
};

/**
 * True for a record that keeps its original's bytes. A record with only a
 * thumbnail on the device keeps its stored URL, and is left alone.
 */
function hasBytes(record: DeviceFileBytesRecord) {
  return Boolean(record.data);
}

/**
 * Returns the FileFn `fileId` a record's bytes move under, derived from its
 * namespace and record ID, so a run resumed after an interruption, or another
 * tab or device migrating the same synced record, stages and uploads the
 * same file instead of another one.
 */
export async function deriveDeviceFileId(
  namespace: string,
  recordId: string
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${namespace}\n${recordId}`)
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return `file_m${hex.slice(0, 40)}`;
}

/**
 * Moves the bytes of a namespace's `file` records (`data` and
 * `thumbnailData`, written before files were kept in the FileFn OPFS queue)
 * into the queue, once. Each record is staged first and then saved with its
 * `fileId` and without bytes, so a run interrupted at any point leaves every
 * record either untouched or moved, and the next run stages an untouched
 * record again under the same `fileId`. A record whose save fails has its
 * staged file removed and stays as it was. The namespace is marked done only
 * when every record moved; until then the migration runs again at the next
 * start. Tabs run it one at a time through a Web Lock when the browser has
 * one. Returns how many records moved and failed.
 */
export async function migrateDeviceFileBytes(
  host: DeviceFileBytesMigrationHost
): Promise<{ moved: number; failed: number }> {
  const run = () => runMigration(host);
  const locks: LockManager | undefined = globalThis.navigator?.locks;
  if (!locks) return run();
  return locks.request(`${MIGRATION_LOCK_PREFIX}:${host.namespace}`, run);
}

async function runMigration(host: DeviceFileBytesMigrationHost) {
  const name = `${DEVICE_FILE_BYTES_MIGRATION}:${host.namespace}`;
  const result = { moved: 0, failed: 0 };
  if (await FallbackTracker.hasRun(name)) return result;
  const logger = requirePersistenceLogger();
  for (const id of await host.listRecordIds()) {
    const record = await host.readRecord(id);
    if (!record || record.fileId || !hasBytes(record)) continue;
    const fileId = await deriveDeviceFileId(host.namespace, record.id);
    try {
      await host.stage(record, fileId);
      await host.commit(record, fileId);
      result.moved += 1;
    } catch (error) {
      result.failed += 1;
      logger.error(
        { at: "migrateDeviceFileBytes", id: record.id, fileId },
        error
      );
      await unstageUnreferenced(host, record.id, fileId);
    }
  }
  if (result.failed === 0) await FallbackTracker.markAsRun(name);
  logger.info({
    at: "migrateDeviceFileBytes",
    namespace: host.namespace,
    ...result
  });
  return result;
}

/**
 * Removes a staged file after a failed move, unless the record turns out to
 * reference it after all; a record that cannot be read keeps the file, so
 * bytes are never removed while a record may point at them.
 */
async function unstageUnreferenced(
  host: DeviceFileBytesMigrationHost,
  recordId: string,
  fileId: string
) {
  const logger = requirePersistenceLogger();
  try {
    const current = await host.readRecord(recordId);
    if (current?.fileId === fileId) return;
    await host.unstage(fileId);
  } catch (error) {
    logger.error({ at: "migrateDeviceFileBytes.unstage", fileId }, error);
  }
}
