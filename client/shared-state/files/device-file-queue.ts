import { get } from "svelte/store";
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
  listQueuedFiles,
  LOCAL_FILE_QUEUE_DIR,
  markQueuedFileCommitted,
  markQueuedFileStale,
  replayFileQueue,
  resolveAccountFileQueueDir,
  writeQueuedFileRecord,
  type QueuedFileEntry,
  type QueuedFilePublisher,
  type QueuedFileRecord
} from "@nucleum/shared-state/files/file-queue";
import {
  captureFileQueueUploader,
  recordFileFnPendingDelete,
  resolveFileFnAccountScope,
  resolveFileQueueDirs,
  uploadQueuedFiles,
  type FileQueueUploader
} from "@nucleum/shared-state/files/filefn-client";
import account from "@nucleum/client/runtime/account/account.store";

/** A `file` record with bytes on the device, as written before TIDY-544. */
type DeviceFileRecord = DeviceFileBytesRecord & {
  name?: string;
  label?: string;
  type?: string;
  size?: number;
  processing?: unknown;
};

/** DataFn page size of the migration's record listing. */
const RECORD_PAGE_SIZE = 200;

/** Reads every `file` record, trashed, archived or under an inactive one too. */
const ALL_RECORDS = {
  includeTrashed: true,
  includeArchived: true,
  includeAncestorInactive: true
};

/**
 * Fields of a local-only `file` record that its copy in a cloud account keeps:
 * the record's own fields without its bytes or legacy URLs (the account
 * resolves the file by its `fileId`).
 */
const PUBLISHED_FIELDS = [
  "id",
  "label",
  "type",
  "size",
  "duration",
  "name",
  "isMeta",
  "metadata",
  "processing",
  "fileId"
] as const;

/**
 * Age after which a queued file that was never committed, and that no record
 * references, is taken as a capture whose record never saved and removed.
 */
const ABANDONED_STAGING_MS = 60 * 60 * 1000;

function pickPublishedFields(record: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  for (const field of PUBLISHED_FIELDS) {
    const value = record[field];
    if (value !== undefined && value !== null) fields[field] = value;
  }
  return fields;
}

/**
 * Copies the fields of a `file` record its cloud copy is published with, and
 * whether it is trashed or archived, which the publish applies.
 */
export function toQueuedFileRecord(
  record: Record<string, unknown>
): QueuedFileRecord {
  const copy: Record<string, unknown> = {
    ...pickPublishedFields(record),
    isTrashed: record.trashedAt !== undefined && record.trashedAt !== null,
    isArchived: record.isArchived === true
  };
  return copy as QueuedFileRecord;
}

function assertSaved(result: unknown) {
  for (const entry of Array.isArray(result) ? result : [result]) {
    const saved = entry as { ok?: boolean; error?: unknown } | undefined;
    if (saved?.ok === false) {
      throw saved.error ?? new Error("File record save failed");
    }
  }
}

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
      const ids: string[] = [];
      for (;;) {
        assertNamespace(namespace);
        const result = await datafn.file.query({
          select: ["id"],
          sort: ["id"],
          metadata: ALL_RECORDS,
          limit: RECORD_PAGE_SIZE,
          offset: ids.length
        });
        const page = (result.data ?? []).map((record) => String(record.id));
        ids.push(...page);
        if (page.length < RECORD_PAGE_SIZE) return ids;
      }
    },
    async readRecord(id) {
      assertNamespace(namespace);
      const result = await datafn.file.query({
        filters: { id },
        limit: 1,
        metadata: ALL_RECORDS
      });
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
      const fileName = file.name || file.label || "file";
      await enqueueFile(queueDir, {
        fileId,
        fileName,
        record: {
          ...toQueuedFileRecord(file),
          label: file.label ?? fileName,
          name: fileName,
          type: contentType,
          size: data.byteLength
        },
        contentType,
        blob: new Blob([data], { type: contentType }),
        thumbnailBlob: thumbnail
          ? new Blob([thumbnail], { type: "image/jpeg" })
          : undefined
      });
    },
    async commit(record, fileId) {
      assertNamespace(namespace);
      assertSaved(
        await datafn.file.mutate({
          operation: "merge",
          id: record.id,
          record: { id: record.id, fileId, data: null, thumbnailData: null }
        })
      );
      await markQueuedFileCommitted(queueDir, fileId).catch(
        (error: unknown) => {
          logger.warn({ at: "deviceFileQueue.commit", fileId, error });
        }
      );
    },
    unstage: (fileId) => dequeueFile(queueDir, fileId)
  };
}

/**
 * Returns the publisher of the device's local files for a cloud account: it
 * is ready while DataFn is in the account's namespace and syncs, if it has a
 * remote, to the account authority the files upload to, and publishes each
 * uploaded file as a record of the account under its local-only record's ID,
 * with the record's current fields and its trashed and archived state,
 * unless the account already holds that record (an earlier publish whose
 * entry was not yet marked uploaded).
 */
