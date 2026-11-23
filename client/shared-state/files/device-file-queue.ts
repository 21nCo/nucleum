import { get } from "svelte/store";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import {
  clearQueuedFileStale,
  dequeueFile,
  isAppOffline,
  isFileQueueSupported,
  listQueuedFiles,
  LOCAL_FILE_QUEUE_DIR,
  markQueuedFileCommitted,
  markQueuedFileDiscarded,
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
 * Resolves false for a file left as it was: one staged, whose record is not
 * saved yet.
 */
async function reconcileLocalFile(
  namespace: string,
  entry: QueuedFileEntry
): Promise<boolean> {
  const byId = entry.recordId
    ? await readFileRecord(namespace, { id: entry.recordId })
    : undefined;
  const record =
    byId?.fileId === entry.fileId
      ? byId
      : await readFileRecord(namespace, { fileId: entry.fileId });
  if (record) {
    const copy = toQueuedFileRecord(record, namespace);
    // An orphan a record took over stays stale until its copy is written.
    if (entry.isOrphaned)
      await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId);
    await writeQueuedFileRecord(LOCAL_FILE_QUEUE_DIR, entry.fileId, copy);
    const now = await readFileRecord(namespace, { id: copy.id });
    if (!now || toState(toQueuedFileRecord(now, namespace)) !== toState(copy))
      await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId, !now);
    if (!entry.isCommitted) {
      await markQueuedFileCommitted(LOCAL_FILE_QUEUE_DIR, entry.fileId);
    }
    return true;
  }
  if (!entry.isCommitted && !isAbandoned(entry)) return false;
  if (entry.claim && !entry.isUploaded) {
    await markQueuedFileOrphaned(LOCAL_FILE_QUEUE_DIR, entry.fileId);
  } else if (globalThis.navigator?.locks) {
    const isUnused = async () =>
      !(await readFileRecord(namespace, { fileId: entry.fileId }));
    if (!(await dequeueFile(LOCAL_FILE_QUEUE_DIR, entry.fileId, isUnused)))
      return reconcileLocalFile(namespace, entry);
  }
  return true;
}

/**
 * Reconciles the local files of the namespace's pending changes (all, for a
 * full pass) and its stale, orphaned or deleted ones (a late fence may mark
 * one whose change a pass copied) with their guest records, and
 * returns the record IDs it could not copy. A pending delete's file is
 * marked deleted first (a staged file it leaves stays pending until that
 * mark is written); a pending, stale, orphaned or deleted file it could not
 * reconcile is marked with its pending action, so the mark holds it across a
 * sign-out (see markQueuedFileStale). Another keeps its copy, still current.
 */
async function reconcileLocalFiles(
  namespace: string,
  pending: PendingChange[],
  isFull: boolean
) {
  const failed: string[] = [];
  const ids = new Set(pending.map(({ id }) => id));
  for (const entry of await listQueuedFiles(LOCAL_FILE_QUEUE_DIR, true)) {
    const id = entry.recordId ?? "";
    if (entry.namespace !== namespace) continue;
    const isHeld =
      entry.isOrphaned || entry.isDeleted || entry.stale !== undefined;
    if (!isFull && !ids.has(id) && !isHeld) continue;
    let isDeleted = pending.some(
      (change) => change.id === id && change.action === "delete"
    );
    try {
      const isMarked =
        !isDeleted ||
        (await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId, true)
          .then(() => true)
          .catch(() => false));
      if (!(await reconcileLocalFile(namespace, entry)) && !isMarked)
        throw new Error("The delete of a staged file is not marked");
    } catch (error) {
      logger.warn({ at: "deviceFileQueue.reconcile", namespace, error });
      if (!isHeld && !ids.has(id)) continue;
      // A delete recorded since the snapshot (another tab's) stays one.
      isDeleted ||= isPendingDelete(pendingKey(namespace, id));
      await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, entry.fileId, isDeleted);
      failed.push(id);
    }
  }
  return failed;
}

/**
 * Name of the shared Web Lock every tab holds while DataFn is in a guest
 * namespace (see holdNamespace).
 */
function liveLockName(namespace: string) {
  return `${LOCAL_FILE_QUEUE_DIR}-live:${namespace}`;
}

/** Holds the guest namespace's live lock until the function it returns runs. */
function holdNamespace(namespace: string | undefined) {
  let leave = () => undefined as void;
  if (!namespace || !resolveMigrationQueueDir(namespace)) return leave;
  const left = new Promise<void>((resolve) => (leave = resolve));
  void globalThis.navigator?.locks
    ?.request(liveLockName(namespace), { mode: "shared" }, () => left)
    .catch((error: unknown) =>
      logger.warn({ at: "deviceFileQueue.live", error })
    );
  return leave;
}

/**
 * Lets the stale local files of retired guest namespaces publish the record
 * copies they hold, dropping those namespaces' pending changes. A namespace
 * is retired when it is not the device's (the sign-out that cleared the
 * DataFn ID it was opened with means it never starts again) and no tab is in
 * it. An orphaned file, one whose record was deleted, or one whose mark
 * tells nothing stays held; a deleted one claimed, not uploaded and not stale
 * (no guest record, nor a change it drops, took it over: marked stale) is
 * marked orphaned for its account to settle (see settleOrphanedLocalFiles).
 */
