import { get } from "svelte/store";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  clearQueuedFileStale,
  dequeueFile,
  isAppOffline,
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

function toState(copy: QueuedFileRecord, trash = copy, archive = copy) {
  const fields = PUBLISHED_FIELDS.map((field) => copy[field] ?? null);
  return JSON.stringify([fields, trash.isTrashed, archive.isArchived]);
}

/**
 * Returns the publisher of the device's local files for a cloud account: it
 * is ready while its runtime syncs to the account authority and publishes each
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
    isHeld,
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
      if (
        bound?.storage &&
        !(await pullAccountFileRecords(datafn, isReady, uploader.signal))
      )
        throw new DOMException("Records not pulled", "AbortError");
      assertReady();
      const held = await readFileRecord(namespace, { id: record.id });
      assertReady();
      if (held && held.fileId !== record.fileId) {
        await entry.mark("uploaded", uploaded.versionId);
        if (await readFileRecord(namespace, { fileId: uploaded.fileId }))
          return;
        const pend = () => recordFileFnPendingDelete(uploader, uploaded.fileId);
        if (isAppOffline() || !isReady()) return pend();
        return uploader.client.deleteFile(uploaded.fileId).catch(pend);
      }
      if (!held && entry.saved.includes(`ok ${record.id}`)) return;
      const saved = held && toQueuedFileRecord(held, namespace);
      if (saved && !entry.saved.includes(toState(saved))) return;
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
      const both = [from, record];
      const states = both.flatMap((a) =>
        both.flatMap((b) => both.map((c) => toState(a, b, c)))
      );
      await entry.mark("saved", [...entry.saved, ...states].join("\n"));
      if (!(await entry.isCurrent())) return;
      assertReady();
      assertSaved(await datafn.file.mutate(mutations as never));
      await entry.mark("saved", `${toState(record)}\nok ${record.id}`);
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
  if (!Array.isArray(result.data)) throw new Error("Records unknown");
  return result.data[0] as Record<string, unknown> | undefined;
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
 * removed under Web Locks; one claimed and not uploaded is marked orphaned,
 * for the claiming account to settle (see settleOrphanedLocalFiles).
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
    if (!now || toState(toQueuedFileRecord(now, namespace)) !== toState(copy))
      await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId);
    if (!entry.isCommitted) {
      await markQueuedFileCommitted(LOCAL_FILE_QUEUE_DIR, entry.fileId);
    }
    return;
  }
  if (!entry.isCommitted && !isAbandoned(entry)) return;
  if (entry.claim && !entry.isUploaded) {
    await markQueuedFileOrphaned(LOCAL_FILE_QUEUE_DIR, entry.fileId);
  } else if (globalThis.navigator?.locks) {
    const isUnused = async () =>
      !(await readFileRecord(namespace, { fileId: entry.fileId }));
    if (!(await dequeueFile(LOCAL_FILE_QUEUE_DIR, entry.fileId, isUnused)))
      await reconcileLocalFile(namespace, entry);
  }
}

/**
 * Reconciles the local files of the given changed records (all with none)
 * and the orphaned ones with their guest records, resolving the record IDs
 * it could not copy. A pending change's file (any, for a pending full pass)
 * or an orphaned one whose record could not be read is marked stale; a file
 * whose record did not change keeps its copy, which is still current.
 */
async function reconcileLocalFiles(
  namespace: string,
  changedIds?: string[],
  pendingIds = changedIds ?? []
) {
  const failed: string[] = [];
  const isAllPending = pendingIds.includes(FULL_PASS);
  for (const entry of await listQueuedFiles(LOCAL_FILE_QUEUE_DIR, true)) {
    const id = entry.recordId ?? "";
    if (entry.namespace !== namespace) continue;
    if (changedIds && !changedIds.includes(id) && !entry.isOrphaned) continue;
    try {
      await reconcileLocalFile(namespace, entry);
    } catch (error) {
      logger.warn({ at: "deviceFileQueue.reconcile", namespace, error });
      if (!isAllPending && !pendingIds.includes(id) && !entry.isOrphaned)
        continue;
      await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId);
      failed.push(id);
    }
  }
  return failed;
}

/**
 * Lets the stale local files of the other guest namespaces publish the
 * record copies they hold, dropping their pending changes: such a namespace
 * never starts again (a sign-out replaced the device's DataFn ID). A deleted
 * record's file or an orphaned one stays held.
 */
