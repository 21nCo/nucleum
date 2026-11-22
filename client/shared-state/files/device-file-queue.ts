import { get } from "svelte/store";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  dequeueFile,
  hasQueuedFiles,
  isFileQueueSupported,
  listQueuedFiles,
  LOCAL_FILE_QUEUE_DIR,
  markQueuedFileCommitted,
  markQueuedFileOrphaned,
  markQueuedFileStale,
  replayFileQueue,
  UNCOMMITTED_GRACE_MS,
  writeQueuedFileRecord,
  type QueuedFileEntry,
  type QueuedFilePublisher,
  type QueuedFileRecord
} from "@nucleum/shared-state/files/file-queue";
import {
  captureFileQueueUploader,
  pullAccountFileRecords,
  recordFileFnPendingDelete,
  resolveFileQueueDirs,
  uploadQueuedFiles,
  type FileQueueUploader
} from "@nucleum/shared-state/files/filefn-client";
import account from "@nucleum/client/runtime/account/account.store";

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
const ABANDONED_STAGING_MS = UNCOMMITTED_GRACE_MS;

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

function assertNamespace(namespace: string) {
  if (datafn.currentNamespace() !== namespace) {
    throw new DOMException(
      "DataFn left the namespace the file migration started in",
      "AbortError"
    );
  }
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
 * removed from the device, but one an account claimed and did not record
 * uploaded is marked orphaned for it to settle (see settleOrphanedLocalFiles).
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
    await markQueuedFileOrphaned(LOCAL_FILE_QUEUE_DIR, entry.fileId);
    return;
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
  const publisher = createLocalFilePublisher(uploader);
  await settleOrphanedLocalFiles(uploader, publisher).catch(logOrphanError);
  await replayFileQueue(
    LOCAL_FILE_QUEUE_DIR,
    uploader.client,
    uploader.signal,
    publisher
  );
}

/**
 * Removes the orphaned local files the uploader's account claimed, while the
 * publisher is ready and its synced records are up to date, deleting each no
 * record of the account references at its authority (its publish never
 * landed), or recording that delete for the account's next client.
 */
async function settleOrphanedLocalFiles(
  uploader: FileQueueUploader,
  publisher: QueuedFilePublisher
) {
  const { userId, baseUrl, client, signal } = uploader;
  const orphans = (await listQueuedFiles(LOCAL_FILE_QUEUE_DIR)).filter(
    ({ isOrphaned, isUploaded, claim }) =>
      isOrphaned &&
      !isUploaded &&
      claim?.userId === userId &&
      claim.baseUrl === baseUrl
  );
  if (!orphans.length || !publisher.isReady()) return;
  const runtime = get(datafnRuntime);
  if (
    runtime?.storage &&
    runtime.remoteUrl &&
    !(await pullAccountFileRecords(datafn, publisher.isReady, signal))
  ) {
    return;
  }
  for (const { fileId } of orphans) {
    if (!publisher.isReady()) return;
    const result = await datafn.file.query({
      filters: { fileId },
      limit: 1,
      metadata: ALL_RECORDS
    });
    if (!publisher.isReady() || !Array.isArray(result.data)) return;
    if (result.data.length === 0) {
      await client.deleteFile(fileId).catch(async (error: unknown) => {
        logOrphanError(error);
        await recordFileFnPendingDelete({ userId, baseUrl }, fileId);
      });
    }
    await dequeueFile(LOCAL_FILE_QUEUE_DIR, fileId);
  }
}

function logOrphanError(error: unknown) {
  logger.warn({ at: "deviceFileQueue.orphans", error });
}

/**
 * Brings every local file of a local-only user's namespace in line with its
 * record, then uploads queued files when a cloud account is online.
 */
async function prepareNamespace(namespace: string) {
  if (resolveMigrationQueueDir(namespace)) {
    await scheduleLocalRecordWork(async () => {
      changedRecordIds.delete(namespace);
      await reconcileLocalFiles(namespace);
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
 * namespace that starts brings its local files in line with its records
 * (see resolveMigrationQueueDir), each change to a local-only `file`
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