async function releaseRetiredNamespaces() {
  const locks = await globalThis.navigator?.locks?.query();
  if (!locks) return;
  const dapId = await clientStorage.get(ClientStorageKey.DAP_ID);
  const live = [...(locks.held ?? []), ...(locks.pending ?? [])];
  const current = datafn.currentNamespace();
  const isRetired = (namespace: unknown) =>
    dapId !== null &&
    typeof namespace === "string" &&
    resolveMigrationQueueDir(namespace) !== null &&
    namespace !== current &&
    namespace !== `guest:${dapId}` &&
    !live.some(({ name }) => name === liveLockName(namespace));
  const deleted = new Set<string>();
  const dropped: PendingChange[] = [];
  for (const change of readPendingChanges()) {
    if (!isRetired(change.namespace)) continue;
    if (change.action !== "delete") dropped.push(change);
    else deleted.add(`${change.namespace}\n${change.id}`);
  }
  for (const entry of await listQueuedFiles(LOCAL_FILE_QUEUE_DIR, true)) {
    if (!isRetired(entry.namespace)) continue;
    const { fileId } = entry;
    let { stale } = entry;
    const isDeleted =
      entry.isDeleted || deleted.has(`${entry.namespace}\n${entry.recordId}`);
    const isTakenOver = dropped.some((c) => c.namespace === entry.namespace);
    if ((entry.isOrphaned || isDeleted) && isTakenOver && stale === undefined) {
      await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, fileId);
      stale = "changed";
    }
    if (entry.isOrphaned) continue;
    if (!isDeleted) {
      if (stale !== undefined)
        await clearQueuedFileStale(LOCAL_FILE_QUEUE_DIR, fileId);
    } else if (entry.claim && !entry.isUploaded && stale === undefined) {
      await markQueuedFileOrphaned(LOCAL_FILE_QUEUE_DIR, fileId);
    } else await markQueuedFileStale(LOCAL_FILE_QUEUE_DIR, fileId, true);
  }
  dropped.forEach(removePendingChange);
}

