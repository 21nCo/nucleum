import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  migrateDeviceFileBytes,
  type DeviceFileBytesMigrationHost,
  type DeviceFileBytesRecord
} from "@nucleum/persistence/migrations/device-file-bytes.migration";
import {
  dequeueFile,
  enqueueFile,
  hasQueuedFiles,
  isFileQueueSupported,
  LOCAL_FILE_QUEUE_DIR
} from "@nucleum/shared-state/files/file-queue";
import {
  resolveFileQueueDirs,
  uploadQueuedFiles
} from "@nucleum/shared-state/files/filefn-client";
import account from "@nucleum/client/runtime/account/account.store";

/** A `file` record with bytes on the device, as written before TIDY-544. */
type DeviceFileRecord = DeviceFileBytesRecord & {
  name?: string;
  label?: string;
  type?: string;
};

/**
 * Returns the FileFn OPFS queue a DataFn namespace's record bytes move to:
 * the device's local queue for a local-only user's (guest) data, or null for
 * an account's data. An account's records with bytes have synced them to the
 * account, so moving them to one device before they upload could leave that
 * device with the only copy; they move with the existing production files in
 * the production cutover (TIDY-554).
 */
export function resolveMigrationQueueDir(namespace: string): string | null {
  return namespace.startsWith("guest:") ? LOCAL_FILE_QUEUE_DIR : null;
}

/**
 * Reads bytes stored on a record: a Uint8Array, or the array or index-keyed
 * object JSON makes of one. Anything else is not readable as bytes.
 */
function toBytes(value: unknown): Uint8Array<ArrayBuffer> | undefined {
  if (value instanceof Uint8Array) return Uint8Array.from(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (Array.isArray(value)) return Uint8Array.from(value as number[]);
  if (value && typeof value === "object") {
    const entries = Object.values(value as Record<string, unknown>);
    if (entries.every((entry) => typeof entry === "number")) {
      return Uint8Array.from(entries as number[]);
    }
  }
  return undefined;
}

function assertNamespace(namespace: string) {
  if (datafn.currentNamespace() !== namespace) {
    throw new DOMException(
      "DataFn left the namespace the file migration started in",
      "AbortError"
    );
  }
}

/**
 * Builds the migration host that moves a namespace's record bytes into its
 * FileFn OPFS queue through DataFn, failing once DataFn leaves the namespace.
 */
export function createDeviceFileBytesHost(
  namespace: string,
  queueDir: string
): DeviceFileBytesMigrationHost {
  return {
    namespace,
    async listRecordIds() {
      assertNamespace(namespace);
      const result = await datafn.file.query({ select: ["id"] });
      return (result.data ?? []).map((record) => String(record.id));
    },
    async readRecord(id) {
      assertNamespace(namespace);
      const result = await datafn.file.query({ filters: { id } });
      const record = result.data?.[0] as DeviceFileRecord | undefined;
      if (!record) return undefined;
      return { ...record, data: toBytes(record.data) };
    },
    async stage(record, fileId) {
      const file = record as DeviceFileRecord;
      const data = toBytes(file.data);
      if (!data) throw new Error("The record has no bytes to move");
      const contentType = file.type || "application/octet-stream";
      const thumbnail = toBytes(file.thumbnailData);
      await enqueueFile(queueDir, {
        fileId,
        fileName: file.name || file.label || "file",
        contentType,
        blob: new Blob([data], { type: contentType }),
        thumbnailBlob: thumbnail
          ? new Blob([thumbnail], { type: "image/jpeg" })
          : undefined
      });
    },
    async commit(record, fileId) {
      assertNamespace(namespace);
      const result = (await datafn.file.mutate({
        operation: "merge",
        id: record.id,
        record: { id: record.id, fileId, data: null, thumbnailData: null }
      })) as { ok?: boolean; error?: unknown };
      if (result.ok === false) {
        throw result.error ?? new Error("File record save failed");
      }
    },
    unstage: (fileId) => dequeueFile(queueDir, fileId)
  };
}

const migratedNamespaces = new Set<string>();

/**
 * Moves the bytes of a local-only user's records into the device's queue once
 * per namespace and session (the migration itself runs once per namespace),
 * then uploads queued files when a cloud account is online.
 */
async function prepareNamespace(namespace: string) {
  const queueDir = resolveMigrationQueueDir(namespace);
  if (queueDir && !migratedNamespaces.has(namespace)) {
    migratedNamespaces.add(namespace);
    try {
      await migrateDeviceFileBytes(
        createDeviceFileBytesHost(namespace, queueDir)
      );
    } catch (error) {
      migratedNamespaces.delete(namespace);
      logger.error({ at: "deviceFileQueue.migrate", namespace, error });
    }
  }
  await uploadWhenQueued();
}

async function uploadWhenQueued() {
  try {
    if (!(await hasQueuedFiles(resolveFileQueueDirs()))) return;
    await uploadQueuedFiles();
  } catch (error) {
    logger.error({ at: "deviceFileQueue.upload", error });
  }
}

/**
 * Binds the FileFn OPFS queue to the app: each local-only (guest) DataFn
 * namespace that starts moves its records' bytes into the device's queue
 * once (see resolveMigrationQueueDir), and queued files upload when
 * a cloud account is signed in (a local-only user's on the first cloud
 * sign-in) and the device is online, at start, on an account change and on
 * reconnect. Returns the function that unbinds it.
 */
export function installDeviceFileQueue(): () => void {
  if (!isFileQueueSupported()) return () => undefined;
  const stopRuntime = datafnRuntime.subscribe((runtime) => {
    if (runtime?.namespace) void prepareNamespace(runtime.namespace);
  });
  const stopAccount = account.subscribe(() => void uploadWhenQueued());
  const onOnline = () => void uploadWhenQueued();
  globalThis.addEventListener?.("online", onOnline);
  return () => {
    stopRuntime();
    stopAccount();
    globalThis.removeEventListener?.("online", onOnline);
  };
}
