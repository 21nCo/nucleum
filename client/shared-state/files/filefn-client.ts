import {
  createFileFnClient,
  FileFnHttpError,
  generateFileId,
  type FileFnClient,
  type UploadHandle,
  type UploadResult
} from "@filefn/client";
import account from "@nucleum/client/runtime/account/account.store";
import context from "@nucleum/client/runtime/context.store";
import {
  UserDataMode,
  type UserAccount
} from "@nucleum/client/runtime/account/account.type";
import { createNucleumAuthFnTransportAuth } from "@nucleum/client/runtime/account/auth";
import { resolveAccountBaseUrl } from "@nucleum/client/runtime/account/network";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
import {
  countSentRequests,
  isAppOffline,
  readOfflineModeWith,
  replayFileQueue,
  resolveAccountFileQueueDir,
  resolveFileQueueDirsOf,
  toRecordsView,
  type QueuedFileClaim,
  type QueuedFileReferences
} from "@nucleum/shared-state/files/file-queue";
import { get } from "svelte/store";

const FILEFN_OFFLINE_DIR_PREFIX = "filefn-pending-uploads";
const OFFLINE_REPLAY_START_FILE_ID = "";
const OFFLINE_REPLAY_LOCK_PREFIX = "filefn-offline-replay";
const PENDING_DELETE_DIR_PREFIX = "filefn-pending-deletes";

readOfflineModeWith(() => get(context).isInOfflineMode === true);

/** Signed-in cloud account that owns a FileFn client. */
export type FileFnAccountScope = {
  userId: string;
  region: string | null;
};

/**
 * The signed-in account and FileFn client generation an operation belongs to.
 * A sign-out, another account or another authority ends the generation.
 */
export type FileFnOwner = { userId: string; epoch: number };

/** A FileFn client of an owner, with the authority it stores files under. */
export type OwnedFileFnClient = { client: FileFnClient; baseUrl: string };

type FileFnClientEntry = {
  userId: string;
  baseUrl: string;
  key: string;
  controller: AbortController;
  client: Promise<FileFnClient>;
};

let currentEntry: FileFnClientEntry | null = null;
let isBoundToAccount = false;
let syncGeneration = 0;
let latestSync: Promise<void> = Promise.resolve();
/** Whether the latest sync is still reading the stored region. */
let isAuthorityPending = false;
let ownerEpoch = 0;
let ownerUserId: string | undefined;
/**
 * Who may send replay on this page, until the session ends (see
 * isReplayAuthorized and endAccountUploadReplay): `liveOwner` is the cloud
 * account, at the region it names, that the latest live session confirmed
 * (null before one did or once a resolution stopped the replay);
 * `contradictedUserIds` are the users a live session showed are not the
 * signed-in account, or that a session which ended knew; `fileGrantUserIds`
 * are the users a file operation requested the client for while not
 * contradicted.
 */
const replayAuthorization = {
  liveOwner: null as FileFnAccountScope | null,
  contradictedUserIds: new Set<string>(),
  fileGrantUserIds: new Set<string>()
};
/** What each client runs when the replay authorization expands. */
const replayWaiters = new Set<() => void>();
let stopLiveBindWait: () => void = () => undefined;
const pendingDeleteDrains = new Map<string, Promise<void>>();

/**
 * Returns the cloud account a FileFn client belongs to, or null for a
 * signed-out, undetermined or local-only account.
 */
export function resolveFileFnAccountScope(
  value: UserAccount | null | undefined
): FileFnAccountScope | null {
  if (value?.dataMode !== UserDataMode.CLOUD) return null;
  const userId =
    value.userId?.trim() || value.userInfo?.id?.replace(/^user:/, "").trim();
  if (!userId) return null;
  return {
    userId,
    region: value.userInfo?.region?.trim() || null
  };
}

/** Returns the FileFn routes under the account authority for a region. */
export function resolveFileFnBaseUrl(region: string): string {
  return `${resolveAccountBaseUrl(region).replace(/\/$/, "")}/files`;
}

/**
 * Returns the OPFS directory of an account's offline upload queue, so staged
 * uploads are only replayed by a client of the account that staged them.
 */
export function resolveFileFnOfflineDir(userId: string): string {
  return `${FILEFN_OFFLINE_DIR_PREFIX}-${encodeURIComponent(userId)}`;
}

/**
 * Returns the FileFn client of the signed-in cloud account, or null when no
 * cloud account is signed in. The first call binds the client to the account
 * state. A client belongs to one account and one effective FileFn authority:
 * the session region, else the stored account region, else `insouth`. A
 * change of that authority, seen on an account change or the next call,
 * recreates the client, and sign-out tears it down.
 *
 * Creating a client starts the replay of the account's offline queue in the
 * one tab that holds the account's replay lock (Web Locks): staged uploads are
 * sent now when online and on every later `online` event. A client in another
 * tab waits for the lock and starts its replay once the holder is torn down or
 * its tab closes.
 *
 * Known limit (owner amendment 2026-11-14, deferred to TIDY-544 and FILE-15):
 * the lock covers only this startup replay. @filefn/client 0.3.0 also starts
 * its replay on the first use of the offline queue (an offline upload, a
 * pending local descriptor or a local render), so a tab that waits for the
 * lock replays outside it once it uses the queue, and without Web Locks every
 * client replays. Delivery then stays at least once, as in @filefn/client
 * 0.3.0: two tabs replaying one staged upload can create two upload sessions.
 *
 * Teardown aborts the client's in-flight requests, rejects every later call
 * with an AbortError before it does any work, and rejects the pending `done()`
 * of every upload handle the client returned. Uploads already staged, or being
 * staged, in the account's offline queue stay there for the account's next
 * client to replay; a handle's `abort()` after teardown does not delete them.
 *
 * Known limit: @filefn/client 0.3.0 has no dispose and cannot restart the
 * replay of an existing OfflineSync, so every client that started its replay
 * keeps its window `online` listener after teardown. On a reconnect it reads
 * each staged upload, reaches only the torn-down transport, which rejects with
 * an AbortError before any request, and leaves the upload unchanged, without
 * spending a retry, for the current client. A tab adds one such listener per
 * client it created while holding the replay lock, and none while another tab
 * holds it. Removing them needs an SDK dispose (TIDY-553).
 */
