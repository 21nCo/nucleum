import { get } from "svelte/store";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  dequeueFile,
  isAppOffline,
  isFileQueueSupported,
  listQueuedFiles,
  LOCAL_FILE_QUEUE_DIR,
  markQueuedFileCommitted,
  markQueuedFileStale,
  onAccountQueueReplay,
  replayFileQueue,
  UNCOMMITTED_GRACE_MS,
  withQueueLock,
  writeQueuedFileRecord,
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
 * whether it is trashed or archived, which the publish applies.
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

function toParts(copy: QueuedFileRecord) {
  const fields = PUBLISHED_FIELDS.map((field) => copy[field] ?? null);
  return [JSON.stringify(fields), `t${copy.isTrashed}`, `a${copy.isArchived}`];
}

/**
 * Returns the publisher of the device's local files for a cloud account: it
 * is ready while the runtime it was created in, in the account's namespace,
 * syncs to the account authority the files upload to, and publishes each
 * uploaded file as a record of the account under its local-only record's ID,
 * with the record's current fields and its trashed and archived state,
 * unless the account already holds that record (an earlier publish whose
 * entry was not yet marked uploaded): then it updates it, if not edited since.
 */
export function createLocalFilePublisher(
  uploader: Pick<FileQueueUploader, "userId" | "baseUrl" | "signal" | "client">
): QueuedFilePublisher {
  const namespace = `user:${uploader.userId}`;
  const bound = get(datafnRuntime);
  const isReady = () => {
    if (uploader.signal.aborted) return false;
    const runtime = get(datafnRuntime);
    if (
      runtime !== bound ||
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
    async publish(record, uploaded, entry) {
      const assertReady = () => {
        if (!isReady()) {
          throw new DOMException(
            "DataFn left the account the local files upload to",
            "AbortError"
          );
        }
      };
      assertReady();
      const isPulled =
        !bound?.storage ||
        (await pullAccountFileRecords(datafn, isReady, uploader.signal));
      if (!isPulled) throw new DOMException("Records not pulled", "AbortError");
      assertReady();
      const existing = await datafn.file.query({
        filters: { id: record.id },
        limit: 1,
        metadata: ALL_RECORDS
      });
      assertReady();
      if (!Array.isArray(existing.data)) throw new Error("Records unknown");
      const held = existing.data[0] as Record<string, unknown> | undefined;
      if (held && held.fileId !== record.fileId) {
        await entry.mark("uploaded", uploaded.versionId);
        const pend = () => recordFileFnPendingDelete(uploader, uploaded.fileId);
        if (isAppOffline() || !isReady()) return pend();
        return uploader.client.deleteFile(uploaded.fileId).catch(pend);
      }
      const saved = held && toQueuedFileRecord(held, namespace);
      if (saved && !toParts(saved).every((part) => entry.saved.includes(part)))
        return;
      const id = record.id;
      const { isTrashed, isArchived } = record;
      const from = saved ?? { ...record, isTrashed: false, isArchived: false };
      const fields = pickPublishedFields(record);
      for (const field of PUBLISHED_FIELDS)
        if (saved && field in saved) fields[field] ??= null;
      const mutations: Record<string, unknown>[] = [
        { operation: saved ? "merge" : "insert", id, record: fields }
      ];
      if (isTrashed !== from.isTrashed)
        mutations.push({ id, operation: isTrashed ? "trash" : "restore" });
      if (isArchived !== from.isArchived)
        mutations.push({ id, operation: isArchived ? "archive" : "unarchive" });
      if (!(await entry.isCurrent())) return;
      const parts = [...entry.saved, ...toParts(from), ...toParts(record)];
      await entry.mark("saved", parts.join("\n"));
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
 * removed under Web Locks; one claimed and not uploaded is marked stale.
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
    const copy = toQueuedFileRecord(record, namespace);
    await writeQueuedFileRecord(LOCAL_FILE_QUEUE_DIR, entry.fileId, copy);
    const now = await readFileRecord(namespace, { id: copy.id });
    const nowCopy = now && toQueuedFileRecord(now, namespace);
    if (JSON.stringify(nowCopy) !== JSON.stringify(copy))
      await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId);
    if (!entry.isCommitted) {
      await markQueuedFileCommitted(LOCAL_FILE_QUEUE_DIR, entry.fileId);
    }
    return;
  }
  if (!entry.isCommitted && !isAbandoned(entry)) return;
  if (entry.claim && !entry.isUploaded) {
    await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId);
  } else if (globalThis.navigator?.locks) {
    const isUnused = async () =>
      !(await readFileRecord(namespace, { fileId: entry.fileId }));
    if (!(await dequeueFile(LOCAL_FILE_QUEUE_DIR, entry.fileId, isUnused)))
      await reconcileLocalFile(namespace, entry);
  }
}

