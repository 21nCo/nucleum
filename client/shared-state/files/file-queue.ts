import {
  FileFnHttpError,
  OPFSStore,
  type FileFnClient,
  type PendingUpload,
  type UploadResult
} from "@filefn/client";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { DEVICE_THUMBNAIL_KIND } from "@nucleum/shared-state/files/file-processing";

/**
 * The FileFn OPFS queue of files kept on the device until they upload: files
 * captured offline by a cloud account, in the account's queue, and files
 * captured by a local-only user, in the device's local queue, which the first
 * cloud account that signs in uploads. Each file is one FileFn `OPFSStore`
 * entry named after its `fileId`, so staging the same file again (a migration
 * resumed after an interruption) overwrites it rather than adding another.
 *
 * An entry uploads only once it is marked committed, after the record that
 * references it is saved, so a file whose record never saved never reaches an
 * account. An account's entry is removed once it uploads, as the account's
 * record already references it. A local entry also keeps a copy of its
 * local-only record as it currently is (see device-file-queue), which the
 * upload publishes as a record of the account. The first account ready to
 * upload it claims it, so only that account ever uploads it, and once
 * published it stays on the device, marked uploaded, so the local-only record
 * still renders after the account signs out.
 */

const QUEUE_DIR_PREFIX = "nucleum-file-queue";
/** Queue of files captured while no cloud account was signed in. */
export const LOCAL_FILE_QUEUE_DIR = `${QUEUE_DIR_PREFIX}-local`;
const QUEUE_LOCK_PREFIX = "nucleum-file-queue-replay";
const ENTRY_PREFIX = "queued_";
const THUMBNAIL_PREFIX = "thumbnail-";
const THUMBNAIL_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const RECORD_FILE = "record.json";
const UPLOADED_FILE = "uploaded";
const PUBLISHING_FILE = "publishing";
const COMMITTED_FILE = "committed";
const CLAIM_FILE = "claim.json";
const STALE_FILE = "stale";
/** Marks a local file whose record was deleted; only its record's copy clears it. */
const DELETED_FILE = "deleted";
const CHANGED_MARK = "changed";
/** Marks a claimed local file whose record was deleted (see device-file-queue). */
const ORPHANED_FILE = "orphaned";
/** Marks a local file whose upload its account deleted: it never publishes. */
const DISCARDED_FILE = "discarded";
/** Started markers: `started-<attempt>`, one per attempt (`started` earlier). */
const STARTED_FILE = "started";
/**
 * Marks an account's file whose thumbnail the replay sent, or gave up on, so
 * a later pass or backup does not send or copy it again.
 */
const THUMBNAIL_SENT_FILE = "sent-thumbnail";
/** Marks a thumbnail FileFn rejected for good: sent no more, still backed up. */
const THUMBNAIL_REJECTED_FILE = "rejected-thumbnail";
/**
 * Marks an account's file whose delivery its replay confirmed (see
 * replayAccountEntry) when it could not then leave the queue, so a later
 * pass reads its delivery (see readDelivery) instead of sending it again.
 */
const DELIVERED_FILE = "delivered";
/**
 * Restore marks, each created empty, so its name alone carries its meaning
 * and an interrupted write never leaves one half written. A restore writing
 * a file creates `restoring-<generation>` first, with a new generation ID
 * that names this copy of the file for as long as it is queued, and
 * `published-<generation>` last, once the rest of the entry is written:
 * until then the entry is unpublished, and URL resolution, backups and the
 * replay ignore it, the replay removing it once no restore can still be
 * writing it. A published one is held for its account, never uploaded,
 * removed or discarded, until the account adopts it, once a record of the
 * account references it (`adopted-<generation>`, or an adoption row when
 * that mark cannot be created; see adoptEntry), or no record did by the end
 * of its grace (see takeOverRestoredEntry); the replay's rules then
 * apply. Restore sessions also hold files with hold rows (see HoldRow).
 */
const RESTORING_PREFIX = "restoring-";
const PUBLISHED_PREFIX = "published-";
const ADOPTED_PREFIX = "adopted-";
/**
 * Marks a published file held for its account that a restore which went on
 * to import its records relied on (see settleRestoredFiles), so no earlier
 * restore's rollback removes it.
 */
const SETTLED_PREFIX = "settled-";
/** Marks a file a restore into the queue's own account wrote. */
const OWN_PREFIX = "own-";
/**
 * Binds a restored file to the queue's account (`bound-<generation>~<digest
 * of the owner>~<order>`, see toBoundMark, the owner's claim) when its replay took the file on a record's reference
 * while no adoption could be recorded, written before any request (see
 * isBound), apart from the started markers that tell whether one was sent.
 */
const BOUND_PREFIX = "bound-";
/**
 * Marks a file whose original FileFn rejected for good (`failed-<generation>`,
 * see RejectedUploadError), holding the rejection's status and code: the
 * file keeps its bytes and renders on the device, and no replay uploads it
 * until the user retries it (see retryFailedQueuedFile). Named after its
 * generation, so a restore that writes the file again starts unmarked.
 */
const FAILED_PREFIX = "failed-";
/**
 * Marks a failed local file another account claimed that the guest retried
 * (`retry-<generation>`): it stays failed, so the guest still sees it and
 * its Retry, until its claimant's next pass removes both marks and uploads
 * it again (see retryFailedQueuedFile).
 */
const RETRY_PREFIX = "retry-";
const MAKE = { create: true };
/** The generation of a file no restore wrote. */
const BASE_GENERATION = "base";

/** FileFn upload policies the account service registers (Nucleus policies). */
export const DURABLE_UPLOAD_POLICY = "nucleus-durable-default";
export const TEMPORARY_UPLOAD_POLICY = "nucleus-temporary-default";

/** A file to keep on the device until it uploads. */
export type QueuedFileInput = {
  fileId: string;
  fileName: string;
  contentType: string;
  blob: Blob;
  thumbnailBlob?: Blob;
  isTemp?: boolean;
  /** The local-only record of a file in the local queue (see enqueueFile). */
  record?: QueuedFileRecord;
  /** The account and FileFn authority an account's file is captured at. */
  claim?: QueuedFileClaim;
};

/** The fields of the DataFn `file` record a queued local file belongs to. */
export type QueuedFileRecord = { id: string } & Record<string, unknown>;

/** The cloud account, at its FileFn authority, that a local file uploads to. */
export type QueuedFileClaim = { userId: string; baseUrl: string };

/**
 * Publishes the record of a local file that uploaded, so the account holds a
 * record of every local file it uploads. `isReady` is checked before each
 * upload; a pass stops while it is false, keeping the files for a later one.
 * `owner` claims each local file before its upload. A file whose record
 * copy `isHeld` (a change to its record not yet copied) neither uploads nor
 * publishes. A publish that resolves false saved nothing.
 */
export type QueuedFilePublisher = {
  owner: QueuedFileClaim;
  isReady(): boolean;
  isHeld?(record: QueuedFileRecord): boolean;
  publish(
    record: QueuedFileRecord,
    uploaded: UploadResult,
    entry: {
      isCurrent(): Promise<boolean>;
      saved: string[];
      mark(name: "saved" | "uploaded", text: string): Promise<void>;
    }
  ): Promise<boolean | void>;
};

/**
 * The records of the account whose queue replays (see replayFileQueue), at
 * the `owner` authority: whether they still are the owner's there, checked
 * without waiting, bringing them fully up to date with the authority (false
 * while they cannot be), whether one references a file, undefined while they
 * cannot be read, and the delete of an uploaded file whose record was
 * deleted, at that authority, resolving false when it sent no delete or
 * recorded none, or the records stopped being current meanwhile. `view`
 * names the DataFn scope they are read from (see toRecordsView), if known.
 */
export type QueuedFileReferences = {
  owner: QueuedFileClaim;
  isCurrent(): boolean;
  sync(): Promise<boolean>;
  isReferenced(fileId: string): Promise<boolean | undefined>;
  discard(fileId: string): Promise<boolean | void>;
  view?(): string | undefined;
};

/**
 * Names the DataFn scope that decides whether a runtime holds a record: its
 * namespace and local copy, whatever its connectivity (local-only while
 * offline, synced once online), or in direct mode, without a local copy,
 * its authority; so only a query of the same scope tells that a record a
 * restore imported there is gone (see reconcileForeignRows), and a direct
 * query never counts for records a local copy may hold alone. Undefined
 * without a runtime.
 */
export function toRecordsView(
  runtime:
    | {
        namespace: string;
        remoteUrl: string | null;
        storageDbName: string | null;
      }
    | null
    | undefined
) {
  if (!runtime) return undefined;
  const { namespace, remoteUrl, storageDbName } = runtime;
  const scope = storageDbName
    ? `store:${storageDbName}`
    : `direct:${remoteUrl}`;
  return `${namespace}|${scope}`;
}

/**
 * A fixed-length digest of a value, for a field of a row name (see
 * HoldRow): two 53-bit hashes (cyrb53) with different seeds, 28 hex digits,
 * computed without waiting, so it never delays a replay's timers.
 */