export async function getFileFnClient(): Promise<FileFnClient | null> {
  syncWithAccount();
  await settleFileFnClientSync();
  const entry = currentEntry;
  if (!entry) return null;
  const client = await entry.client;
  return currentEntry === entry ? client : getFileFnClient();
}

/**
 * Starts the signed-in cloud account's upload replay once its stored session
 * is resolved, so files queued before a reload upload also when the page never
 * renders or captures a file. It binds the FileFn client to the account state
 * (see getFileFnClient); signing out tears the client down. Tabs started
 * together share the queue as described in replayFileQueue.
 *
 * A client bound this way sends nothing (no offline replay, queue replay or
 * pending delete) until its replay is authorized (see isReplayAuthorized):
 * `liveSession` is the account and region a live session establishes. Without
 * it (a cached cloud session restored offline) an earlier live confirmation no
 * longer counts (see stopAccountUploadReplay), and the client is bound and
 * waits for the next one. With it, the client is bound only once the account
 * state carries the same cloud user at the same region, waiting while it
 * carries no cloud user yet; every other user the page knows, or the account
 * state publishes, is contradicted until a live session confirms it, a bound
 * client of another user or region is torn down, and an account state seeded
 * with another user binds nothing. The account state, the queue and the
 * pending deletes stay as they are.
 */
export function startAccountUploadReplay(
  liveSession?: FileFnAccountScope
): void {
  if (!liveSession) {
    if (replayAuthorization.liveOwner) stopAccountUploadReplay();
    bindToAccount();
    return;
  }
  const { contradictedUserIds, fileGrantUserIds } = replayAuthorization;
  replayAuthorization.liveOwner = liveSession;
  contradictedUserIds.delete(liveSession.userId);
  const known = [
    ...fileGrantUserIds,
    currentEntry?.userId,
    resolveFileFnAccountScope(account.get())?.userId
  ];
  for (const userId of known) {
    if (userId && userId !== liveSession.userId) {
      contradictedUserIds.add(userId);
      fileGrantUserIds.delete(userId);
    }
  }
  stopLiveBindWait();
  const entry = currentEntry;
  if (entry && !isLiveReplayOwner(entry.userId, entry.baseUrl)) {
    fileGrantUserIds.delete(entry.userId);
    tearDownFileFnClient();
  }
  notifyReplayWaiters();
  let isSettled = false;
  let unsubscribe: (() => void) | undefined;
  const settle = () => {
    isSettled = true;
    unsubscribe?.();
  };
  stopLiveBindWait = settle;
  unsubscribe = account.subscribe((value) => {
    const scope = resolveFileFnAccountScope(value);
    if (isSettled || !scope) return;
    settle();
    if (isLiveSessionScope(scope, liveSession)) {
      bindToAccount();
    } else {
      if (scope.userId !== liveSession.userId) {
        contradictedUserIds.add(scope.userId);
      }
      logger.warn({ at: "filefn.uploadReplay.start.accountMismatch" });
    }
  });
  if (isSettled) unsubscribe();
}

/**
 * Stops the upload replay the session restore started, once the stored session
 * resolves as expired, signed out, local-only, unavailable or only as the
 * cached session: the client it bound is torn down, and the account state,
 * the queue, the pending deletes and the users a live session contradicted
 * stay as they are. A client a file operation requested is left to it.
 */
export function stopAccountUploadReplay(): void {
  replayAuthorization.liveOwner = null;
  stopLiveBindWait();
  if (!replayAuthorization.fileGrantUserIds.has(currentEntry?.userId ?? "")) {
    tearDownFileFnClient();
  }
}

/**
 * Ends the page's session for the upload replay on sign-out: every grant is
 * cleared and every user the session knew (its live owner, file grants, bound
 * client and the account state's cloud user) is contradicted, so no file
 * operation during or after the sign-out authorizes their replay again; only
 * a later live session that confirms a user does. The bound client is torn
 * down, and the queue and the pending deletes stay as they are.
 */
export function endAccountUploadReplay(): void {
  const { liveOwner, contradictedUserIds, fileGrantUserIds } =
    replayAuthorization;
  const known = [
    liveOwner?.userId,
    ...fileGrantUserIds,
    currentEntry?.userId,
    resolveFileFnAccountScope(account.get())?.userId
  ];
  for (const userId of known) {
    if (userId) contradictedUserIds.add(userId);
  }
  replayAuthorization.liveOwner = null;
  fileGrantUserIds.clear();
  stopLiveBindWait();
  tearDownFileFnClient();
}

function isLiveSessionScope(
  scope: FileFnAccountScope,
  liveSession: FileFnAccountScope
): boolean {
  return (
    scope.userId === liveSession.userId &&
    (!scope.region ||
      !liveSession.region ||
      resolveFileFnBaseUrl(scope.region) ===
        resolveFileFnBaseUrl(liveSession.region))
  );
}

/**
 * Whether the account may send replay (offline uploads, queued files or
 * pending deletes) at the authority now: never once a live session of this
 * page's session contradicted it; otherwise when a file operation requested
 * its client (at every authority, as a file page does) or the latest live
 * session confirmed it at that authority.
 */
function isReplayAuthorized(userId: string, baseUrl: string): boolean {
  if (isContradicted(userId)) return false;
  return (
    replayAuthorization.fileGrantUserIds.has(userId) ||
    isLiveReplayOwner(userId, baseUrl)
  );
}