function logReleaseError(error: unknown) {
  logger.warn({ at: "deviceFileQueue.release", error });
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
function retryChangePass(namespace: string, isFull: boolean) {
  const count = passRetries.get(namespace) ?? 0;
  if (count >= PASS_RETRY_MS.length) return;
  passRetries.set(namespace, count + 1);
  setTimeout(() => {
    if (datafn.currentNamespace() === namespace)
      void scheduleChangePass(namespace, isFull);
  }, PASS_RETRY_MS[count]);
}

/**
 * Copies a guest namespace's pending changes to their local files, under the
 * queue's lock, and removes those it copied; a full pass (as the namespace
 * starts) reconciles all its files and releases retired namespaces'. A pass
 * keeps pending what it could not copy, marked stale, and runs again (see
 * retryChangePass).
 */
function scheduleChangePass(namespace: string, isFull = false) {
  if (!resolveMigrationQueueDir(namespace)) return localRecordWork;
  const { signal } = new AbortController();
  const work = localRecordWork.then(async () => {
    await fences;
    await withQueueLock(LOCAL_FILE_QUEUE_DIR, signal, async () => {
      const pending = readPendingChanges(namespace);
      const failed = await reconcileLocalFiles(namespace, pending, isFull);
      if (isFull) await releaseRetiredNamespaces().catch(logReleaseError);
      for (const change of pending) {
        if (failed.includes(change.id)) unfenced.delete(change.key);
        else removePendingChange(change);
      }
      for (const id of failed)
        if (!pending.some((change) => change.id === id))
          addPendingChange(namespace, id);
      if (!failed.length) passRetries.delete(namespace);
      else retryChangePass(namespace, false);
    }).catch((error: unknown) => {
      logger.error({ at: "deviceFileQueue.records", error });
      retryChangePass(namespace, isFull);
    });
  });
  localRecordWork = work;
  return work;
}

/**
 * Uploads the device's local files (a local-only user's) through the signed-in
 * cloud account's client and publishes their records in the account, so the
 * account holds a record of each file it receives (see replayFileQueue),
 * once retired guest namespaces are released and the account's orphaned
 * files settled (see settleOrphanedLocalFiles).
 */
export async function uploadLocalQueuedFiles(uploader: FileQueueUploader) {
  if (!globalThis.navigator?.locks) return;
  await settleLocalFileRecords();
  if (uploader.signal.aborted) return;
  await withQueueLock(
    LOCAL_FILE_QUEUE_DIR,
    uploader.signal,
    releaseRetiredNamespaces
  ).catch(logReleaseError);
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
 * check of its records and the delete. An orphan stays while its guest
 * namespace has a change not yet copied, which may take it over; that is
 * checked again after the records' query, after a new discard mark (then
 * removed) and before the dequeue: a file whose upload is deleted never
 * publishes, even when a guest record takes it over before its dequeue.
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
    entry.claim.baseUrl === baseUrl &&
    !readPendingChanges(String(entry.namespace)).some(
      ({ action }) => action !== "delete"
    );
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
    const isOrphan = async () =>
      Boolean(
        isOrphanOf(
          (await listQueuedFiles(LOCAL_FILE_QUEUE_DIR, true)).find(
            (queued) => queued.fileId === fileId
          )
        )
      );
    if (!(await isOrphan())) return true;
    if (!publisher.isReady()) return false;
    const result = await datafn.file.query({
      filters: { fileId },
      limit: 1,
      metadata: ALL_RECORDS
    });
    if (!publisher.isReady() || !Array.isArray(result.data)) return false;
    if (!(await isOrphan())) return true;
    if (!result.data.length) {
      const was = await markQueuedFileDiscarded(LOCAL_FILE_QUEUE_DIR, fileId);
      if (!was && !(await isOrphan())) {
        await markQueuedFileDiscarded(LOCAL_FILE_QUEUE_DIR, fileId, false);
        return true;
      }
      const pend = () => recordFileFnPendingDelete(uploader, fileId);
      if (isAppOffline()) await pend();
      else await client.deleteFile(fileId).catch(pend);
    }
    await dequeueFile(LOCAL_FILE_QUEUE_DIR, fileId, isOrphan);
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
 * each, `<PENDING_PREFIX><namespace>:<record ID>`, valued `<action>:<token>`,
 * so a reload and other tabs keep them, and a pass removes only those it
 * read and that did not change since; also in page memory, so this tab's
 * pass copies them after another tab's sign-out cleared local storage.
 * A local file's durable hold is its stale mark (see fenceChanges); until
 * that mark is written, its local-storage entry holds it, and its memory
 * entry too while either could not be written (`unfenced`).
 */
const PENDING_PREFIX = `${LOCAL_FILE_QUEUE_DIR}-pending:`;
const memoryPending = new Map<string, string>();
const unfenced = new Set<string>();

type PendingChange = {
  key: string;
  value: string;
  namespace: string;
  id: string;
  action: string;
};

function pendingKey(namespace: string, id: string) {
  return PENDING_PREFIX + [namespace, id].map(encodeURIComponent).join(":");
}

/** Reads a pending change's local-storage entry. */
function readStoredChange(key: string) {
  try {
    return globalThis.localStorage?.getItem(key) ?? undefined;
  } catch (error) {
    logger.warn({ at: "deviceFileQueue.pending", error });
    return undefined;
  }
}

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

function isPendingDelete(key: string) {
  return [memoryPending.get(key), readStoredChange(key)].some((value) =>
    value?.startsWith("delete:")
  );
}

/** Records a pending change; a record's delete stays one. */
function addPendingChange(namespace: string, id: string, action = "change") {
  const key = pendingKey(namespace, id);
  const isDeleted = isPendingDelete(key);
  const value = `${isDeleted ? "delete" : action}:${crypto.randomUUID()}`;
  memoryPending.set(key, value);
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch (error) {
    logger.warn({ at: "deviceFileQueue.pending", error });
    unfenced.add(key);
  }
}

/** Removes a pending change, unless it was recorded again since it was read. */
function removePendingChange({ key, value }: PendingChange) {
  if (memoryPending.get(key) === value) memoryPending.delete(key);
  if (!memoryPending.has(key)) unfenced.delete(key);
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
  const key = pendingKey(record.namespace, record.id);
  return unfenced.has(key) || readStoredChange(key) !== undefined;
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
 * orphaned or deleted ones, which a changed record may take over, stale at
 * once, without the lock. Changes whose marks could not be written stay held
 * in page memory until a pass handles them.
 */
function fenceChanges(namespace: string, ids: string[], isDeleted: boolean) {
  fences = fences
    .then(async () => {
      for (const entry of await listQueuedFiles(LOCAL_FILE_QUEUE_DIR)) {
        if (entry.namespace !== namespace) continue;
        const isChanged = ids.includes(entry.recordId ?? "");
        if (isChanged || entry.isOrphaned || entry.isDeleted)
          await markQueuedFileStale(
            LOCAL_FILE_QUEUE_DIR,
            entry.fileId,
            isChanged && isDeleted
          );
      }
    })
    .catch((error) => {
      logger.warn({ at: "deviceFileQueue.fence", error });
      for (const id of ids) {
        const key = pendingKey(namespace, id);
        if (memoryPending.has(key)) unfenced.add(key);
      }
    });
}

/**
 * Binds the FileFn OPFS queue to the app: each local-only (guest) DataFn
 * namespace that starts reconciles its local files with its records at
 * once (see resolveMigrationQueueDir) and is held live while DataFn is in it
 * (see holdNamespace), each change to a local-only `file`
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
  let leaveNamespace = () => undefined as void;
  const stopRuntime = datafnRuntime.subscribe((runtime) => {
    leaveNamespace();
    leaveNamespace = holdNamespace(runtime?.namespace);
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
    leaveNamespace();
    stopUploads();
  };
}