async function releaseOtherNamespaces(namespace: string) {
  const deleted = new Set<string>();
  for (const change of readPendingChanges()) {
    if (change.namespace === namespace) continue;
    if (change.action !== "delete") removePendingChange(change);
    else deleted.add(`${change.namespace}\n${change.id}`);
  }
  for (const entry of await listQueuedFiles(LOCAL_FILE_QUEUE_DIR, true)) {
    const key = `${entry.namespace}\n${entry.recordId}`;
    if (entry.namespace === namespace || entry.stale !== "") continue;
    if (!entry.isOrphaned && !deleted.has(key))
      await clearQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId);
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

/** Delays before a pass that left changes pending runs again. */
const PASS_RETRY_MS = [1_000, 10_000, 60_000];
const passRetries = new Map<string, number>();

/** Runs the namespace's pass again later, while DataFn is in it then. */
function retryChangePass(namespace: string) {
  const count = passRetries.get(namespace) ?? 0;
  if (count >= PASS_RETRY_MS.length) return;
  passRetries.set(namespace, count + 1);
  setTimeout(() => {
    if (datafn.currentNamespace() === namespace)
      void scheduleChangePass(namespace);
  }, PASS_RETRY_MS[count]);
}

/**
 * Copies a guest namespace's pending changes to their local files, under the
 * queue's lock, and removes those it copied; a full pass (as the namespace
 * starts, or a pending one) reconciles all its files and releases other
 * namespaces'. A pass keeps pending what it could not copy (a failed full
 * pass as a pending full pass) and runs again (see retryChangePass).
 */
function scheduleChangePass(namespace: string, isFull = false) {
  if (!resolveMigrationQueueDir(namespace)) return localRecordWork;
  const { signal } = new AbortController();
  const work = localRecordWork.then(async () => {
    await fences;
    await withQueueLock(LOCAL_FILE_QUEUE_DIR, signal, async () => {
      const pending = readPendingChanges(namespace);
      const ids = pending.map(({ id }) => id);
      const isFullPass = isFull || ids.includes(FULL_PASS);
      const failed = isFullPass
        ? await reconcileLocalFiles(namespace, undefined, ids)
        : ids.length
          ? await reconcileLocalFiles(namespace, ids)
          : [];
      if (isFullPass) await releaseOtherNamespaces(namespace);
      for (const change of pending)
        if (!failed.includes(change.id)) removePendingChange(change);
      for (const id of failed)
        if (!ids.includes(id)) addPendingChange(namespace, id);
      if (!failed.length) passRetries.delete(namespace);
      else retryChangePass(namespace);
    }).catch((error: unknown) => {
      logger.error({ at: "deviceFileQueue.records", error });
      if (isFull) addPendingChange(namespace, FULL_PASS);
      retryChangePass(namespace);
    });
  });
  localRecordWork = work;
  return work;
}

/**
 * Uploads the device's local files (a local-only user's) through the signed-in
 * cloud account's client and publishes their records in the account, so the
 * account holds a record of each file it receives (see replayFileQueue),
 * once the account's orphaned files are settled (see settleOrphanedLocalFiles).
 */
export async function uploadLocalQueuedFiles(uploader: FileQueueUploader) {
  if (!globalThis.navigator?.locks) return;
  await settleLocalFileRecords();
  if (uploader.signal.aborted) return;
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
 * publisher is ready and its synced records are up to date: deletes each no
 * record of the account references at its authority (its publish never
 * landed), or records that delete for the account's next client; each under
 * the queue's lock, on its entry read there, so no publish runs between the
 * check of its records and the delete.
 */
async function settleOrphanedLocalFiles(
  uploader: FileQueueUploader,
  publisher: QueuedFilePublisher
) {
  const { userId, baseUrl, client, signal } = uploader;
  const isOrphanOf = (entry?: QueuedFileEntry) =>
    entry?.isOrphaned &&
    entry.stale === undefined && // A guest change may have taken it over.
    !entry.isUploaded &&
    entry.claim?.userId === userId &&
    entry.claim.baseUrl === baseUrl;
  const orphans = (await listQueuedFiles(LOCAL_FILE_QUEUE_DIR)).filter(
    isOrphanOf
  );
  if (!orphans.length || !publisher.isReady()) return;
  if (
    get(datafnRuntime)?.storage &&
    !(await pullAccountFileRecords(datafn, publisher.isReady, signal))
  )
    return;
  const settle = async (fileId: string) => {
    const entries = await listQueuedFiles(LOCAL_FILE_QUEUE_DIR, true);
    const entry = entries.find((queued) => queued.fileId === fileId);
    if (!isOrphanOf(entry)) return true;
    if (!publisher.isReady()) return false;
    const result = await datafn.file.query({
      filters: { fileId },
      limit: 1,
      metadata: ALL_RECORDS
    });
    if (!publisher.isReady() || !Array.isArray(result.data)) return false;
    if (!result.data.length) {
      const pend = () => recordFileFnPendingDelete(uploader, fileId);
      if (isAppOffline()) await pend();
      else await client.deleteFile(fileId).catch(pend);
    }
    await dequeueFile(LOCAL_FILE_QUEUE_DIR, fileId);
    return true;
  };
  for (const { fileId } of orphans) {
    if (
      !(await withQueueLock(LOCAL_FILE_QUEUE_DIR, signal, () => settle(fileId)))
    )
      return;
  }
}

function logOrphanError(error: unknown) {
  logger.warn({ at: "deviceFileQueue.orphans", error });
}

/**
 * Guest changes not yet copied to their local files: one local-storage entry
 * each, `<PENDING_PREFIX><namespace>:<record ID>` (FULL_PASS for a full pass
 * that failed), valued `<action>:<token>`, so a reload and other tabs keep
 * them, and a pass removes only those it read and that did not change since;
 * also in page memory, which another tab's sign-out or release cannot clear.
 */
const PENDING_PREFIX = `${LOCAL_FILE_QUEUE_DIR}-pending:`;
const FULL_PASS = "*";
const memoryPending = new Map<string, string>();

type PendingChange = {
  key: string;
  value: string;
  namespace: string;
  id: string;
  action: string;
};

/** Lists the pending changes (of one namespace, if given). */
function readPendingChanges(namespace?: string): PendingChange[] {
  const found = [...memoryPending];
  try {
    const storage = globalThis.localStorage;
    for (let index = 0; index < (storage?.length ?? 0); index++) {
      const key = storage.key(index);
      if (key?.startsWith(PENDING_PREFIX))
        found.push([key, storage.getItem(key) ?? ""]);
    }
  } catch (error) {
    logger.warn({ at: "deviceFileQueue.pending", error });
  }
  const changes = found.map(([key, value]) => {
    const [owner = "", id = ""] = key
      .slice(PENDING_PREFIX.length)
      .split(":")
      .map(decodeURIComponent);
    return { key, value, namespace: owner, id, action: value.split(":")[0] };
  });
  return changes.filter(
    (change) => !namespace || change.namespace === namespace
  );
}

/** Records a pending change; a record's delete stays one. */
function addPendingChange(namespace: string, id: string, action = "change") {
  const key =
    PENDING_PREFIX + [namespace, id].map(encodeURIComponent).join(":");
  const isDeleted = readPendingChanges(namespace).some(
    (change) => change.key === key && change.action === "delete"
  );
  const token = `${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}`;
  const value = `${isDeleted ? "delete" : action}:${token}`;
  memoryPending.set(key, value);
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch (error) {
    logger.warn({ at: "deviceFileQueue.pending", error });
  }
}

/** Removes a pending change, unless it was recorded again since it was read. */
function removePendingChange({ key, value }: PendingChange) {
  if (memoryPending.get(key) === value) memoryPending.delete(key);
  try {
    const storage = globalThis.localStorage;
    if (storage?.getItem(key) === value) storage.removeItem(key);
  } catch (error) {
    logger.warn({ at: "deviceFileQueue.pending", error });
  }
}

/** Whether a local file's record copy has a change not yet copied to it. */
function isHeld(record: QueuedFileRecord) {
  if (typeof record.namespace !== "string") return false;
  return readPendingChanges(record.namespace).some(
    ({ id }) => id === record.id || id === FULL_PASS
  );
}

/**
 * Keeps each local file's record copy current: a change to a local-only
 * record (a rename, trash, archive or delete) is recorded pending (see
 * readPendingChanges) and copied to its file, or removes the file when no
 * record references it any more. Changes that come while a pass waits are
 * reconciled together by that pass.
 */
function onFileRecordsChanged(event: { ids?: string[]; action?: string }) {
  const namespace = datafn.currentNamespace();
  if (!namespace || !resolveMigrationQueueDir(namespace)) return;
  if (!event.ids?.length) return;
  const action = event.action === "delete" ? "delete" : "change";
  for (const id of event.ids) addPendingChange(namespace, id, action);
  fenceChanges(namespace, event.ids, action === "delete");
  void scheduleChangePass(namespace);
}

let fences: Promise<void> = Promise.resolve();

/**
 * Marks the changed records' local files (a delete's as deleted) and the
 * orphaned ones stale at once, without the lock.
 */
function fenceChanges(namespace: string, ids: string[], isDeleted: boolean) {
  fences = fences
    .then(async () => {
      for (const entry of await listQueuedFiles(LOCAL_FILE_QUEUE_DIR)) {
        if (entry.namespace !== namespace) continue;
        const isChanged = ids.includes(entry.recordId ?? "");
        if (isChanged || entry.isOrphaned)
          await markQueuedFileStale(
            LOCAL_FILE_QUEUE_DIR,
            entry.fileId,
            isChanged && isDeleted
          );
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