function isContradicted(userId: string): boolean {
  const { liveOwner, contradictedUserIds } = replayAuthorization;
  return (
    contradictedUserIds.has(userId) ||
    (liveOwner !== null && liveOwner.userId !== userId)
  );
}

function isLiveReplayOwner(userId: string, baseUrl: string): boolean {
  const owner = replayAuthorization.liveOwner;
  return (
    owner?.userId === userId &&
    (!owner.region || resolveFileFnBaseUrl(owner.region) === baseUrl)
  );
}

/** Starts the replay once it is authorized, unless the client is torn down first. */
function whenReplayAuthorized(
  userId: string,
  baseUrl: string,
  teardown: AbortSignal,
  start: () => void
) {
  if (teardown.aborted) return;
  const tryStart = () => {
    if (teardown.aborted || !isReplayAuthorized(userId, baseUrl)) return;
    replayWaiters.delete(tryStart);
    start();
  };
  onReplayAuthorizationExpanded(tryStart, teardown);
  tryStart();
}

/** Runs `listener` on every expansion of the replay authorization until teardown. */
function onReplayAuthorizationExpanded(
  listener: () => void,
  teardown: AbortSignal
) {
  if (teardown.aborted) return;
  replayWaiters.add(listener);
  teardown.addEventListener("abort", () => replayWaiters.delete(listener), {
    once: true
  });
}

function notifyReplayWaiters() {
  for (const tryStart of [...replayWaiters]) tryStart();
}

/**
 * Binds the client to the account state for a file operation. Its replay
 * starts as soon as it is created, unless a live session contradicted the
 * account (it stays contradicted when that session's confirmation lapses),
 * whose replay then waits for one that confirms it.
 */
function syncWithAccount() {
  const userId = resolveFileFnAccountScope(account.get())?.userId;
  const { liveOwner, contradictedUserIds, fileGrantUserIds } =
    replayAuthorization;
  if (userId && liveOwner && liveOwner.userId !== userId) {
    contradictedUserIds.add(userId);
  }
  if (userId && !isContradicted(userId) && !fileGrantUserIds.has(userId)) {
    fileGrantUserIds.add(userId);
    notifyReplayWaiters();
  }
  bindToAccount();
}

/** Binds the client to the account state once, then syncs it with the account. */
function bindToAccount() {
  if (!isBoundToAccount) {
    isBoundToAccount = true;
    account.subscribe(syncFileFnClient);
  }
  syncFileFnClient(account.get());
}

/**
 * Waits until the latest sync has settled: it returns only when no newer sync
 * started while it waited, so the caller's next synchronous step sees the
 * client bound to the account's current authority.
 */
async function settleFileFnClientSync(): Promise<void> {
  let sync: Promise<void>;
  do {
    sync = latestSync;
    await sync;
  } while (sync !== latestSync);
}

/**
 * Binds the current client to the account's effective FileFn authority. A
 * signed-out account or another user tears the client down at once; the
 * stored region, read when the session carries none, can only be compared
 * once read, and a newer sync supersedes it.
 */
function syncFileFnClient(value: UserAccount | null | undefined) {
  const generation = ++syncGeneration;
  const scope = resolveFileFnAccountScope(value);
  if (ownerUserId !== scope?.userId) {
    ownerUserId = scope?.userId;
    ownerEpoch += 1;
  }
  if (currentEntry?.userId !== scope?.userId) tearDownFileFnClient();
  if (!scope?.region) {
    isAuthorityPending = Boolean(scope);
    latestSync = scope
      ? bindToStoredRegion(scope.userId, generation)
      : Promise.resolve();
    return;
  }
  isAuthorityPending = false;
  bindFileFnClient(scope.userId, scope.region);
  latestSync = Promise.resolve();
}

function bindToStoredRegion(userId: string, generation: number) {
  const sync = clientStorage.get(ClientStorageKey.REGION).then((stored) => {
    if (generation === syncGeneration) {
      bindFileFnClient(userId, stored ?? "insouth");
      isAuthorityPending = false;
    }
  });
  sync.catch((error: unknown) => {
    logger.error({ at: "filefn.client.sync", error });
  });
  return sync;
}

function bindFileFnClient(userId: string, region: string) {
  const baseUrl = resolveFileFnBaseUrl(region);
  const key = `${userId}:${baseUrl}`;
  if (currentEntry?.key === key) return;
  tearDownFileFnClient();
  const controller = new AbortController();
  const entry: FileFnClientEntry = {
    userId,
    baseUrl,
    key,
    controller,
    client: createAccountFileFnClient(userId, baseUrl, controller.signal)
  };
  entry.client.catch((error: unknown) => {
    logger.error({ at: "filefn.client.create", error });
    if (currentEntry === entry) currentEntry = null;
  });
  currentEntry = entry;
}

function tearDownFileFnClient() {
  const entry = currentEntry;
  if (!entry) return;
  currentEntry = null;
  ownerEpoch += 1;
  entry.controller.abort(createTeardownError());
}

/**
 * Creates an account's FileFn client. The SDK's HEIC preprocessing is off, so
 * the original keeps its bytes and the processing mode owns conversion. The
 * client sends the account's pending deletes, at every authority, now and on
 * every reconnect and every expansion of the replay authorization until it
 * is torn down, once its replay is authorized (see startAccountUploadReplay).
 */