export function createLocalFilePublisher(
  uploader: Pick<FileQueueUploader, "userId" | "baseUrl" | "signal">
): QueuedFilePublisher {
  const namespace = `user:${uploader.userId}`;
  const isReady = () => {
    if (uploader.signal.aborted) return false;
    const runtime = get(datafnRuntime);
    if (
      datafn.currentNamespace() !== namespace ||
      runtime?.namespace !== namespace
    ) {
      return false;
    }
    return (
      !runtime.remoteUrl ||
      runtime.remoteUrl.replace(/\/datafn\/?$/, "") ===
        uploader.baseUrl.replace(/\/files\/?$/, "")
    );
  };
  return {
    owner: { userId: uploader.userId, baseUrl: uploader.baseUrl },
    isReady,
    async publish(record) {
      const assertReady = () => {
        if (!isReady()) {
          throw new DOMException(
            "DataFn left the account the local files upload to",
            "AbortError"
          );
        }
      };
      assertReady();
      const existing = await datafn.file.query({
        filters: { id: record.id },
        limit: 1,
        metadata: ALL_RECORDS
      });
      if (existing.data?.[0]) return;
      const id = record.id;
      const mutations: Record<string, unknown>[] = [
        { operation: "insert", id, record: pickPublishedFields(record) }
      ];
      if (record.isTrashed === true) mutations.push({ operation: "trash", id });
      if (record.isArchived === true)
        mutations.push({ operation: "archive", id });
      assertReady();
      assertSaved(await datafn.file.mutate(mutations as never));
    }
  };
}

/** Reads one `file` record of the namespace, trashed or archived too. */
async function readFileRecord(
  namespace: string,
  filters: Record<string, string>
): Promise<Record<string, unknown> | undefined> {
  assertNamespace(namespace);
  const result = await datafn.file.query({
    filters,
    limit: 1,
    metadata: ALL_RECORDS
  });
  assertNamespace(namespace);
  return result.data?.[0] as Record<string, unknown> | undefined;
}

function isAbandoned(entry: QueuedFileEntry) {
  const createdAt = Date.parse(entry.createdAt);
  return (
    Number.isFinite(createdAt) && Date.now() - createdAt > ABANDONED_STAGING_MS
  );
}

/**
 * Brings a local file in line with the local-only record that references it,
 * read in the guest namespace it was captured in: the file keeps a copy of
 * the record as it is now (another record that took over its `fileId` when
 * the first one was deleted, too) and is marked committed. A committed file
 * no record references any more, or one never committed and abandoned, is
 * removed from the device; when an account claimed it and its record was not
 * published there, the account's file is deleted at its next client.
 */
async function reconcileLocalFile(namespace: string, entry: QueuedFileEntry) {
  const byId = entry.recordId
    ? await readFileRecord(namespace, { id: entry.recordId })
    : undefined;
  const record =
    byId?.fileId === entry.fileId
      ? byId
      : await readFileRecord(namespace, { fileId: entry.fileId });
  if (record) {
    await writeQueuedFileRecord(
      LOCAL_FILE_QUEUE_DIR,
      entry.fileId,
      toQueuedFileRecord(record)
    );
    if (!entry.isCommitted) {
      await markQueuedFileCommitted(LOCAL_FILE_QUEUE_DIR, entry.fileId);
    }
    return;
  }
  if (!entry.isCommitted && !isAbandoned(entry)) return;
  if (entry.claim && !entry.isUploaded) {
    await recordFileFnPendingDelete(entry.claim, entry.fileId);
  }
  await dequeueFile(LOCAL_FILE_QUEUE_DIR, entry.fileId);
}

/**
 * Reconciles the local files of the given changed records (all with none)
 * with their records in the guest namespace. When a changed record could not
 * be read, as DataFn left the namespace, its file is marked stale, so it does
 * not upload with an outdated copy until the namespace starts again; a file
 * whose record did not change keeps its copy, which is still current.
 */
async function reconcileLocalFiles(namespace: string, changedIds?: string[]) {
  for (const entry of await listQueuedFiles(LOCAL_FILE_QUEUE_DIR)) {
    if (changedIds && !changedIds.includes(entry.recordId ?? "")) continue;
    try {
      await reconcileLocalFile(namespace, entry);
    } catch (error) {
      logger.warn({ at: "deviceFileQueue.reconcile", namespace, error });
      if (!changedIds) continue;
      await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId).catch(
        () => undefined
      );
    }
  }
}

/**
 * Marks committed each file of the account's queue whose record its
 * namespace holds (a capture whose mark was lost), and removes one never
 * committed, abandoned, that no record references.
 */
async function reconcileAccountFiles(namespace: string) {
  const userId = resolveFileFnAccountScope(account.get())?.userId;
  if (!userId || namespace !== `user:${userId}`) return;
  const dir = resolveAccountFileQueueDir(userId);
  for (const entry of await listQueuedFiles(dir)) {
    if (entry.isCommitted) continue;
    if (await readFileRecord(namespace, { fileId: entry.fileId })) {
      await markQueuedFileCommitted(dir, entry.fileId);
    } else if (isAbandoned(entry)) {
      await dequeueFile(dir, entry.fileId);
    }
  }
}