/**
 * Reconciles the local files of the given changed records (all with none)
 * with their records in the guest namespace. When a changed record could not
 * be read, as DataFn left the namespace, its file is marked stale, so it does
 * not upload with an outdated copy until the namespace starts again; a file
 * whose record did not change keeps its copy, which is still current.
 */
async function reconcileLocalFiles(namespace: string, changedIds?: string[]) {
  for (const entry of await listQueuedFiles(LOCAL_FILE_QUEUE_DIR, true)) {
    if (entry.namespace !== namespace) continue;
    if (changedIds && !changedIds.includes(entry.recordId ?? "")) continue;
    try {
      await reconcileLocalFile(namespace, entry);
    } catch (error) {
      logger.warn({ at: "deviceFileQueue.reconcile", namespace, error });
      if (!changedIds) continue;
      await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId);
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

/** Reconciles a namespace's changed records (`isFull`: all) under the lock. */
function scheduleChangePass(namespace: string, isFull = false) {
  if (!resolveMigrationQueueDir(namespace)) return localRecordWork;
  const { signal } = new AbortController();
  const work = localRecordWork.then(async () => {
    const changed = [...(changedRecordIds.get(namespace) ?? [])];
    changedRecordIds.delete(namespace);
    await fences;
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
export async function uploadLocalQueuedFiles(uploader: FileQueueUploader) {
  if (!globalThis.navigator?.locks) return;
  await settleLocalFileRecords();
  if (uploader.signal.aborted || changedRecordIds.size) return;
  await replayFileQueue(
    LOCAL_FILE_QUEUE_DIR,
    uploader.client,
    uploader.signal,
    createLocalFilePublisher(uploader)
  );
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

/** Stale marks for changed records, written before the queue's lock. */
let fences: Promise<void> = Promise.resolve();

function queueChanges(namespace: string, ids: string[]) {
  if (!ids.length) return;
  const queued = changedRecordIds.get(namespace) ?? new Set<string>();
  for (const id of ids) queued.add(id);
  changedRecordIds.set(namespace, queued);
  fences = fences
    .then(async () => {
      for (const entry of await listQueuedFiles(LOCAL_FILE_QUEUE_DIR)) {
        if (entry.namespace === namespace && ids.includes(entry.recordId ?? ""))
          await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId);
      }
    })
    .catch((error) => logger.warn({ at: "deviceFileQueue.fence", error }));
}

/**
 * Binds the FileFn OPFS queue to the app: each local-only (guest) DataFn
 * namespace that starts reconciles its local files with its records at
 * once (see resolveMigrationQueueDir), each change to a local-only `file`
 * record is copied to its local file (see onFileRecordsChanged; the DataFn
 * events are subscribed again on every context switch, which replaces the
 * client that emits them), and queued
 * files upload with each cloud account's queue replay. A local-only user's
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
    if (runtime?.namespace) void scheduleChangePass(runtime.namespace, true);
  });
  const stopUploads = onAccountQueueReplay((replay) => {
    void uploadLocalQueuedFiles(replay).catch((error: unknown) => {
      logger.error({ at: "deviceFileQueue.upload", error });
    });
  });
  return () => {
    stopRecords();
    stopRuntime();
    stopUploads();
  };
}