async function createAccountFileFnClient(
  userId: string,
  baseUrl: string,
  teardown: AbortSignal
): Promise<FileFnClient> {
  const sent = new Map<string, number>();
  const client = await createSdkClient(
    baseUrl,
    teardown,
    { enabled: true, opfsDir: resolveFileFnOfflineDir(userId) },
    sent
  );
  const guarded = guardFileFnClient(client, teardown);
  countSentRequests(guarded, sent);
  whenReplayAuthorized(userId, baseUrl, teardown, () => {
    startOfflineReplayWhenOwner(userId, client, teardown);
    startFileQueueReplay(userId, baseUrl, guarded, teardown);
    const drain = () =>
      void drainAccountPendingDeletes(userId, baseUrl, guarded, teardown).catch(
        (error: unknown) => {
          logger.error({ at: "filefn.client.pendingDelete", error });
        }
      );
    drain();
    globalThis.addEventListener?.("online", drain, { signal: teardown });
    onReplayAuthorizationExpanded(drain, teardown);
  });
  return guarded;
}

/**
 * Returns the FileFn OPFS queues whose files the signed-in account shows from
 * the device until they upload: the cloud account's own queue and the
 * device's local queue, or only the local queue without a cloud account.
 */
export function resolveFileQueueDirs(): string[] {
  return resolveFileQueueDirsOf(
    resolveFileFnAccountScope(account.get())?.userId ?? null
  );
}

/**
 * Uploads the account's queued files through the client, now when online and
 * on every reconnect or end of the app's offline mode until the client is torn
 * down. See replayFileQueue for how tabs share the queue. A pass checks the
 * account's records, so it runs only once DataFn is in the account's
 * namespace, and again whenever it is.
 */
function startFileQueueReplay(
  userId: string,
  baseUrl: string,
  client: FileFnClient,
  teardown: AbortSignal
) {
  const replay = () => {
    if (isReplayAuthorized(userId, baseUrl)) {
      replayAccountFileQueue({ userId, baseUrl, client, signal: teardown });
    }
  };
  const stop = datafnRuntime.subscribe((runtime) => {
    if (runtime?.namespace === `user:${userId}`) replay();
  });
  let wasOffline = isAppOffline();
  const stopOffline = context.subscribe(() => {
    if (wasOffline && !isAppOffline()) replay();
    wasOffline = isAppOffline();
  });
  teardown.addEventListener("abort", stop, { once: true });
  teardown.addEventListener("abort", stopOffline, { once: true });
  globalThis.addEventListener?.("online", replay, { signal: teardown });
}

/**
 * Replays the account's queue (see replayFileQueue) with its records as the
 * DataFn runtime current now holds them: once another runtime replaces it,
 * also one of the same account at the same authority, the references are no
 * longer current, so no decision read from the replaced runtime is acted on,
 * also by the retries and deadline passes that reuse them; the replay that
 * runtime starts decides again (see startFileQueueReplay). They watch the
 * runtime until it is replaced or the client is torn down.
 */
function replayAccountFileQueue(uploader: FileQueueUploader) {
  const { userId, baseUrl, client, signal } = uploader;
  if (signal.aborted || isAppOffline()) return;
  const namespace = `user:${userId}`;
  const bound = { runtime: undefined as unknown, isReplaced: false };
  let stopWatching = () => undefined as void;
  const unwatch = () => {
    stopWatching();
    signal.removeEventListener("abort", unwatch);
  };
  stopWatching = datafnRuntime.subscribe((runtime) => {
    if (bound.runtime === undefined) bound.runtime = runtime;
    else if (runtime !== bound.runtime && !bound.isReplaced) {
      bound.isReplaced = true;
      queueMicrotask(unwatch);
    }
  });
  signal.addEventListener("abort", unwatch, { once: true });
  const isAccountRecords = () => {
    const runtime = get(datafnRuntime);
    return (
      !signal.aborted &&
      !bound.isReplaced &&
      datafn.currentNamespace() === namespace &&
      runtime?.namespace === namespace &&
      runtime.remoteUrl?.replace(/\/datafn\/?$/, "") ===
        baseUrl.replace(/\/files\/?$/, "")
    );
  };
  const references: QueuedFileReferences = {
    owner: { userId, baseUrl },
    isCurrent: isAccountRecords,
    view: () => toRecordsView(get(datafnRuntime)),
    async sync() {
      if (!isAccountRecords()) return false;
      if (!get(datafnRuntime)?.storage) return true;
      return pullAccountFileRecords(datafn, isAccountRecords, signal);
    },
    async isReferenced(fileId) {
      if (!isAccountRecords()) return undefined;
      const result = await datafn.file.query({
        filters: { fileId },
        limit: 1,
        metadata: {
          includeTrashed: true,
          includeArchived: true,
          includeAncestorInactive: true
        }
      });
      if (!isAccountRecords() || !Array.isArray(result.data)) return undefined;
      return result.data.length > 0;
    },
    async discard(fileId) {
      if (!isAccountRecords()) return false;
      await client.deleteFile(fileId).catch(async (error: unknown) => {
        logger.warn({ at: "filefn.client.queue.discard", fileId, error });
        if (isAccountRecords()) {
          await recordPendingDelete(userId, baseUrl, fileId);
        }
      });
      return isAccountRecords();
    }
  };
  replayFileQueue(
    resolveAccountFileQueueDir(userId),
    client,
    signal,
    undefined,
    references
  ).catch((error: unknown) => {
    logger.error({ at: "filefn.client.queue", error });
  });
}

/** How long a queue replay waits for DataFn to pull the account's records. */
const ACCOUNT_PULL_TIMEOUT_MS = 120_000;

/**
 * Pulls the account's records into the device's DataFn copy. Resolves true
 * once a pull that started after this call applied the file records and
 * found no change left to bring, and false once one fails, the records stop
 * being the account's (`isCurrent`), the signal aborts or no pull ends in
 * time. A pull that brought changes may have stopped at its batch limit, so
 * it is followed by another until one brings none. A pull already running
 * when it is called may have read the records before, so it is waited out and
 * followed by another. A pull that left the file records out, while they
 * are still being cloned, is followed by the one DataFn starts once they are.
 */