function toRowDigest(value: string) {
  const hash = (seed: number) => {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let at = 0; at < value.length; at++) {
      const code = value.codePointAt(at) ?? 0;
      h1 = Math.imul(h1 ^ code, 2654435761);
      h2 = Math.imul(h2 ^ code, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const high = (h2 & 0x1fffff) * 0x100000000 + (h1 >>> 0);
    return high.toString(16).padStart(14, "0");
  };
  return `${hash(1)}${hash(2)}`;
}

/**
 * The destination fields of a foreign row (see HoldRow) for an account, a
 * DataFn scope (see toRecordsView) and the account's FileFn authority (see
 * QueuedFileClaim): the scope's kind (`s` for a local copy, `d` for a direct
 * authority) followed by the digest of the account, namespace and scope,
 * and the digest of the account, namespace and authority, empty when the
 * authority is unknown; both empty without a scope.
 */
function toRowDestination(
  account: string,
  view: string | undefined,
  authority: string | undefined
) {
  const at = view?.indexOf("|") ?? -1;
  const namespace = view?.slice(0, at) ?? "";
  const toScope = (scope: string) =>
    `${scope.startsWith("store:") ? "s" : "d"}${toRowDigest(
      `${account}\n${namespace}\n${scope}`
    )}`;
  if (!view || at < 0) return { scope: "", authority: "" };
  return {
    scope: toScope(view.slice(at + 1)),
    authority: authority
      ? toRowDigest(`${account}\n${namespace}\n${authority}`)
      : ""
  };
}

/** What a queue holds of a file, for reconciling it with its record. */
export type QueuedFileEntry = {
  fileId: string;
  createdAt: string;
  /** The ID of the record a local file was staged or last copied with. */
  recordId?: string;
  namespace?: unknown;
  isCommitted: boolean;
  isUploaded: boolean;
  /** Stale mark: "changed", or "" (an earlier build's, unknown). */
  stale?: string;
  isDeleted: boolean;
  /** The names of its stale and deleted marks (see readHoldMarks). */
  marks: string[];
  /** The changes its record copy covers (see writeQueuedFileRecord). */
  covered: string[];
  isOrphaned: boolean;
  claim?: QueuedFileClaim;
};

/** Returns the queue of a cloud account's files captured offline. */
export function resolveAccountFileQueueDir(userId: string): string {
  return `${QUEUE_DIR_PREFIX}-account-${encodeURIComponent(userId)}`;
}

/**
 * Returns the queues whose files a cloud account, or with none (null) the
 * device, renders from the device: the account's own queue and the device's
 * local queue.
 */
export function resolveFileQueueDirsOf(userId: string | null): string[] {
  return userId
    ? [resolveAccountFileQueueDir(userId), LOCAL_FILE_QUEUE_DIR]
    : [LOCAL_FILE_QUEUE_DIR];
}

/** True when the device has the origin private file system the queue uses. */
export function isFileQueueSupported(): boolean {
  return OPFSStore.isSupported();
}

const stores = new Map<string, OPFSStore>();

function getStore(dir: string) {
  let store = stores.get(dir);
  if (!store) {
    store = new OPFSStore({ rootDir: dir });
    stores.set(dir, store);
  }
  return store;
}

function toEntryName(fileId: string) {
  return `${ENTRY_PREFIX}${fileId}`;
}

/**
 * Keeps a file and its thumbnail in a queue until it uploads. Staging the
 * same `fileId` again replaces the entry. A thumbnail that cannot be kept is
 * logged and left out; the original is what the file needs. The record
 * metadata a local file is published with, or the authority an account's
 * file is captured at, is written after the original, and a failure to write
 * it removes the entry and rejects, so an entry the replay reads has both.
 */
export async function enqueueFile(
  dir: string,
  input: QueuedFileInput
): Promise<void> {
  await bumpRevision(dir);
  try {
    await writeQueuedEntry(dir, input);
  } finally {
    await bumpRevisionAfter(dir);
  }
}

async function writeQueuedEntry(dir: string, input: QueuedFileInput) {
  const entryName = toEntryName(input.fileId);
  const pending: PendingUpload = {
    uploadSessionId: entryName,
    fileId: input.fileId,
    policy: input.isTemp ? TEMPORARY_UPLOAD_POLICY : DURABLE_UPLOAD_POLICY,
    fileName: input.fileName,
    size: input.blob.size,
    mimeType: input.contentType,
    fileData: await input.blob.arrayBuffer(),
    createdAt: new Date().toISOString(),
    retryCount: 0
  };
  const store = getStore(dir);
  await store.stagePendingUpload(pending);
  if (input.record || input.claim) {
    try {
      if (input.claim) await claimEntry(dir, entryName, input.claim);
      if (input.record) {
        await writeEntryFile(
          dir,
          entryName,
          RECORD_FILE,
          JSON.stringify(input.record)
        );
      }
    } catch (error) {
      await store.deletePendingUpload(entryName).catch(() => undefined);
      throw error;
    }
  }
  if (!input.thumbnailBlob) return;
  try {
    const type = THUMBNAIL_TYPES.has(input.thumbnailBlob.type)
      ? input.thumbnailBlob.type
      : "image/jpeg";
    await writeEntryFile(
      dir,
      entryName,
      `${THUMBNAIL_PREFIX}${type.split("/")[1]}`,
      await input.thumbnailBlob.arrayBuffer()
    );
  } catch (error) {
    logger.warn({
      at: "fileQueue.enqueue.thumbnail",
      fileId: input.fileId,
      error
    });
  }
}

/**
 * Removes a file from a queue, if it is there, resolving whether it did:
 * with `isAllowed`, only while it resolves true, checked once the change is
 * marked as far as it can be (see markChange), right before the removal.
 * The FileFn store ignores a removal that fails, so the entry is looked up
 * again, and one found still there, or a lookup that fails, rejects with an
 * UnconfirmedRemovalError, for the caller to retry; it may then record what
 * the removal would have freed room for (see logDelivered). The held URL of
 * an entry it could not look up is released once a pass finds it gone (see
 * confirmRemovals).
 */
export async function dequeueFile(
  dir: string,
  fileId: string,
  isAllowed?: () => Promise<boolean>
): Promise<boolean> {
  const entryName = toEntryName(fileId);
  await markChange(dir);
  if (isAllowed && !(await isAllowed())) return false;
  await getStore(dir).deletePendingUpload(entryName);
  const key = `${dir}\n${entryName}`;
  const isLeft = await getEntryDir(dir, entryName, true).then(Boolean, () => {
    unconfirmedRemovals.add(key);
    return true;
  });
  if (isLeft) throw new UnconfirmedRemovalError();
  unconfirmedRemovals.delete(key);
  await bumpRevisionAfter(dir);
  releaseQueuedFileUrls((held) => held === key);
  notifyFailureChange(fileId);
  return true;
}

/**
 * Entries (queue, entry) dequeueFile removed but could not look up again,
 * so a later pass releases their held URL once it finds them gone (see
 * confirmRemovals).
 */
const unconfirmedRemovals = new Set<string>();

/**
 * Releases the held download URL of each of a queue's entries whose removal
 * dequeueFile could not confirm (see unconfirmedRemovals) once a lookup
 * finds it gone; one found there keeps its URL, and one that still cannot be
 * read is looked up again by the next pass.
 */
async function confirmRemovals(dir: string) {
  for (const key of unconfirmedRemovals) {
    const [keyDir, entryName] = key.split("\n");
    if (keyDir !== dir) continue;
    const entry = await getEntryDir(dir, entryName, true).catch(() => false);
    if (entry === false) continue;
    unconfirmedRemovals.delete(key);
    if (!entry) {
      releaseQueuedFileUrls((held) => held === key);
      notifyFailureChange(entryName.slice(ENTRY_PREFIX.length));
    }
  }
}

/** A removal dequeueFile attempted but could not confirm. */
class UnconfirmedRemovalError extends Error {
  constructor() {
    super("A queued file could not be removed");
  }
}

/**
 * Marks a queued file committed once the record that references it is saved;
 * only a committed file uploads.
 */
export async function markQueuedFileCommitted(
  dir: string,
  fileId: string
): Promise<void> {
  await writeEntryFile(dir, toEntryName(fileId), COMMITTED_FILE, "");
}

/**
 * What a local file's record copy write covers once a locked reread verified
 * it: the changes `covered` lists and those of the marks `listed` before
 * that reread; `isHeld` tells whether its record has a pending change the
 * copy does not cover (see settleMarks).
 */
export type QueuedFileCover = {
  covered: string[];
  listed: string[];
  isHeld?: (copy: QueuedFileRecord) => boolean;
};

/**
 * Replaces the copy of a local file's record with the record as it is now,
 * which its upload publishes, clears its orphaned mark and resolves the
 * names of its stale and deleted marks. The copy covers the changes the copy
 * it replaces covered (see withCover) and those of a verified `cover`, whose
 * marks it then settles (see settleMarks). An "unverified" write clears
 * none; one without `cover` clears the plain marks, as an earlier build's
 * does. A prior copy it cannot read fails it, keeping that copy's cover. The
 * cover is not capped (one token per change of its record while the file is
 * local): another tab's memory of a change it dropped would hold the file
 * again.
 */
export async function writeQueuedFileRecord(
  dir: string,
  fileId: string,
  record: QueuedFileRecord,
  cover?: QueuedFileCover | "unverified"
) {
  const entryName = toEntryName(fileId);
  const was = await readQueuedRecord(dir, entryName, true);
  const verified = typeof cover === "object" ? cover : undefined;
  const listed = verified?.listed ?? [];
  const marked = listed.flatMap((name) => toMarkGeneration(name) ?? []);
  const copy = withCover(record, was, verified?.covered ?? [], marked);
  await writeEntryFile(dir, entryName, RECORD_FILE, JSON.stringify(copy));
  const entry = await getEntryDir(dir, entryName, true);
  await removeMark(entry, ORPHANED_FILE);
  if (cover === "unverified") return toHoldMarks(await readNames(entry));
  if (verified) return settleMarks(dir, entryName, HOLD_MARKS, copy, verified);
  for (const mark of HOLD_MARKS) await removeMark(entry, mark);
  return [];
}

/** Settles a local file's marks by its copy (see settleMarks), in any namespace. */
export async function settleQueuedFileMarks(
  dir: string,
  fileId: string,
  isHeld?: QueuedFileCover["isHeld"]
) {
  const entryName = toEntryName(fileId);
  const copy = await readQueuedRecord(dir, entryName, true);
  await settleMarks(dir, entryName, HOLD_MARKS, copy, { listed: [], isHeld });
}

/**
 * A record copy covering the changes its prior copy `was` covered (another
 * record's, too: change generations are unique, and a takeover's copy comes
 * after them) and those `tokens` list.
 */
function withCover<T>(record: T, was: unknown, ...tokens: string[][]) {
  const all = [...toCovered(was), ...tokens.flat()];
  return { ...record, covered: [...new Set(all)] };
}

const HOLD_MARKS = [STALE_FILE, DELETED_FILE];

/** The names of a local file's stale and deleted marks (a generation's, too). */
function toHoldMarks(names: string[]) {
  return names.filter(
    (name) => HOLD_MARKS.includes(name) || toMarkGeneration(name)
  );
}

/** The names of a local file's stale and deleted marks, read strictly. */
export async function listQueuedFileMarks(dir: string, fileId: string) {
  return toHoldMarks(
    await readNames(await getEntryDir(dir, toEntryName(fileId), true))
  );
}

/**
 * Settles the marks of `kinds` of a local file under the queue's lock, by
 * its record `copy`, without reading a plain mark's text: it clears the marks
 * of a generation the copy covers first, then a plain mark only when a rescan
 * finds no open generation mark of its kind and `isHeld` finds no pending
 * change the copy does not cover, and it was `listed` before a locked reread
 * that verified the copy, or is a deleted mark beside a covered generation's
 * mark (a fence's; an earlier build's has none, a restore's is open), which it
 * keeps until the plain mark is cleared, so a retry can still clear it. A
 * plain stale mark has no owner (an earlier build's fence finds it set and
 * writes none), so only a listing clears it. It then sets a plain mark again
 * (an earlier build's tab reads only those) while an uncovered generation's
 * mark holds, also when that covered mark's removal failed.
 */
async function settleMarks(
  dir: string,
  entryName: string,
  kinds: string[],
  copy: unknown,
  { listed, isHeld }: Pick<QueuedFileCover, "listed" | "isHeld">
) {
  const entry = await getEntryDir(dir, entryName, true);
  const covered = toCovered(copy);
  const ofKind = (names: string[], kind: string) =>
    names.filter(
      (name) => name.startsWith(`${kind}.`) && toMarkGeneration(name)
    );
  const names = await readNames(entry);
  const isPending = () => !!copy && isHeld?.(copy as QueuedFileRecord) === true;
  const isOpen = (name: string) =>
    !covered.includes(String(toMarkGeneration(name)));
  const owners = kinds.map((kind) =>
    kind !== STALE_FILE && names.includes(kind)
      ? ofKind(names, kind).find((name) => !isOpen(name))
      : undefined
  );
  for (const kind of kinds)
    for (const name of ofKind(names, kind))
      if (!isOpen(name) && !owners.includes(name))
        await removeMark(entry, name);
  const now = await readNames(entry);
  let failed: { error: unknown } | void = undefined;
  for (const [index, kind] of kinds.entries()) {
    const owner = owners[index];
    const isClear = !ofKind(now, kind).some(isOpen) && !isPending();
    if (!now.includes(kind) || !(listed.includes(kind) || owner) || !isClear)
      continue;
    await removeMark(entry, kind);
    if (owner)
      failed =
        (await removeMark(entry, owner).catch((error: unknown) => ({
          error
        }))) || failed;
  }
  const after = await readNames(entry);
  for (const kind of kinds)
    if (ofKind(after, kind).some(isOpen) && !after.includes(kind)) {
      await writeEntryFile(
        dir,
        entryName,
        kind,
        kind === STALE_FILE ? CHANGED_MARK : ""
      );
      after.push(kind);
    }
  if (failed) throw failed.error;
  return toHoldMarks(after);
}

async function removeMark(
  entry: FileSystemDirectoryHandle | null | undefined,
  mark: string
) {
  await entry?.removeEntry(mark).catch((error: Error) => {
    if (error?.name !== "NotFoundError") throw error;
  });
}

/**
 * Marks a local file orphaned: it does not publish until its copy is
 * rewritten. Once that mark is written, its copy covers the changes
 * `covered` lists and those of the marks `listed`, all before its record's
 * lookups, and its stale marks are settled (see settleMarks).
 */
export async function markQueuedFileOrphaned(
  dir: string,
  fileId: string,
  listed: string[] = [],
  covered: string[] = []
) {
  const name = toEntryName(fileId);
  const marked = listed.flatMap((mark) => toMarkGeneration(mark) ?? []);
  const was = await readQueuedRecord(dir, name, true);
  const copy = was && withCover(was, was, covered, marked);
  await writeEntryFile(dir, name, ORPHANED_FILE, "");
  if (copy && covered.length + marked.length)
    await writeEntryFile(dir, name, RECORD_FILE, JSON.stringify(copy));
  await settleMarks(dir, name, [STALE_FILE], copy, { listed });
}

/** A new change generation: `<ms>-<uuid>` (its time is never compared). */
export function toChangeGeneration() {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

const GENERATION = /^\d+-[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

/** The generation of a stale or deleted mark (`<mark>.<generation>`). */
function toMarkGeneration(name: string) {
  const dot = name.indexOf(".");
  const [mark, generation] = [name.slice(0, dot), name.slice(dot + 1)];
  const isMark = [STALE_FILE, DELETED_FILE].includes(mark);
  return isMark && GENERATION.test(generation) ? generation : undefined;
}

/** The change generations a record copy covers (see writeQueuedFileRecord). */
export function toCovered(record: unknown): string[] {
  const covered = Object(record).covered;
  return Array.isArray(covered)
    ? covered.filter((token) => typeof token === "string")
    : [];
}

/**
 * Whether a local file's marks hold it stale or deleted: a local file's one
 * hold rule (its listing, its publish, its backup's restore). Marks of a kind
 * hold while its plain mark is set (only a locked settle clears it; see
 * settleMarks) or one is of a change generation its record copy does not cover.
 */
function toHold(names: string[], record: unknown) {
  const covered = toCovered(record);
  const holds = (kind: string) =>
    names.includes(kind) ||
    names.some((name) => {
      const generation = toMarkGeneration(name);
      return (
        name.startsWith(`${kind}.`) &&
        generation &&
        !covered.includes(generation)
      );
    });
  return { isStale: holds(STALE_FILE), isDeleted: holds(DELETED_FILE) };
}

/** Reads a local file's hold (see toHold) and its stale and deleted marks. */
async function readHoldMarks(
  dir: string,
  entryName: string,
  record: QueuedFileRecord | undefined,
  isStrict = false
) {
  const names = await readNames(
    await getEntryDir(dir, entryName, isStrict)
  ).catch((error: unknown) => {
    if (isStrict) throw error;
    return [] as string[];
  });
  const { isStale, isDeleted } = toHold(names, record);
  const text = names.includes(STALE_FILE)
    ? await readEntryText(dir, entryName, STALE_FILE, isStrict)
    : undefined;
  return {
    stale: isStale ? (text ?? CHANGED_MARK) : undefined,
    isDeleted,
    marks: toHoldMarks(names)
  };
}

/** Marks a local file discarded (or not); resolves whether it already was. */
export async function markQueuedFileDiscarded(
  dir: string,
  fileId: string,
  isDiscarded = true
) {
  const name = toEntryName(fileId);
  const was = await readEntryText(dir, name, DISCARDED_FILE, true);
  const entry = await getEntryDir(dir, name, true);
  if (isDiscarded) await entry?.getFileHandle(DISCARDED_FILE, { create: true });
  else await removeMark(entry, DISCARDED_FILE);
  return was !== undefined;
}

/** Lets a stale local file whose marks say its record changed publish its copy. */
export async function clearQueuedFileStale(dir: string, fileId: string) {
  const name = toEntryName(fileId);
  const text = await readEntryText(dir, name, STALE_FILE, true);
  if ((text ?? CHANGED_MARK) !== CHANGED_MARK) return;
  const entry = await getEntryDir(dir, name, true);
  for (const mark of await readNames(entry))
    if (
      mark === STALE_FILE ||
      (mark.startsWith(`${STALE_FILE}.`) && toMarkGeneration(mark))
    )
      await removeMark(entry, mark);
}

/**
 * Marks a local file's record copy stale, when its record changed but could
 * not be read again: the file does not upload until a copy that covers the
 * change `generation` (see toHold) replaces it. A deleted record
 * (`isDeleted`) gets its own mark. It writes none when the record copy
 * already covers the generation (a fence that lands after a verified copy of
 * its change), else a plain deleted mark if absent first (an earlier build
 * reads only those), then the generation's mark, written again once if that
 * fails, and, unless the copy read again covers it, the plain mark if
 * absent. It never rewrites a plain mark. A fence without `generation` marks
 * an uncovered generation of its kind, or a new one (only a listing covers it).
 */
export async function markQueuedFileStale(
  dir: string,
  fileId: string,
  isDeleted = false,
  generation?: string
) {
  const name = toEntryName(fileId);
  const mark = isDeleted ? DELETED_FILE : STALE_FILE;
  const readCovered = async () => toCovered(await readQueuedRecord(dir, name));
  const was = await readCovered();
  const names = generation
    ? []
    : await readNames(await getEntryDir(dir, name)).catch(() => []);
  const open = names.find(
    (at) =>
      at.startsWith(`${mark}.`) && !was.includes(toMarkGeneration(at) ?? "")
  );
  const at =
    generation ?? (open && toMarkGeneration(open)) ?? toChangeGeneration();
  if (was.includes(at)) return;
  const hasMark = async () =>
    (await readEntryText(dir, name, mark, true)) !== undefined;
  if (isDeleted && !(await hasMark().catch(() => true)))
    await writeEntryFile(dir, name, mark, "").catch(() => {});
  const write = () => writeEntryFile(dir, name, `${mark}.${at}`, "");
  const failed = await write()
    .catch(write)
    .then(
      () => undefined,
      (error: unknown) => ({ error })
    );
  if ((await readCovered()).includes(at)) return;
  if (!(await hasMark()))
    await writeEntryFile(dir, name, mark, isDeleted ? "" : CHANGED_MARK);
  if (failed) throw failed.error;
}

/** Lists the files of a queue whose staging finished. */
export async function listQueuedFiles(dir: string, isStrict = false) {
  if (!isFileQueueSupported()) return [];
  const store = getStore(dir);
  const entries: QueuedFileEntry[] = [];
  for (const entryName of await store.listPendingUploads()) {
    if (!entryName.startsWith(ENTRY_PREFIX)) continue;
    const pending = await store.getPendingUpload(entryName);
    if (!pending?.fileId) continue;
    const record = await readQueuedRecord(dir, entryName, isStrict);
    entries.push({
      fileId: pending.fileId,
      createdAt: pending.createdAt,
      recordId: record?.id,
      namespace: record?.namespace,
      isCommitted: await hasEntryFile(dir, entryName, COMMITTED_FILE),
      isUploaded:
        (await hasEntryFile(dir, entryName, UPLOADED_FILE)) &&
        (await readEntryText(dir, entryName, PUBLISHING_FILE, isStrict)) ===
          undefined,
      ...(await readHoldMarks(dir, entryName, record, isStrict)),
      covered: toCovered(record),
      isOrphaned: await hasEntryFile(dir, entryName, ORPHANED_FILE),
      claim: await readClaim(dir, entryName, isStrict)
    });
  }
  return entries;
}

/**
 * Returns an entry's directory, or null when it is missing; with `isStrict`,
 * any other read error rejects instead of counting as missing.
 */
async function getEntryDir(
  dir: string,
  entryName: string,
  isStrict = false
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const queue = await root.getDirectoryHandle(dir);
    return await queue.getDirectoryHandle(entryName);
  } catch (error) {
    if (isStrict && (error as Error)?.name !== "NotFoundError") throw error;
    return null;
  }
}

async function writeEntryFile(
  dir: string,
  entryName: string,
  name: string,
  data: string | ArrayBuffer
) {
  const entry = await getEntryDir(dir, entryName);
  if (!entry) throw new Error("The staged file's entry is missing");
  const handle = await entry.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

/**
 * Reads a file of an entry, or undefined when the entry has none (see
 * getEntryDir for `isStrict`).
 */
async function readEntryText(
  dir: string,
  entryName: string,
  name: string,
  isStrict = false
): Promise<string | undefined> {
  const entry = await getEntryDir(dir, entryName, isStrict);
  if (!entry) return undefined;
  try {
    return await (
      await entry.getFileHandle(name)
    )
      .getFile()
      .then((file) => file.text());
  } catch (error) {
    if (isStrict && (error as Error)?.name !== "NotFoundError") throw error;
    return undefined;
  }
}

async function hasEntryFile(dir: string, entryName: string, name: string) {
  return (await readEntryText(dir, entryName, name)) !== undefined;
}

/** Reads a JSON file of an entry, or undefined when it is missing or invalid. */
async function readEntryJson<T>(
  dir: string,
  entryName: string,
  name: string,
  isValid: (value: T) => boolean,
  isStrict = false
): Promise<T | undefined> {
  return parseJson(
    await readEntryText(dir, entryName, name, isStrict),
    isValid
  );
}

function parseJson<T>(
  text: string | undefined,
  isValid: (value: T) => boolean
): T | undefined {
  try {
    const value = text ? (JSON.parse(text) as T) : undefined;
    return value && isValid(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads an entry's claim (see getEntryDir for `isStrict`): undefined when it
 * has none, and an empty or malformed claim.json (one half written, too) as
 * an unreadable claim, which no owner matches (see isSameClaim), so it never
 * counts as no claim.
 */
async function readClaim(dir: string, entryName: string, isStrict = false) {
  const text = await readEntryText(dir, entryName, CLAIM_FILE, isStrict);
  if (text === undefined) return undefined;
  return parseJson(text, isClaim) ?? { userId: "", baseUrl: "" };
}

function isClaim(claim: QueuedFileClaim) {
  return typeof claim.userId === "string" && typeof claim.baseUrl === "string";
}

/** Whether a claim read names an owner, not an unreadable claim.json. */
function isReadClaim({ userId, baseUrl }: QueuedFileClaim) {
  return Boolean(userId && baseUrl);
}

function isSameClaim(a: QueuedFileClaim, b: QueuedFileClaim) {
  return isReadClaim(a) && a.userId === b.userId && a.baseUrl === b.baseUrl;
}

function readQueuedRecord(dir: string, entryName: string, isStrict = false) {
  return readEntryJson<QueuedFileRecord>(
    dir,
    entryName,
    RECORD_FILE,
    (record) => typeof record.id === "string",
    isStrict
  );
}

async function readThumbnail(
  entry: FileSystemDirectoryHandle
): Promise<Blob | undefined> {
  for await (const name of (
    entry as unknown as { keys(): AsyncIterable<string> }
  ).keys()) {
    if (!name.startsWith(THUMBNAIL_PREFIX)) continue;
    const file = await (await entry.getFileHandle(name)).getFile();
    const type = `image/${name.slice(THUMBNAIL_PREFIX.length)}`;
    return new Blob([await file.arrayBuffer()], {
      type: THUMBNAIL_TYPES.has(type) ? type : "image/jpeg"
    });
  }
  return undefined;
}

/**
 * The account, at the FileFn authority it stores files under, that reads or
 * retries a failed file (see isReplayableBy); null for none.
 */
export type QueuedFileFailureOwner = QueuedFileClaim | null;

/**
 * Whether the first queue that holds a file (see resolveQueuedFileUrl) holds
 * it failed (see FAILED_PREFIX) for `owner`: one its replay would upload
 * again once retried (see isReplayableBy). False when none holds it, another
 * account or authority claimed or started it, or it cannot be read.
 */
export async function isQueuedFileFailed(
  dirs: readonly string[],
  fileId: string,
  owner: QueuedFileFailureOwner = null
): Promise<boolean> {
  if (!isFileQueueSupported()) return false;
  const found = await findPublishedEntry(dirs, fileId);
  if (!found?.entry.names.includes(toFailedMark(found.entry))) return false;
  return isReplayableBy(found.dir, toEntryName(fileId), owner);
}

/**
 * Retries a failed file (see FAILED_PREFIX) of the first queue that holds
 * it: removes its failed mark, so replays upload it again, and runs one pass
 * of that queue now with the request the page last asked a replay of it
 * with, unless that request's signal aborted or its records were replaced
 * (see isStale), when the next replay requested uploads it. Resolves
 * whether it removed a mark; one it finds unmarked (removed, uploaded or
 * written again meanwhile) resolves false and has the file's failed state
 * read again (see onQueuedFileFailureChange). Only an `owner` whose
 * replay would upload the entry retries it (see isReplayableBy), and only
 * while `isCurrent` holds just before the mark is removed: an entry another
 * account or authority claimed or started, or an owner no longer current,
 * resolves false and is left as it is, its mark kept and no replay started,
 * so a Retry never clears a rejection without an upload attempt. The
 * guest's Retry of a local file an account claimed instead adds its retry
 * mark (see RETRY_PREFIX) and keeps it failed until that account uploads
 * it. A mark it cannot remove or add rejects.
 */
export async function retryFailedQueuedFile(
  dirs: readonly string[],
  fileId: string,
  owner: QueuedFileFailureOwner = null,
  isCurrent: () => boolean = () => true
): Promise<boolean> {
  if (!isFileQueueSupported()) return false;
  const found = await findPublishedEntry(dirs, fileId);
  const mark = found && toFailedMark(found.entry);
  if (!found || !mark || !found.entry.names.includes(mark)) {
    notifyFailureChange(fileId);
    return false;
  }
  if (!(await isReplayableBy(found.dir, toEntryName(fileId), owner))) {
    return false;
  }
  if (!isCurrent()) return false;
  const isClaimed =
    owner === null &&
    found.dir === LOCAL_FILE_QUEUE_DIR &&
    (await readClaim(found.dir, toEntryName(fileId), true)) !== undefined;
  const retry = `${RETRY_PREFIX}${found.entry.generation}`;
  if (isClaimed)
    await writeEntryFile(found.dir, toEntryName(fileId), retry, "");
  else
    for (const name of [mark, retry])
      await removeEntryFile(found.entry.entry, name);
  notifyFailureChange(fileId);
  const request = latestRequests.get(found.dir);
  if (request && !request.signal.aborted && !isStale(request)) {
    const { client, signal, publisher, references } = request;
    void replayFileQueue(found.dir, client, signal, publisher, references);
  }
  return true;
}

/**
 * Calls `listener` with the file's ID whenever the failed state of a file of
 * any queue (see FAILED_PREFIX) may have changed, in this page or, where the
 * browser has a BroadcastChannel, in another tab: the file was marked
 * failed or retried, or its entry was removed (see dequeueFile), uploaded
 * and dropped, or written again by a restore as an unmarked generation.
 * Returns the unsubscribe.
 */
export function onQueuedFileFailureChange(
  listener: (fileId: string) => void
): () => void {
  failureListeners.add(listener);
  getFailureChannel();
  return () => {
    failureListeners.delete(listener);
  };
}

const failureListeners = new Set<(fileId: string) => void>();
const FAILURE_CHANNEL = `${QUEUE_DIR_PREFIX}-failures`;
let failureChannel: BroadcastChannel | null | undefined;

function getFailureChannel() {
  if (failureChannel !== undefined) return failureChannel;
  failureChannel = null;
  if (typeof BroadcastChannel !== "function") return failureChannel;
  const channel = new BroadcastChannel(FAILURE_CHANNEL);
  (channel as { unref?: () => void }).unref?.();
  channel.onmessage = ({ data }: MessageEvent) => {
    if (typeof data === "string") callFailureListeners(data);
  };
  return (failureChannel = channel);
}

function callFailureListeners(fileId: string) {
  for (const listener of failureListeners) {
    try {
      listener(fileId);
    } catch (error) {
      logger.warn({ at: "fileQueue.failure", fileId, error });
    }
  }
}

function notifyFailureChange(fileId: string) {
  callFailureListeners(fileId);
  getFailureChannel()?.postMessage(fileId);
}

function toFailedMark({ generation }: Pick<PublishedEntry, "generation">) {
  return `${FAILED_PREFIX}${generation}`;
}

/**
 * Whether `owner`'s replay would upload an entry once its failed mark is
 * removed, so its failed state is the owner's to read and retry: the test
 * the replay of the entry's queue applies (see replayEntry). An account
 * queue's entry is replayed with the account's references, which skip it
 * only once an attempt of another account or authority started it (see
 * isStartedElsewhere), whatever authority it was staged with (claim.json);
 * a local entry must also be unclaimed or claimed by the owner at its
 * authority (see isPublishable). No owner matches no claim or started
 * marker, except that the guest (no owner) reads and retries every local
 * file whose claim reads: a retry only removes its failed mark, and the
 * account that claimed it still uploads it. A marker read error rejects.
 */
async function isReplayableBy(
  dir: string,
  entryName: string,
  owner: QueuedFileFailureOwner
) {
  const isOwned = (claim: QueuedFileClaim | undefined) =>
    !claim || (owner !== null && isSameClaim(claim, owner));
  if (dir === LOCAL_FILE_QUEUE_DIR) {
    const claim = await readClaim(dir, entryName, true);
    const isGuests = owner === null && claim !== undefined;
    if (!(isGuests ? isReadClaim(claim) : isOwned(claim))) return false;
  }
  return (await readMarkers(dir, entryName)).every(isOwned);
}

/** The first queue's published entry of a file (see getPublishedEntryDir). */
async function findPublishedEntry(dirs: readonly string[], fileId: string) {
  const entryName = toEntryName(fileId);
  for (const dir of dirs) {
    const entry = await getPublishedEntryDir(dir, entryName);
    if (entry) return { dir, entry };
  }
  return undefined;
}

/**
 * Returns an object URL of a queued file's bytes from the first queue that
 * holds it: its thumbnail for `thumbnail` (undefined when none was kept, so a
 * view falls back to the original), else the original. Returns null when no
 * queue holds the file, so the caller resolves it through FileFn. Each call
 * makes a new object URL, as the record bytes did: the view that renders it
 * revokes it once it no longer shows it.
 * A download shares one held URL per file, revoked when it leaves the queue
 * or a lookup reads other queues (see releaseQueuedFileUrls).
 */
export async function resolveQueuedFileUrl(
  dirs: readonly string[],
  fileId: string,
  variant: "thumbnail" | "full" | "download"
): Promise<string | undefined | null> {
  if (!isFileQueueSupported()) return null;
  const entryName = toEntryName(fileId);
  releaseQueuedFileUrls((key) => !dirs.includes(key.split("\n")[0]));
  for (const dir of dirs) {
    const entry = await getPublishedEntryDir(dir, entryName);
    const key = `${dir}\n${entryName}`;
    if (!entry) releaseQueuedFileUrls((held) => held === key);
    if (!entry) continue;
    try {
      const url =
        variant === "download"
          ? await resolveHeldUrl(dir, key, entryName, entry)
          : (await readUrl(dir, entry, entryName, variant)).url;
      if (url !== null) return url;
    } catch (error) {
      logger.warn({ at: "fileQueue.resolve", fileId, error });
      return undefined;
    }
  }
  return null;
}

/**
 * Returns an entry's held download URL (see resolveQueuedFileUrl), shared
 * by concurrent lookups, read from the generation now published. A lookup
 * joins a held read only when it is of the generation the lookup found
 * published (see HeldUrl); one of another generation is joined once the
 * lookup finds that generation published again, and is otherwise retired
 * (revoked, while still held), so its rejection or null URL never ends a
 * lookup of the generation published now. The URL
 * is returned only while the generation that supplied its bytes (see
 * readUrl) is the one published, as `found` or as read again, and while it
 * is still the URL held. One whose generation is no longer published is
 * revoked, only while it is still the one held, so retiring an older
 * lookup never revokes a newer one's URL; the lookup then reads the
 * generation published now, up to SNAPSHOT_ATTEMPTS times. A lookup whose
 * URL was released meanwhile (see releaseQueuedFileUrls) resolves null and
 * holds no URL.
 */
async function resolveHeldUrl(
  dir: string,
  key: string,
  entryName: string,
  found: PublishedEntry
) {
  const released = releases.get(key) ?? 0;
  const isReleased = () => (releases.get(key) ?? 0) !== released;
  let entry: PublishedEntry | null = found;
  for (let attempt = 0; entry && attempt < SNAPSHOT_ATTEMPTS; attempt++) {
    let held = heldUrls.get(key);
    if (held && held.generation !== entry.generation) {
      const now = await getPublishedEntryDir(dir, entryName);
      if (isReleased()) return null;
      const isRetired = now?.generation !== held.generation;
      if (isRetired && heldUrls.get(key) === held) revokeHeldUrl(key, held);
      entry = now;
      continue;
    }
    if (!held) {
      const created = { generation: entry.generation } as HeldUrl;
      created.read = readUrl(dir, entry, entryName, "download").then((read) => {
        created.generation = read.generation ?? created.generation;
        return read;
      });
      held = created;
      heldUrls.set(key, held);
    }
    const read: Awaited<HeldUrl["read"]> = await held.read.catch(
      (error: unknown) => {
        if (heldUrls.get(key) === held) heldUrls.delete(key);
        throw error;
      }
    );
    if (read.url === null || isReleased()) {
      if (heldUrls.get(key) === held) heldUrls.delete(key);
      return null;
    }
    if (heldUrls.get(key) === held && read.generation === entry.generation) {
      return read.url;
    }
    const now = await getPublishedEntryDir(dir, entryName);
    if (isReleased()) return null;
    const isHeld = heldUrls.get(key) === held;
    if (isHeld && read.generation === now?.generation) return read.url;
    if (isHeld) revokeHeldUrl(key, held);
    entry = now;
  }
  return null;
}

/**
 * Reads a published entry's bytes as an object URL (see
 * resolveQueuedFileUrl), from the generation it found published (`entry`),
 * reading its publication again once the bytes are read, or could not be:
 * a generation replaced meanwhile is read again, from the one that replaced
 * it once that is published, and after SNAPSHOT_ATTEMPTS resolves a null
 * URL; a read error of a generation still published rejects. Resolves the
 * URL with the generation that supplied its bytes.
 */
async function readUrl(
  dir: string,
  found: PublishedEntry,
  entryName: string,
  variant: string
) {
  let entry: PublishedEntry | null = found;
  for (let attempt = 0; entry && attempt < SNAPSHOT_ATTEMPTS; attempt++) {
    const blob = await readBlob(entry, variant).catch((error: unknown) => {
      return { error };
    });
    const again = await getPublishedEntryDir(dir, entryName);
    if (blob && "error" in blob && again?.generation === entry.generation) {
      throw blob.error;
    }
    if (blob && "error" in blob) {
      entry = again;
      continue;
    }
    if (again?.generation === entry.generation) {
      const url = blob ? URL.createObjectURL(blob) : blob;
      return { url, generation: entry.generation };
    }
    entry = again;
  }
  return { url: null };
}

/**
 * Reads a published entry's thumbnail (undefined without one), or its
 * original (null when it holds its thumbnail only, see QueuedFileCopy).
 */
async function readBlob({ entry, names }: PublishedEntry, variant: string) {
  if (variant === "thumbnail") return readThumbnail(entry);
  const pending = await readPendingStrict(entry, names);
  if (!pending?.fileData.byteLength && names.includes(UPLOADED_FILE)) {
    return null;
  }
  return pending
    ? new Blob([pending.fileData], { type: pending.mimeType })
    : null;
}

type PublishedEntry = {
  entry: FileSystemDirectoryHandle;
  names: string[];
  generation: string;
};

/**
 * Returns an entry's directory, names and generation once it is published
 * (see RESTORING_PREFIX), or null when it is missing, unpublished or cannot
 * be read.
 */
async function getPublishedEntryDir(
  dir: string,
  entryName: string
): Promise<PublishedEntry | null> {
  try {
    const entry = await getEntryDir(dir, entryName);
    const names = await readNames(entry);
    const { generation, isPublished } = readMarks(names);
    return entry && isPublished ? { entry, names, generation } : null;
  } catch {
    return null;
  }
}

/**
 * The held download URLs, by key (queue, entry), each with the generation
 * that supplied its bytes (see readUrl).
 */
type HeldUrl = {
  /**
   * The generation whose bytes the read supplied once it resolved (see
   * readUrl), and until then the one the lookup that started it found
   * published.
   */
  generation: string;
  read: Promise<{ url: string | undefined | null; generation?: string }>;
};
const heldUrls = new Map<string, HeldUrl>();

/** How many times each key's held download URL was released, by key. */
const releases = new Map<string, number>();

/**
 * Revokes the held download URLs whose keys (queue, entry) it selects; a
 * lookup still reading one resolves null (see resolveHeldUrl).
 */
export function releaseQueuedFileUrls(isReleased: (key: string) => boolean) {
  for (const [key, held] of heldUrls) {
    if (!isReleased(key)) continue;
    releases.set(key, (releases.get(key) ?? 0) + 1);
    revokeHeldUrl(key, held);
  }
}

function revokeHeldUrl(key: string, held: HeldUrl) {
  heldUrls.delete(key);
  void held.read
    .then(({ url }) => url && URL.revokeObjectURL(url))
    .catch(String);
}

/**
 * A file of an account's queue as a backup carries it: its bytes, thumbnail,
 * the authority it is captured at (`claim`), whether its record saved, and
 * the started markers that bind an upload that may have begun to its
 * authority (name and contents). A file whose original FileFn confirmed
 * (`uploadedVersionId`, the version it got) while its thumbnail is still to
 * be sent carries the thumbnail only, with no original bytes. A file of the
 * local queue also carries its record copy and its marks (see LOCAL_MARKS).
 */
export type QueuedFileCopy = {
  fileId: string;
  fileName: string;
  contentType: string;
  policy: string;
  createdAt: string;
  retryCount: number;
  data: Uint8Array;
  uploadedVersionId?: string;
  thumbnail?: { type: string; data: Uint8Array };
  claim?: QueuedFileClaim;
  isCommitted: boolean;
  started: { name: string; text: string }[];
  record?: QueuedFileRecord;
  marks?: { name: string; text: string }[];
};

/**
 * The marks that hold a local file (see markQueuedFileStale) and its publish
 * journal (`saved`, so a restored file never inserts again a record its
 * account deleted), which a guest backup carries and restores; its copy
 * also lists the file's uploaded mark, so the backup can leave out a file
 * that reached its account.
 */
const LOCAL_MARKS = [
  STALE_FILE,
  DELETED_FILE,
  ORPHANED_FILE,
  DISCARDED_FILE,
  "saved"
];

/** Whether a name is a local mark a guest backup carries (a generation's, too). */
function isLocalMark(name: string) {
  return LOCAL_MARKS.includes(name) || toMarkGeneration(name) !== undefined;
}

const STARTED_NAME = /^started(?:-[\w-]+)?$/;
/** The files of a FileFn OPFSStore entry: its metadata and its bytes. */
const METADATA_FILE = "metadata.json";
const DATA_FILE = "data.bin";

/**
 * Copies the files an account's queue still holds, so a backup carries the
 * bytes of files that have not reached FileFn, with the snapshot `snapshot`
 * takes (the records that reference them): under the queue's lock, taken
 * before the snapshot and held through the copy, so no replay removes a file
 * between the two reads; a queue that changed meanwhile (a capture or
 * another tab, see readRevision), or whose files left, were replaced or
 * published, takes the snapshot again, and after SNAPSHOT_ATTEMPTS rejects.
 * Leaves out an original FileFn confirmed at a known
 * version, as the file's uploaded mark or the upload log records it
 * (keeping a thumbnail still to be sent; one whose version neither records
 * is copied whole), an unpublished file (see RESTORING_PREFIX), and one that
 * leaves the queue while it is read. A published file a restore wrote is
 * copied whether or not its account adopted it. A file whose metadata, bytes
 * or marks cannot be read rejects, and never counts as absent, unless its
 * record copy reads and `isForeign` tells, from it and the snapshot, that
 * the backup does not need it: that file is logged and left out.
 */
export async function exportQueuedFiles<T>(
  dir: string,
  snapshot: () => Promise<T>,
  isWhole = false,
  isForeign?: (fileId: string, record: QueuedFileRecord, records: T) => boolean
): Promise<{ records: T; files: QueuedFileCopy[] }> {
  if (!isFileQueueSupported()) return { records: await snapshot(), files: [] };
  const signal = new AbortController().signal;
  for (let attempt = 0; attempt < SNAPSHOT_ATTEMPTS; attempt++) {
    const exported = await withQueueLock(dir, signal, async () => {
      const revision = await readRevision(dir);
      const listed = await readQueueRevision(dir);
      const records = await snapshot();
      const files: QueuedFileCopy[] = [];
      for (const entryName of await listEntryNames(dir)) {
        const fileId = entryName.slice(ENTRY_PREFIX.length);
        const copy = await copyEntry(dir, entryName, isWhole).catch(
          async (error: unknown) => {
            const record = await readQueuedRecord(dir, entryName, true).catch(
              () => undefined
            );
            if (!record || !isForeign?.(fileId, record, records)) throw error;
            logger.warn({ at: "fileQueue.export", fileId, error });
          }
        );
        if (copy) files.push(copy);
      }
      const remaining = await readQueueRevision(dir);
      const isChanged =
        (await readRevision(dir)) !== revision ||
        remaining.size !== listed.size ||
        [...listed].some(([name, value]) => remaining.get(name) !== value);
      return isChanged ? undefined : { records, files };
    });
    if (exported) return exported;
  }
  throw new Error("The upload queue changed while the backup was made");
}

/**
 * Whether a guest backup carries a held local file's copy and its restore
 * writes it back: with its record ID and namespace, readable marks, and
 * claimed by a named owner (settled once orphaned) or committed and not
 * deleted (released).
 */
export function isRestorableLocalCopy(copy: QueuedFileCopy) {
  const { record, marks = [], claim } = copy;
  return (
    typeof record?.id === "string" &&
    typeof record.namespace === "string" &&
    marks.every((m) => isLocalMark(m.name) && typeof m.text === "string") &&
    (claim === undefined
      ? copy.isCommitted === true &&
        !toHold(
          marks.map((m) => m.name),
          record
        ).isDeleted
      : isClaim(Object(claim)) && isReadClaim(Object(claim)))
  );
}

/**
 * Writes a guest backup's held local files back, still held, under one hold
 * of the queue's lock, each with its record copy last: a file already
 * there whole (record copy, written last, and bytes, not fenced) is kept,
 * any other (no pass publishes or reconciles one without a record
 * copy) written again once its removal (record copy first) is confirmed,
 * else the restore rejects, as on one it cannot read, keeping it. Rejects,
 * leaving none it wrote, on a copy that is not restorable
 * (before any write), a failed write, or `isChanged` after the last write;
 * one whose removal it cannot confirm is left without its record copy, else
 * with an unreadable claim, so no pass publishes it (see unrestoreEntry).
 */
export async function restoreLocalQueuedFiles(
  files: QueuedFileCopy[],
  isChanged: () => boolean
) {
  const dir = LOCAL_FILE_QUEUE_DIR;
  if (!files.every(isRestorableLocalCopy))
    throw new Error("A held local file is invalid");
  const written: string[] = [];
  const signal = new AbortController().signal;
  await withQueueLock(dir, signal, async () => {
    try {
      for (const copy of files) {
        const entryName = toEntryName(copy.fileId);
        if (await isWholeEntry(dir, entryName)) continue;
        await bumpRevision(dir);
        try {
          const entry = await getEntryDir(dir, entryName, true);
          await removeEntryFile(entry, RECORD_FILE);
          await getStore(dir).deletePendingUpload(entryName);
          if (await getEntryDir(dir, entryName, true))
            throw new Error("A held local file could not be replaced");
          written.push(entryName);
          await getStore(dir).stagePendingUpload({
            uploadSessionId: entryName,
            fileId: copy.fileId,
            policy: copy.policy,
            fileName: copy.fileName,
            size: copy.data.byteLength,
            mimeType: copy.contentType,
            fileData: copy.data.slice().buffer as ArrayBuffer,
            createdAt: copy.createdAt,
            retryCount: copy.retryCount
          });
          const write = writeEntryFile.bind(null, dir, entryName);
          const covered = toCovered(copy.record);
          for (const { name, text } of copy.marks ?? []) {
            const at = toMarkGeneration(name);
            if (!at || !covered.includes(at))
              await write(name, name === DELETED_FILE ? "" : text);
            if (HOLD_MARKS.includes(name))
              await write(`${name}.${toChangeGeneration()}`, "");
          }
          if (copy.claim) await write(CLAIM_FILE, JSON.stringify(copy.claim));
          const { thumbnail } = copy;
          if (thumbnail && THUMBNAIL_TYPES.has(thumbnail.type)) {
            const name = `${THUMBNAIL_PREFIX}${thumbnail.type.split("/")[1]}`;
            await write(name, thumbnail.data.slice().buffer as ArrayBuffer);
          }
          if (copy.isCommitted) await write(COMMITTED_FILE, "");
          await write(RECORD_FILE, JSON.stringify(copy.record));
        } finally {
          await bumpRevisionAfter(dir);
        }
      }
      if (isChanged())
        throw new Error("The account changed while the backup was restored");
    } catch (error) {
      for (const name of written) await unrestoreEntry(dir, name);
      throw error;
    }
  });
}

/**
 * Whether an entry has its bytes and metadata (both listed, then read
 * strictly), record copy and no restore fence; a read error, or listed
 * bytes or metadata that cannot be read, rejects and never counts as missing.
 */
async function isWholeEntry(dir: string, entryName: string) {
  const entry = await getEntryDir(dir, entryName, true);
  const names = await readNames(entry);
  const claim = await readEntryText(dir, entryName, CLAIM_FILE, true);
  const record = await readQueuedRecord(dir, entryName, true);
  if (!entry || !names.includes(DATA_FILE) || !names.includes(METADATA_FILE))
    return false;
  if (claim === RESTORE_FENCE || !record) return false;
  return !!(await readPendingStrict(entry, names));
}

/** The claim.json of an entry a failed restore could not remove. */
const RESTORE_FENCE = "restore-fenced";

/**
 * Removes an entry a restore wrote, its record copy first, and confirms its
 * record copy is gone; one still there gets an unreadable claim.json (see
 * readClaim), so no pass publishes or deletes it, and a retry rewrites it.
 */
async function unrestoreEntry(dir: string, entryName: string) {
  await removeEntryFile(await getEntryDir(dir, entryName), RECORD_FILE).catch(
    String
  );
  await getStore(dir).deletePendingUpload(entryName).catch(String);
  const isGone = await readEntryText(dir, entryName, RECORD_FILE, true).then(
    (text) => text === undefined,
    () => false
  );
  if (isGone) return;
  logger.error({ at: "fileQueue.restore", entryName });
  await writeEntryFile(dir, entryName, CLAIM_FILE, RESTORE_FENCE).catch(String);
}

/**
 * How many times a backup takes its snapshot again when the queue changed
 * between its reads (see readRevision).
 */
const SNAPSHOT_ATTEMPTS = 3;

/**
 * A queue's change mark: a file beside the queue that every write of an
 * entry (enqueueFile, a restore's staging) replaces with a new value before
 * it starts, rejecting the write when it cannot, and once it ends, in any
 * tab, with or without Web Locks, so a backup sees any entry added between
 * its reads, also one added and removed again meanwhile. Nothing removes
 * the mark, so a backup that finds none (none was ever written, or a full
 * store kept it from being written) knows no entry was added while it still
 * finds none. A removal (dequeueFile) and a remote discard replace it too,
 * but only as far as they can (see markChange), so a full store never keeps
 * a file queued: the backup's scans of the entries see a removal
 * themselves. One that cannot be read rejects the backup.
 */
async function readRevision(dir: string) {
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(`${dir}.revision`);
    return await (await handle.getFile()).text();
  } catch (error) {
    if ((error as Error)?.name === "NotFoundError") return "";
    throw error;
  }
}

/** Replaces a queue's change mark once a change ended; never rejects. */
function bumpRevisionAfter(dir: string) {
  return bumpRevision(dir).catch((error: unknown) => {
    logger.warn({ at: "fileQueue.revision", dir, error });
  });
}

/**
 * Marks a change that removes from a queue, or discards one of its files
 * (see readRevision), as far as the change mark can be written: one that
 * cannot (a full store) is logged and the change goes on; never rejects.
 */
const markChange = bumpRevisionAfter;

/** Replaces a queue's change mark with a new value (see readRevision). */
async function bumpRevision(dir: string) {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(`${dir}.revision`, { create: true });
  const writable = await handle.createWritable();
  await writable.write(crypto.randomUUID());
  await writable.close();
}

/**
 * A queue's entries with the generation each holds and whether it is
 * published, so a backup can tell when one left or was replaced.
 */
async function readQueueRevision(dir: string) {
  const revision = new Map<string, string>();
  for (const name of await listEntryNames(dir)) {
    const entry = await getEntryDir(dir, name, true);
    if (!entry) continue;
    const { generation, isPublished } = readMarks(await readNames(entry));
    revision.set(name, `${generation}:${isPublished}`);
  }
  return revision;
}

async function listEntryNames(dir: string) {
  const names = await getStore(dir).listPendingUploads();
  return names.filter((name) => name.startsWith(ENTRY_PREFIX));
}

async function copyEntry(dir: string, entryName: string, isWhole = false) {
  try {
    const entry = await getEntryDir(dir, entryName, true);
    const all = await readNames(entry);
    const isLeft = all.includes(PUBLISHING_FILE);
    const names = all.filter((name) => !isLeft || name !== UPLOADED_FILE);
    if (!entry || !readMarks(names).isPublished) return undefined;
    const pending = await readPendingStrict(entry, names);
    if (!pending) return undefined;
    const thumbnail = await readThumbnail(entry);
    const isThumbnailMarked = !thumbnail || names.includes(THUMBNAIL_SENT_FILE);
    const isMarked =
      names.includes(UPLOADED_FILE) &&
      (await readEntryText(dir, entryName, UPLOADED_FILE, true)) !== undefined;
    if (isMarked && isThumbnailMarked && !isWhole) return undefined;
    const delivery =
      isWhole || isLeft
        ? undefined
        : await readDelivery(dir, pending.fileId, names, !!thumbnail);
    if (delivery && !delivery.isKnown) throw delivery.error;
    const uploaded = delivery?.original;
    if (uploaded && delivery?.isDone) return undefined;
    const started: QueuedFileCopy["started"] = [];
    const marks: QueuedFileCopy["started"] = [];
    const isLocal = dir === LOCAL_FILE_QUEUE_DIR;
    for (const name of names) {
      const isMark = isLocal && (isLocalMark(name) || name === UPLOADED_FILE);
      if (!STARTED_NAME.test(name) && !isMark) continue;
      const text = await readEntryText(dir, entryName, name, true);
      if (text !== undefined) (isMark ? marks : started).push({ name, text });
    }
    return {
      fileId: pending.fileId,
      fileName: pending.fileName,
      contentType: pending.mimeType,
      policy: pending.policy,
      createdAt: pending.createdAt,
      retryCount: pending.retryCount,
      data: uploaded ? new Uint8Array() : new Uint8Array(pending.fileData),
      uploadedVersionId: uploaded,
      thumbnail: thumbnail && {
        type: thumbnail.type,
        data: new Uint8Array(await thumbnail.arrayBuffer())
      },
      claim: await readClaim(dir, entryName, true),
      isCommitted: names.includes(COMMITTED_FILE),
      started,
      ...(isLocal && {
        record: await readQueuedRecord(dir, entryName, true),
        marks
      })
    };
  } catch (error) {
    if (!(await getEntryDir(dir, entryName, true))) return undefined;
    throw error;
  }
}

/**
 * Reads a queued file's metadata and bytes, or undefined while its staging
 * has not finished: its metadata file is not there, or is still empty (the
 * FileFn store writes the bytes first, then the metadata, which is empty
 * until its write closes), and none of its entry's names (`names`) shows
 * its staging finished (see isStaged). A missing or empty metadata file of
 * a file whose staging finished, any other read error, and metadata that
 * cannot be parsed reject rather than counting as absent.
 */
async function readPendingStrict(
  entry: FileSystemDirectoryHandle,
  names: readonly string[]
): Promise<(PendingUpload & { fileId: string }) | undefined> {
  let text = "";
  try {
    text = await (
      await (await entry.getFileHandle(METADATA_FILE)).getFile()
    ).text();
  } catch (error) {
    if ((error as Error)?.name !== "NotFoundError") throw error;
  }
  if (!text && isStaged(names)) {
    throw new Error("A queued file's metadata is missing");
  }
  if (!text) return undefined;
  const metadata = JSON.parse(text) as PendingUpload;
  if (typeof metadata?.fileId !== "string") {
    throw new Error("A queued file's metadata is invalid");
  }
  const data = await (await entry.getFileHandle(DATA_FILE)).getFile();
  return {
    ...metadata,
    fileId: metadata.fileId,
    fileData: await data.arrayBuffer()
  };
}

/**
 * Whether an entry's names show its staging finished, its metadata written:
 * a capture writes its claim, record and thumbnail after the metadata (see
 * enqueueFile), a restore its marks and its published mark (see
 * stageRestoredEntry), and the replay its committed and uploaded marks.
 */
function isStaged(names: readonly string[]) {
  return names.some(
    (name) =>
      [CLAIM_FILE, RECORD_FILE, COMMITTED_FILE, UPLOADED_FILE].includes(name) ||
      name.startsWith(THUMBNAIL_PREFIX) ||
      name.startsWith(PUBLISHED_PREFIX)
  );
}

/** The names in a directory, none without one; a read error rejects. */
async function readNames(handle: FileSystemDirectoryHandle | null) {
  const names: string[] = [];
  for await (const name of handle
    ? (handle as unknown as { keys(): AsyncIterable<string> }).keys()
    : []) {
    names.push(name);
  }
  return names;
}

/**
 * Reads an entry's restore marks (see RESTORING_PREFIX) from its names: its
 * generation (BASE_GENERATION when no restore wrote it), whether it is
 * published, whether its adopted, settled and own marks are there, whether
 * its original and thumbnail were both delivered. A published mark left
 * without its restoring mark (see adoptEntry) still names the generation,
 * published and adopted.
 */
function readMarks(names: readonly string[]) {
  const generations = names
    .filter((name) => name.startsWith(RESTORING_PREFIX))
    .map((name) => name.slice(RESTORING_PREFIX.length));
  const published = names
    .filter((name) => name.startsWith(PUBLISHED_PREFIX))
    .map((name) => name.slice(PUBLISHED_PREFIX.length));
  const [generation = published.length === 1 ? published[0] : BASE_GENERATION] =
    generations;
  const isRestored = generations.length > 0;
  return {
    generation,
    isPublished:
      !isRestored ||
      (generations.length === 1 &&
        names.includes(`${PUBLISHED_PREFIX}${generation}`)),
    isAdopted: !isRestored || names.includes(`${ADOPTED_PREFIX}${generation}`),
    isSettled: names.includes(`${SETTLED_PREFIX}${generation}`),
    isBound: toBindingMarks(names, generation).length > 0,
    isOwn: names.includes(`${OWN_PREFIX}${generation}`),
    isDelivered:
      names.includes(UPLOADED_FILE) &&
      (names.includes(THUMBNAIL_SENT_FILE) ||
        !names.some((name) => name.startsWith(THUMBNAIL_PREFIX)))
  };
}

/**
 * Reads how restores hold a queued file: its restore marks, whether its
 * account adopted it (its adopted mark or an adoption row), and whether a
 * live hold row of a session other than `except` holds its generation;
 * undefined when the queue does not hold it. A read error other than a
 * missing file rejects.
 */
async function readRestore(dir: string, fileId: string) {
  const entry = await getEntryDir(dir, toEntryName(fileId), true);
  if (!entry) return undefined;
  const names = await readNames(entry);
  const marks = readMarks(names);
  const { rows, adoptions, foreign } = await readHolds(dir);
  const adoption = [ADOPTION_ROW, fileId, marks.generation].join("~");
  const prefix = [FOREIGN_ROW, fileId, marks.generation].join("~");
  /** When the last live hold row of its generation expires, 0 without one. */
  const heldUntil = (except?: string) =>
    Math.max(
      0,
      ...rows
        .filter(
          (row) =>
            row.kind === HOLD_ROW &&
            row.isLive &&
            row.fileId === fileId &&
            row.generation === marks.generation &&
            row.session !== except
        )
        .map((row) => row.expiresAt)
    );
  return {
    ...marks,
    /** Its generation's binding marks (see toBoundMark). */
    boundMarks: toBindingMarks(names, marks.generation),
    isAdopted: marks.isAdopted || adoptions.has(adoption),
    isOwn:
      marks.isOwn &&
      !adoptions.has(`${FOREIGN_ROW}~${fileId}~${marks.generation}`),
    isHeld: (except?: string) => heldUntil(except) > 0,
    heldUntil,
    /** The foreign rows of its generation (see HoldRow). */
    foreignRows: foreign.filter(
      (row) => row === prefix || row.startsWith(`${prefix}~`)
    )
  };
}

/**
 * Restore holds: rows beside a queue, in `<queue>.holds`, each an empty file
 * named `hold~<session>~<fileId>~<generation>~<expires at, in ms>`, created
 * and removed under the queue's lock. A restore session holds each file it
 * writes or keeps, at the generation it wrote or found, from staging until
 * it settles or rolls back, when it removes its own rows only (see
 * settleRestoredFiles); no replay acts on a file while a live row holds its
 * generation. A row a session left (its page closed) holds no longer than
 * RESTORE_HOLD_LIFETIME_MS, and a replay removes it once it expired; a
 * clock set back keeps it live (up to twice its lifetime ahead).
 * Adoption rows, `adopted~<fileId>~<generation>`, record an adoption whose
 * mark could not be created in the entry (see adoptEntry), and acting and
 * dispatch rows, `acting~<session>~<fileId>~~<expires at>` and
 * `dispatch~<session>~<fileId>~~<expires at>`, a step removing or
 * discarding a file without Web Locks (see actAlone). Delivered rows,
 * `delivered~<fileId>~<1 when its thumbnail was sent, else 0>~<version>`,
 * record a delivery the upload log could not (see logDelivered), and
 * foreign rows,
 * `foreign~<fileId>~<generation>~<session>~<scope>~<authority>~<token>`
 * (with fixed-length digests of the account's DataFn scope and FileFn
 * authority, see toRowDestination, so the name stays within the 255 bytes a
 * filename may have; or without the session, the destination or the token,
 * which is new
 * for each row created, also when a session creates one again), a
 * generation a restore into another account kept, which the replay never
 * reclaims while the row is there, nor binds on an earlier take of it that
 * did not find that row (see bindTaken and isBound), and which no
 * rollback of another session removes (see rollBackEntry); the
 * account's replay removes its own once their session holds no file and no
 * record of the account references the file in the DataFn scope (see
 * toRecordsView) the restore imported into, and in no other scope (see
 * reconcileForeignRows).
 */
type HoldRow = {
  name: string;
  kind: string;
  session: string;
  fileId: string;
  generation: string;
  expiresAt: number;
  isLive: boolean;
};

const HOLD_ROW = "hold";
const ADOPTION_ROW = "adopted";
const ACTING_ROW = "acting";
const DISPATCH_ROW = "dispatch";
const DELIVERED_ROW = "delivered";
const FOREIGN_ROW = "foreign";
/** How long a restore's hold row holds its file at most (see HoldRow). */
export const RESTORE_HOLD_LIFETIME_MS = 24 * 60 * 60_000;
/** How long an acting row (see actAlone) counts at most. */
const ACTING_LIFETIME_MS = 10 * 60_000;

/** Returns a queue's holds directory, or null when it has none yet. */
async function getHoldsDir(dir: string, isCreated = false) {
  const root = await navigator.storage.getDirectory();
  try {
    return await root.getDirectoryHandle(`${dir}.holds`, {
      create: isCreated
    });
  } catch (error) {
    if (isCreated || (error as Error)?.name !== "NotFoundError") throw error;
    return null;
  }
}

/** Reads a queue's hold, adoption and delivered rows; a read error rejects. */
async function readHolds(dir: string) {
  const handle = await getHoldsDir(dir);
  const rows: HoldRow[] = [];
  const adoptions = new Set<string>();
  const delivered: (LoggedUpload & { name: string; fileId: string })[] = [];
  const foreign: string[] = [];
  for (const name of await readNames(handle)) {
    const [kind, session, fileId, generation, expires] = name.split("~");
    if (kind === ADOPTION_ROW) adoptions.add(name);
    if (kind === FOREIGN_ROW) adoptions.add([kind, session, fileId].join("~"));
    if (kind === FOREIGN_ROW) foreign.push(name);
    if (kind === DELIVERED_ROW) {
      const [, file, sent, ...version] = name.split("~");
      const versionId = version.join("~");
      const isThumbnailSent = sent === "1";
      delivered.push({ name, fileId: file, versionId, at: 0, isThumbnailSent });
    }
    if (![HOLD_ROW, ACTING_ROW, DISPATCH_ROW].includes(kind)) continue;
    const expiresAt = Number(expires);
    const left = expiresAt - Date.now();
    const lifetime =
      kind === ACTING_ROW ? ACTING_LIFETIME_MS : RESTORE_HOLD_LIFETIME_MS;
    const isLive = left > 0 && left < 2 * lifetime;
    rows.push({ name, kind, session, fileId, generation, expiresAt, isLive });
  }
  return { handle, rows, adoptions, delivered, foreign };
}

/**
 * Holds a file's generation for a restore session, creating its row. Without
 * Web Locks, it then reads the rows, removes the file's acting and dispatch
 * rows that expired, which takes the file over from the step that wrote one
 * (that step can then no longer claim it, or act on it once claimed, see
 * actAlone, even once a clock set ahead is set back), reads the rows again,
 * and rejects while another tab removes or discards the file (a live acting
 * or dispatch row, or a dispatch row any clock reads as expired since) or,
 * when the session writes the file (`isWritten`), while another session
 * holds it; also when an expired acting row cannot be removed.
 */
async function holdEntry(
  { dir, session }: RestoredQueuedFiles,
  fileId: string,
  generation: string,
  isWritten = false
) {
  const expiresAt = Date.now() + RESTORE_HOLD_LIFETIME_MS;
  const name = [HOLD_ROW, session, fileId, generation, expiresAt].join("~");
  const handle = await getHoldsDir(dir, true);
  await handle!.getFileHandle(name, { create: true });
  if (hasWebLocks()) return;
  for (const row of (await readHolds(dir)).rows) {
    const isActing = row.kind === ACTING_ROW || row.kind === DISPATCH_ROW;
    if (isActing && !row.isLive && row.fileId === fileId) {
      await removeEntryFile(handle, row.name);
    }
  }
  const { rows } = await readHolds(dir);
  const isContended = rows.some(
    (row) =>
      row.fileId === fileId &&
      row.session !== session &&
      (row.kind === DISPATCH_ROW ||
        (row.isLive && (row.kind === ACTING_ROW || isWritten)))
  );
  if (isContended) throw new Error("Another tab is changing a queued file");
}

/**
 * Runs a step that removes or discards a queued file (`act`), resolving
 * whether it ran. With Web Locks, the queue's lock keeps every restore out
 * meanwhile. Without, another tab's restore may hold the file at any time,
 * so the step first creates an acting row, then reads the hold rows again,
 * and is skipped while a live row of a session other than `session` holds
 * the file; a restore reads the acting rows once its hold row is created
 * (see holdEntry), so either the step sees the hold or the restore sees the
 * step and rejects. The step calls `isAlone` right before each destructive
 * request (a FileFn discard, a removal, see dequeueFile), with no await in
 * between, and skips it on false: false while another session's live hold
 * row holds the file. The first call also claims the file: it creates the
 * step's dispatch row, which every restore then finds and rejects on, and
 * removes the step's acting row, which fails when a restore took the file
 * over by removing that row once it expired (see holdEntry), so exactly
 * one of the two goes on, whatever the clocks read; the claim then reads the
 * rows once more. Later calls are false once the dispatch row is gone.
 */
async function actAlone(
  dir: string,
  fileId: string,
  act: (isAlone: () => Promise<boolean>) => Promise<void>,
  session: string = crypto.randomUUID()
) {
  if (hasWebLocks()) {
    await act(async () => true);
    return true;
  }
  const row = (kind: string, lifetime: number) =>
    [kind, session, fileId, "", Date.now() + lifetime].join("~");
  const name = row(ACTING_ROW, ACTING_LIFETIME_MS);
  const fence = row(DISPATCH_ROW, RESTORE_HOLD_LIFETIME_MS);
  const handle = (await getHoldsDir(dir, true))!;
  await handle.getFileHandle(name, { create: true });
  let isClaimed = false;
  const isAlone = async (isClaiming = true) => {
    const { rows } = await readHolds(dir);
    const isHeld = rows.some(
      (held) =>
        held.kind === HOLD_ROW &&
        held.isLive &&
        held.fileId === fileId &&
        held.session !== session
    );
    if (isHeld) return false;
    if (isClaimed) return rows.some((held) => held.name === fence);
    if (!rows.some((held) => held.name === name)) return false;
    if (!isClaiming) return true;
    await handle.getFileHandle(fence, { create: true });
    try {
      await handle.removeEntry(name);
    } catch (error) {
      if ((error as Error)?.name === "NotFoundError") return false;
      throw error;
    }
    isClaimed = true;
    return isAlone();
  };
  try {
    const isActing = await isAlone(false);
    if (isActing) await act(() => isAlone());
    return isActing;
  } finally {
    for (const created of [name, fence]) {
      await removeEntryFile(handle, created).catch((error: unknown) => {
        logger.warn({ at: "fileQueue.holds", row: created, error });
      });
    }
  }
}

/**
 * Removes the hold rows `isRemoved` selects: a session's own (see
 * releaseHolds), or the expired ones a replay removes. One that cannot be
 * removed is logged, and holds no longer than RESTORE_HOLD_LIFETIME_MS.
 * Never rejects.
 */
async function removeHolds(dir: string, isRemoved: (row: HoldRow) => boolean) {
  try {
    const { handle, rows } = await readHolds(dir);
    for (const row of rows) {
      if (!isRemoved(row)) continue;
      await removeEntryFile(handle, row.name).catch((error: unknown) => {
        logger.warn({ at: "fileQueue.holds", row: row.name, error });
      });
    }
  } catch (error) {
    logger.warn({ at: "fileQueue.holds", dir, error });
  }
}

/**
 * Removes a restore session's own hold rows, but those of the files in
 * `retained`, which then hold them until they expire; never rejects.
 */
function releaseHolds(
  { dir, session }: RestoredQueuedFiles,
  retained: ReadonlySet<string> = new Set()
) {
  return removeHolds(
    dir,
    (row) => row.session === session && !retained.has(row.fileId)
  );
}

/**
 * Hands a published file a restore wrote, at `generation`, to its account's
 * replay: creates its adopted mark or, when that cannot be created, an
 * adoption row beside the queue, so a replay finds it adopted even when its
 * record is deleted before the replay sees it. Rejects only when neither
 * can be created.
 */
async function adoptEntry(dir: string, fileId: string, generation: string) {
  try {
    const entry = await getEntryDir(dir, toEntryName(fileId), true);
    await entry?.getFileHandle(`${ADOPTED_PREFIX}${generation}`, {
      create: true
    });
  } catch (error) {
    logger.warn({ at: "fileQueue.adopt", fileId, error });
    const handle = await getHoldsDir(dir, true);
    await handle!.getFileHandle([ADOPTION_ROW, fileId, generation].join("~"), {
      create: true
    });
  }
}

/** Removes a file's entry file, if it is there; any other error rejects. */
async function removeEntryFile(
  entry: FileSystemDirectoryHandle | null,
  name: string
) {
  await entry?.removeEntry(name).catch((error: unknown) => {
    if ((error as Error)?.name !== "NotFoundError") throw error;
  });
}

/**
 * The uploads an account's replay completed, by file: the version FileFn
 * gave the original, recorded once it uploaded, before its thumbnail is sent
 * and before the file leaves the queue. The log is a directory of the origin
 * private file system beside the queue (`<queue>.uploads`), outside its
 * entries, with one row per file, so it outlives the file leaving the queue,
 * a reload and the tab, and a write of one file's row (its own file, created
 * or replaced whole) never changes another's, in any tab, with or without
 * Web Locks. A thumbnail's delivery is a row of its own beside its file's
 * (`<file>~thumbnail`, holding the version), only ever created, so a writer
 * that did not send it never takes another's delivery back. A restore does not stage again a file it records (see
 * stageRestoredFiles), as its original reached FileFn. A discarded file
 * leaves the log, so a later restore stages it again. Once FileFn took the
 * file's thumbnail, or it has none (see sendAccountThumbnail), its row also
 * records it (`isThumbnailSent`), so a restore does not stage the thumbnail
 * again.
 */
type LoggedUpload = {
  versionId: string;
  at: number;
  isThumbnailSent?: boolean;
};

function isLoggedUpload(value: LoggedUpload) {
  return typeof value?.versionId === "string" && typeof value.at === "number";
}

/** Returns a queue's upload log directory, or null when it has none yet. */
async function getUploadLogDir(dir: string, isCreated = false) {
  const root = await navigator.storage.getDirectory();
  try {
    return await root.getDirectoryHandle(`${dir}.uploads`, {
      create: isCreated
    });
  } catch (error) {
    if (isCreated || (error as Error)?.name !== "NotFoundError") throw error;
    return null;
  }
}

/**
 * A queued file's delivery evidence, per component, from its entry's names
 * (`names`, none once it left the queue) and marks, its upload log rows and
 * its delivered row (see logDelivered): `original`, its confirmed version,
 * "" when none is recorded, undefined when unreadable; `thumbnail`, "absent"
 * (`hasThumbnail`), "sent", "rejected", "pending" or "unknown". Each source
 * is read only while those before it leave the component open; one that
 * cannot be read is never absent (`isKnown` false, `error` set). `isDone`:
 * the thumbnail needs no other request. With `confirmed`, a version the
 * page's replay confirmed (see reuseDelivery), the original is that version
 * and only the thumbnail's evidence is read.
 */
async function readDelivery(
  dir: string,
  fileId: string,
  names: readonly string[],
  hasThumbnail = names.some((name) => name.startsWith(THUMBNAIL_PREFIX)),
  confirmed?: string
) {
  let error: unknown;
  const read = async (
    open: () => Promise<FileSystemDirectoryHandle | null>,
    name: string
  ) => {
    try {
      const handle = await open();
      const file = await handle?.getFileHandle(name);
      return file ? await (await file.getFile()).text() : "";
    } catch (readError) {
      if ((readError as Error)?.name === "NotFoundError") return "";
      logger.warn({ at: "fileQueue.delivery", fileId, name, readError });
      error ??= readError;
      return undefined;
    }
  };
  const log = () => getUploadLogDir(dir);
  const row = encodeURIComponent(fileId);
  const isMarked = !confirmed && names.includes(UPLOADED_FILE);
  const marked = confirmed
    ? confirmed
    : isMarked
      ? await read(
          () => getEntryDir(dir, toEntryName(fileId), true),
          UPLOADED_FILE
        )
      : "";
  /** The file's delivered row (see logDelivered); null when unreadable. */
  const readRow = async () => {
    try {
      const { delivered } = await readHolds(dir);
      return delivered.filter((found) => found.fileId === fileId);
    } catch (readError) {
      error ??= readError;
      return null;
    }
  };
  let original = marked;
  if (!original) {
    const text = await read(log, row);
    const logged = parseJson(text, isLoggedUpload)?.versionId;
    original = logged ?? (text === undefined ? undefined : marked);
  }
  if (original === "") {
    const found = await readRow();
    original = found === null ? undefined : (found[0]?.versionId ?? "");
  }
  type Thumbnail = "absent" | "sent" | "rejected" | "pending" | "unknown";
  let thumbnail: Thumbnail = "pending";
  if (!hasThumbnail) thumbnail = "absent";
  else if (names.includes(THUMBNAIL_SENT_FILE)) thumbnail = "sent";
  else if (names.includes(THUMBNAIL_REJECTED_FILE)) thumbnail = "rejected";
  else if (original) {
    const sent = await read(log, `${row}~thumbnail`);
    const found = sent === original ? [] : await readRow();
    const isRowSent = found?.some(
      (rowSent) => rowSent.isThumbnailSent && rowSent.versionId === original
    );
    if (sent === original || isRowSent) thumbnail = "sent";
    else if (sent === undefined || found === null) thumbnail = "unknown";
  }
  return {
    original,
    thumbnail,
    isKnown: original !== undefined && thumbnail !== "unknown",
    isDone: thumbnail === "sent" || thumbnail === "absent",
    error
  };
}

/**
 * Records a file's uploaded version in its row of its queue's upload log,
 * or without one removes its row.
 */
async function writeUploadLog(
  dir: string,
  fileId: string,
  versionId?: string,
  isThumbnailSent?: boolean
) {
  const handle = await getUploadLogDir(dir, Boolean(versionId));
  const name = encodeURIComponent(fileId);
  if (!versionId) {
    await removeEntryFile(handle, name);
    await removeEntryFile(handle, `${name}~thumbnail`);
    const { handle: holds, delivered } = await readHolds(dir);
    for (const row of delivered.filter((row) => row.fileId === fileId)) {
      await removeEntryFile(holds, row.name);
    }
    return;
  }
  const write = async (row: string, text: string) => {
    const file = await handle!.getFileHandle(row, { create: true });
    const writable = await file.createWritable();
    await writable.write(text);
    await writable.close();
  };
  await write(name, JSON.stringify({ versionId, at: Date.now() }));
  if (isThumbnailSent) await write(`${name}~thumbnail`, versionId);
}

/**
 * Records a replay's upload (or discard, without `versionId`) in its queue's
 * upload log, resolving whether it could. The log only spares a later
 * restore staging the file again, so a log that cannot be read or written
 * is logged and the replay goes on: it sends the thumbnail, marks the file
 * uploaded and removes it, or removes a discarded file, as without a log
 * (see replayAccountEntry).
 */
async function logUpload(
  dir: string,
  fileId: string,
  versionId?: string,
  isThumbnailSent?: boolean
) {
  try {
    await writeUploadLog(dir, fileId, versionId, isThumbnailSent);
    return true;
  } catch (error) {
    logger.warn({ at: "fileQueue.replay.uploadLog", fileId, error });
    return false;
  }
}

/**
 * Records a delivery in the upload log once the removal freed the file's
 * bytes (see replayAccountEntry and removeDelivered), and when the log still
 * cannot be written (a full store), as a delivered row beside the queue
 * (see HoldRow), an empty file whose name holds the delivery, so a restore
 * of an older backup still finds it (see readDelivery) and the next pass
 * moves it into the log (see drainQueue). Never rejects.
 */
async function logDelivered(
  dir: string,
  fileId: string,
  versionId: string,
  isThumbnailSent: boolean
) {
  if (await logUpload(dir, fileId, versionId, isThumbnailSent)) return;
  const sent = isThumbnailSent ? "1" : "0";
  try {
    const handle = await getHoldsDir(dir, true);
    const name = [DELIVERED_ROW, fileId, sent, versionId].join("~");
    await handle!.getFileHandle(name, { create: true });
  } catch (error) {
    logger.warn({ at: "fileQueue.delivered", fileId, error });
  }
}

/**
 * A queued file at the generation a restore wrote or found it, and whether
 * the backup carried its thumbnail.
 */
type QueuedGeneration = {
  fileId: string;
  generation: string;
  hasThumbnail?: boolean;
};

/** The files a restore session put or kept in a queue (see stageRestoredFiles). */
export type RestoredQueuedFiles = {
  dir: string;
  /** The restore session, whose hold rows hold the files (see HoldRow). */
  session: string;
  /** The files the restore wrote, each at the new generation it wrote. */
  written: QueuedGeneration[];
  /** The files the restore found held and kept as they were. */
  kept: QueuedGeneration[];
  /**
   * The foreign rows (see HoldRow) the restore created for files it kept,
   * removed again once it rolls back or imports no record of the file.
   */
  foreign: string[];
  /** The signed-in account the restore imports records into, if any. */
  account?: string;
  /** The DataFn scope it imports them into (see toRecordsView), if known. */
  view?: string;
  /** The account's FileFn authority (see QueuedFileClaim), if known. */
  authority?: string;
  /** When its earliest hold row expires (see renewRestoredFiles). */
  heldUntil: number;
};

/**
 * Puts files a backup carried into a queue, under the queue's lock, each as
 * a new generation (see RESTORING_PREFIX) published only once it is fully
 * written, and held by the restore session (see HoldRow) from before its
 * first byte until the restore settles (see settleRestoredFiles). A
 * published file stays held, never uploaded, removed or discarded, until
 * its account adopts it, once a record of the account references it: a
 * restore into the queue's own account adopts the files its imported records
 * reference when it settles, and the account's replay adopts any other once
 * it finds a record referencing it, also for a restore into another account
 * or the guest.
 * A file stays as the queue holds it when it is complete there (published),
 * or when the queue's upload log records its original uploaded (see
 * LoggedUpload), whether or not it is still there, unless the backup carries
 * its thumbnail only (see QueuedFileCopy); a restore into the queue's
 * own account (`isOwnAccount`) holds a complete file it keeps, and any
 * restore holds a published file no account adopted yet, so no replay acts
 * on it and no earlier restore's rollback removes it before the restore's
 * records are imported. Any other (missing, not staged yet, or left
 * unpublished by an interrupted restore) is written again from the backup.
 * A file another restore may still be writing (without Web Locks), or that
 * cannot be read or written, rejects, after rolling back what this call
 * wrote (see unstageRestoredFiles); a read error never counts as absent.
 * Without Web Locks, each file is held before it is written or kept, then
 * read again, and one another tab holds, writes, removes or discards
 * meanwhile rejects (see holdEntry), so no other tab acts on it.
 */
export async function stageRestoredFiles(
  dir: string,
  copies: readonly QueuedFileCopy[],
  options: {
    isOwnAccount: boolean;
    account?: string | null;
    view?: string;
    authority?: string;
  }
): Promise<RestoredQueuedFiles> {
  const staged: RestoredQueuedFiles = {
    dir,
    session: crypto.randomUUID(),
    written: [],
    kept: [],
    foreign: [],
    account: options.account ?? undefined,
    view: options.view,
    authority: options.authority,
    heldUntil: Date.now() + RESTORE_HOLD_LIFETIME_MS
  };
  if (!copies.length) return staged;
  if (!isFileQueueSupported()) {
    throw new Error("This device cannot keep the backup's pending files");
  }
  const signal = new AbortController().signal;
  await withQueueLock(dir, signal, async () => {
    try {
      for (const copy of copies) {
        const { fileId } = copy;
        const found = await readFoundEntry(dir, fileId);
        const isKept =
          found.state === "restored" ||
          (found.state === "complete" && options.isOwnAccount);
        const delivery = await readDelivery(dir, fileId, [], !!copy.thumbnail);
        if (!delivery.isKnown) throw delivery.error;
        const logged = delivery.original;
        const isWritten =
          found.state === "none" && !(logged && delivery.isDone);
        if (!isKept && !isWritten) continue;
        const generation = isKept ? found.generation : crypto.randomUUID();
        const hasThumbnail = Boolean(copy.thumbnail);
        const restored = { fileId, generation, hasThumbnail };
        (isKept ? staged.kept : staged.written).push(restored);
        await holdEntry(staged, fileId, generation, isWritten);
        const again = hasWebLocks() ? found : await readFoundEntry(dir, fileId);
        if (
          again.state !== found.state ||
          again.generation !== found.generation ||
          again.isPresent !== found.isPresent
        ) {
          throw new Error("Another tab is changing a queued file");
        }
        if (isWritten) {
          const thumbnailOnly = logged && {
            data: new Uint8Array(),
            uploadedVersionId: logged
          };
          const written = { ...copy, ...thumbnailOnly };
          const { isPresent } = found;
          const isOwn = options.isOwnAccount;
          await stageRestoredEntry(dir, written, generation, isPresent, isOwn);
        } else if (!options.isOwnAccount) {
          await createForeignRow(staged, fileId, generation);
        }
      }
    } catch (error) {
      await rollBackRestoredFiles(staged);
      throw error;
    }
  });
  return staged;
}

/**
 * Revalidates a restore session's files right before it imports its
 * records, under the queue's lock, once less than half of its holds'
 * lifetime is left (a page paused since staging): each file it wrote or
 * kept must still be published at the generation it recorded, and is then
 * held again, with the session's foreign row created again when the
 * account's replay removed it meanwhile (see reconcileForeignRows), so an
 * import that resumes once its holds expired commits only while its files
 * are protected again; a file replaced or removed meanwhile rejects, for
 * the restore to roll back without importing (see unstageRestoredFiles),
 * unless its delivery is confirmed (see isDelivered).
 */
export async function renewRestoredFiles(staged: RestoredQueuedFiles) {
  if (!staged.written.length && !staged.kept.length) return;
  if (Date.now() + RESTORE_HOLD_LIFETIME_MS / 2 < staged.heldUntil) return;
  const heldUntil = Date.now() + RESTORE_HOLD_LIFETIME_MS;
  const signal = new AbortController().signal;
  await withQueueLock(staged.dir, signal, async () => {
    for (const restored of [...staged.written, ...staged.kept]) {
      const { fileId, generation, hasThumbnail } = restored;
      const restore = await readRestore(staged.dir, fileId);
      if (!restore && (await isDelivered(staged.dir, fileId, hasThumbnail))) {
        continue;
      }
      if (!restore?.isPublished || restore.generation !== generation) {
        throw new Error("A queued file changed while the backup was restored");
      }
      await holdEntry(staged, fileId, generation);
      if (isRowLost(staged, fileId, restore)) {
        await createForeignRow(staged, fileId, generation);
      }
    }
  });
  staged.heldUntil = heldUntil;
}

/**
 * Whether the upload log or a delivered row (see readDelivery) confirms a
 * file delivered once it left the queue: its original and, when the backup
 * carried one (`hasThumbnail`), its thumbnail sent, so a restore whose
 * thumbnail no delivery records rejects instead of dropping it; a read
 * error rejects.
 */
async function isDelivered(dir: string, fileId: string, hasThumbnail = false) {
  const delivery = await readDelivery(dir, fileId, [], hasThumbnail);
  if (!delivery.isKnown) throw delivery.error;
  return Boolean(delivery.original) && delivery.isDone;
}

/**
 * Whether a session created a foreign row for a file's generation of which
 * none is left (the account's replay removed it, see reconcileForeignRows),
 * so the session creates a new one, under a new name (see HoldRow), which
 * no earlier take or binding of the generation found (see bindTaken).
 */
function isRowLost(
  staged: RestoredQueuedFiles,
  fileId: string,
  { generation, foreignRows }: { generation: string; foreignRows: string[] }
) {
  const prefix = [FOREIGN_ROW, fileId, generation, staged.session, ""];
  const own = staged.foreign.filter((row) => row.startsWith(prefix.join("~")));
  return own.length > 0 && !own.some((row) => foreignRows.includes(row));
}

/**
 * How a queue holds a file a restore brings back, at its generation:
 * "complete" when it is published and no restore holds it for an account
 * (adopted, or no restore wrote it), "restored" when it is published and
 * not adopted yet, and "none" when it is missing, its staging has not
 * finished, or an interrupted restore left it unpublished. One a live hold
 * shows another restore may still be writing (without Web Locks), and one
 * whose metadata, bytes or thumbnail cannot be read, rejects.
 */
async function readFoundEntry(dir: string, fileId: string) {
  const restore = await readRestore(dir, fileId);
  const generation = restore?.generation ?? BASE_GENERATION;
  if (!restore) return { state: "none", generation, isPresent: false };
  if (!restore.isPublished) {
    if (!hasWebLocks() && restore.isHeld()) {
      throw new Error("Another restore is writing a queued file");
    }
    return { state: "none", generation, isPresent: true };
  }
  const entry = await getEntryDir(dir, toEntryName(fileId), true);
  if (!entry || !(await readPendingStrict(entry, await readNames(entry)))) {
    return { state: "none", generation, isPresent: Boolean(entry) };
  }
  await readThumbnail(entry);
  const state = restore.isAdopted ? "complete" : "restored";
  return { state, generation, isPresent: true };
}

/**
 * Writes a file a backup carried as a new generation, in an entry it
 * creates: its restoring mark first (removing the entry when that mark
 * cannot be created), then its bytes and the marks the backup held, and its
 * published mark last (see RESTORING_PREFIX), rejecting instead when another
 * restore wrote into the entry meanwhile (another tab, without Web Locks).
 */
async function stageRestoredEntry(
  dir: string,
  copy: QueuedFileCopy,
  generation: string,
  isPresent: boolean,
  isOwn: boolean
) {
  const entryName = toEntryName(copy.fileId);
  if (isPresent) await dequeueFile(dir, copy.fileId);
  await bumpRevision(dir);
  const root = await navigator.storage.getDirectory();
  const queue = await root.getDirectoryHandle(dir, { create: true });
  const entry = await queue.getDirectoryHandle(entryName, { create: true });
  if ((await readNames(entry)).length) {
    throw new Error("Another restore is writing a queued file");
  }
  try {
    await entry.getFileHandle(`${RESTORING_PREFIX}${generation}`, {
      create: true
    });
  } catch (error) {
    await queue.removeEntry(entryName, { recursive: true }).catch(String);
    throw error;
  }
  await getStore(dir).stagePendingUpload({
    uploadSessionId: entryName,
    fileId: copy.fileId,
    policy: copy.policy,
    fileName: copy.fileName,
    size: copy.data.byteLength,
    mimeType: copy.contentType,
    fileData: copy.data.slice().buffer as ArrayBuffer,
    createdAt: copy.createdAt,
    retryCount: copy.retryCount
  });
  for (const { name, text } of copy.started) {
    if (STARTED_NAME.test(name)) {
      await writeEntryFile(dir, entryName, name, text);
    }
  }
  if (copy.claim) await claimEntry(dir, entryName, copy.claim);
  if (copy.isCommitted) {
    await markQueuedFileCommitted(dir, copy.fileId);
  }
  if (copy.uploadedVersionId) {
    await writeEntryFile(dir, entryName, UPLOADED_FILE, copy.uploadedVersionId);
  }
  if (copy.thumbnail && THUMBNAIL_TYPES.has(copy.thumbnail.type)) {
    await writeEntryFile(
      dir,
      entryName,
      `${THUMBNAIL_PREFIX}${copy.thumbnail.type.split("/")[1]}`,
      copy.thumbnail.data.slice().buffer as ArrayBuffer
    );
  }
  const restoring = (await readNames(entry)).filter((name) =>
    name.startsWith(RESTORING_PREFIX)
  );
  if (restoring.length !== 1) {
    throw new Error("Another restore is writing a queued file");
  }
  if (isOwn) await entry.getFileHandle(`${OWN_PREFIX}${generation}`, MAKE);
  await entry.getFileHandle(`${PUBLISHED_PREFIX}${generation}`, {
    create: true
  });
  await bumpRevisionAfter(dir);
  notifyFailureChange(copy.fileId);
}

/**
 * Settles a restore session once it imported its records, all or in part,
 * or stopped there, under the queue's lock, for each file it wrote or kept
 * that is still published at the generation it recorded. With
 * `isReferenced`, for a restore into the queue's own account, a file a
 * record of the account references is adopted (see adoptEntry), so the
 * replay's rules apply to it, also once its record is later deleted; and
 * one whose original and thumbnail the replay delivered (marked uploaded
 * and sent) leaves the queue instead, unless another session holds it, as
 * its record now references the file FileFn holds (see removeDelivered). Any other file not
 * adopted yet stays held for its account, marked settled so no earlier
 * restore's rollback removes it. Without `isReferenced`, for a restore into
 * another account, a file it kept that `isKept` resolves false for (its
 * import failed, and no record of the account references the file) is left
 * as it was, without the foreign row the restore created for it (see
 * createForeignRow); one `isKept` cannot tell keeps that row, created
 * again when the account's replay removed it while the import ran.
 * Then removes the session's own hold rows,
 * leaving other sessions', but the row of a file that cannot be read,
 * adopted or marked, which stays held until the row expires, so no earlier
 * restore's rollback removes it meanwhile, and then for the replay to adopt
 * once it finds the file referenced; never rejects.
 */
export async function settleRestoredFiles(
  staged: RestoredQueuedFiles,
  isReferenced?: (fileId: string) => Promise<boolean | undefined>,
  isKept: (fileId: string) => Promise<boolean | undefined> = async () => true
): Promise<void> {
  const { dir, written, kept, session } = staged;
  if (!written.length && !kept.length) return;
  const signal = new AbortController().signal;
  await withQueueLock(dir, signal, async () => {
    const retained = new Set<string>();
    for (const { fileId, generation } of [...written, ...kept]) {
      try {
        const restore = await readRestore(dir, fileId);
        if (!restore?.isPublished || restore.generation !== generation) {
          continue;
        }
        const isForeign =
          !isReferenced && kept.some((found) => found.fileId === fileId);
        if (isForeign && (await isKept(fileId)) === false) {
          await removeForeignRows(staged, `${fileId}~`);
          continue;
        }
        if (isRowLost(staged, fileId, restore)) {
          await createForeignRow(staged, fileId, generation);
        }
        if (isReferenced && (await isReferenced(fileId)) === true) {
          if (restore.isDelivered && !restore.isHeld(session)) {
            await removeDelivered(staged, fileId);
          } else if (!restore.isAdopted) {
            await adoptEntry(dir, fileId, generation);
          }
        } else if (!restore.isAdopted) {
          const entry = await getEntryDir(dir, toEntryName(fileId), true);
          await entry?.getFileHandle(`${SETTLED_PREFIX}${generation}`, {
            create: true
          });
        }
      } catch (error) {
        retained.add(fileId);
        logger.warn({ at: "fileQueue.release", fileId, error });
      }
    }
    await releaseHolds(staged, retained);
  }).catch((error: unknown) => {
    logger.warn({ at: "fileQueue.release", dir, error });
  });
}

/**
 * Removes a restored file whose original and thumbnail were delivered (see
 * settleRestoredFiles), recording the delivery in the upload log from its
 * uploaded mark first, and again once the removal freed its bytes when the
 * log could not be written (a full store, see logDelivered), so a later
 * restore does not stage either again.
 */
async function removeDelivered(
  { dir, session }: RestoredQueuedFiles,
  fileId: string
) {
  const versionId = await readEntryText(
    dir,
    toEntryName(fileId),
    UPLOADED_FILE,
    true
  );
  const isLogged =
    Boolean(versionId) && (await logUpload(dir, fileId, versionId, true));
  await actAlone(
    dir,
    fileId,
    async (isAlone) => {
      const record = () =>
        versionId && !isLogged && logDelivered(dir, fileId, versionId, true);
      const isRemoved = await dequeueFile(dir, fileId, isAlone).catch(
        async (error: unknown) => {
          if (error instanceof UnconfirmedRemovalError) await record();
          throw error;
        }
      );
      if (isRemoved) await record();
    },
    session
  );
}

/**
 * Rolls back a restore session that failed before importing any record,
 * under the queue's lock: removes each file it wrote that is still at the
 * generation it wrote, neither adopted, bound (see BOUND_PREFIX) nor
 * settled, held by no other session's live row and protected by no other
 * session's foreign row (see HoldRow); a file another restore or the
 * replay adopted, bound, kept, settled or replaced stays as it is. One that cannot be removed stays
 * held for its account. Then removes the session's own hold rows. Never
 * rejects.
 */
export async function unstageRestoredFiles(
  staged: RestoredQueuedFiles
): Promise<void> {
  if (!staged.written.length && !staged.kept.length) return;
  const signal = new AbortController().signal;
  await withQueueLock(staged.dir, signal, () =>
    rollBackRestoredFiles(staged)
  ).catch((error: unknown) => {
    logger.warn({ at: "fileQueue.unstage", dir: staged.dir, error });
  });
}

/** Removes a file a session wrote, unless kept (see unstageRestoredFiles). */
async function rollBackEntry(
  { dir, session, foreign }: RestoredQueuedFiles,
  fileId: string,
  generation: string,
  isAlone: () => Promise<boolean>
) {
  const restore = await readRestore(dir, fileId);
  if (!restore || restore.generation !== generation) return;
  if (restore.isAdopted || restore.isSettled || restore.isHeld(session)) {
    return;
  }
  if (restore.foreignRows.some((row) => !foreign.includes(row))) return;
  if (restore.isBound) return;
  await dequeueFile(dir, fileId, isAlone);
}

/**
 * Creates the session's own foreign row of a file a restore into another
 * account kept, before it imports any record, so a restore cut short after
 * its import still protects the file, naming the account it restores into,
 * whose replay removes the row once it finds no record of the account
 * referencing the file (see reconcileForeignRows); another session's row is
 * its own.
 */
async function createForeignRow(
  staged: RestoredQueuedFiles,
  fileId: string,
  generation: string
) {
  const handle = (await getHoldsDir(staged.dir, true))!;
  const { scope, authority } = toRowDestination(
    staged.account ?? "",
    staged.view,
    staged.authority
  );
  const name = [FOREIGN_ROW, fileId, generation, staged.session];
  name.push(scope, authority);
  const row = [...name, crypto.randomUUID()].join("~");
  staged.foreign.push(row);
  await handle.getFileHandle(row, MAKE);
}

/**
 * Removes the foreign rows a restore created (see createForeignRow), of
 * one file or all; one that cannot be removed is logged and stays, for the
 * account's replay to remove (see reconcileForeignRows).
 */
async function removeForeignRows(staged: RestoredQueuedFiles, fileId = "") {
  const prefix = `${FOREIGN_ROW}~${fileId}`;
  for (const name of staged.foreign.filter((row) => row.startsWith(prefix))) {
    try {
      const handle = await getHoldsDir(staged.dir);
      await handle?.removeEntry(name);
    } catch (error) {
      if ((error as Error)?.name === "NotFoundError") continue;
      logger.warn({ at: "fileQueue.foreign", name, error });
    }
  }
}

/** Rolls back a restore session (see unstageRestoredFiles), under the lock. */
async function rollBackRestoredFiles(staged: RestoredQueuedFiles) {
  const { dir, session } = staged;
  for (const { fileId, generation } of staged.written) {
    try {
      await actAlone(
        dir,
        fileId,
        (isAlone) => rollBackEntry(staged, fileId, generation, isAlone),
        session
      );
    } catch (error) {
      logger.warn({ at: "fileQueue.unstage", fileId, error });
    }
  }
  await removeForeignRows(staged);
  await releaseHolds(staged);
}

function hasWebLocks() {
  return Boolean(globalThis.navigator?.locks);
}

/** Returns whether any of the queues holds a file. */
export async function hasQueuedFiles(dirs: readonly string[]) {
  if (!isFileQueueSupported()) return false;
  for (const dir of dirs) {
    try {
      const root = await navigator.storage.getDirectory();
      const queue = await root.getDirectoryHandle(dir);
      const keys = (
        queue as unknown as { keys(): AsyncIterableIterator<string> }
      ).keys();
      if (!(await keys.next()).done) return true;
    } catch {
      continue;
    }
  }
  return false;
}

type ReplayRequest = {
  client: FileFnClient;
  signal: AbortSignal;
  publisher?: QueuedFilePublisher;
  references?: QueuedFileReferences;
};
const replays = new Map<
  string,
  { next: ReplayRequest | null; done: Promise<void> }
>();
/**
 * The request the page last asked a replay of each queue with, that a retry
 * of a failed file runs a pass with (see retryFailedQueuedFile); one whose
 * records were replaced (see isStale) never replaces a current one.
 */
const latestRequests = new Map<string, ReplayRequest>();
/** Delays of the retries after passes that left files to upload. */
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000, 600_000];
/**
 * The retries a queue's passes used, by queue, with the request that last
 * counted one: every current request shares them, and once that request is
 * stale (see isStale, a replaced DataFn runtime), the next starts with every
 * retry, so retries a replaced runtime used never limit its own.
 */
const retryCounts = new Map<
  string,
  { request: ReplayRequest; count: number }
>();
/** How long an account's file without a record may still be saving. */
export const UNCOMMITTED_GRACE_MS = 24 * 60 * 60_000;
/** The upload requests each client sent (see countSentRequests). */
const sentRequests = new WeakMap<FileFnClient, Map<string, number>>();

/**
 * Lets a replay tell that `client` sent no request for an upload, whose marker
 * it may then remove: `sent` counts upload requests per idempotency key ("*",
 * unreadable, counts for all); without counts, an upload may have sent one.
 */
export function countSentRequests(
  client: FileFnClient,
  sent: Map<string, number>
) {
  sentRequests.set(client, sent);
}

/**
 * What a pass did with an entry: finished with it for now, left it to upload
 * on a retry, or stopped the pass.
 */
type EntryOutcome = "done" | "retry" | "stop";
type ReplayPass = {
  dir: string;
  store: OPFSStore;
  request: ReplayRequest;
  /** Whether the records were brought up to date since the last upload. */
  isSynced: boolean;
  /**
   * The `<file>~<generation>`s it took though no adoption was recorded:
   * bound (see isBound), or to bind or reclaim (see takeOverRestoredEntry).
   */
  taken: Set<string>;
};

/**
 * Uploads every file in a queue through the client, one tab at a time: the
 * replay holds the queue's Web Lock, so another tab's replay waits and then
 * finds the files it uploaded gone. A tab coalesces replays requested while
 * one runs into one more pass, through the latest client asked for. Each
 * upload sends a fixed `fileId` and an idempotency key, so a replay that a
 * reload or a closed tab interrupted, or that ran in two tabs without Web
 * Locks, continues the same upload session instead of making another file
 * version; a session another replay already completed counts as uploaded
 * once FileFn has the file. A file stays queued while its upload fails, for
 * the next replay (reconnect or next client), and a pass stops when its
 * client's signal aborts. A pass that fails still runs the one requested
 * meanwhile, and one that left files to upload while online is retried a
 * few times at growing delays. An upload starts only while the device is
 * online, checked in the same step, so a client never stages it offline.
 * A file a restore is writing or holds (see RESTORING_PREFIX and HoldRow)
 * is left untouched; an unpublished one no restore can still be writing is
 * removed, and a published one no hold row holds is adopted once a record
 * of the queue's account references it, and the rules below then apply. A
 * mark that cannot be read leaves the file to a retry.
 *
 * A file uploads only once it is committed (see markQueuedFileCommitted).
 * With a publisher (the device's local queue), it also needs a current copy
 * of its record (not marked stale), and uploads only while the publisher is
 * ready and only for the account that claimed it: the first ready account
 * claims it before the upload, so a sign-out or account switch during the
 * upload leaves it to that account's next sign-in, never to another account.
 * Its record, as copied when the upload ends, is published after the upload
 * and the entry is then marked uploaded instead of removed, so it renders on
 * the device and never uploads again. A publish interrupted or failed leaves
 * the entry for the claiming account's next replay, whose upload continues
 * the same session or finds it completed.
 *
 * With references (an account's queue), a file whose upload started (marked
 * with its authority first) is left untouched at any other authority; one
 * that never started is the replay's. Each decision reads the records
 * fully brought up to date since the pass last uploaded, and again after
 * each upload (which marks the file uploaded) before the file is removed. A file uploads only while a record
 * of the account references it, which also commits one whose mark was lost.
 * A committed file whose record was deleted, or an uncommitted one older
 * than a day, is removed without an upload (a pass runs at that deadline),
 * and one that may have started (per markers read after that check, always
 * without Web Locks) is discarded first; each discard and removal runs only
 * while the records are the owner's at that authority, checked in the same
 * step. A marker that cannot be read keeps the file. A pass stops while the
 * records cannot be brought up to date or read, and a request whose records
 * were replaced never replaces a current one queued (see isStale).
 */
export function replayFileQueue(
  dir: string,
  client: FileFnClient,
  signal: AbortSignal,
  publisher?: QueuedFilePublisher,
  references?: QueuedFileReferences
): Promise<void> {
  const first: ReplayRequest = { client, signal, publisher, references };
  if (references && !isStale(first)) {
    for (const listener of [...accountReplayListeners]) {
      listener({ ...references.owner, client, signal });
    }
  }
  const latest = latestRequests.get(dir);
  if (!isStale(first) || !latest || isStale(latest)) {
    latestRequests.set(dir, first);
  }
  const running = replays.get(dir);
  if (running) {
    if (!isStale(first) || !running.next || isStale(running.next)) {
      running.next = first;
    }
    return running.done;
  }
  const state = {
    next: first as ReplayRequest | null,
    done: Promise.resolve()
  };
  replays.set(dir, state);
  state.done = (async () => {
    try {
      while (state.next) {
        const current: ReplayRequest = state.next;
        state.next = null;
        if (!current.signal.aborted) await replayPass(dir, current);
      }
    } finally {
      replays.delete(dir);
    }
  })();
  return state.done;
}

export type AccountQueueReplay = QueuedFileClaim &
  Pick<ReplayRequest, "client" | "signal">;
const accountReplayListeners = new Set<(replay: AccountQueueReplay) => void>();

export function onAccountQueueReplay(
  listener: (replay: AccountQueueReplay) => void
): () => void {
  accountReplayListeners.add(listener);
  return () => accountReplayListeners.delete(listener);
}

/**
 * Whether a request's records were replaced (see QueuedFileReferences), as
 * for a retry or deadline pass that kept them, so it never replaces the
 * request a current runtime queued.
 */
function isStale(request: ReplayRequest) {
  return request.references?.isCurrent() === false;
}

/** Runs a pass, scheduling a retry when it left files to upload. */
async function replayPass(dir: string, request: ReplayRequest) {
  let isRetried = true;
  try {
    isRetried = Boolean(
      await withQueueLock(dir, request.signal, () => drainQueue(dir, request))
    );
  } catch (error) {
    if (!request.signal.aborted) logger.warn({ at: "fileQueue.replay", error });
  }
  isRetried = (await reconcileForeignRows(dir, request)) || isRetried;
  if (isStale(request)) return;
  const { client, signal, publisher, references } = request;
  const used = retryCounts.get(dir);
  const count = used && !isStale(used.request) ? used.count : 0;
  if (!isRetried) retryCounts.delete(dir);
  if (!isRetried || request.signal.aborted || count >= RETRY_DELAYS_MS.length) {
    return;
  }
  retryCounts.set(dir, { request, count: count + 1 });
  const timer = setTimeout(() => {
    if (isStale(request)) return;
    void replayFileQueue(dir, client, signal, publisher, references);
  }, RETRY_DELAYS_MS[count]);
  signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
}

/** The timers that run a queue's pass at its earliest grace deadline. */
const graceTimers = new Map<
  string,
  { at: number; signal: AbortSignal; request: ReplayRequest }
>();

/**
 * Runs a pass over the queue at `at`, once a recent file without a record
 * outlives its grace, so it is removed, or a restore's hold on a file
 * expires, so it is uploaded, without another trigger: one timer per queue,
 * at the earliest deadline, outside the retry budget, cancelled once the
 * pass's client signal aborts. The pass runs with the latest request that
 * asked for a deadline, so records replaced meanwhile (see
 * QueuedFileReferences) never decide it, and a request whose records were
 * replaced (see isStale) never displaces a current one's deadline.
 */
function scheduleDeadline(
  { dir, request }: Pick<ReplayPass, "dir" | "request">,
  at: number
) {
  const current = graceTimers.get(dir);
  if (!Number.isFinite(at) || request.signal.aborted) return;
  if (isStale(request)) return;
  if (current?.signal === request.signal && current.at <= at) {
    current.request = request;
    return;
  }
  const { signal } = request;
  const scheduled = { at, signal, request };
  graceTimers.set(dir, scheduled);
  const delay = Math.min(at - Date.now(), 2 ** 31 - 1);
  const timer = setTimeout(() => {
    if (graceTimers.get(dir) !== scheduled) return;
    graceTimers.delete(dir);
    if (isStale(scheduled.request)) return;
    const { client, publisher, references } = scheduled.request;
    void replayFileQueue(dir, client, signal, publisher, references);
  }, delay);
  signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
}

/** The page's own queue locks, for a browser without Web Locks. */
const pageLocks = new Map<string, Promise<unknown>>();

/**
 * Runs `run` under a queue's Web Lock, or without Web Locks under the
 * page's own lock of the queue, so the page's replays, backups and restores
 * of a queue never interleave.
 */
export async function withQueueLock<T>(
  dir: string,
  signal: AbortSignal,
  run: () => Promise<T>
): Promise<T | undefined> {
  const locks: LockManager | undefined = globalThis.navigator?.locks;
  if (!locks) {
    const result = (pageLocks.get(dir) ?? Promise.resolve()).then(run);
    pageLocks.set(
      dir,
      result.catch(() => undefined)
    );
    return result;
  }
  return locks
    .request(`${QUEUE_LOCK_PREFIX}:${dir}`, { signal }, run)
    .catch((error: unknown) => {
      if (!signal.aborted) throw error;
      return undefined;
    });
}

/** Runs a pass over a queue; resolves whether it left files to retry. */
async function drainQueue(dir: string, request: ReplayRequest) {
  if (!isFileQueueSupported()) return false;
  const pass: ReplayPass = {
    dir,
    store: getStore(dir),
    request,
    isSynced: false,
    taken: new Set()
  };
  await removeHolds(dir, (row) => !row.isLive);
  await moveDeliveredRows(dir);
  await confirmRemovals(dir);
  let isRetried = false;
  for (const entryName of await pass.store.listPendingUploads()) {
    if (request.signal.aborted || isAppOffline()) {
      return false;
    }
    if (!entryName.startsWith(ENTRY_PREFIX)) continue;
    const outcome = await replayEntry(pass, entryName).catch(
      (error: unknown): EntryOutcome => {
        if (request.signal.aborted) return "stop";
        logger.warn({ at: "fileQueue.replay", entryName, error });
        return "retry";
      }
    );
    if (outcome === "stop") return !request.signal.aborted;
    isRetried ||= outcome === "retry";
  }
  return isRetried;
}

/**
 * Moves the delivered rows (see logDelivered) into the upload log as far as
 * it can be written, removing each it moved; never rejects.
 */
async function moveDeliveredRows(dir: string) {
  try {
    const { handle, delivered } = await readHolds(dir);
    for (const { name, fileId, versionId, isThumbnailSent } of delivered) {
      if (!(await logUpload(dir, fileId, versionId, isThumbnailSent))) return;
      await removeEntryFile(handle, name);
    }
  } catch (error) {
    logger.warn({ at: "fileQueue.delivered", dir, error });
  }
}

/**
 * Removes the foreign rows (see HoldRow) restores into the request's account
 * created in any queue, once no live hold row of their session is left (it
 * settled or rolled back, or its page closed) and no record of the account
 * references the file, in its records brought up to date in the DataFn
 * scope the restore imported into (the row's scope, see toRecordsView); a
 * row of any other scope stays, also one of the account's other kind of
 * scope at the same FileFn authority, as a negative answer there (a local
 * copy whose deletion is not acknowledged yet, or a direct authority that a
 * retired local copy never reached) never shows the row's scope lost its
 * last reference, so the row keeps the file rather than risk its only
 * bytes. A row naming no authority (its restore could not tell which
 * authority its records sync with) gets the request's once a pass of its
 * own scope, brought up to date with that authority, finds a record
 * referencing the file; the authority a row names never widens where it is
 * reconciled. So a restore cut short before
 * it imported a matching record, or whose removal of its row failed,
 * protects the file no longer, while one that saved a matching record keeps
 * it protected; one that resumes its import later protects its files again
 * first (see renewRestoredFiles). A row its session still holds gets a pass of
 * the request's queue (`dir`) once that hold expires (see scheduleDeadline).
 * Each queue's rows are read and removed under that queue's lock, taken
 * after the pass released its own; never rejects, and resolves true when a
 * row could not be checked or removed, for the pass to be retried.
 */
async function reconcileForeignRows(dir: string, request: ReplayRequest) {
  const { references, signal } = request;
  if (!references || signal.aborted) return false;
  const { owner } = references;
  const destination = toRowDestination(
    owner.userId,
    references.view?.(),
    owner.baseUrl
  );
  if (!destination.scope) return false;
  /** Rows of the account's exact scope (see toRowDestination). */
  const isOwn = (row: string) => {
    const [kind, , , , scope] = row.split("~");
    return kind === FOREIGN_ROW && scope === destination.scope;
  };
  let isSynced = false;
  let isRetried = false;
  const reconcile = async (queue: string) => {
    const { handle, rows } = await readHolds(queue);
    for (const row of await readNames(handle)) {
      const [, fileId, , session] = row.split("~");
      if (!isOwn(row)) continue;
      const heldUntil = Math.max(
        0,
        ...rows
          .filter((hold) => hold.kind === HOLD_ROW && hold.isLive)
          .filter((hold) => hold.session === session)
          .map((hold) => hold.expiresAt)
      );
      if (heldUntil) {
        scheduleDeadline({ dir, request }, heldUntil + 1_000);
        continue;
      }
      isSynced ||= await references.sync();
      if (!isSynced) return (isRetried = true);
      const isReferenced = await references.isReferenced(fileId);
      if (isReferenced === undefined) isRetried = true;
      const fields = row.split("~");
      if (isReferenced && handle && !fields[5]) {
        fields[5] = destination.authority;
        if (!references.isCurrent()) return;
        await handle
          .getFileHandle(fields.join("~"), MAKE)
          .then(() => removeEntryFile(handle, row))
          .catch((error: unknown) => {
            logger.warn({ at: "fileQueue.foreign", row, error });
          });
      }
      if (isReferenced !== false) continue;
      if (!references.isCurrent()) return;
      await removeEntryFile(handle, row).catch((error: unknown) => {
        logger.warn({ at: "fileQueue.foreign", row, error });
        isRetried = true;
      });
    }
  };
  try {
    const root = await navigator.storage.getDirectory();
    for (const name of await readNames(root)) {
      if (!name.startsWith(QUEUE_DIR_PREFIX) || !name.endsWith(".holds")) {
        continue;
      }
      const queue = name.slice(0, -".holds".length);
      if (!(await readNames(await getHoldsDir(queue))).some(isOwn)) continue;
      await withQueueLock(queue, signal, () => reconcile(queue));
      if (isRetried && !isSynced) break;
    }
  } catch (error) {
    if (signal.aborted) return false;
    logger.warn({ at: "fileQueue.foreign", error });
    isRetried = true;
  }
  return isRetried && references.isCurrent();
}

async function replayEntry(
  pass: ReplayPass,
  entryName: string
): Promise<EntryOutcome> {
  const { dir, store } = pass;
  const { publisher, references } = pass.request;
  const pending = await store.getPendingUpload(entryName);
  const fileId = pending?.fileId;
  if (!pending || !fileId) {
    await removeAbandonedEntry(dir, entryName.slice(ENTRY_PREFIX.length));
    return "done";
  }
  const restored = await takeOverRestoredEntry(pass, fileId, pending.createdAt);
  if (restored) return restored;
  if (references) {
    return replayAccountEntry(pass, references, { ...pending, fileId });
  }
  if (!(await hasEntryFile(dir, entryName, COMMITTED_FILE))) return "done";
  if (publisher && !(await isPublishable(dir, entryName, publisher)))
    return "done";
  const names = await readNames(await getEntryDir(dir, entryName, true));
  const marks = readMarks(names);
  const failed = toFailedMark(marks);
  if (names.includes(failed)) {
    const retry = `${RETRY_PREFIX}${marks.generation}`;
    const isReady = !publisher || publisher.isReady();
    if (!isReady || !names.includes(retry)) return "done";
    const entry = await getEntryDir(dir, entryName, true);
    for (const name of [failed, retry]) await removeEntryFile(entry, name);
    notifyFailureChange(fileId);
  }
  if (publisher && !publisher.isReady()) return "stop";
  if (publisher) await claimEntry(dir, entryName, publisher.owner);
  const result = await uploadOrMarkFailed(pass, entryName, marks, {
    ...pending,
    fileId
  });
  if (!result) return "done";
  if (publisher) {
    await publishEntry(dir, entryName, publisher, result);
  } else {
    await store.deletePendingUpload(entryName);
    releaseQueuedFileUrls((key) => key === `${dir}\n${entryName}`);
    notifyFailureChange(fileId);
  }
  logger.info({ at: "fileQueue.replay", fileId: result.fileId });
  return "done";
}

/**
 * Leaves a replay to act on a file (resolving undefined) when no restore
 * holds it (see RESTORING_PREFIX and HoldRow): no restore wrote it, or its
 * account adopted it, or a record of the queue's account now references it,
 * when the replay adopts it. A file a live hold row holds is left
 * untouched, and while the records cannot be brought up to date or read,
 * the pass stops. One no record references is left untouched, unless a
 * restore into the queue's own account (see OWN_PREFIX) never settled it:
 * then the pass takes it once its capture's grace (`createdAt`, see
 * UNCOMMITTED_GRACE_MS) ended, to remove it, for this pass and generation
 * only (`taken`), recording nothing, so a pass that stops before removing
 * it leaves it held for its account. An adoption that cannot be recorded
 * (a full store) is logged and the pass takes the file and binds it (see
 * bindEntry), or, when that fails too, its replay binds it before any
 * request, and a later pass
 * takes a file its account bound as one its account adopted, unless a
 * foreign row the binding did not find protects it (see isBound), and acts
 * on one whose pending binding it could record only as an adoption as
 * adopted, in the same pass (see bindTaken).
 * An unpublished file is removed, under Web Locks (no restore writes while
 * the replay holds the lock) or once no live hold row holds it.
 */
async function takeOverRestoredEntry(
  pass: ReplayPass,
  fileId: string,
  createdAt: string
): Promise<EntryOutcome | undefined> {
  const { dir } = pass;
  const { references } = pass.request;
  const restore = await readRestore(dir, fileId);
  if (!restore) return "done";
  if (!restore.isPublished) {
    await removeAbandonedEntry(dir, fileId, restore);
    return "done";
  }
  if (restore.isHeld()) {
    scheduleDeadline(pass, restore.heldUntil() + 1_000);
    return "done";
  }
  const taken = `${fileId}~${restore.generation}`;
  if (restore.isAdopted) {
    unboundTakes.delete(`${dir}\n${taken}`);
    return undefined;
  }
  if (!references) return "done";
  const recovered = await bindTaken(dir, fileId, restore, references);
  if (recovered === "adopted") return undefined;
  if (await isBound(dir, fileId, restore, references)) {
    pass.taken.add(taken);
    return undefined;
  }
  const isReferenced = await isReferencedNow(pass, references, fileId);
  if (isReferenced === undefined) return "stop";
  const reclaimAt = Date.parse(createdAt) + UNCOMMITTED_GRACE_MS;
  if (!isReferenced && (restore.isSettled || !restore.isOwn)) return "done";
  if (!isReferenced && !(Date.now() >= reclaimAt)) {
    scheduleDeadline(pass, reclaimAt + 1_000);
    return "done";
  }
  if (!isReferenced) {
    pass.taken.add(taken);
    return undefined;
  }
  try {
    await adoptEntry(dir, fileId, restore.generation);
  } catch (error) {
    logger.warn({ at: "fileQueue.adopt", fileId, error });
    pass.taken.add(taken);
    const { owner } = references;
    unboundTakes.set(`${dir}\n${taken}`, {
      owner,
      foreign: restore.foreignRows,
      marks: restore.boundMarks
    });
    await bindTaken(dir, fileId, restore, references).catch(
      (failure: unknown) => {
        logger.warn({ at: "fileQueue.bind", fileId, error: failure });
      }
    );
  }
  return undefined;
}

/**
 * The restored files a replay of the page took on a record's reference
 * while their binding could not be written yet, by queue, file and
 * generation, with the account that took them and the foreign rows (see
 * HoldRow) of the generation then: each is bound (see bindTaken) before any
 * other step of a later pass of that account, in any runtime of the page,
 * also once the record is deleted meanwhile.
 */
const unboundTakes = new Map<
  string,
  { owner: QueuedFileClaim; foreign: string[]; marks: string[] }
>();

/**
 * Binds a restored file's generation the queue's account took (see
 * unboundTakes) but could not bind yet, if any, or, when its binding still
 * cannot be written, adopts it (see adoptEntry), as its take on a record's
 * reference would have, resolving which it recorded; rejects when neither
 * can be written, so the pass sends nothing for the file. The pass reads
 * the file's `restore` under the queue's lock, held by no live row: while
 * a foreign row the take did not find protects the generation (a restore
 * into another account kept it since), the take binds nothing, and stays
 * until that row is removed, so the earlier reference never decides over
 * the newer restore; and once another account or authority bound the
 * generation since (a binding mark the take did not find), the take is
 * dropped, so it never outranks that later binding (see isBound).
 */
async function bindTaken(
  dir: string,
  fileId: string,
  restore: { generation: string; foreignRows: string[]; boundMarks: string[] },
  references: QueuedFileReferences
) {
  const { generation, foreignRows, boundMarks } = restore;
  const key = `${dir}\n${fileId}~${generation}`;
  const take = unboundTakes.get(key);
  if (!take || !isSameClaim(take.owner, references.owner)) return undefined;
  if (foreignRows.some((row) => !take.foreign.includes(row))) return undefined;
  const own = `${toBoundMark(generation, take.owner)}~`;
  const isTaken = (mark: string) =>
    !take.marks.includes(mark) && !mark.startsWith(own);
  if (boundMarks.some(isTaken)) {
    unboundTakes.delete(key);
    return undefined;
  }
  const bound = bindEntry(dir, fileId, generation, references, take.foreign);
  const recorded = await bound.then(
    () => "bound" as const,
    async (error: unknown) => {
      logger.warn({ at: "fileQueue.bind", fileId, error });
      await adoptEntry(dir, fileId, generation);
      return "adopted" as const;
    }
  );
  unboundTakes.delete(key);
  return recorded;
}

/**
 * Binds a restored file's `generation` to the queue's account (see
 * BOUND_PREFIX), once its replay took it on a record's reference, with the
 * foreign rows (see HoldRow) of the generation then (`foreign`).
 */
async function bindEntry(
  dir: string,
  fileId: string,
  generation: string,
  { owner }: QueuedFileReferences,
  foreign: string[]
) {
  const entryName = toEntryName(fileId);
  const names = await readNames(await getEntryDir(dir, entryName, true));
  const marks = toBindingMarks(names, generation);
  const at = Math.max(
    Date.now(),
    ...marks.map((name) => toMarkOrder(name) + 1)
  );
  const name = `${toBoundMark(generation, owner)}~${at}`;
  const text = JSON.stringify({ ...owner, foreign });
  await writeEntryFile(dir, entryName, name, text);
}

/**
 * Names the mark binding a generation to an account at its FileFn authority
 * (see BOUND_PREFIX), with their digest, so a mark whose contents were never
 * written still names who began it (see isBound); bindEntry appends a
 * number above every earlier mark's of the generation, so the newest
 * binding alone decides (see toMarkOrder).
 */
function toBoundMark(generation: string, { userId, baseUrl }: QueuedFileClaim) {
  return `${BOUND_PREFIX}${generation}~${toRowDigest(`${userId}\n${baseUrl}`)}`;
}

/** Whether a name is a generation's binding mark (see toBoundMark). */
function isBoundMark(name: string, generation: string) {
  const mark = `${BOUND_PREFIX}${generation}`;
  return name === mark || name.startsWith(`${mark}~`);
}

/**
 * A generation's binding marks (see toBoundMark), newest first: the one
 * reader of marks by name for a rollback, which keeps a file any mark binds
 * (see rollBackEntry), a take, which a mark it did not find drops (see
 * bindTaken), and a replay, which walks them from the newest (see isBound).
 */
function toBindingMarks(names: readonly string[], generation: string) {
  return names
    .filter((name) => isBoundMark(name, generation))
    .sort((a, b) => toMarkOrder(b) - toMarkOrder(a));
}

/** The order of a binding mark (see toBoundMark), 0 for one without. */
function toMarkOrder(name: string) {
  const order = Number(name.split("~")[2]);
  return Number.isSafeInteger(order) && order > 0 ? order : 0;
}

/**
 * Whether the queue's account (`owner`) bound a restored file's
 * `generation` (see BOUND_PREFIX): its replay took the file once a record
 * of the account referenced it, which binds the file as an adoption does,
 * also when neither its adopted mark nor its adoption row could be
 * created; not while a foreign row its binding did not find protects the
 * generation (a restore into another account kept it since). The newest
 * complete mark of the account at its FileFn authority decides, with the
 * foreign rows it found; a newer mark of the account whose write was cut
 * short (empty or incomplete) does not hide it. Without a complete one, a
 * mark whose write was cut short is still the binding its replay began, as
 * for a rollback (see rollBackEntry), once a record referenced the file,
 * for the account and FileFn authority its name digests only (see
 * toBoundMark); since it does not tell which foreign rows it found, any
 * foreign row of the generation protects it. A newer mark of another
 * account or authority, complete or not, overrides the account's, so an
 * earlier binding at another authority, read or not, never authorizes
 * removing a file a later one took (two marks of one order count as none).
 * A mark that cannot be read rejects.
 */
async function isBound(
  dir: string,
  fileId: string,
  { generation, foreignRows }: { generation: string; foreignRows: string[] },
  { owner }: QueuedFileReferences
) {
  const entryName = toEntryName(fileId);
  const names = await readNames(await getEntryDir(dir, entryName, true));
  const marks = toBindingMarks(names, generation);
  const own = `${toBoundMark(generation, owner)}~`;
  let isBegun = false;
  for (const mark of marks) {
    const order = toMarkOrder(mark);
    const isTied = marks.some(
      (other) => other !== mark && toMarkOrder(other) === order
    );
    if (!mark.startsWith(own) || isTied) return false;
    const text = await readEntryText(dir, entryName, mark, true);
    const claim = parseJson<QueuedFileClaim & { foreign?: unknown }>(
      text,
      (value) => typeof value === "object" && value !== null && isClaim(value)
    );
    if (!claim) {
      isBegun = true;
      continue;
    }
    const found = Array.isArray(claim.foreign) ? claim.foreign : [];
    const isProtected = foreignRows.some((row) => !found.includes(row));
    return isSameClaim(claim, owner) && !isProtected;
  }
  return isBegun && !foreignRows.length;
}

/**
 * Removes a file a restore left unpublished (see RESTORING_PREFIX), also one
 * whose bytes or metadata it never wrote, once no restore can still be
 * writing it: under Web Locks, as no restore writes while the replay holds
 * the lock, and otherwise once no live hold row holds its generation.
 */
async function removeAbandonedEntry(
  dir: string,
  fileId: string,
  restore?: Awaited<ReturnType<typeof readRestore>>
) {
  const found = restore ?? (await readRestore(dir, fileId));
  if (!found || found.isPublished) return;
  if (hasWebLocks() || !found.isHeld()) {
    await actAlone(dir, fileId, async (isAlone) => {
      const now = await readRestore(dir, fileId);
      if (now?.isPublished || now?.generation !== found.generation) return;
      await dequeueFile(dir, fileId, isAlone);
    });
  }
}

/** Whether a restore holds a file now (see takeOverRestoredEntry). */
async function isHeldNow({ dir, taken }: ReplayPass, fileId: string) {
  const restore = await readRestore(dir, fileId);
  const isTaken = taken.has(`${fileId}~${restore?.generation}`);
  return Boolean(
    restore &&
    (!restore.isPublished ||
      !(restore.isAdopted || isTaken) ||
      restore.isHeld())
  );
}

/**
 * Replays a file of an account's queue (see replayFileQueue). Its markers and
 * committed mark are read before its record, so a capture saving its record
 * meanwhile keeps the file; an empty or invalid marker (an interrupted write)
 * may be the owner's attempt (as may any unreferenced file without Web Locks).
 * An original marked uploaded is not sent again while its thumbnail is
 * still to be sent, when the file holds its thumbnail only (see
 * QueuedFileCopy), when a restore wrote the file, or once a removal after
 * its delivery could not be confirmed (see DELIVERED_FILE); a delivery the
 * upload log could not record is recorded again once the removal freed, or
 * may have freed, the file's bytes (a full store), before the removal's
 * acting row (see actAlone) ends, so restoring an older backup does not
 * stage it again; a thumbnail
 * marked sent, or for a restored file one the upload log records sent at
 * its version, is not sent again; a
 * thumbnail FileFn could not take, or a restored file's that cannot be
 * read, is sent again on a retry, the file staying queued meanwhile (see
 * sendAccountThumbnail).
 * An original whose delivery evidence cannot be read (see readDelivery)
 * retries the file without a request, once a request may have been sent (a
 * restored, byte-less or marked file, or one with a started marker). A
 * restored file the pass took without an adoption (see
 * takeOverRestoredEntry) is bound (see BOUND_PREFIX) before its first
 * request.
 */
async function replayAccountEntry(
  pass: ReplayPass,
  references: QueuedFileReferences,
  pending: PendingUpload & { fileId: string }
): Promise<EntryOutcome> {
  const { dir } = pass;
  const { fileId, uploadSessionId: entryName } = pending;
  const markers = await readMarkers(dir, entryName);
  if (isStartedElsewhere(markers, references)) return "done";
  const names = await readNames(await getEntryDir(dir, entryName, true));
  const isThumbnailPending =
    names.some((name) => name.startsWith(THUMBNAIL_PREFIX)) &&
    !names.includes(THUMBNAIL_SENT_FILE);
  const { generation } = readMarks(names);
  if (unboundTakes.has(`${dir}\n${fileId}~${generation}`)) {
    const restore = await readRestore(dir, fileId);
    if (restore) await bindTaken(dir, fileId, restore, references);
  }
  const isRestored = generation !== BASE_GENERATION;
  const deliveredKey = `${dir}\n${entryName}\n${generation}`;
  const confirmed = deliveredEntries.get(deliveredKey);
  const isLogRead =
    !pending.fileData.byteLength ||
    isThumbnailPending ||
    isRestored ||
    names.includes(DELIVERED_FILE) ||
    Boolean(confirmed);
  const delivery = confirmed
    ? await reuseDelivery(dir, fileId, names, confirmed)
    : isLogRead
      ? await readDelivery(dir, fileId, names)
      : null;
  const isUnsure = delivery?.original === undefined && isLogRead;
  const isMaybeSent =
    isRestored ||
    markers.length > 0 ||
    names.includes(UPLOADED_FILE) ||
    !pending.fileData.byteLength;
  if (isUnsure && isMaybeSent) return "retry";
  const uploaded = delivery?.original;
  const isCommitted = await hasEntryFile(dir, entryName, COMMITTED_FILE);
  const isRecent = !(
    Date.now() - Date.parse(pending.createdAt) >=
    UNCOMMITTED_GRACE_MS
  );
  const isReferenced = await isReferencedNow(pass, references, fileId);
  if (isReferenced === undefined) return "stop";
  if (!isReferenced) {
    if (!markers.length && !isCommitted && isRecent && !uploaded) {
      const createdAt = Date.parse(pending.createdAt);
      scheduleDeadline(pass, createdAt + UNCOMMITTED_GRACE_MS + 1_000);
      return "done";
    }
    const started = await readMarkers(dir, entryName);
    if (uploaded || isUnsure || !hasWebLocks()) started.push(undefined);
    if (isStartedElsewhere(started, references)) return "done";
    const isDiscarded = started.length > 0;
    return removeAccountEntry(pass, references, fileId, isDiscarded, true);
  }
  if (!isCommitted) await markQueuedFileCommitted(dir, fileId);
  if (!uploaded && names.includes(toFailedMark({ generation }))) return "done";
  const result = uploaded
    ? { fileId, versionId: uploaded }
    : await uploadOrMarkFailed(pass, entryName, { generation }, pending, {
        write: () => markStarted(dir, entryName, references),
        isReady: () => !pass.request.signal.aborted && references.isCurrent(),
        undo: (attempt) => unmarkStarted(dir, entryName, attempt)
      });
  if (!result) return "done";
  const sent =
    delivery?.thumbnail === "rejected"
      ? "rejected"
      : delivery?.isDone ||
        (await sendAccountThumbnail(pass, entryName, result));
  const isKept = isRestored || Boolean(confirmed);
  if (!sent || (sent === "unread" && isKept)) return "retry";
  if (uploaded) pass.isSynced = false;
  const isLogged = await logUpload(
    dir,
    fileId,
    result.versionId,
    sent === true
  );
  const isStillReferenced = await isReferencedNow(pass, references, fileId);
  if (isStillReferenced === undefined) return "stop";
  logger.info({ at: "fileQueue.replay", fileId: result.fileId });
  return removeAccountEntry(
    pass,
    references,
    fileId,
    !isStillReferenced,
    false,
    async (isRemoved) => {
      if (!isStillReferenced) return;
      const thumbnail = sent === "rejected" ? sent : ("pending" as const);
      const remembered = {
        original: result.versionId,
        thumbnail: sent === true ? ("sent" as const) : thumbnail,
        isKnown: true,
        isDone: sent === true,
        error: undefined
      };
      if (!isRemoved)
        await markDelivered(dir, entryName, deliveredKey, remembered);
      if (!isLogged) {
        await logDelivered(dir, fileId, result.versionId, sent === true);
      }
    }
  );
}

/**
 * The page's files, by queue, entry and generation, whose delivery its
 * replay confirmed before their removal could not be (see markDelivered),
 * with that delivery (the original's version FileFn confirmed and whether
 * the thumbnail was sent), so a later pass of the page reuses it, sending
 * neither again, also when neither their mark nor the upload log nor the
 * delivered row (see logDelivered) could record it.
 */
const deliveredEntries = new Map<
  string,
  Awaited<ReturnType<typeof readDelivery>>
>();

/**
 * A delivery the page's replay confirmed (see deliveredEntries), with a
 * thumbnail it left to send found sent or rejected since by the file's
 * marks, or for its version by the upload log or a delivered row (another
 * tab's replay), so a retry neither requests the original nor sends the
 * thumbnail again.
 */
async function reuseDelivery(
  dir: string,
  fileId: string,
  names: readonly string[],
  confirmed: Awaited<ReturnType<typeof readDelivery>>
) {
  if (confirmed.isDone || confirmed.thumbnail === "rejected") return confirmed;
  const { original } = confirmed;
  const has = names.some((name) => name.startsWith(THUMBNAIL_PREFIX));
  const { thumbnail } = await readDelivery(dir, fileId, names, has, original);
  if (thumbnail !== "sent" && thumbnail !== "rejected") return confirmed;
  return { ...confirmed, thumbnail, isDone: thumbnail === "sent" };
}

/**
 * Marks a file whose delivery the replay confirmed delivered (see
 * DELIVERED_FILE and deliveredEntries); a mark that cannot be written is
 * logged.
 */
async function markDelivered(
  dir: string,
  entryName: string,
  key: string,
  delivery: Awaited<ReturnType<typeof readDelivery>>
) {
  deliveredEntries.set(key, delivery);
  await writeEntryFile(dir, entryName, DELIVERED_FILE, "").catch(
    (error: unknown) => {
      logger.warn({ at: "fileQueue.replay.delivered", entryName, error });
    }
  );
}

/**
 * Marks an account's file uploaded once its upload completed, so a later
 * pass does not send it again and a backup taken while it is still queued
 * copies its thumbnail only (see exportQueuedFiles). A mark that cannot be written, as the
 * file left the queue meanwhile, is logged; the pass goes on.
 */
async function markAccountEntryUploaded(
  dir: string,
  entryName: string,
  uploaded: UploadResult
) {
  try {
    await writeEntryFile(dir, entryName, UPLOADED_FILE, uploaded.versionId);
  } catch (error) {
    logger.warn({ at: "fileQueue.replay.uploaded", entryName, error });
  }
}

/**
 * Reads a file's started markers, each parsed or undefined when empty or
 * invalid; a read error other than a missing file rejects.
 */
async function readMarkers(dir: string, entryName: string) {
  const entry = await getEntryDir(dir, entryName, true);
  const markers: (QueuedFileClaim | undefined)[] = [];
  for await (const name of entry
    ? (entry as unknown as { keys(): AsyncIterable<string> }).keys()
    : []) {
    if (!name.startsWith(STARTED_FILE)) continue;
    const text = await readEntryText(dir, entryName, name, true);
    if (text !== undefined) markers.push(parseJson(text, isClaim));
  }
  return markers;
}

function isStartedElsewhere(
  markers: (QueuedFileClaim | undefined)[],
  { owner }: QueuedFileReferences
) {
  return markers.some((marker) => marker && !isSameClaim(marker, owner));
}

/**
 * Writes a new attempt's own started marker at the owner's authority, then
 * reads every marker: one of another authority by now stops the attempt, as
 * that attempt, writing first, stops or, writing later, sees this marker.
 */
async function markStarted(
  dir: string,
  entryName: string,
  references: QueuedFileReferences
) {
  const attempt = crypto.randomUUID();
  const marker = JSON.stringify({ ...references.owner, attempt });
  try {
    await writeEntryFile(dir, entryName, `${STARTED_FILE}-${attempt}`, marker);
    if (isStartedElsewhere(await readMarkers(dir, entryName), references)) {
      throw new DOMException("Started elsewhere", "NetworkError");
    }
  } catch (error) {
    await unmarkStarted(dir, entryName, attempt);
    throw error;
  }
  return attempt;
}

/** Removes an attempt's own started marker; no other attempt removes it. */
async function unmarkStarted(dir: string, entryName: string, attempt: string) {
  try {
    const entry = await getEntryDir(dir, entryName);
    await entry?.removeEntry(`${STARTED_FILE}-${attempt}`);
  } catch (error) {
    if ((error as Error)?.name === "NotFoundError") return;
    logger.warn({ at: "fileQueue.replay.started", entryName, error });
  }
}

/**
 * Whether a record of the account references the file, on records brought
 * fully up to date since the pass last uploaded, or undefined while they
 * cannot be brought up to date or read.
 */
async function isReferencedNow(
  pass: ReplayPass,
  references: QueuedFileReferences,
  fileId: string
) {
  if (!pass.isSynced && !(await references.sync())) return undefined;
  pass.isSynced = true;
  return references.isReferenced(fileId);
}

/**
 * Removes a file from an account's queue, discarding it first when its
 * upload may have reached FileFn, then removing it from the upload log so a
 * later restore stages it again, each only while the records are still the
 * owner's at the authority, checked in the same step. A file a restore holds
 * by then (see isHeldNow and actAlone) stays queued, and without Web Locks
 * one a record references again by the time no restore holds it (another
 * tab restored it) is neither discarded nor removed. A file removed as no
 * record references it (`isOrphan`) is removed only while none does.
 */
async function removeAccountEntry(
  pass: ReplayPass,
  references: QueuedFileReferences,
  fileId: string,
  isDiscarded: boolean,
  isOrphan: boolean,
  afterRemoval?: (isRemoved: boolean) => Promise<unknown>
): Promise<EntryOutcome> {
  let outcome: EntryOutcome = "done";
  await actAlone(pass.dir, fileId, async (isAlone) => {
    if (isDiscarded && !hasWebLocks()) {
      pass.isSynced = false;
      const isReferenced = await isReferencedNow(pass, references, fileId);
      if (isReferenced !== false) {
        outcome = isReferenced === undefined ? "stop" : "done";
        return;
      }
    }
    outcome = await discardAccountEntry(
      pass,
      references,
      fileId,
      isDiscarded || isOrphan,
      isAlone,
      isDiscarded
    ).catch(async (error: unknown) => {
      if (error instanceof UnconfirmedRemovalError) await afterRemoval?.(false);
      throw error;
    });
    if (outcome === "done") await afterRemoval?.(true);
  });
  return outcome;
}

/**
 * Discards (when `isDiscarded`) and removes an account's file (see
 * removeAccountEntry). Right before the discard request and the removal
 * (see dequeueFile), it checks that it still acts alone (see actAlone),
 * then, with `isUnreferencedOnly`, that no record references the file in
 * the records DataFn
 * holds now (also after DataFn was started again), the last await before
 * the request, so a reference added while it checked is seen, retrying the
 * file later when either fails, and, with no await in between, that the
 * records are still the owner's at the authority. A discard marks the
 * change as a removal does (see markChange), so a full store does not keep
 * the file queued.
 */
async function discardAccountEntry(
  pass: ReplayPass,
  references: QueuedFileReferences,
  fileId: string,
  isUnreferencedOnly: boolean,
  isAlone: () => Promise<boolean>,
  isDiscarded: boolean
): Promise<EntryOutcome> {
  if (await isHeldNow(pass, fileId)) return "done";
  /** Whether no record references the file in the records DataFn holds now. */
  const isUnreferenced = async () =>
    !isUnreferencedOnly || (await references.isReferenced(fileId)) === false;
  if (isDiscarded) {
    if (!references.isCurrent()) return "stop";
    await markChange(pass.dir);
    if (!(await isAlone())) return "retry";
    if (!(await isUnreferenced())) return "retry";
    if (!references.isCurrent()) return "stop";
    if ((await references.discard(fileId)) === false) return "stop";
    await logUpload(pass.dir, fileId);
    if (await isHeldNow(pass, fileId)) return "done";
  }
  const isRemoved = await dequeueFile(
    pass.dir,
    fileId,
    async () =>
      (await isAlone()) && (await isUnreferenced()) && references.isCurrent()
  );
  if (isRemoved) return "done";
  return references.isCurrent() ? "retry" : "stop";
}

/**
 * Uploads a queued file; for an account's queue, records the upload in the
 * upload log and marks the file uploaded, its thumbnail left to the caller
 * (see sendAccountThumbnail), and otherwise sends the thumbnail too.
 */
async function uploadEntry(
  pass: ReplayPass,
  pending: PendingUpload & { fileId: string },
  mark?: StartMark
) {
  pass.isSynced = false;
  const { client, references } = pass.request;
  const entryName = pending.uploadSessionId;
  const result = await uploadQueuedFile(client, pass.store, pending, mark);
  if (!references) {
    const sent = await sendAccountThumbnail(pass, entryName, result);
    if (!sent || sent === "unread") throw new Error("Thumbnail unsent");
    return result;
  }
  await logUpload(pass.dir, pending.fileId, result.versionId);
  await markAccountEntryUploaded(pass.dir, entryName, result);
  return result;
}

/**
 * Uploads an entry (see uploadEntry), or, once FileFn rejects its original
 * for good (see RejectedUploadError), marks it failed for its generation
 * (see FAILED_PREFIX), keeping its bytes, and resolves null, so the pass is
 * done with it and schedules no retry for it; a mark that cannot be written
 * rejects, leaving the file to a retry.
 */
async function uploadOrMarkFailed(
  pass: ReplayPass,
  entryName: string,
  marks: Pick<PublishedEntry, "generation">,
  pending: PendingUpload & { fileId: string },
  mark?: StartMark
): Promise<UploadResult | null> {
  try {
    return await uploadEntry(pass, pending, mark);
  } catch (error) {
    if (!(error instanceof RejectedUploadError)) throw error;
    const { status, code } = error.rejection;
    logger.warn({
      at: "fileQueue.replay.rejected",
      fileId: pending.fileId,
      error: error.rejection
    });
    const failed = JSON.stringify({ status, code: code ?? null });
    await writeEntryFile(pass.dir, entryName, toFailedMark(marks), failed);
    notifyFailureChange(pending.fileId);
    return null;
  }
}

/**
 * Sends the thumbnail of an account's file whose original uploaded, unless
 * it is marked sent, then marks it sent (see THUMBNAIL_SENT_FILE); resolves
 * false when it is to be sent again on a retry, and "rejected", marking it
 * rejected instead (see THUMBNAIL_REJECTED_FILE), when FileFn rejected it
 * for good.
 */
async function sendAccountThumbnail(
  { dir, request }: ReplayPass,
  entryName: string,
  uploaded: UploadResult
) {
  if (await hasEntryFile(dir, entryName, THUMBNAIL_SENT_FILE)) return true;
  const isReady = () =>
    !isAppOffline() &&
    !request.signal.aborted &&
    request.references?.isCurrent() !== false &&
    request.publisher?.isReady() !== false;
  const sent = await uploadQueuedThumbnail(
    request.client,
    dir,
    entryName,
    uploaded,
    isReady
  );
  if (sent === false || sent === "unread") return sent;
  const mark = sent === true ? THUMBNAIL_SENT_FILE : THUMBNAIL_REJECTED_FILE;
  const text = sent === true ? "" : uploaded.versionId;
  await writeEntryFile(dir, entryName, mark, text).catch((error: unknown) => {
    logger.warn({ at: "fileQueue.replay.thumbnail", entryName, error });
  });
  return sent;
}

/**
 * Whether a local file can upload through the publisher's account: not yet
 * uploaded, with a current copy of its record, and unclaimed or claimed by
 * that account.
 */
async function isPublishable(
  dir: string,
  entryName: string,
  publisher: QueuedFilePublisher
) {
  await verifyCopy(dir, entryName, publisher);
  const marks = [UPLOADED_FILE, ORPHANED_FILE, DISCARDED_FILE];
  for (const mark of marks)
    if ((await readEntryText(dir, entryName, mark, true)) !== undefined)
      return false;
  if (!(await readUnheldRecord(dir, entryName, publisher))) return false;
  const claim = await readClaim(dir, entryName, true);
  return !claim || isSameClaim(claim, publisher.owner);
}

/**
 * A local file's record copy, read strictly, unless a hold mark or a pending
 * change holds it.
 */
async function readUnheldRecord(
  dir: string,
  entryName: string,
  publisher: QueuedFilePublisher
) {
  const record = await readQueuedRecord(dir, entryName, true);
  const hold = await readHoldMarks(dir, entryName, record, true);
  if (hold.stale !== undefined || hold.isDeleted) return undefined;
  return record && !publisher.isHeld?.(record) ? record : undefined;
}

/**
 * Publishes the record of a local file that uploaded, as its copy is now,
 * then marks the file uploaded. A file whose record was removed or marked
 * stale during the upload is left for the reconciliation of its record, and
 * so is one a hold, a pending change or a new copy reached after the publish's
 * last check: its uploaded mark is withdrawn, so the copy its guest pass
 * verifies publishes again (see verifyCopy).
 */
async function publishEntry(
  dir: string,
  entryName: string,
  publisher: QueuedFilePublisher,
  uploaded: UploadResult
) {
  if (!(await isPublishable(dir, entryName, publisher))) return;
  const record = await readQueuedRecord(dir, entryName);
  if (!record) return;
  const isCurrent = () => isPublishable(dir, entryName, publisher);
  const mark = writeEntryFile.bind(null, dir, entryName);
  const saved = (await readEntryText(dir, entryName, "saved", true)) ?? "";
  const copy = { ...record, fileId: uploaded.fileId };
  const entry = { isCurrent, saved: saved.split("\n"), mark };
  if ((await publisher.publish(copy, uploaded, entry)) === false) return;
  if (!(await isCurrent())) return;
  await writeEntryFile(dir, entryName, PUBLISHING_FILE, JSON.stringify(record));
  await writeEntryFile(dir, entryName, UPLOADED_FILE, uploaded.versionId);
  await verifyCopy(dir, entryName, publisher);
}

/**
 * Withdraws an upload whose publishing mark names an outdated or held copy,
 * also when a reread after the mark's removal (which makes it final) fails.
 */
async function verifyCopy(dir: string, name: string, by: QueuedFilePublisher) {
  const copy = await readEntryText(dir, name, PUBLISHING_FILE, true);
  if (copy === undefined) return;
  const entry = await getEntryDir(dir, name, true);
  const isCopy = async () =>
    JSON.stringify(await readUnheldRecord(dir, name, by)) === copy;
  if (await isCopy()) {
    await removeEntryFile(entry, PUBLISHING_FILE);
    if (await isCopy().catch(() => false)) return;
    await removeEntryFile(entry, UPLOADED_FILE).catch(() =>
      writeEntryFile(dir, name, PUBLISHING_FILE, copy).catch(String)
    );
  }
  await removeEntryFile(entry, UPLOADED_FILE);
  await removeEntryFile(entry, PUBLISHING_FILE);
}

async function claimEntry(
  dir: string,
  entryName: string,
  owner: QueuedFileClaim
) {
  if (await readClaim(dir, entryName, true)) return;
  await writeEntryFile(
    dir,
    entryName,
    CLAIM_FILE,
    JSON.stringify({ userId: owner.userId, baseUrl: owner.baseUrl })
  );
}

/**
 * Marks a file started at its owner's authority with the attempt's own marker
 * before the request, sent only while `isReady` (same step); an attempt whose
 * client sent no request undoes its marker, identified by the `write` result.
 */
type StartMark = {
  write(): Promise<string>;
  isReady(): boolean;
  undo(attempt: string): Promise<void>;
};

let isOfflineModeOn = (): boolean => false;

/** Sets how isAppOffline reads offline mode, so the queue imports no store. */
export function readOfflineModeWith(read: () => boolean) {
  isOfflineModeOn = read;
}

/** True while the device has no network or the app's offline mode is on. */
export function isAppOffline(): boolean {
  const isNetworkOffline = globalThis.navigator?.onLine === false;
  return isNetworkOffline || isOfflineModeOn();
}

/** Throws while the app is offline or the attempt is no longer ready. */
function assertSendable(mark?: StartMark) {
  if (isAppOffline() || mark?.isReady() === false) {
    throw new DOMException("The upload cannot start", "NetworkError");
  }
}

/**
 * FileFn codes of a session that can no longer upload the file: it expired
 * or was aborted, it completed with a size other than the bytes sent, or its
 * idempotency key is held for another payload. FileFn returns the same
 * session, or the same conflict, for every request with its key.
 */
const ENDED_SESSION_CODES = new Set([
  "FILEFN_UPLOAD_EXPIRED",
  "FILEFN_UPLOAD_ABORTED",
  "FILEFN_UPLOAD_SIZE_MISMATCH",
  "FILEFN_IDEMPOTENCY_CONFLICT"
]);

/**
 * Uploads a queued file under its `fileId`. The idempotency key carries the
 * entry's session count, which a session that ended (see
 * ENDED_SESSION_CODES) advances, so the next upload, a replay's or, after a
 * rejection for good, a Retry's, starts a new session instead of meeting the
 * ended one again.
 */
async function uploadQueuedFile(
  client: FileFnClient,
  store: OPFSStore,
  pending: PendingUpload & { fileId: string },
  mark?: StartMark
): Promise<UploadResult> {
  const key = `${pending.uploadSessionId}:${pending.retryCount}`;
  const sent = sentRequests.get(client);
  const countSent = () => sent && (sent.get(key) ?? 0) + (sent.get("*") ?? 0);
  const sentBefore = countSent();
  let attempt: string | undefined;
  let isSending = false;
  try {
    assertSendable();
    attempt = await mark?.write();
    assertSendable(mark);
    isSending = true;
    return await client
      .uploadFile({
        policy: pending.policy,
        file: new File([pending.fileData], pending.fileName, {
          type: pending.mimeType
        }),
        fileName: pending.fileName,
        fileId: pending.fileId,
        idempotencyKey: key
      })
      .done();
  } catch (error) {
    const isUnsent = !isSending || (sent && countSent() === sentBefore);
    if (attempt && isUnsent) await mark?.undo(attempt);
    if (!(error instanceof FileFnHttpError)) throw error;
    if (error.code === "FILEFN_UPLOAD_ALREADY_COMPLETED") {
      const file = await client.getFile(pending.fileId);
      const versionId = file.currentVersionId;
      if (typeof versionId === "string") {
        return { fileId: pending.fileId, versionId };
      }
    }
    if (error.code && ENDED_SESSION_CODES.has(error.code)) {
      await store.incrementRetryCount(pending.uploadSessionId);
    }
    if (isUploadRejectedForGood(error)) throw new RejectedUploadError(error);
    throw error;
  }
}

/**
 * FileFn codes that reject the file itself or its metadata, which another
 * attempt with the same bytes, name, type and file ID meets again: its type
 * or size the policy refuses, a policy that does not exist, a storage quota
 * it exceeds, a file ID or request FileFn refuses, a size that does not match
 * the bytes sent, an idempotency key FileFn holds for another payload, and
 * FileFn's own refusal of access (see isUploadRejectedForGood); the session
 * of the two session-bound ones is replaced for a Retry (see
 * ENDED_SESSION_CODES). Every other
 * code stays a failure the next replay retries, such as one about a single
 * upload session (not found, invalid token, incomplete, a part or etag),
 * which the next replay replaces with a new session.
 */
const FILE_REJECTION_CODES = new Set([
  "FILEFN_POLICY_CONTENT_TYPE_NOT_ALLOWED",
  "FILEFN_POLICY_MAX_SIZE_EXCEEDED",
  "FILEFN_POLICY_NOT_FOUND",
  "FILEFN_QUOTA_EXCEEDED",
  "FILEFN_INVALID_FILE_ID",
  "FILEFN_INVALID_REQUEST",
  "FILEFN_UPLOAD_SIZE_MISMATCH",
  "FILEFN_IDEMPOTENCY_CONFLICT",
  "FILEFN_FORBIDDEN"
]);

/**
 * Reasons the account service in front of FileFn refuses a request with
 * FILEFN_FORBIDDEN before FileFn sees the file (a missing scope, a CSRF
 * header read again on each request), which a later attempt may not meet.
 */
const REQUEST_REFUSAL_REASONS = new Set(["scope", "csrf"]);

/**
 * Whether FileFn rejected an original's upload in a way a retry does not
 * change: a client error of the FileFn API (4xx other than an authorization
 * failure (401), a timeout (408) or a rate limit (429)) with one of the codes
 * that reject the file itself (see FILE_REJECTION_CODES), unless FileFn marks
 * it retryable, or it is the account service's refusal of the request rather
 * than FileFn's (see REQUEST_REFUSAL_REASONS). A part upload's failure carries
 * no code (a presigned storage URL that expired answers 403), and a code
 * FileFn did not raise (such as an AUTHFN_* region routing answer, or the
 * account service's FILEFN_ROUTE_NOT_FOUND), so both stay transient failures
 * the next replay retries.
 */
function isUploadRejectedForGood({ status, code, details }: FileFnHttpError) {
  if (typeof code !== "string" || !FILE_REJECTION_CODES.has(code)) {
    return false;
  }
  if (status < 400 || status >= 500 || [401, 408, 429].includes(status)) {
    return false;
  }
  const { retryable, reason } = details ?? {};
  if (retryable === true) return false;
  return !(
    code === "FILEFN_FORBIDDEN" &&
    typeof reason === "string" &&
    REQUEST_REFUSAL_REASONS.has(reason)
  );
}

/** An original's upload FileFn rejected for good (see isUploadRejectedForGood). */
class RejectedUploadError extends Error {
  constructor(readonly rejection: FileFnHttpError) {
    super(rejection.message);
    this.name = "RejectedUploadError";
  }
}

/**
 * Uploads a queued thumbnail, resolving whether it is done with. One that
 * cannot be read is logged and left out, as is one whose upload fails,
 * unless it is retried (`isReady`, an account's file): then only one FileFn
 * rejects for good is left out, resolving "rejected" (FileFn did not take
 * it), and any other upload failure, or a
 * thumbnail read once the replay can no longer send it (`isReady`, read
 * again right before the request), resolves false, for a retry to send it;
 * one that cannot be read resolves "unread", for a retry to read it again
 * (see replayAccountEntry), with no evidence it was sent.
 */
async function uploadQueuedThumbnail(
  client: FileFnClient,
  dir: string,
  entryName: string,
  uploaded: UploadResult,
  isReady?: () => boolean
): Promise<boolean | "unread" | "rejected"> {
  let thumbnail: Blob | undefined;
  let isRead = false;
  try {
    const entry = await getEntryDir(dir, entryName, Boolean(isReady));
    thumbnail = entry ? await readThumbnail(entry) : undefined;
    isRead = true;
    if (!thumbnail) return true;
    if (isReady?.() === false) return false;
    await client.uploadArtifact({
      fileId: uploaded.fileId,
      versionId: uploaded.versionId,
      kind: DEVICE_THUMBNAIL_KIND,
      data: thumbnail,
      mimeType: thumbnail.type
    });
    return true;
  } catch (error) {
    logger.warn({
      at: "fileQueue.replay.thumbnail",
      fileId: uploaded.fileId,
      error
    });
    if (!isReady) return true;
    if (!isRead) return "unread";
    return isRejectedForGood(error) && "rejected";
  }
}

/**
 * Whether FileFn rejected a request in a way a retry does not change: not an
 * authorization failure, which renewed credentials may change, nor a
 * conflict, timeout or rate limit, which a later attempt may not meet.
 */
function isRejectedForGood(error: unknown) {
  if (!(error instanceof FileFnHttpError)) return false;
  const { status } = error;
  return (
    status >= 400 && status < 500 && ![401, 403, 408, 409, 429].includes(status)
  );
}