/**
 * Work on the local files' record copies, in order; the local queue uploads
 * only after the work started before it ends.
 */
let localRecordWork: Promise<void> = Promise.resolve();

/** Resolves once the local record copies started so far are made. */
export function settleLocalFileRecords(): Promise<void> {
  return localRecordWork;
}

function scheduleLocalRecordWork(run: () => Promise<void>) {
  const work = localRecordWork.then(run).catch((error: unknown) => {
    logger.error({ at: "deviceFileQueue.records", error });
  });
  localRecordWork = work;
  return work;
}

/**
 * Uploads the device's local files (a local-only user's) through the signed-in
 * cloud account's client and publishes their records in the account, so the
 * account holds a record of each file it receives; see replayFileQueue.
 */
export async function uploadLocalQueuedFiles(): Promise<void> {
  await settleLocalFileRecords();
  const uploader = await captureFileQueueUploader();
  if (!uploader) return;
  await replayFileQueue(
    LOCAL_FILE_QUEUE_DIR,
    uploader.client,
    uploader.signal,
    createLocalFilePublisher(uploader)
  );
}

const migratedNamespaces = new Set<string>();

/**
 * Moves the bytes of a local-only user's records into the device's queue once
 * per namespace and session (the migration itself runs once per namespace)
 * and brings every local file in line with its record; in an account's
 * namespace, marks committed the account's files whose records it holds.
 * Then uploads queued files when a cloud account is online.
 */
async function prepareNamespace(namespace: string) {
  const queueDir = resolveMigrationQueueDir(namespace);
  if (queueDir) {
    await scheduleLocalRecordWork(async () => {
      if (!migratedNamespaces.has(namespace)) {
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
      changedRecordIds.delete(namespace);
      await reconcileLocalFiles(namespace);
    });
  } else {
    await reconcileAccountFiles(namespace).catch((error: unknown) => {
      logger.warn({ at: "deviceFileQueue.reconcile", namespace, error });
    });
  }
  await uploadWhenQueued();
}

/** IDs of local-only records changed since their files were last reconciled. */
const changedRecordIds = new Map<string, Set<string>>();

/**
 * Keeps each local file's record copy current: a change to a local-only
 * record (a rename, trash, archive or delete) is copied to its file, or
 * removes the file when no record references it any more. Changes that come
 * while a pass waits are reconciled together by that pass.
 */
function onFileRecordsChanged(event: { ids?: string[] }) {
  const namespace = datafn.currentNamespace();
  if (!namespace || !resolveMigrationQueueDir(namespace)) return;
  if (!event.ids?.length) return;
  let ids = changedRecordIds.get(namespace);
  if (!ids) {
    ids = new Set();
    changedRecordIds.set(namespace, ids);
    void scheduleLocalRecordWork(async () => {
      const changed = changedRecordIds.get(namespace);
      changedRecordIds.delete(namespace);
      if (changed) await reconcileLocalFiles(namespace, [...changed]);
    });
  }
  for (const id of event.ids) ids.add(id);
}

async function uploadWhenQueued() {
  try {
    if (!(await hasQueuedFiles(resolveFileQueueDirs()))) return;
    await uploadQueuedFiles();
    await uploadLocalQueuedFiles();
  } catch (error) {
    logger.error({ at: "deviceFileQueue.upload", error });
  }
}

/**
 * Binds the FileFn OPFS queue to the app: each local-only (guest) DataFn
 * namespace that starts moves its records' bytes into the device's queue
 * once (see resolveMigrationQueueDir), each change to a local-only `file`
 * record is copied to its local file (see onFileRecordsChanged; the DataFn
 * events are subscribed again on every context switch, which replaces the
 * client that emits them), and queued
 * files upload when
 * a cloud account is signed in and the device is online, at start, on a
 * DataFn namespace or account change and on reconnect. A local-only user's
 * files upload, with their records, on the first cloud sign-in once DataFn is
 * in the account's namespace. Returns the function that unbinds it.
 */
export function installDeviceFileQueue(): () => void {
  if (!isFileQueueSupported()) return () => undefined;
  let stopEvents = () => undefined as void;
  const stopClient = datafn.subscribeClient((client) => {
    stopEvents();
    stopEvents = client.subscribe(onFileRecordsChanged, {
      type: "mutation_applied",
      resource: "file"
    });
  });
  const stopRecords = () => {
    stopClient();
    stopEvents();
  };
  const stopRuntime = datafnRuntime.subscribe((runtime) => {
    if (runtime?.namespace) void prepareNamespace(runtime.namespace);
  });
  const stopAccount = account.subscribe(() => void uploadWhenQueued());
  const onOnline = () => void uploadWhenQueued();
  globalThis.addEventListener?.("online", onOnline);
  return () => {
    stopRecords();
    stopRuntime();
    stopAccount();
    globalThis.removeEventListener?.("online", onOnline);
  };
}