export function pullAccountFileRecords(
  client: Pick<typeof datafn, "subscribe"> & {
    sync: Pick<typeof datafn.sync, "pullNow">;
  },
  isCurrent: () => boolean,
  signal: AbortSignal
): Promise<boolean> {
  if (!isCurrent()) return Promise.resolve(false);
  return new Promise((resolve) => {
    let isOwnPull = false;
    const pull = () => void client.sync.pullNow().catch(() => undefined);
    const stops = [
      client.subscribe((event) => {
        const context = event.context as
          | {
              phase?: unknown;
              cursors?: Record<string, unknown>;
              cursorDelta?: Record<string, unknown>;
            }
          | undefined;
        if (context?.phase !== "pull") return;
        if (event.type === "sync_started") isOwnPull = true;
        if (event.type !== "sync_applied" && event.type !== "sync_failed") {
          return;
        }
        const isCaughtUp = !Object.keys(context.cursorDelta ?? {}).length;
        if (!isOwnPull || (event.type === "sync_applied" && !isCaughtUp)) {
          setTimeout(pull, 0);
        } else if (event.type === "sync_failed") {
          finish(false);
        } else if (context.cursors && "file" in context.cursors) {
          finish(isCurrent());
        }
        isOwnPull = false;
      }),
      datafnRuntime.subscribe(() => {
        if (!isCurrent()) finish(false);
      })
    ];
    const timeout = setTimeout(() => finish(false), ACCOUNT_PULL_TIMEOUT_MS);
    const abort = () => finish(false);
    signal.addEventListener("abort", abort, { once: true });
    function finish(isPulled: boolean) {
      for (const stop of stops) stop();
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      resolve(isPulled);
    }
    pull();
  });
}

/** The signed-in cloud account's current FileFn client and its lifetime. */
export type FileQueueUploader = {
  userId: string;
  baseUrl: string;
  client: FileFnClient;
  /** Aborts when the client is torn down. */
  signal: AbortSignal;
};

/**
 * Returns the signed-in cloud account's current FileFn client, creating it
 * when there is none yet (creating one starts its queue replay too), or null
 * offline, without a cloud account, or when the client was replaced while it
 * was created.
 */
export async function captureFileQueueUploader(): Promise<FileQueueUploader | null> {
  if (isAppOffline()) return null;
  syncWithAccount();
  await settleFileFnClientSync();
  const entry = currentEntry;
  if (!entry) return null;
  const client = await entry.client;
  if (currentEntry !== entry || entry.controller.signal.aborted) return null;
  return {
    userId: entry.userId,
    baseUrl: entry.baseUrl,
    client,
    signal: entry.controller.signal
  };
}

/**
 * Uploads the signed-in cloud account's queued files now, through its FileFn
 * client. Does nothing offline or without a cloud account.
 */
export async function uploadQueuedFiles(): Promise<void> {
  const uploader = await captureFileQueueUploader();
  if (!uploader) return;
  replayAccountFileQueue(uploader);
}

/**
 * Creates an SDK client at an authority, authenticated as the signed-in
 * account, whose requests end when the teardown signal aborts and whose
 * upload requests add to `sent` once dispatched (see createTeardownFetch).
 */
async function createSdkClient(
  baseUrl: string,
  teardown: AbortSignal,
  offline: { enabled: boolean; opfsDir?: string },
  sent?: Map<string, number>
): Promise<FileFnClient> {
  const transport = await createNucleumAuthFnTransportAuth();
  return createFileFnClient({
    baseUrl,
    credentials: (await transport.getCredentials?.()) ?? "include",
    fetch: createTeardownFetch(teardown, sent),
    getAuthHeaders: async () => {
      teardown.throwIfAborted();
      return Object.fromEntries(
        new Headers((await transport.getRequestHeaders?.()) ?? undefined)
      );
    },
    offline,
    preprocessing: { heic: { enabled: false } }
  });
}

/**
 * Starts the client's offline queue replay once its tab holds the account's
 * replay lock, and holds the lock until the client is torn down, so one tab
 * replays the shared queue at a time and the next waiting client takes over.
 * Without Web Locks every client replays (at least once, see
 * getFileFnClient).
 */
function startOfflineReplayWhenOwner(
  userId: string,
  client: FileFnClient,
  teardown: AbortSignal
) {
  const locks: LockManager | undefined = globalThis.navigator?.locks;
  if (!locks) {
    startOfflineReplay(client);
    return;
  }
  const lockName = `${OFFLINE_REPLAY_LOCK_PREFIX}:${resolveFileFnOfflineDir(userId)}`;
  locks
    .request(lockName, { signal: teardown }, () => {
      if (teardown.aborted) return;
      startOfflineReplay(client);
      return new Promise<void>((resolve) => {
        teardown.addEventListener("abort", () => resolve(), { once: true });
      });
    })
    .catch((error: unknown) => {
      if (!teardown.aborted) {
        logger.error({ at: "filefn.client.replay", error });
      }
    });
}

/**
 * Starts the client's offline queue replay. @filefn/client 0.3.0 creates and
 * starts its OfflineSync only on the first use of the offline queue, so this
 * makes that first use with a local lookup that matches no staged upload and
 * sends no request. Later uses reuse the same OfflineSync, so a client never
 * runs two replays.
 */
function startOfflineReplay(client: FileFnClient) {
  client
    .getPendingLocalDescriptor(OFFLINE_REPLAY_START_FILE_ID)
    .catch((error: unknown) => {
      logger.error({ at: "filefn.client.replay", error });
    });
}

function createTeardownError() {
  return new DOMException("The FileFn client was torn down", "AbortError");
}

/**
 * Captures, without waiting, the signed-in cloud account and FileFn client
 * generation an operation belongs to, or null when no cloud account is
 * signed in.
 */
