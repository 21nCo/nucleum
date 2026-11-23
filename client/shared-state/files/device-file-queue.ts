import { get } from "svelte/store";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  clearQueuedFileStale,
  dequeueFile,
  isFileQueueSupported,
  listQueuedFiles,
  LOCAL_FILE_QUEUE_DIR,
  markQueuedFileCommitted,
  markQueuedFileOrphaned,
  markQueuedFileStale,
  onAccountQueueReplay,
  replayFileQueue,
  UNCOMMITTED_GRACE_MS,
  withQueueLock,
  writeQueuedFileRecord,
  type AccountQueueReplay,
  type QueuedFileEntry,
  type QueuedFilePublisher,
  type QueuedFileRecord
} from "@nucleum/shared-state/files/file-queue";
import {
  pullAccountFileRecords,
  recordFileFnPendingDelete,
  type FileQueueUploader
} from "@nucleum/shared-state/files/filefn-client";

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
 * whether it is trashed or archived, which the publish applies, with the
 * guest namespace it is read in (see reconcileLocalFiles).
 */
export function toQueuedFileRecord(
  record: Record<string, unknown>,
  namespace: string
): QueuedFileRecord {
  const copy: Record<string, unknown> = {
    ...pickPublishedFields(record),
    namespace,
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
 * is ready while DataFn is in the account's namespace and syncs with the
 * account authority the files upload to, and publishes each
 * uploaded file as a record of the account under its local-only record's ID,
 * with the record's current fields and its trashed and archived state. When
 * the account already holds that record (an earlier publish whose entry was
 * not yet marked uploaded, which may have saved only its insert), it only
 * trashes or archives it as its copy is, if it references the file; it
 * changes nothing else, so later edits in the account stay. One referencing
 * another file or none stays too: its upload is deleted, its file kept.
 */
export function createLocalFilePublisher(
  uploader: Pick<FileQueueUploader, "userId" | "baseUrl" | "signal" | "client">
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
      runtime.remoteUrl?.replace(/\/datafn\/?$/, "") ===
      uploader.baseUrl.replace(/\/files\/?$/, "")
    );
  };
  return {
    owner: { userId: uploader.userId, baseUrl: uploader.baseUrl },
    isReady,
    async publish(record, uploaded) {
      const assertReady = () => {
        if (!isReady()) {
          throw new DOMException(
            "DataFn left the account the local files upload to",
            "AbortError"
          );
        }
      };
      assertReady();
      const found = await datafn.file.query({
        filters: { id: record.id },
        limit: 1,
        metadata: ALL_RECORDS
      });
      const existing = found.data?.[0] as Record<string, unknown> | undefined;
      if (existing && existing.fileId !== record.fileId) {
        return uploader.client
          .deleteFile(uploaded.fileId)
          .catch(() => recordFileFnPendingDelete(uploader, uploaded.fileId));
      }
      const saved = existing && toQueuedFileRecord(existing, namespace);
      const id = record.id;
      const mutations: Record<string, unknown>[] = saved
        ? []
        : [{ operation: "insert", id, record: pickPublishedFields(record) }];
      if (record.isTrashed === true && !saved?.isTrashed)
        mutations.push({ operation: "trash", id });
      if (record.isArchived === true && !saved?.isArchived)
        mutations.push({ operation: "archive", id });
      if (!mutations.length) return;
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

/** Reads a local file's entry as the queue holds it now; an unreadable claim rejects. */
async function readLocalEntry(fileId: string) {
  const entries = await listQueuedFiles(LOCAL_FILE_QUEUE_DIR, true);
  return entries.find((entry) => entry.fileId === fileId);
}

/**
 * Brings a local file in line with the local-only record that references it,
 * read in the guest namespace it was captured in: the file keeps a copy of
 * the record as it is now (another record that took over its `fileId` when
 * the first one was deleted, too) and is marked committed. A committed file
 * no record references any more, or one never committed and abandoned, is
 * removed from the device, but one an account claimed and did not record
 * uploaded is marked orphaned for it to settle (see settleOrphanedLocalFiles);
 * under the queue's lock (scheduleChangePass), so no other tab acts meanwhile.
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
      toQueuedFileRecord(record, namespace)
    );
    if (!entry.isCommitted) {
      await markQueuedFileCommitted(LOCAL_FILE_QUEUE_DIR, entry.fileId);
    }
    return;
  }
  if (!entry.isCommitted && !isAbandoned(entry)) return;
  const current = await readLocalEntry(entry.fileId);
  if (current?.namespace !== namespace) return;
  if (current.claim && !current.isUploaded) {
    await markQueuedFileOrphaned(LOCAL_FILE_QUEUE_DIR, entry.fileId);
  } else await dequeueFile(LOCAL_FILE_QUEUE_DIR, entry.fileId);
}

/**
 * Reconciles the local files of the given changed records (all with none)
 * with their records in the guest namespace, captured there: a file of
 * another guest namespace (a sign-out opens a new one) keeps its copy to
 * publish. When a changed record could not
 * be read, as DataFn left the namespace, its file is marked stale, so it does
 * not upload with an outdated copy until the namespace starts again; a file
 * whose record did not change keeps its copy, which is still current. A full
 * pass lets a stale file of another guest namespace publish the copy it
 * holds: that namespace never starts again (a sign-out replaced the device's
 * DataFn ID), so no later read can bring its copy up to date.
 */
async function reconcileLocalFiles(namespace: string, changedIds?: string[]) {
  for (const entry of await listQueuedFiles(LOCAL_FILE_QUEUE_DIR)) {
    const isOwn = entry.namespace === namespace;
    if (changedIds && !(isOwn && changedIds.includes(entry.recordId ?? ""))) {
      continue;
    }
    try {
      if (isOwn) await reconcileLocalFile(namespace, entry);
      else if (entry.isStale) {
        await clearQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId);
      }
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

/** Namespaces whose next change pass has not yet taken their changed IDs. */
const waitingPasses = new Set<string>();

/**
 * Reconciles a namespace's changed records, after all its local files with
 * `isFull`, under the queue's lock, so no other tab acts meanwhile; changes
 * that come while a pass waits are reconciled together by that pass. A pass
 * that fails puts the IDs it took back for the next one.
 */
function scheduleChangePass(namespace: string, isFull = false) {
  if (!isFull && waitingPasses.has(namespace)) return localRecordWork;
  waitingPasses.add(namespace);
  const { signal } = new AbortController();
  const work = localRecordWork.then(async () => {
    waitingPasses.delete(namespace);
    const changed = [...(changedRecordIds.get(namespace) ?? [])];
    changedRecordIds.delete(namespace);
    await withQueueLock(LOCAL_FILE_QUEUE_DIR, signal, async () => {
      if (isFull) await reconcileLocalFiles(namespace);
      if (changed.length) await reconcileLocalFiles(namespace, changed);
    }).catch((error: unknown) => {
      logger.error({ at: "deviceFileQueue.records", error });
      queueChanges(namespace, changed);
    });
  });
  localRecordWork = work;
  return work;
}

/**
 * Uploads the device's local files (a local-only user's) through the signed-in
 * cloud account's client and publishes their records in the account, so the
 * account holds a record of each file it receives; see replayFileQueue.
 */
export async function uploadLocalQueuedFiles(
  uploader: FileQueueUploader
): Promise<void> {
  // Without Web Locks no lock keeps other tabs' passes out: files stay local.
  if (!globalThis.navigator?.locks) return;
  for (const namespace of changedRecordIds.keys()) {
    void scheduleChangePass(namespace);
  }
  await settleLocalFileRecords();
  // A change no pass could take holds the local files until one does.
  if (uploader.signal.aborted || changedRecordIds.size) return;
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
 * landed), or recording that delete for the account's next client; each
 * under the queue's lock, on its entry read there, so no publish runs
 * between the check of its records and the delete.
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
  const settle = async (fileId: string) => {
    const entry = await readLocalEntry(fileId);
    if (!entry?.isOrphaned || entry.isUploaded) return true;
    if (!publisher.isReady()) return false;
    const result = await datafn.file.query({
      filters: { fileId },
      limit: 1,
      metadata: ALL_RECORDS
    });
    if (!publisher.isReady() || !Array.isArray(result.data)) return false;
    if (result.data.length === 0) {
      await client.deleteFile(fileId).catch(async (error: unknown) => {
        logOrphanError(error);
        await recordFileFnPendingDelete({ userId, baseUrl }, fileId);
      });
    }
    await dequeueFile(LOCAL_FILE_QUEUE_DIR, fileId);
    return true;
  };
  for (const { fileId } of orphans) {
    const lock = withQueueLock(LOCAL_FILE_QUEUE_DIR, signal, () =>
      settle(fileId)
    );
    if (!(await lock)) return;
  }
}

function logOrphanError(error: unknown) {
  logger.warn({ at: "deviceFileQueue.orphans", error });
}

/**
 * Brings a local-only user's local files in line with their records, then
 * the changed ones; changes of an earlier guest namespace, which never
 * starts again, are dropped (see reconcileLocalFiles).
 */
async function prepareNamespace(namespace: string) {
  if (!resolveMigrationQueueDir(namespace)) return;
  for (const other of changedRecordIds.keys()) {
    if (other !== namespace) changedRecordIds.delete(other);
  }
  await scheduleChangePass(namespace, true);
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
  queueChanges(namespace, event.ids);
  void scheduleChangePass(namespace);
}

function queueChanges(namespace: string, ids: string[]) {
  if (!ids.length) return;
  const queued = changedRecordIds.get(namespace) ?? new Set<string>();
  for (const id of ids) queued.add(id);
  changedRecordIds.set(namespace, queued);
}

/**
 * Uploads the local files with each authorized replay of an account's queue
 * (see onAccountQueueReplay), so no trigger here authorizes a replay.
 */
function uploadWithAccountReplay(replay: AccountQueueReplay) {
  void uploadLocalQueuedFiles(replay).catch((error: unknown) => {
    logger.error({ at: "deviceFileQueue.upload", error });
  });
}

/**
 * Binds the FileFn OPFS queue to the app: each local-only (guest) DataFn
 * namespace that starts brings its local files in line with its records
 * (see resolveMigrationQueueDir), each change to a local-only `file`
 * record is copied to its local file (see onFileRecordsChanged; the DataFn
 * events are subscribed again on every context switch, which replaces the
 * client that emits them), and the local files upload with each replay of a
 * cloud account's queue (see uploadWithAccountReplay). A local-only user's
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
  const stopUploads = onAccountQueueReplay(uploadWithAccountReplay);
  return () => {
    stopRecords();
    stopRuntime();
    stopUploads();
  };
}
