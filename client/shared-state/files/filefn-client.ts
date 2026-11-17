import {
  createFileFnClient,
  FileFnHttpError,
  generateFileId,
  type FileFnClient,
  type UploadHandle,
  type UploadResult
} from "@filefn/client";
import account from "@nucleum/client/runtime/account/account.store";
import {
  UserDataMode,
  type UserAccount
} from "@nucleum/client/runtime/account/account.type";
import { createNucleumAuthFnTransportAuth } from "@nucleum/client/runtime/account/auth";
import { resolveAccountBaseUrl } from "@nucleum/client/runtime/account/network";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

const FILEFN_OFFLINE_DIR_PREFIX = "filefn-pending-uploads";
const OFFLINE_REPLAY_START_FILE_ID = "";
const OFFLINE_REPLAY_LOCK_PREFIX = "filefn-offline-replay";
const PENDING_DELETE_DIR_PREFIX = "filefn-pending-deletes";

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
let ownerEpoch = 0;
let ownerUserId: string | undefined;
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

/** Binds the client to the account state once, then syncs it with the account. */
function syncWithAccount() {
  if (!isBoundToAccount) {
    isBoundToAccount = true;
    account.subscribe(syncFileFnClient);
  }
  syncFileFnClient(account.get());
}

function settleFileFnClientSync(): Promise<void> {
  const sync = latestSync;
  return sync.then(() =>
    sync === latestSync ? undefined : settleFileFnClientSync()
  );
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
    latestSync = scope
      ? bindToStoredRegion(scope.userId, generation)
      : Promise.resolve();
    return;
  }
  bindFileFnClient(scope.userId, scope.region);
  latestSync = Promise.resolve();
}

function bindToStoredRegion(userId: string, generation: number) {
  const sync = clientStorage.get(ClientStorageKey.REGION).then((stored) => {
    if (generation === syncGeneration) {
      bindFileFnClient(userId, stored ?? "insouth");
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
 * every reconnect until it is torn down.
 */
async function createAccountFileFnClient(
  userId: string,
  baseUrl: string,
  teardown: AbortSignal
): Promise<FileFnClient> {
  const client = await createSdkClient(baseUrl, teardown, {
    enabled: true,
    opfsDir: resolveFileFnOfflineDir(userId)
  });
  const guarded = guardFileFnClient(client, teardown);
  if (!teardown.aborted) {
    startOfflineReplayWhenOwner(userId, client, teardown);
    const drain = () =>
      void drainAccountPendingDeletes(userId, baseUrl, guarded, teardown).catch(
        (error: unknown) => {
          logger.error({ at: "filefn.client.pendingDelete", error });
        }
      );
    drain();
    globalThis.addEventListener?.("online", drain, { signal: teardown });
  }
  return guarded;
}

/**
 * Creates an SDK client at an authority, authenticated as the signed-in
 * account, whose requests end when the teardown signal aborts.
 */
async function createSdkClient(
  baseUrl: string,
  teardown: AbortSignal,
  offline: { enabled: boolean; opfsDir?: string }
): Promise<FileFnClient> {
  const transport = await createNucleumAuthFnTransportAuth();
  return createFileFnClient({
    baseUrl,
    credentials: (await transport.getCredentials?.()) ?? "include",
    fetch: createTeardownFetch(teardown),
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
 * Throws the teardown AbortError once the owner's generation has ended: a
 * sign-out, another account or another authority tore its client down.
 */
export function assertFileFnOwner(owner: FileFnOwner): void {
  if (owner.epoch !== ownerEpoch) throw createTeardownError();
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
  await settleFileFnClientSync();
  assertFileFnOwner(owner);
}

/**
 * Deletes a file that no record will reference through the owner's client.
 * When the owner's generation has ended or the delete fails, it records the
 * delete for the owner at the file's authority: in the owner's private origin
 * storage, which sign-out keeps, else in memory for this session. Each later
 * client of the owner sends it, through a client of that authority, when the
 * client is created, at once when it is current, and on every reconnect, so
 * the file is never deleted through another account.
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

/** Pending deletes of this session without device storage, by account and authority. */
const sessionPendingDeletes = new Map<string, Map<string, Set<string>>>();

function getSessionPendingDeletes(userId: string, baseUrl: string) {
  const byAuthority = sessionPendingDeletes.get(userId) ?? new Map();
  sessionPendingDeletes.set(userId, byAuthority);
  const fileIds: Set<string> = byAuthority.get(baseUrl) ?? new Set();
  byAuthority.set(baseUrl, fileIds);
  return fileIds;
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
  getSessionPendingDeletes(userId, baseUrl).add(fileId);
}

/**
 * Sends the account's pending deletes at every authority that has one: at
 * the client's own authority through it, at another through a client of that
 * authority made for the account and ended with the client's teardown.
 */
async function drainAccountPendingDeletes(
  userId: string,
  baseUrl: string,
  client: FileFnClient,
  teardown: AbortSignal
) {
  const authorities = new Set(sessionPendingDeletes.get(userId)?.keys());
  const userDir = await getPendingDeleteUserDir(userId, false);
  if (userDir) {
    for await (const name of listEntryNames(userDir)) {
      authorities.add(decodeURIComponent(name));
    }
  }
  for (const authority of authorities) {
    if (teardown.aborted) return;
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
    return await root.getDirectoryHandle(
      `${PENDING_DELETE_DIR_PREFIX}-${encodeURIComponent(userId)}`,
      { create }
    );
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
  const sessionFileIds = getSessionPendingDeletes(userId, baseUrl);
  const fileIds = new Set(sessionFileIds);
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
      sessionFileIds.delete(fileId);
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
 * offline queue keeps staged without spending a retry.
 */
function createTeardownFetch(teardown: AbortSignal): typeof fetch {
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
      return await globalThis.fetch(input, { ...init, signal: linked.signal });
    } finally {
      for (const remove of detach) remove();
    }
  };
}