export function captureFileFnOwner(): FileFnOwner | null {
  syncWithAccount();
  const scope = resolveFileFnAccountScope(account.get());
  return scope ? { userId: scope.userId, epoch: ownerEpoch } : null;
}

/**
 * Captures the signed-in cloud account and FileFn client generation once the
 * client is bound to the account's current authority, reading the stored
 * region when the session carries none, or null when no cloud account is
 * signed in. A stored region that cannot be read rejects. Unlike
 * captureFileFnOwner, an authority change that is still being read has
 * already ended the previous generation when it returns.
 */
export async function captureSettledFileFnOwner(): Promise<FileFnOwner | null> {
  syncWithAccount();
  await settleFileFnClientSync();
  const scope = resolveFileFnAccountScope(account.get());
  return scope ? { userId: scope.userId, epoch: ownerEpoch } : null;
}

/**
 * Returns the authority the owner's files captured now are queued for: the
 * owner and the FileFn authority its client is bound to once settled, or
 * undefined when its generation ended or the authority cannot be read.
 */
export async function captureFileQueueClaim(
  owner: FileFnOwner
): Promise<QueuedFileClaim | undefined> {
  await settleFileFnClientSync().catch(() => undefined);
  const entry = currentEntry;
  if (!entry || !isFileFnOwnerCurrent(owner)) return undefined;
  return { userId: entry.userId, baseUrl: entry.baseUrl };
}

/**
 * Returns whether the owner's generation has not ended: the owner's account is
 * still signed in and no sign-out, other account or other authority has torn
 * its client down. A stored region read still pending does not end it; a
 * read that finds another authority does, once it binds.
 */
export function isFileFnOwnerLive(owner: FileFnOwner): boolean {
  return (
    owner.epoch === ownerEpoch &&
    resolveFileFnAccountScope(account.get())?.userId === owner.userId
  );
}

/**
 * Returns, without waiting, whether the owner's generation has not ended and
 * its authority is settled: no stored region read that could still change
 * the authority is pending. A caller that checks it in the same synchronous
 * step as it hands out a result never hands it to another owner or authority;
 * while it is false and the generation lives, settleFileFnOwner waits for the
 * pending read.
 */
export function isFileFnOwnerCurrent(owner: FileFnOwner): boolean {
  return !isAuthorityPending && isFileFnOwnerLive(owner);
}

/**
 * Throws the teardown AbortError once the owner's generation has ended: a
 * sign-out, another account or another authority tore its client down.
 */
export function assertFileFnOwner(owner: FileFnOwner): void {
  if (!isFileFnOwnerLive(owner)) throw createTeardownError();
}

/**
 * Waits for the authority syncs already started, without starting another,
 * then throws when the owner's generation has ended. A stored region that
 * cannot be read rejects.
 */
export async function settleFileFnOwner(owner: FileFnOwner): Promise<void> {
  await settleFileFnClientSync();
  assertFileFnOwner(owner);
}

/**
 * Returns the owner's FileFn client. Unlike getFileFnClient, it never
 * follows a replacement client: it rejects with the teardown AbortError when
 * the owner's generation ends before the client is ready.
 */
export async function getOwnedFileFnClient(
  owner: FileFnOwner
): Promise<OwnedFileFnClient> {
  await settleFileFnClientSync();
  assertFileFnOwner(owner);
  const entry = currentEntry;
  if (!entry)
    throw new Error("FileFn is unavailable for the signed-in account");
  const client = await entry.client;
  assertFileFnOwner(owner);
  return { client, baseUrl: entry.baseUrl };
}

/**
 * Re-binds the FileFn client to the signed-in account's current authority,
 * reading the stored region when the session carries none, then throws when
 * the owner's generation has ended. A stored region that cannot be read
 * rejects, so an unverified authority never passes.
 */
export async function confirmFileFnOwner(owner: FileFnOwner): Promise<void> {
  syncWithAccount();
  await settleFileFnOwner(owner);
}

/**
 * Deletes a file that no record will reference through the owner's client.
 * When the owner's generation has ended or the delete fails, it records the
 * delete for the owner at the file's authority: in the owner's private origin
 * storage, else in local storage, both of which sign-out and a reload keep,
 * else in memory for this session. Each later client of the owner sends it,
 * through a client of that authority, when the client is created, at once
 * when it is current, and on every reconnect, so the file is never deleted
 * through another account.
 */
export async function discardFileFnFile(
  owner: FileFnOwner,
  owned: OwnedFileFnClient,
  fileId: string
): Promise<void> {
  try {
    assertFileFnOwner(owner);
    await owned.client.deleteFile(fileId);
    return;
  } catch (error) {
    logger.warn({ at: "filefn.client.discard", fileId, error });
  }
  await recordPendingDelete(owner.userId, owned.baseUrl, fileId);
  const entry = currentEntry;
  if (entry?.userId === owner.userId) {
    const client = await entry.client;
    await drainAccountPendingDeletes(
      owner.userId,
      entry.baseUrl,
      client,
      entry.controller.signal
    );
  }
}

/**
 * Records the delete of a file the account will hold no record of, at the
 * file's authority, for the account's next client to send (see
 * discardFileFnFile): a local file the account claimed whose local-only
 * record was deleted before its record was published.
 */
export async function recordFileFnPendingDelete(
  account: { userId: string; baseUrl: string },
  fileId: string
): Promise<void> {
  await recordPendingDelete(account.userId, account.baseUrl, fileId);
}

/**
 * Pending deletes recorded without device file storage, each its own entry:
 * in local storage, which a reload keeps and where tabs add and remove
 * entries without overwriting each other, else in memory for this session.
 */
const memoryPendingDeletes = new Set<string>();

function getFallbackPendingDeleteKey(
  userId: string,
  baseUrl: string,
  fileId: string
) {
  return [baseUrl, fileId].reduce(
    (key, part) => `${key}:${encodeURIComponent(part)}`,
    getPendingDeleteKey(userId)
  );
}

/** Returns the account's pending deletes without device file storage. */
function getFallbackPendingDeletes(userId: string): Map<string, Set<string>> {
  const keys = new Set(memoryPendingDeletes);
  try {
    const storage = globalThis.localStorage;
    for (let index = 0; index < (storage?.length ?? 0); index++) {
      const key = storage?.key(index);
      if (key) keys.add(key);
    }
  } catch (error) {
    logger.warn({ at: "filefn.client.pendingDelete", error });
  }
  const prefix = `${getPendingDeleteKey(userId)}:`;
  const byAuthority = new Map<string, Set<string>>();
  for (const key of keys) {
    if (!key.startsWith(prefix)) continue;
    const [authority, fileId] = key
      .slice(prefix.length)
      .split(":")
      .map(decodeURIComponent);
    if (!authority || !fileId) continue;
    byAuthority.set(
      authority,
      (byAuthority.get(authority) ?? new Set()).add(fileId)
    );
  }
  return byAuthority;
}

function addFallbackPendingDelete(
  userId: string,
  baseUrl: string,
  fileId: string
) {
  const key = getFallbackPendingDeleteKey(userId, baseUrl, fileId);
  try {
    const storage = globalThis.localStorage;
    if (!storage) throw new Error("No local storage");
    storage.setItem(key, "1");
  } catch (error) {
    logger.warn({ at: "filefn.client.pendingDelete", fileId, error });
    memoryPendingDeletes.add(key);
  }
}

function removeFallbackPendingDelete(
  userId: string,
  baseUrl: string,
  fileId: string
) {
  const key = getFallbackPendingDeleteKey(userId, baseUrl, fileId);
  memoryPendingDeletes.delete(key);
  try {
    globalThis.localStorage?.removeItem(key);
  } catch (error) {
    logger.warn({ at: "filefn.client.pendingDelete", fileId, error });
  }
}

function getPendingDeleteKey(userId: string) {
  return `${PENDING_DELETE_DIR_PREFIX}-${encodeURIComponent(userId)}`;
}

async function recordPendingDelete(
  userId: string,
  baseUrl: string,
  fileId: string
) {
  try {
    const dir = await getPendingDeleteDir(userId, baseUrl, true);
    if (dir) {
      await dir.getFileHandle(encodeURIComponent(fileId), { create: true });
      return;
    }
  } catch (error) {
    logger.warn({ at: "filefn.client.pendingDelete", fileId, error });
  }
  addFallbackPendingDelete(userId, baseUrl, fileId);
}

/**
 * Sends the account's pending deletes at every authority that has one and
 * where its replay is authorized (see isReplayAuthorized): at the client's
 * own authority through it, at another through a client of that authority
 * made for the account and ended with the client's teardown.
 */
async function drainAccountPendingDeletes(
  userId: string,
  baseUrl: string,
  client: FileFnClient,
  teardown: AbortSignal
) {
  const authorities = new Set(getFallbackPendingDeletes(userId).keys());
  const userDir = await getPendingDeleteUserDir(userId, false);
  if (userDir) {
    for await (const name of listEntryNames(userDir)) {
      authorities.add(decodeURIComponent(name));
    }
  }
  for (const authority of authorities) {
    if (teardown.aborted) return;
    if (!isReplayAuthorized(userId, authority)) continue;
    await drainPendingDeletes(userId, authority, async () =>
      authority === baseUrl
        ? client
        : guardFileFnClient(
            await createSdkClient(authority, teardown, { enabled: false }),
            teardown
          )
    );
  }
}

/**
 * Sends the account's pending deletes at an authority through a client of
 * that authority, one drain at a time per account and authority.
 */
function drainPendingDeletes(
  userId: string,
  baseUrl: string,
  getClient: () => Promise<FileFnClient>
): Promise<void> {
  const key = `${userId}:${baseUrl}`;
  const drain = (pendingDeleteDrains.get(key) ?? Promise.resolve())
    .then(() => replayPendingDeletes(userId, baseUrl, getClient))
    .catch((error: unknown) => {
      logger.error({ at: "filefn.client.pendingDelete", error });
    });
  pendingDeleteDrains.set(key, drain);
  return drain;
}

function listEntryNames(dir: FileSystemDirectoryHandle) {
  return (dir as unknown as { keys(): AsyncIterable<string> }).keys();
}

/** Returns the directory of an account's pending deletes on the device. */
async function getPendingDeleteUserDir(
  userId: string,
  create: boolean
): Promise<FileSystemDirectoryHandle | null> {
  const storage = globalThis.navigator?.storage;
  if (!storage?.getDirectory) return null;
  try {
    const root = await storage.getDirectory();
    return await root.getDirectoryHandle(getPendingDeleteKey(userId), {
      create
    });
  } catch (error) {
    if (create) throw error;
    return null;
  }
}

/** Returns the directory of an account's pending deletes at an authority. */
async function getPendingDeleteDir(
  userId: string,
  baseUrl: string,
  create: boolean
): Promise<FileSystemDirectoryHandle | null> {
  const userDir = await getPendingDeleteUserDir(userId, create);
  if (!userDir) return null;
  try {
    return await userDir.getDirectoryHandle(encodeURIComponent(baseUrl), {
      create
    });
  } catch (error) {
    if (create) throw error;
    return null;
  }
}

/**
 * Sends the account's pending deletes at an authority, dropping each one
 * that succeeds or finds the file already gone and keeping each other
 * failure for the next drain. The client is made only when one is pending.
 */
async function replayPendingDeletes(
  userId: string,
  baseUrl: string,
  getClient: () => Promise<FileFnClient>
) {
  const dir = await getPendingDeleteDir(userId, baseUrl, false);
  const fileIds = new Set(getFallbackPendingDeletes(userId).get(baseUrl));
  if (dir) {
    for await (const name of listEntryNames(dir)) {
      fileIds.add(decodeURIComponent(name));
    }
  }
  if (fileIds.size === 0) return;
  const client = await getClient();
  for (const fileId of fileIds) {
    try {
      await client.deleteFile(fileId).catch((error: unknown) => {
        if (!(error instanceof FileFnHttpError && error.status === 404)) {
          throw error;
        }
      });
      removeFallbackPendingDelete(userId, baseUrl, fileId);
      await dir?.removeEntry(encodeURIComponent(fileId)).catch(() => undefined);
    } catch (error) {
      logger.warn({ at: "filefn.client.pendingDelete", fileId, error });
    }
  }
}

/**
 * Settles with the promise, or rejects with the teardown reason once the
 * client is torn down, whichever comes first.
 */
function untilTornDown<T>(promise: Promise<T>, teardown: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const onTeardown = () => reject(teardown.reason as unknown);
    if (teardown.aborted) onTeardown();
    else teardown.addEventListener("abort", onTeardown, { once: true });
    promise.then(resolve, reject).finally(() => {
      teardown.removeEventListener("abort", onTeardown);
    });
  });
}

/**
 * Fences a handle by the client teardown: `done()` rejects at teardown, and
 * `abort()` after teardown leaves an offline-staged upload in the queue.
 */
function guardUploadHandle<T extends UploadHandle>(
  handle: T,
  teardown: AbortSignal
): T {
  let done: Promise<UploadResult> | undefined;
  return {
    get uploadSessionId() {
      return handle.uploadSessionId;
    },
    get uploadSessionToken() {
      return handle.uploadSessionToken;
    },
    get fileId() {
      return handle.fileId;
    },
    onProgress: (callback) => handle.onProgress(callback),
    abort: () => {
      if (!teardown.aborted) handle.abort();
    },
    done: () => {
      done ??= teardown.aborted
        ? Promise.reject(teardown.reason as unknown)
        : untilTornDown(handle.done(), teardown);
      return done;
    }
  } as T;
}

function createTornDownHandle(fileId?: string): UploadHandle {
  return {
    uploadSessionId: "",
    fileId,
    onProgress: () => undefined,
    abort: () => undefined,
    done: () => Promise.reject(createTeardownError())
  };
}

/**
 * Wraps a FileFn client so that after teardown no method reaches the network,
 * the offline queue or its staged bytes.
 */
function guardFileFnClient(
  client: FileFnClient,
  teardown: AbortSignal
): FileFnClient {
  const guard = <T>(run: () => Promise<T>) => {
    if (teardown.aborted) return Promise.reject(teardown.reason as unknown);
    return untilTornDown(run(), teardown);
  };
  const guarded: FileFnClient = {
    uploadFile: (input) => {
      if (teardown.aborted) {
        return {
          ...createTornDownHandle(),
          fileId: input.fileId ?? generateFileId()
        };
      }
      return guardUploadHandle(client.uploadFile(input), teardown);
    },
    resumeUpload: (uploadSessionId, file, options) => {
      if (teardown.aborted) {
        return createTornDownHandle(options?.fileId);
      }
      return guardUploadHandle(
        client.resumeUpload(uploadSessionId, file, options),
        teardown
      );
    },
    getFile: (fileId) => guard(() => client.getFile(fileId)),
    listArtifacts: (fileId) => guard(() => client.listArtifacts(fileId)),
    downloadUrl: (fileId, options) =>
      guard(() => client.downloadUrl(fileId, options)),
    downloadArtifact: (fileId, artifactId) =>
      guard(() => client.downloadArtifact(fileId, artifactId)),
    uploadArtifact: (input) => guard(() => client.uploadArtifact(input)),
    resolveRenderable: (input) => guard(() => client.resolveRenderable(input)),
    deleteFile: (fileId) => guard(() => client.deleteFile(fileId)),
    getPendingLocalDescriptor: (fileId) =>
      guard(() => client.getPendingLocalDescriptor(fileId))
  };
  return guarded;
}

/**
 * Sends requests through the global fetch until the client is torn down, then
 * aborts in-flight requests and rejects new ones with an AbortError, which the
 * offline queue keeps staged without spending a retry. Counts in `sent` only
 * each upload's first request, as dispatched, by its key (see readUploadKey).
 */
function createTeardownFetch(
  teardown: AbortSignal,
  sent?: Map<string, number>
): typeof fetch {
  return async (input, init) => {
    teardown.throwIfAborted();
    const linked = new AbortController();
    const sources = [teardown, init?.signal].filter(
      (signal): signal is AbortSignal => Boolean(signal)
    );
    const detach = sources.map((signal) => {
      const forward = () => linked.abort(signal.reason);
      if (signal.aborted) forward();
      signal.addEventListener("abort", forward, { once: true });
      return () => signal.removeEventListener("abort", forward);
    });
    try {
      const key = readUploadKey(input, init);
      if (sent && key) sent.set(key, (sent.get(key) ?? 0) + 1);
      return await globalThis.fetch(input, { ...init, signal: linked.signal });
    } finally {
      for (const remove of detach) remove();
    }
  };
}

/** An upload's first request's idempotency key ("*" when it cannot be read). */
function readUploadKey(input: RequestInfo | URL, init?: RequestInit) {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.split(/[?#]/)[0].endsWith("/upload/init")) return undefined;
  try {
    const body: { idempotencyKey?: unknown } = JSON.parse(String(init?.body));
    const key = body.idempotencyKey;
    return typeof key === "string" && key ? key : "*";
  } catch {
    return "*";
  }
}
