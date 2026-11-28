import "fake-indexeddb/auto";
import {
  captureUploadTestPhoto,
  newUploadTestDevice,
  stubUploadBrowserGlobals,
  stubUploadObjectUrls,
  uploadTestUserInfo
} from "../../../tests/fixtures/file-upload";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi
} from "vitest";
import type {
  FileFnClient,
  UploadArtifactInput,
  UploadInput
} from "@filefn/client";
import account from "@nucleum/client/runtime/account/account.store";
import {
  UserDataMode,
  UserSessionType,
  type UserAccount
} from "@nucleum/client/runtime/account/account.type";
import { Product } from "@nucleum/client/config/product.type";
import { configurePersistenceLogger } from "@nucleum/persistence/logging-host";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import {
  datafn,
  destroyNucleumDatafn,
  initializeNucleumDatafn
} from "@nucleum/datafn/datafn.store";
import context from "@nucleum/client/runtime/context.store";
import { createFakeLocks, createFakeOpfs } from "../../../tests/fixtures/opfs";

const codec = vi.hoisted(() => ({
  compressImageToTargetSize: vi.fn(),
  convertHeicToPng: vi.fn()
}));
vi.mock("@nucleum/client/runtime/media/image-codec", () => codec);

/** What the FileFn clients the real client runtime creates received. */
const sdk = vi.hoisted(() => ({
  started: [] as UploadInput[],
  uploads: [] as UploadInput[],
  artifacts: [] as UploadArtifactInput[],
  deletes: [] as string[],
  baseUrls: [] as string[],
  /** Holds every upload's completion until it settles, when set. */
  hold: null as Promise<void> | null,
  /** Runs, when set, as an upload's delete is sent. */
  onDelete: null as (() => Promise<void>) | null,
  /**
   * Runs, when set, before a delete is sent, with the client's fetch, which
   * it may dispatch the request through (a refused dispatch rejects it).
   */
  beforeDelete: null as
    ((fileId: string, dispatch: typeof fetch) => Promise<void>) | null
}));
vi.mock("@filefn/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@filefn/client")>();
  return {
    ...actual,
    createFileFnClient: (
      config: Parameters<typeof actual.createFileFnClient>[0]
    ): Partial<FileFnClient> => {
      sdk.baseUrls.push(config.baseUrl);
      return {
        uploadFile: (input) => {
          sdk.started.push(input);
          return {
            uploadSessionId: "ses_1",
            fileId: input.fileId,
            onProgress: () => undefined,
            abort: () => undefined,
            done: async () => {
              await sdk.hold;
              sdk.uploads.push(input);
              return { fileId: input.fileId!, versionId: "ver_1" };
            }
          } as ReturnType<FileFnClient["uploadFile"]>;
        },
        deleteFile: async (fileId) => {
          await sdk.beforeDelete?.(fileId, config.fetch ?? fetch);
          sdk.deletes.push(fileId);
          await sdk.onDelete?.();
        },
        uploadArtifact: async (input) => {
          sdk.artifacts.push(input);
          return {} as Awaited<ReturnType<FileFnClient["uploadArtifact"]>>;
        },
        getPendingLocalDescriptor: async () => null
      };
    }
  };
});

/**
 * The cloud accounts' DataFn authority. The device's DataFn runs local-only,
 * so a fake of its sync stands in: an account's namespace syncs with `url`
 * (a guest's syncs with none), and each pull applies at once.
 */
const authority = vi.hoisted(() => ({
  url: "https://account-useast-dev.nucleum.app/datafn"
}));
/**
 * Runs, when set, before each query or mutation of the file records; a
 * function it returns replaces the call's result with its own.
 */
type AfterCall = (result: unknown) => unknown;
const fileCalls = vi.hoisted(() => ({
  beforeQuery: null as ((args: unknown) => Promise<void | AfterCall>) | null,
  beforeMutate: null as ((args: unknown) => Promise<void | AfterCall>) | null,
  /** Runs, when set, as each pull of the authority's records applies. */
  onPull: null as (() => Promise<void | "fail">) | null
}));
vi.mock("@nucleum/datafn/datafn.store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@nucleum/datafn/datafn.store")>();
  const { derived } = await import("svelte/store");
  const { createUploadSyncEvents } = await import("../../../tests/fixtures/file-upload");
  const { emit, subscribe } = createUploadSyncEvents();
  let pulls = 0;
  const pullNow = async () => {
    const pull = ++pulls;
    const outcome = await fileCalls.onPull?.();
    emit("sync_started", { phase: "pull" });
    if (outcome === "fail") emit("sync_failed", { phase: "pull" });
    else emit("sync_applied", { phase: "pull", cursors: { file: `${pull}` } });
  };
  const datafn = new Proxy(actual.datafn, {
    get(target, key) {
      if (key === "subscribe") return subscribe;
      if (key === "sync") return { ...target.sync, pullNow };
      if (key === "file") {
        return new Proxy(target.file, {
          get(table, name) {
            const method = Reflect.get(table, name);
            const before =
              name === "query"
                ? fileCalls.beforeQuery
                : name === "mutate"
                  ? fileCalls.beforeMutate
                  : null;
            if (!before || typeof method !== "function") return method;
            return async (...args: unknown[]) => {
              const after = await before(args[0]);
              const result = await method.apply(table, args);
              return after ? after(result) : result;
            };
          }
        });
      }
      return Reflect.get(target, key);
    }
  });
  const datafnRuntime = derived(actual.datafnRuntime, (runtime) =>
    runtime?.namespace?.startsWith("user:")
      ? { ...runtime, mode: "sync" as const, remoteUrl: authority.url }
      : runtime
  );
  return { ...actual, datafn, datafnRuntime };
});

const { fileUpload } = await import("./file-upload");
const { resolveFileUrl } = await import("./file-url");
const {
  installDeviceFileQueue,
  settleLocalFileRecords,
  uploadLocalQueuedFiles
} = await import("./device-file-queue");
const {
  captureFileQueueUploader,
  endAccountUploadReplay,
  recordFileFnPendingDelete,
  startAccountUploadReplay
} = await import("./filefn-client");
const {
  exportQueuedFiles,
  isQueuedFileFailed,
  isRestorableLocalCopy,
  listQueuedFiles,
  markQueuedFileOrphaned,
  markQueuedFileStale,
  replayFileQueue,
  restoreLocalQueuedFiles,
  retryFailedQueuedFile,
  settleQueuedFileMarks,
  withQueueLock,
  writeQueuedFileRecord
} = await import("./file-queue");
const { OPFSStore } = await import("@filefn/client");

/** One device file system: the queue keeps its handles for the page's life. */
const opfs = createFakeOpfs();
let isOnline = true;
/** The device's Web Locks; a test sets undefined for a browser without them. */
let webLocks: LockManager | undefined;
let uninstall: (() => void) | undefined;

function cloudAccount(userId: string): UserAccount {
  return {
    dataMode: UserDataMode.CLOUD,
    sessionType: UserSessionType.RETURNING,
    userId,
    userInfo: uploadTestUserInfo(userId)
  };
}

const localAccount: UserAccount = {
  dataMode: UserDataMode.LOCAL,
  sessionType: UserSessionType.RETURNING
};

/** The device's DataFn identity, so a namespace can be opened again. */
let device = { dapId: "", env: "" };

/**
 * Opens local DataFn in the namespace of the account (of none: the guest),
 * with the device's DataFn ID kept in local storage, as the app does.
 */
async function openData(userId?: string) {
  localStorage.setItem(ClientStorageKey.DAP_ID, device.dapId);
  await destroyNucleumDatafn();
  await initializeNucleumDatafn({
    product: Product.MEMOTRON,
    account: { dataMode: UserDataMode.LOCAL, userId },
    ...device,
    isOffline: true
  });
}

/** Boots local DataFn in the account's namespace, then signs the account in. */
async function bootData(value: UserAccount) {
  await openData(value.userId);
  account.set(value);
}

/** Confirms the account's cloud session live, as a sign-in or a session restore does. */
function confirmLiveSession(userId: string) {
  startAccountUploadReplay({ userId, region: "useast" });
}

/** Signs a cloud account in, then moves DataFn to its namespace, as the app does. */
async function signInToCloud(userId: string) {
  account.set(cloudAccount(userId));
  confirmLiveSession(userId);
  await openData(userId);
}

/**
 * Signs out to local-only mode, back in a guest namespace: the device's, or
 * with `isNewGuest` a new one, as a sign-out that clears the device's DataFn
 * ID opens. Every sign-out clears the device's local storage.
 */
async function signOutToLocal(isNewGuest = false) {
  endAccountUploadReplay();
  localStorage.clear();
  account.set(localAccount);
  if (isNewGuest)
    device = { ...device, dapId: `device-${crypto.randomUUID()}` };
  await openData();
}

/**
 * Adds shared locks and their query to the device's fake Web Locks: a shared
 * request is granted at once and held until its callback's promise settles.
 */
function withSharedLocks(locks: LockManager): LockManager {
  const held: LockInfo[] = [];
  const request = locks.request.bind(locks) as (
    ...args: unknown[]
  ) => Promise<unknown>;
  return {
    request(name: string, options: LockOptions, callback: LockGrantedCallback) {
      if (options?.mode !== "shared") return request(name, options, callback);
      const lock = { name, mode: "shared" as const };
      held.push(lock);
      return Promise.resolve(callback(lock as Lock)).finally(() =>
        held.splice(held.indexOf(lock), 1)
      );
    },
    query: async () => ({ held: [...held], pending: [] })
  } as LockManager;
}

/**
 * Makes the next request of the queue's lock (only of the lock named `name`,
 * if given) fail, as a busy browser can.
 */
function failQueueLockOnce(name?: string) {
  const locks = webLocks as LockManager;
  const request = locks.request.bind(locks) as (
    ...args: unknown[]
  ) => Promise<unknown>;
  let isFailed = false;
  vi.spyOn(locks, "request").mockImplementation(((...args: unknown[]) => {
    const isOther = name !== undefined && args[0] !== name;
    if (isFailed || isOther || (args[1] as LockOptions)?.mode === "shared")
      return request(...args);
    isFailed = true;
    return Promise.reject(
      new DOMException("The lock request failed", "AbortError")
    );
  }) as never);
}

/** Holds a guest namespace live, as another tab in it does, until released. */
function enterInOtherTab(namespace: string) {
  const left = deferred<void>();
  void navigator.locks.request(
    `${LOCAL_QUEUE}-live:${namespace}`,
    { mode: "shared" },
    () => left.promise
  );
  return () => left.resolve();
}

/** Runs a pass of the local queue through the signed-in account's client. */
async function replayLocalQueue() {
  const uploader = await captureFileQueueUploader();
  if (uploader) await uploadLocalQueuedFiles(uploader);
}

/** Lets the background work the page started run its course. */
async function settleTasks() {
  for (let turn = 0; turn < 50; turn++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  await settleLocalFileRecords();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

/** Captures a photo (through `upload`, a reloaded page's module, if given). */
function capturePhoto(upload = fileUpload) {
  return captureUploadTestPhoto(upload, codec.compressImageToTargetSize);
}

/** Renames the captured photo, as the guest does before its queue reconciles. */
function renamePhotoToReceipt(id: string) {
  return datafn.file.mutate({
    operation: "merge",
    id,
    record: { id, name: "receipt.png" }
  } as never);
}

/** Saves a rename and waits for the guest queue to process it. */
async function renamePhotoAndSettle(id: string) {
  await renamePhotoToReceipt(id);
  await settleLocalFileRecords();
}

/** Switches to user-a on the rename pass's record read and runs replay. */
async function replayAfterSignInInterruptsRename(id: string) {
  fileCalls.beforeQuery = async (args) => {
    const { filters } = args as { filters?: { id?: string } };
    if (filters?.id !== id) return;
    fileCalls.beforeQuery = null;
    await signInToCloud("user-a");
  };
  await renamePhotoToReceipt(id);
  await vi.waitFor(() =>
    expect(datafn.currentNamespace()).toBe("user:user-a")
  );
  await settleTasks();
  await replayLocalQueue();
}

async function savedRecord(id: string) {
  const result = await datafn.file.query({ filters: { id } });
  return result.data?.[0] as Record<string, unknown> | undefined;
}

/** Reads a record of the current namespace, trashed or archived too. */
async function readAnyRecord(id: string) {
  const result = await datafn.file.query({
    filters: { id },
    metadata: { includeTrashed: true, includeArchived: true }
  });
  return result.data?.[0] as Record<string, unknown> | undefined;
}

const LOCAL_QUEUE = "nucleum-file-queue-local";

/**
 * Captures a photo as a local-only user, then signs a cloud account in whose
 * upload of it is still running when the account signs out.
 */
async function captureThenSignOutDuringUpload(isNewGuest = false) {
  await bootData(localAccount);
  uninstall = installDeviceFileQueue();
  const record = await capturePhoto();
  await settleLocalFileRecords();
  let release!: () => void;
  sdk.hold = new Promise<void>((done) => (release = done));
  await signInToCloud("user-a");
  await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
  await signOutToLocal(isNewGuest);
  release();
  sdk.hold = null;
  return record;
}

/** Writes a file of a local file's entry, as another tab's replay does. */
/** Reads the record copy a local file holds. */
function readLocalCopy(fileId: string) {
  const bytes = opfs.read(LOCAL_QUEUE, `queued_${fileId}`, "record.json");
  if (!bytes) return undefined;
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}

async function writeLocalEntryFile(fileId: string, name: string, text = "") {
  const root = await opfs.getDirectory();
  const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
  const entry = await queue.getDirectoryHandle(`queued_${fileId}`);
  const file = await entry.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(text);
  await writable.close();
}

/**
 * Makes reads of a queued file's `name`, or with `isWrite` its creation,
 * fail `times` times (every time by default), as an unreadable or full file
 * system does.
 */
function failEntryFile(name: string, isWrite = false, times = Infinity) {
  let left = times;
  const fail = () => {
    left -= 1;
    return Promise.reject(new DOMException("Unreadable", "NotReadableError"));
  };
  const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
    new Proxy(dir, {
      get(target, key) {
        if (key === "getDirectoryHandle") {
          return async (dirName: string, options?: { create?: boolean }) =>
            wrap(await target.getDirectoryHandle(dirName, options));
        }
        if (key !== "getFileHandle") return Reflect.get(target, key);
        return async (fileName: string, options?: { create?: boolean }) => {
          const isFailing = fileName === name && left > 0;
          if (isFailing && isWrite && options?.create) return fail();
          const file = await target.getFileHandle(fileName, options);
          if (!isFailing || isWrite) return file;
          return { ...file, getFile: fail };
        };
      }
    });
  navigator.storage.getDirectory = async () => wrap(await opfs.getDirectory());
}

/** Makes `times` removals of a queued file's `name` fail, as a busy file system does. */
function failEntryRemoval(name: string, times = Infinity) {
  let left = times;
  const getDirectory = navigator.storage.getDirectory;
  const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
    new Proxy(dir, {
      get(target, key) {
        if (key === "getDirectoryHandle") {
          return async (dirName: string, options?: { create?: boolean }) =>
            wrap(await target.getDirectoryHandle(dirName, options));
        }
        if (key !== "removeEntry") return Reflect.get(target, key);
        return async (entryName: string) => {
          if (entryName !== name || left-- <= 0)
            return target.removeEntry(entryName);
          throw new DOMException("The file system is busy", "NotReadableError");
        };
      }
    });
  navigator.storage.getDirectory = async () => wrap(await getDirectory());
}

/** Runs `hook` before a queued file named `name` is removed, once. */
function hookEntryRemovalOnce(name: string, hook: () => Promise<void>) {
  let isRun = false;
  const getDirectory = navigator.storage.getDirectory;
  const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
    new Proxy(dir, {
      get(target, key) {
        if (key === "getDirectoryHandle")
          return async (dirName: string, options?: { create?: boolean }) =>
            wrap(await target.getDirectoryHandle(dirName, options));
        if (key !== "removeEntry") return Reflect.get(target, key);
        return async (entryName: string) => {
          if (entryName === name && !isRun) {
            isRun = true;
            await hook();
          }
          return target.removeEntry(entryName);
        };
      }
    });
  navigator.storage.getDirectory = async () => wrap(await getDirectory());
}

/**
 * Runs `create` before a queued file is created and `lookup` before a
 * directory is opened; a hook that rejects fails that call.
 */
function hookEntryFiles(hooks: {
  create?(name: string): Promise<void> | void;
  lookup?(name: string): Promise<void> | void;
}) {
  const getDirectory = navigator.storage.getDirectory;
  const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
    new Proxy(dir, {
      get(target, key) {
        if (key === "getDirectoryHandle")
          return async (name: string, options?: { create?: boolean }) => {
            await hooks.lookup?.(name);
            return wrap(await target.getDirectoryHandle(name, options));
          };
        if (key !== "getFileHandle") return Reflect.get(target, key);
        return async (name: string, options?: { create?: boolean }) => {
          if (options?.create) await hooks.create?.(name);
          return target.getFileHandle(name, options);
        };
      }
    });
  navigator.storage.getDirectory = async () => wrap(await getDirectory());
}

/** Makes the next write of a queued file's `name` fail once its file exists. */
function failEntryWriteOnce(name: string) {
  let isFailed = false;
  const getDirectory = navigator.storage.getDirectory;
  const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
    new Proxy(dir, {
      get(target, key) {
        if (key === "getDirectoryHandle")
          return async (dirName: string, options?: { create?: boolean }) =>
            wrap(await target.getDirectoryHandle(dirName, options));
        if (key !== "getFileHandle") return Reflect.get(target, key);
        return async (fileName: string, options?: { create?: boolean }) => {
          const file = await target.getFileHandle(fileName, options);
          if (fileName !== name || isFailed) return file;
          isFailed = true;
          const full = new DOMException(
            "The disk is full",
            "QuotaExceededError"
          );
          return { ...file, createWritable: () => Promise.reject(full) };
        };
      }
    });
  navigator.storage.getDirectory = async () => wrap(await getDirectory());
}

/** Makes each lookup of a queued file's `name` fail while `isFailing` says so. */
function failEntryLookup(name: string, isFailing: () => boolean) {
  const getDirectory = navigator.storage.getDirectory;
  const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
    new Proxy(dir, {
      get(target, key) {
        if (key === "getDirectoryHandle")
          return async (dirName: string, options?: { create?: boolean }) =>
            wrap(await target.getDirectoryHandle(dirName, options));
        if (key !== "getFileHandle") return Reflect.get(target, key);
        return async (fileName: string, options?: { create?: boolean }) => {
          if (fileName === name && !options?.create && isFailing())
            throw new DOMException("Unreadable", "NotReadableError");
          return target.getFileHandle(fileName, options);
        };
      }
    });
  navigator.storage.getDirectory = async () => wrap(await getDirectory());
}

/** Removes a queued file's `name`, as another tab's pass does. */
async function removeLocalEntryFile(fileId: string, name: string) {
  const root = await opfs.getDirectory();
  const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
  const entry = await queue.getDirectoryHandle(`queued_${fileId}`);
  await entry.removeEntry(name);
}

/** Records another tab's guest change to a record, pending, and fences it. */
async function changeInOtherTab(namespace: string, id: string, fileId: string) {
  const key = [namespace, id].map(encodeURIComponent).join(":");
  localStorage.setItem(`${LOCAL_QUEUE}-pending:${key}`, "change:t");
  await writeLocalEntryFile(fileId, "stale", "changed");
}

function goOnline() {
  isOnline = true;
  window.dispatchEvent(new Event("online"));
}

const initialAccount = account.get();

beforeEach(() => {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(`${LOCAL_QUEUE}-pending:`)) localStorage.removeItem(key);
  }
  stubUploadBrowserGlobals();
  opfs.clear();
  device = newUploadTestDevice();
  isOnline = true;
  webLocks = withSharedLocks(createFakeLocks());
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    get onLine() {
      return isOnline;
    },
    get locks() {
      return webLocks;
    },
    storage: { getDirectory: opfs.getDirectory }
  });
  stubUploadObjectUrls();
  configurePersistenceLogger({ error: vi.fn(), info: vi.fn() });
  sdk.started = [];
  sdk.uploads = [];
  sdk.artifacts = [];
  sdk.deletes = [];
  sdk.baseUrls = [];
  sdk.hold = null;
  fileCalls.beforeQuery = null;
  fileCalls.beforeMutate = null;
  fileCalls.onPull = null;
});

afterEach(async () => {
  uninstall?.();
  uninstall = undefined;
  account.set({
    dataMode: UserDataMode.NONE,
    sessionType: UserSessionType.UNDETERMINED
  });
  await destroyNucleumDatafn();
  await clientStorage.remove(ClientStorageKey.FALLBACKS_RUN_STATUS);
  account.set(initialAccount);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  context.update((value) => ({ ...value, isInOfflineMode: false }));
});

describe("files captured offline or by a local-only user", () => {
  it("uploads a local-only user's capture with its record into the first cloud account and still renders it locally after sign-out", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();

    const record = await capturePhoto();

    expect((await savedRecord(record.id))?.data ?? null).toBeNull();
    expect(opfs.list("nucleum-file-queue-local")).toEqual([
      `queued_${record.fileId}`
    ]);
    expect(await resolveFileUrl(record.fileId, "full")).toBe("blob:queued");
    expect(sdk.baseUrls).toEqual([]);
    await settleLocalFileRecords();

    // Signed in while DataFn still holds the guest's data: the account would
    // hold no record of the file, so nothing uploads yet.
    account.set(cloudAccount("user-a"));
    confirmLiveSession("user-a");
    await vi.waitFor(() => expect(sdk.baseUrls).not.toEqual([]));
    await replayLocalQueue();
    expect(sdk.uploads).toEqual([]);

    await openData("user-a");

    await vi.waitFor(() =>
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ])
    );
    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({
          fileId: record.fileId,
          name: "photo.png",
          type: "image/png"
        })
      )
    );
    await vi.waitFor(() =>
      expect(
        opfs.read(
          "nucleum-file-queue-local",
          `queued_${record.fileId}`,
          "uploaded"
        )
      ).toBeDefined()
    );

    await signOutToLocal();

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(await resolveFileUrl(record.fileId, "full")).toBe("blob:queued");

    // Another account signing in later receives nothing: the files went to
    // the first one.
    await signInToCloud("user-b");
    await replayLocalQueue();
    expect(sdk.uploads).toHaveLength(1);
    expect(await savedRecord(record.id)).toBeUndefined();
  });

  it("publishes each local-only record as it is at the first cloud sign-in and never uploads a file whose record was deleted", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const renamed = await capturePhoto();
    const trashed = await capturePhoto();
    const archived = await capturePhoto();
    const deleted = await capturePhoto();
    await datafn.file.mutate({
      operation: "merge",
      id: renamed.id,
      record: {
        id: renamed.id,
        label: "Receipt",
        name: "receipt.png",
        metadata: { pages: 1 }
      }
    });
    await datafn.file.mutate({ operation: "trash", id: trashed.id } as never);
    await datafn.file.mutate({
      operation: "archive",
      id: archived.id
    } as never);
    await datafn.file.mutate({ operation: "delete", id: deleted.id } as never);
    await settleLocalFileRecords();
    expect(opfs.list(LOCAL_QUEUE).sort()).toEqual(
      [renamed, trashed, archived]
        .map((record) => `queued_${record.fileId}`)
        .sort()
    );

    await signInToCloud("user-a");

    const published = [renamed, trashed, archived];
    await vi.waitFor(() =>
      expect(sdk.uploads.map((upload) => upload.fileId).sort()).toEqual(
        published.map((record) => record.fileId).sort()
      )
    );
    await vi.waitFor(async () => {
      expect(await readAnyRecord(renamed.id)).toEqual(
        expect.objectContaining({
          fileId: renamed.fileId,
          label: "Receipt",
          name: "receipt.png",
          metadata: { pages: 1 }
        })
      );
      expect(
        (await readAnyRecord(trashed.id))?.trashedAt ?? null
      ).not.toBeNull();
      expect((await readAnyRecord(archived.id))?.isArchived).toBe(true);
    });
    expect(await savedRecord(renamed.id)).toBeDefined();
    expect(await savedRecord(trashed.id)).toBeUndefined();
    expect(await savedRecord(archived.id)).toBeUndefined();
    expect(await readAnyRecord(deleted.id)).toBeUndefined();
    expect(sdk.started.map((upload) => upload.fileId)).not.toContain(
      deleted.fileId
    );
  });

  it("leaves a local file to the account that claimed it when the account signs out during its upload", async () => {
    const record = await captureThenSignOutDuringUpload();

    await signInToCloud("user-b");
    await replayLocalQueue();
    expect(sdk.started).toHaveLength(1);
    expect(await savedRecord(record.id)).toBeUndefined();

    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId })
      )
    );
    expect(sdk.started.map((upload) => upload.idempotencyKey)).toEqual([
      `queued_${record.fileId}:0`,
      `queued_${record.fileId}:0`
    ]);
  });

  it("deletes the upload of a claimed capture whose local-only record was deleted once the claiming account holds no record of it, then drops the capture", async () => {
    const record = await captureThenSignOutDuringUpload();

    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    // Only the claiming account can tell whether the record was published.
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
    await signInToCloud("user-b");
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.deletes).toEqual([]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);

    await signInToCloud("user-a");

    await vi.waitFor(() => expect(opfs.list(LOCAL_QUEUE)).toEqual([]));
    expect(sdk.deletes).toEqual([record.fileId]);
    expect(sdk.started).toHaveLength(1);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("keeps the claiming account's file and record and drops the capture when its record was published before the local-only record was deleted", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    await vi.waitFor(() =>
      expect(
        opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "uploaded")
      ).toBeDefined()
    );
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    // The page reloaded after the publish, before the uploaded mark landed.
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
    const entry = await queue.getDirectoryHandle(`queued_${record.fileId}`);
    await entry.removeEntry("uploaded");

    await signOutToLocal();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
    expect(sdk.deletes).toEqual([]);
    expect(sdk.started).toHaveLength(1);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
  });

  it("completes a first publish that saved the record but not its trash when the local file replays again", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await datafn.file.mutate({ operation: "trash", id: record.id } as never);
    await settleLocalFileRecords();
    // The first publish saves its insert but not its trash, as an offline
    // DataFn that applies each mutation of a batch on its own may.
    let isPartial = false;
    fileCalls.beforeMutate = async (args) => {
      const [first] = Array.isArray(args) ? args : [];
      if (first?.operation !== "insert" || first.id !== record.id) return;
      fileCalls.beforeMutate = null;
      (args as unknown[]).splice(1);
      isPartial = true;
      const failed = { ok: false, error: new Error("The trash failed") };
      return (result) => [...(result as unknown[]), failed];
    };

    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.fileId).toBe(record.fileId)
    );
    expect(isPartial).toBe(true);
    await replayLocalQueue();

    await vi.waitFor(() =>
      expect(
        opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "uploaded")
      ).toBeDefined()
    );
    expect((await readAnyRecord(record.id))?.trashedAt ?? null).not.toBeNull();
    expect(await savedRecord(record.id)).toBeUndefined();
  });

  it.each([
    ["no file", undefined],
    ["another file", "file_other"]
  ])(
    "leaves an account record with the capture's ID and %s unchanged, deletes the upload and keeps the capture on the device for its guest record",
    async (_, otherFileId) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      // The account already holds a record with the capture's ID, as one
      // restored from a guest backup (bytes on the record, no fileId) does.
      await openData("user-a");
      const restored = { name: "restored.png", type: "image/png" };
      await datafn.file.mutate({
        operation: "insert",
        id: record.id,
        record: { ...restored, ...(otherFileId && { fileId: otherFileId }) }
      } as never);

      await signInToCloud("user-a");

      await vi.waitFor(() => expect(sdk.deletes).toEqual([record.fileId]));
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
      await vi.waitFor(() =>
        expect(
          opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "uploaded")
        ).toBeDefined()
      );
      const saved = await savedRecord(record.id);
      expect(saved).toEqual(expect.objectContaining(restored));
      expect(saved?.fileId).toBe(otherFileId);
      await replayLocalQueue();
      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.deletes).toEqual([record.fileId]);

      await signOutToLocal();
      await settleLocalFileRecords();
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
      expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
      expect(await resolveFileUrl(record.fileId, "full")).toBe("blob:queued");
      await signInToCloud("user-a");
      await replayLocalQueue();
      expect(sdk.uploads).toHaveLength(1);
    }
  );

  it("keeps a claimed file stale when another tab deletes its record while this tab copies an earlier change of it", async () => {
    const record = await captureThenSignOutDuringUpload();
    await settleLocalFileRecords();
    let otherTab: Promise<unknown> | undefined;
    // This tab has read the renamed record when another tab, whose changes
    // this tab does not see, deletes it and marks the claimed file stale
    // under the queue's lock.
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      fileCalls.beforeQuery = null;
      return async (result: unknown) => {
        uninstall?.();
        uninstall = undefined;
        otherTab = withQueueLock(
          LOCAL_QUEUE,
          new AbortController().signal,
          async () => {
            await datafn.file.mutate({
              operation: "delete",
              id: record.id
            } as never);
            await writeLocalEntryFile(record.fileId, "stale");
          }
        );
        for (let turn = 0; turn < 200; turn++) {
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
        return result;
      };
    };

    await renamePhotoAndSettle(record.id);
    await otherTab;

    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeDefined();
    await signInToCloud("user-a");
    await replayLocalQueue();
    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(sdk.started).toHaveLength(1);
    expect(sdk.deletes).toEqual([]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
  });

  it("keeps a capture deleted in another tab while this tab copies its rename held when the sign-in aborts the copy's reread and the default sign-out follows", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    let reads = 0;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      if (++reads === 2) {
        // The sign-in aborts the reread of the copy this tab wrote.
        fileCalls.beforeQuery = null;
        await signInToCloud("user-a");
        return;
      }
      // Once this tab's pass read the renamed record, another tab deletes it,
      // recording and fencing the delete.
      return async (result: unknown) => {
        uninstall?.();
        uninstall = undefined;
        await datafn.file.mutate({
          operation: "delete",
          id: record.id
        } as never);
        const id = [namespace, record.id].map(encodeURIComponent);
        localStorage.setItem(
          `${LOCAL_QUEUE}-pending:${id.join(":")}`,
          "delete:t"
        );
        await writeLocalEntryFile(record.fileId, "deleted");
        return result;
      };
    };

    await renamePhotoToReceipt(record.id);
    await vi.waitFor(() =>
      expect(datafn.currentNamespace()).toBe("user:user-a")
    );
    await settleTasks();

    await signOutToLocal(true);
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("keeps a capture deleted in this tab while its rename's pass copies it held, when the delete's pending entry cannot be stored and the sign-in aborts the copy's reread", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key.includes("-pending:") && value.startsWith("delete:"))
        throw new DOMException("The storage is full", "QuotaExceededError");
      return setItem.call(this, key, value);
    });
    let reads = 0;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      if (++reads === 2) {
        // The sign-in aborts the reread of the copy the pass wrote.
        fileCalls.beforeQuery = null;
        await signInToCloud("user-a");
        return;
      }
      // Once the rename's pass read the renamed record, this tab deletes it,
      // and the delete's fence marks the capture deleted.
      return async (result: unknown) => {
        await datafn.file.mutate({
          operation: "delete",
          id: record.id
        } as never);
        await vi.waitFor(() =>
          expect(opfs.read(LOCAL_QUEUE, entry, "deleted")).toBeDefined()
        );
        return result;
      };
    };

    await renamePhotoToReceipt(record.id);
    await vi.waitFor(() =>
      expect(datafn.currentNamespace()).toBe("user:user-a")
    );
    await settleTasks();
    expect(reads).toBe(2);

    await signOutToLocal(true);
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("holds a capture renamed while the startup pass copies its old record when the rename's pending entry cannot be stored, the sign-in aborts that copy's reread and the rename's pass cannot take the queue's lock", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    const entry = `queued_${record.fileId}`;
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key.includes("-pending:"))
        throw new DOMException("The storage is full", "QuotaExceededError");
      return setItem.call(this, key, value);
    });
    let reads = 0;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      if (++reads === 2) {
        // The sign-in aborts the reread of the old copy the pass wrote.
        fileCalls.beforeQuery = null;
        await signInToCloud("user-a");
        return;
      }
      // Once the startup pass read the old record, the capture is renamed,
      // its fence marks it stale, and its own pass will miss the lock.
      return async (result: unknown) => {
        await renamePhotoToReceipt(record.id);
        await vi.waitFor(() =>
          expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeDefined()
        );
        for (let turn = 0; turn < 20; turn++)
          await new Promise<void>((resolve) => setImmediate(resolve));
        failQueueLockOnce(`nucleum-file-queue-replay:${LOCAL_QUEUE}`);
        return result;
      };
    };

    uninstall = installDeviceFileQueue();
    await vi.waitFor(() =>
      expect(datafn.currentNamespace()).toBe("user:user-a")
    );
    await replayLocalQueue();
    await settleTasks();

    expect(reads).toBe(2);
    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("holds a capture whose change was queued behind the namespace's startup reconcile when that reconcile cannot read its record", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // A change pass holds its read of the record while the namespace starts
    // again; a rename queues behind that start's full pass, and every later
    // read of the record fails, as when DataFn leaves the namespace.
    const gate = deferred<void>();
    let reads = 0;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      reads += 1;
      if (reads === 1) {
        return async (result: unknown) => {
          await gate.promise;
          return result;
        };
      }
      throw new DOMException("DataFn left the namespace", "AbortError");
    };
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, label: "Draft" }
    } as never);
    await vi.waitFor(() => expect(reads).toBe(1));
    uninstall();
    uninstall = installDeviceFileQueue();
    await renamePhotoToReceipt(record.id);
    gate.resolve();
    await settleLocalFileRecords();
    fileCalls.beforeQuery = null;

    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeDefined();
    await signInToCloud("user-a");
    await replayLocalQueue();
    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("holds a capture whose change pass the first sign-in aborted and publishes it once its guest namespace reconciles it again", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // The cloud sign-in moves DataFn to the account's namespace while the
    // change pass of a rename made just before it reads the record.
    await replayAfterSignInInterruptsRename(record.id);

    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeDefined();
    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();

    await signOutToLocal();
    await settleLocalFileRecords();
    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "receipt.png" })
      )
    );
    expect(sdk.uploads.map((upload) => upload.fileId)).toEqual([record.fileId]);
  });

  it("publishes the last copy of a capture held stale once a sign-out opened a new guest namespace", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await replayAfterSignInInterruptsRename(record.id);
    expect(sdk.started).toEqual([]);

    // The sign-out cleared the device's DataFn ID: the capture's guest
    // namespace never starts again, so the copy it holds is its last.
    await signOutToLocal(true);
    await settleLocalFileRecords();
    await signInToCloud("user-a");

    // The publish marks the capture uploaded once the record is saved.
    await vi.waitFor(async () => {
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "photo.png" })
      );
      expect(
        opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "uploaded")
      ).toBeDefined();
    });
    expect(sdk.uploads.map((upload) => upload.fileId)).toEqual([record.fileId]);
    expect(sdk.deletes).toEqual([]);
  });

  it("copies a change whose pass could not take the queue's lock on a later pass and publishes the new copy", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    failQueueLockOnce();
    await renamePhotoAndSettle(record.id);
    expect(readLocalCopy(record.fileId)?.name).toBe("photo.png");

    await vi.waitFor(
      () => expect(readLocalCopy(record.fileId)?.name).toBe("receipt.png"),
      { timeout: 5000 }
    );
    await settleLocalFileRecords();
    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "receipt.png" })
      )
    );
    expect(sdk.uploads.map((upload) => upload.fileId)).toEqual([record.fileId]);
  });

  /**
   * Captures a photo as a local-only user and makes a change to its record
   * whose pass the first cloud sign-in aborts as it reads the record.
   */
  async function captureThenChangeDuringSignIn(mutation: "rename" | "delete") {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      fileCalls.beforeQuery = null;
      await signInToCloud("user-a");
    };
    await datafn.file.mutate(
      (mutation === "delete"
        ? { operation: "delete", id: record.id }
        : {
            operation: "merge",
            id: record.id,
            record: { id: record.id, name: "receipt.png" }
          }) as never
    );
    await vi.waitFor(() =>
      expect(datafn.currentNamespace()).toBe("user:user-a")
    );
    await settleTasks();
    return record;
  }

  /** Reads a local file's stale mark, "deleted" when its deleted mark is set. */
  function readStaleMark(fileId: string) {
    if (opfs.read(LOCAL_QUEUE, `queued_${fileId}`, "deleted")) return "deleted";
    const bytes = opfs.read(LOCAL_QUEUE, `queued_${fileId}`, "stale");
    return bytes && new TextDecoder().decode(bytes);
  }

  it("keeps a stale capture held while another tab is still in its guest namespace, and publishes its last copy once that tab leaves", async () => {
    const record = await captureThenChangeDuringSignIn("rename");
    const leave = enterInOtherTab(`guest:${device.dapId}`);

    await signOutToLocal(true);
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.started).toEqual([]);
    expect(readStaleMark(record.fileId)).toBe("changed");

    leave();
    await replayLocalQueue();
    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "photo.png" })
      )
    );
  });

  it("publishes the last copy of a stale capture at a sign-in that follows the default sign-out with no guest namespace opened", async () => {
    const record = await captureThenChangeDuringSignIn("rename");
    expect(readStaleMark(record.fileId)).toBeDefined();

    // The default sign-out clears the device's storage and DataFn ID and
    // goes straight to the sign-in, which gives the device a new DataFn ID.
    endAccountUploadReplay();
    localStorage.clear();
    device = { ...device, dapId: `device-${crypto.randomUUID()}` };
    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "photo.png" })
      )
    );
    expect(sdk.uploads.map((upload) => upload.fileId)).toEqual([record.fileId]);
  });

  it("settles a claimed capture whose guest delete the sign-in aborted once its guest namespace retires", async () => {
    const record = await captureThenSignOutDuringUpload();
    await settleTasks();
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      fileCalls.beforeQuery = null;
      await signInToCloud("user-a");
    };
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await vi.waitFor(() =>
      expect(datafn.currentNamespace()).toBe("user:user-a")
    );
    await settleTasks();
    await replayLocalQueue();
    expect(readStaleMark(record.fileId)).toBe("deleted");
    expect(sdk.deletes).toEqual([]);

    await signOutToLocal(true);
    await settleLocalFileRecords();
    await signInToCloud("user-a");

    await vi.waitFor(() => expect(sdk.deletes).toEqual([record.fileId]));
    await vi.waitFor(() => expect(opfs.list(LOCAL_QUEUE)).toEqual([]));
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("deletes nothing at sign-in for an orphaned capture whose takeover by a guest record was interrupted", async () => {
    const record = await captureThenSignOutDuringUpload();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "orphaned")
    ).toBeDefined();
    // The takeover's fence cannot write its stale mark; its pass writes the
    // new copy, then the file system fails the orphaned mark's removal.
    failEntryFile("stale", true, 1);
    failEntryRemoval("orphaned");
    await datafn.file.mutate({
      operation: "insert",
      id: `${record.id}-copy`,
      record: { name: "copy.png", type: "image/png", fileId: record.fileId }
    } as never);
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    expect(readLocalCopy(record.fileId)?.name).toBe("copy.png");
    expect(opfs.read(LOCAL_QUEUE, entry, "orphaned")).toBeDefined();
    expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeDefined();

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.deletes).toEqual([]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
  });

  it("keeps an orphaned capture held once its guest namespace retires while a guest record's takeover of it is not copied yet", async () => {
    const record = await captureThenSignOutDuringUpload();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "orphaned")
    ).toBeDefined();
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { fileId?: string } };
      if (filters?.fileId !== record.fileId) return;
      fileCalls.beforeQuery = null;
      await signInToCloud("user-a");
    };
    await datafn.file.mutate({
      operation: "insert",
      id: `${record.id}-copy`,
      record: { name: "copy.png", type: "image/png", fileId: record.fileId }
    } as never);
    await vi.waitFor(() =>
      expect(datafn.currentNamespace()).toBe("user:user-a")
    );
    await settleTasks();
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeDefined();

    await signOutToLocal(true);
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.deletes).toEqual([]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
  });

  it("keeps an orphaned capture held once its guest namespace retires while a guest record's takeover of it is pending but neither fenced nor copied", async () => {
    const record = await captureThenSignOutDuringUpload();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    // The takeover's fence cannot write its stale mark, nor can its pass
    // take the queue's lock.
    failEntryFile("stale", true, 1);
    failQueueLockOnce();
    await datafn.file.mutate({
      operation: "insert",
      id: `${record.id}-copy`,
      record: { name: "copy.png", type: "image/png", fileId: record.fileId }
    } as never);
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeUndefined();

    await signOutToLocal(true);
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.deletes).toEqual([]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([entry]);
    expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeDefined();
  });

  it.each([
    ["an unclaimed", false],
    ["a claimed, stale", true]
  ])(
    "keeps the same marks of %s capture deleted in a guest namespace that retired, held, across replays and guest passes",
    async (_, isClaimed) => {
      const record = isClaimed
        ? await captureThenSignOutDuringUpload()
        : (await bootData(localAccount),
          (uninstall = installDeviceFileQueue()),
          await capturePhoto());
      await settleTasks();
      const entry = `queued_${record.fileId}`;
      // An earlier build's tab fences the claimed capture.
      if (isClaimed) await writeLocalEntryFile(record.fileId, "stale");
      // The delete's pass cannot take the queue's lock; its fence marks it.
      failQueueLockOnce();
      await datafn.file.mutate({ operation: "delete", id: record.id } as never);
      await settleLocalFileRecords();
      expect(opfs.read(LOCAL_QUEUE, entry, "deleted")).toBeDefined();
      await signOutToLocal(true);
      await settleLocalFileRecords();
      const marks = opfs.list(LOCAL_QUEUE, entry).sort();

      for (let run = 0; run < 3; run++) {
        await signInToCloud("user-a");
        await replayLocalQueue();
        await settleTasks();
        await signOutToLocal();
        await settleLocalFileRecords();
        expect(opfs.list(LOCAL_QUEUE, entry).sort()).toEqual(marks);
      }

      const [listed] = await listQueuedFiles(LOCAL_QUEUE, true);
      expect(listed?.isDeleted).toBe(true);
      expect(await readAnyRecord(record.id)).toBeUndefined();
    }
  );

  it("marks a capture deleted by an earlier build's tab with no generation no change names, when its pass cannot reconcile it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    // An earlier build's tab deletes the guest record and stores the delete
    // under the record's entry, with no generation.
    await datafn.file.mutate({
      operation: "delete",
      id: record.id,
      silent: true
    } as never);
    const key = [namespace, record.id].map(encodeURIComponent).join(":");
    localStorage.setItem(`${LOCAL_QUEUE}-pending:${key}`, "delete");
    fileCalls.beforeQuery = async () => {
      fileCalls.beforeQuery = null;
      throw new Error("The guest records cannot be read");
    };

    await openData();
    await settleLocalFileRecords();

    const entry = `queued_${record.fileId}`;
    const marks = opfs.list(LOCAL_QUEUE, entry);
    const deleted = marks.filter((name) => name.startsWith("deleted"));
    expect(deleted).toContain("deleted");
    expect(deleted).toHaveLength(2);
    expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(true);
  });

  it("deletes nothing and publishes the takeover when another tab's guest record takes over an orphaned capture while its settle writes the discard mark", async () => {
    const record = await captureThenSignOutDuringUpload();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    let isTakenOver = false;
    hookEntryFiles({
      create: async (name) => {
        if (name !== "discarded" || isTakenOver) return;
        isTakenOver = true;
        await changeInOtherTab(namespace, `${record.id}-copy`, record.fileId);
      }
    });
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    const entry = `queued_${record.fileId}`;
    expect(isTakenOver).toBe(true);
    expect(sdk.deletes).toEqual([]);
    expect(opfs.read(LOCAL_QUEUE, entry, "discarded")).toBeUndefined();

    // The guest record that took the file over is copied to it.
    await signOutToLocal();
    await datafn.file.mutate({
      operation: "insert",
      id: `${record.id}-copy`,
      record: { name: "copy.png", type: "image/png", fileId: record.fileId }
    } as never);
    await settleLocalFileRecords();
    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect(await savedRecord(`${record.id}-copy`)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "copy.png" })
      )
    );
    await settleTasks();
    expect(sdk.deletes).toEqual([]);
  });

  it("keeps an earlier settle's discard mark and sends no delete when another tab's guest record takes over the orphaned capture while a later settle writes it", async () => {
    const record = await captureThenSignOutDuringUpload();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    // An earlier settle marked the capture discarded, and may have sent its
    // delete, then stopped before its dequeue.
    await writeLocalEntryFile(record.fileId, "discarded");
    let isTakenOver = false;
    hookEntryFiles({
      create: async (name) => {
        if (name !== "discarded" || isTakenOver) return;
        isTakenOver = true;
        await changeInOtherTab(namespace, `${record.id}-copy`, record.fileId);
      }
    });
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    const entry = `queued_${record.fileId}`;
    expect(isTakenOver).toBe(true);
    expect(sdk.deletes).toEqual([]);
    expect(opfs.read(LOCAL_QUEUE, entry, "discarded")).toBeDefined();

    // The guest record that took the file over is copied to it.
    await signOutToLocal();
    await datafn.file.mutate({
      operation: "insert",
      id: `${record.id}-copy`,
      record: { name: "copy.png", type: "image/png", fileId: record.fileId }
    } as never);
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(await readAnyRecord(`${record.id}-copy`)).toBeUndefined();
    expect(sdk.started).toHaveLength(1);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([entry]);
  });

  /** Signs out, inserts a guest record of the file and signs in again. */
  async function takeOverInGuest(record: { id: string; fileId: string }) {
    await signOutToLocal();
    await datafn.file.mutate({
      operation: "insert",
      id: `${record.id}-copy`,
      record: { name: "copy.png", type: "image/png", fileId: record.fileId }
    } as never);
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect(await savedRecord(`${record.id}-copy`)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "copy.png" })
      )
    );
  }

  it("removes its discard mark and sends no delete when the recheck after the mark cannot read the orphaned capture while another tab's guest record takes it over, and publishes that record", async () => {
    const record = await captureThenSignOutDuringUpload();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    let isMarked = false;
    let isFailed = false;
    hookEntryFiles({
      create: (name) => {
        if (name === "discarded") isMarked = true;
      },
      lookup: async (name) => {
        if (!isMarked || isFailed || name !== entry) return;
        isFailed = true;
        await changeInOtherTab(namespace, `${record.id}-copy`, record.fileId);
        throw new DOMException("Unreadable", "NotReadableError");
      }
    });

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(isFailed).toBe(true);
    expect(sdk.deletes).toEqual([]);
    expect(opfs.read(LOCAL_QUEUE, entry, "discarded")).toBeUndefined();
    expect(opfs.list(LOCAL_QUEUE)).toEqual([entry]);

    await takeOverInGuest(record);
    goOnline();
    await settleTasks();
    expect(sdk.deletes).toEqual([]);
  });

  it("leaves no discard mark and sends no delete when the mark's file cannot be written while another tab's guest record takes the orphaned capture over, and publishes that record", async () => {
    const record = await captureThenSignOutDuringUpload();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    let isTakenOver = false;
    hookEntryFiles({
      create: async (name) => {
        if (name !== "discarded" || isTakenOver) return;
        isTakenOver = true;
        await changeInOtherTab(namespace, `${record.id}-copy`, record.fileId);
      }
    });
    failEntryWriteOnce("discarded");

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    const entry = `queued_${record.fileId}`;
    expect(isTakenOver).toBe(true);
    expect(sdk.deletes).toEqual([]);
    expect(opfs.read(LOCAL_QUEUE, entry, "discarded")).toBeUndefined();

    await takeOverInGuest(record);
    goOnline();
    await settleTasks();
    expect(sdk.deletes).toEqual([]);
  });

  it("keeps settling another guest namespace's orphaned capture after one whose rejected delete another tab's guest record takes over", async () => {
    const first = await captureThenSignOutDuringUpload();
    await datafn.file.mutate({ operation: "delete", id: first.id } as never);
    await settleLocalFileRecords();
    // A sign-out opens a new guest namespace, whose capture the account
    // claimed too before its record was deleted.
    await signOutToLocal(true);
    const records = [first, await capturePhoto()];
    await settleLocalFileRecords();
    const claim = opfs.read(
      LOCAL_QUEUE,
      `queued_${first.fileId}`,
      "claim.json"
    );
    await writeLocalEntryFile(
      records[1].fileId,
      "claim.json",
      new TextDecoder().decode(claim)
    );
    await datafn.file.mutate({
      operation: "delete",
      id: records[1].id
    } as never);
    await settleLocalFileRecords();
    const namespaces = records.map(
      ({ fileId }) => readLocalCopy(fileId)?.namespace
    );
    expect(new Set(namespaces).size).toBe(2);
    sdk.onDelete = async () => {
      sdk.onDelete = null;
      const index = records.findIndex(
        ({ fileId }) => fileId === sdk.deletes[0]
      );
      const copyId = `${records[index].id}-copy`;
      await changeInOtherTab(String(namespaces[index]), copyId, sdk.deletes[0]);
      throw new Error("The delete request failed");
    };

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    const [taken] = sdk.deletes;
    const other = records.find(({ fileId }) => fileId !== taken)?.fileId;
    expect(sdk.deletes).toEqual([taken, other]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${taken}`]);
  });

  it("records the delete of an orphaned capture whose settle finds the app offline and keeps the capture while a later check cannot read it", async () => {
    const record = await captureThenSignOutDuringUpload();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    // Offline mode starts as the settle marks the capture discarded; the
    // second read of its orphaned mark after that fails.
    let reads = -1;
    hookEntryFiles({
      create: (name) => {
        if (name !== "discarded" || reads >= 0) return;
        reads = 0;
        context.update((value) => ({ ...value, isInOfflineMode: true }));
      }
    });
    failEntryLookup("orphaned", () => reads >= 0 && ++reads === 2);

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(reads).toBeGreaterThanOrEqual(2);
    expect(sdk.deletes).toEqual([]);

    context.update((value) => ({ ...value, isInOfflineMode: false }));
    goOnline();
    await vi.waitFor(() => expect(sdk.deletes).toEqual([record.fileId]));
  });

  it("records no pending delete when another tab's guest record takes an orphaned capture over while its rejected delete is in flight", async () => {
    const record = await captureThenSignOutDuringUpload();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    sdk.onDelete = async () => {
      sdk.onDelete = null;
      await changeInOtherTab(namespace, `${record.id}-copy`, record.fileId);
      throw new Error("The delete request failed");
    };

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.onDelete).toBeNull();
    expect(sdk.deletes).toEqual([record.fileId]);

    goOnline();
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.deletes).toEqual([record.fileId]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
  });

  it("deletes nothing when another tab's guest record takes over an orphaned capture while its settle reads the account's records", async () => {
    const record = await captureThenSignOutDuringUpload();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { fileId?: string } };
      if (filters?.fileId !== record.fileId) return;
      if (datafn.currentNamespace() !== "user:user-a") return;
      fileCalls.beforeQuery = null;
      // The other tab, in the guest namespace, records and fences its insert.
      const id = [namespace, `${record.id}-copy`].map(encodeURIComponent);
      localStorage.setItem(
        `${LOCAL_QUEUE}-pending:${id.join(":")}`,
        "change:t"
      );
      await writeLocalEntryFile(record.fileId, "stale", "changed");
    };

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(fileCalls.beforeQuery).toBeNull();
    expect(sdk.deletes).toEqual([]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
  });

  it("never publishes an orphaned capture whose upload its settle deleted when a guest record takes it over before its dequeue", async () => {
    const record = await captureThenSignOutDuringUpload();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    sdk.onDelete = async () => {
      sdk.onDelete = null;
      // Another tab, in the guest namespace, records and fences its insert
      // while the delete is sent.
      const id = [namespace, `${record.id}-copy`].map(encodeURIComponent);
      localStorage.setItem(
        `${LOCAL_QUEUE}-pending:${id.join(":")}`,
        "change:t"
      );
      await writeLocalEntryFile(record.fileId, "stale", "changed");
    };
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.deletes).toEqual([record.fileId]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);

    // The guest record that took the file over is copied to it.
    await signOutToLocal();
    await datafn.file.mutate({
      operation: "insert",
      id: `${record.id}-copy`,
      record: { name: "copy.png", type: "image/png", fileId: record.fileId }
    } as never);
    await settleLocalFileRecords();
    expect(readLocalCopy(record.fileId)?.name).toBe("copy.png");
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(await readAnyRecord(`${record.id}-copy`)).toBeUndefined();
    expect(sdk.started).toHaveLength(1);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
  });

  it("keeps a capture whose guest delete the first sign-in aborted held after a sign-out that cleared the device's storage and DataFn ID", async () => {
    const record = await captureThenChangeDuringSignIn("delete");
    expect(readStaleMark(record.fileId)).toBe("deleted");

    await signOutToLocal(true);
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(readStaleMark(record.fileId)).toBe("deleted");
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
  });

  it("publishes the last copy of a stale capture once the retry of a new guest namespace's failed startup pass releases it", async () => {
    const record = await captureThenChangeDuringSignIn("rename");
    failQueueLockOnce();

    await signOutToLocal(true);
    await settleLocalFileRecords();
    expect(readStaleMark(record.fileId)).toBe("changed");
    await vi.waitFor(
      () => expect(readStaleMark(record.fileId)).toBeUndefined(),
      { timeout: 5000 }
    );
    await settleLocalFileRecords();
    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "photo.png" })
      )
    );
  });

  it("publishes the current copies of a guest namespace whose startup pass failed when the sign-in comes before its retry", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const first = await capturePhoto();
    const second = await capturePhoto();
    await settleLocalFileRecords();
    failQueueLockOnce();
    uninstall();
    uninstall = installDeviceFileQueue();
    await settleLocalFileRecords();

    await signInToCloud("user-a");

    await vi.waitFor(async () => {
      expect((await savedRecord(first.id))?.fileId).toBe(first.fileId);
      expect((await savedRecord(second.id))?.fileId).toBe(second.fileId);
    });
  });

  it("copies a guest change whose pending entry and stale mark another tab cleared before this tab's pass took the queue's lock", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // Another tab, signing out to a new guest namespace, holds the queue's
    // lock while this tab renames; its sign-out clears local storage and its
    // full pass releases this tab's stale mark.
    const gate = deferred<void>();
    const otherTab = withQueueLock(
      LOCAL_QUEUE,
      new AbortController().signal,
      async () => {
        await gate.promise;
        localStorage.clear();
        const root = await opfs.getDirectory();
        const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
        const entry = await queue.getDirectoryHandle(`queued_${record.fileId}`);
        await entry.removeEntry("stale");
      }
    );
    await renamePhotoToReceipt(record.id);
    await vi.waitFor(() =>
      expect(readStaleMark(record.fileId)).toBe("changed")
    );
    gate.resolve();
    await otherTab;
    await settleLocalFileRecords();

    expect(readLocalCopy(record.fileId)?.name).toBe("receipt.png");
    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "receipt.png" })
      )
    );
  });

  it("keeps an orphaned capture whose file a new guest record took over and publishes that record at the claiming account", async () => {
    const record = await captureThenSignOutDuringUpload();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "orphaned")
    ).toBeDefined();
    const replacementId = `${record.id}-copy`;
    await datafn.file.mutate({
      operation: "insert",
      id: replacementId,
      record: { name: "copy.png", type: "image/png", fileId: record.fileId }
    } as never);
    await settleLocalFileRecords();

    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect(await savedRecord(replacementId)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "copy.png" })
      )
    );
    expect(sdk.deletes).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("keeps an orphaned capture's upload when another tab publishes a record of it while this tab's settle waits for the queue's lock", async () => {
    const record = await captureThenSignOutDuringUpload();
    const copy = readLocalCopy(record.fileId)!;
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    // Another tab, which read the capture's record copy before the delete,
    // holds the queue's lock to publish it.
    const gate = deferred<void>();
    const otherTab = withQueueLock(
      LOCAL_QUEUE,
      new AbortController().signal,
      async () => {
        await gate.promise;
        const { namespace, isTrashed, isArchived, ...fields } = copy;
        void [namespace, isTrashed, isArchived];
        await datafn.file.mutate({
          operation: "insert",
          id: record.id,
          record: fields
        } as never);
      }
    );

    await signInToCloud("user-a");
    const settling = replayLocalQueue();
    await settleTasks();
    gate.resolve();
    await otherTab;
    await settling;
    await settleTasks();

    expect(sdk.deletes).toEqual([]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
  });

  it("keeps a change whose pass could not list the local files and publishes no outdated copy of it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // The change's stale mark (written without the queue's lock) cannot list
    // the files either, so it marks nothing until the pass fails.
    const busy = new DOMException(
      "The file system is busy",
      "NotReadableError"
    );
    vi.spyOn(OPFSStore.prototype, "listPendingUploads")
      .mockRejectedValueOnce(busy)
      .mockRejectedValueOnce(busy);
    await renamePhotoAndSettle(record.id);

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();

    await signOutToLocal();
    await settleLocalFileRecords();
    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "receipt.png" })
      )
    );
  });

  it("keeps a change whose local file's record copy cannot be read during its pass and publishes no outdated copy of it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // The change's stale mark lists the files leniently first, then the pass.
    failEntryFile("record.json", false, 2);
    await renamePhotoAndSettle(record.id);

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();

    await signOutToLocal();
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "receipt.png" })
      )
    );
  });

  it("keeps a change pending when its record cannot be read and its local file cannot be marked stale", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    fileCalls.beforeQuery = async () => {
      fileCalls.beforeQuery = null;
      throw new DOMException("The records are busy", "NotReadableError");
    };
    // Stale marks fail for the change, its pass and the change put back.
    failEntryFile("stale", true, 3);
    await renamePhotoAndSettle(record.id);
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeUndefined();

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();

    await signOutToLocal();
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "receipt.png" })
      )
    );
  });

  it("publishes the current copy of a capture whose change's stale mark lands after a pass already copied that change", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    // The namespace's startup pass waits for another tab's lock.
    const held = deferred<void>();
    onTestFinished(() => held.resolve());
    const otherTab = withQueueLock(
      LOCAL_QUEUE,
      new AbortController().signal,
      () => held.promise
    );
    uninstall = installDeviceFileQueue();
    for (let turn = 0; turn < 50; turn++)
      await new Promise<void>((resolve) => setImmediate(resolve));
    // The rename's fence reads no stale mark, and its write lands late.
    const landed = deferred<void>();
    const getDirectory = navigator.storage.getDirectory;
    const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
      new Proxy(dir, {
        get(target, key) {
          if (key === "getDirectoryHandle")
            return async (name: string, options?: { create?: boolean }) =>
              wrap(await target.getDirectoryHandle(name, options));
          if (key !== "getFileHandle") return Reflect.get(target, key);
          return async (name: string, options?: { create?: boolean }) => {
            if (name === "stale" && options?.create) await landed.promise;
            return target.getFileHandle(name, options);
          };
        }
      });
    navigator.storage.getDirectory = async () => wrap(await getDirectory());

    await renamePhotoToReceipt(record.id);
    held.resolve();
    await otherTab;
    await vi.waitFor(() =>
      expect(readLocalCopy(record.fileId)?.name).toBe("receipt.png")
    );
    await vi.waitFor(() =>
      expect(
        Object.keys(localStorage).filter((key) => key.includes("-pending:"))
      ).toEqual([])
    );
    landed.resolve();
    await settleTasks();

    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "receipt.png" })
      )
    );
  });

  it("publishes a capture whose first rename's pending entry could not be stored once the pass copies a second rename", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // Both renames come while another tab holds the queue's lock; local
    // storage refuses the first one's pending entry.
    const held = deferred<void>();
    onTestFinished(() => held.resolve());
    const otherTab = withQueueLock(
      LOCAL_QUEUE,
      new AbortController().signal,
      () => held.promise
    );
    const setItem = Storage.prototype.setItem;
    let isRefused = false;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (isRefused || !key.includes("-pending:"))
        return setItem.call(this, key, value);
      isRefused = true;
      throw new DOMException("The storage is full", "QuotaExceededError");
    });
    for (const name of ["receipt.png", "invoice.png"])
      await datafn.file.mutate({
        operation: "merge",
        id: record.id,
        record: { id: record.id, name }
      } as never);
    held.resolve();
    await otherTab;
    await settleTasks();
    expect(isRefused).toBe(true);
    expect(readLocalCopy(record.fileId)?.name).toBe("invoice.png");

    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "invoice.png" })
      )
    );
  });

  it.each([
    ["writes the record copy it read before the rename", "photo.png"],
    ["copies the rename", "receipt.png"]
  ])(
    "keeps a capture whose rename's pending entry could not be stored held at a sign-in before its pass's retry when another tab's pass %s and clears its stale mark",
    async (_case, otherTabName) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      const control = await capturePhoto();
      await settleLocalFileRecords();
      const setItem = Storage.prototype.setItem;
      let isRefused = false;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
        this: Storage,
        key: string,
        value: string
      ) {
        if (isRefused || !key.includes("-pending:"))
          return setItem.call(this, key, value);
        isRefused = true;
        throw new DOMException("The storage is full", "QuotaExceededError");
      });
      failQueueLockOnce();
      await renamePhotoAndSettle(record.id);
      expect(isRefused).toBe(true);
      expect(readLocalCopy(record.fileId)?.name).toBe("photo.png");
      expect(
        opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
      ).toBeDefined();
      // Another tab's pass, which cannot see this page's change, writes its
      // copy (clearing the stale mark) and then fails its reread.
      await writeQueuedFileRecord(LOCAL_QUEUE, record.fileId, {
        ...readLocalCopy(record.fileId),
        name: otherTabName
      } as never);
      expect(
        opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
      ).toBeUndefined();

      await signInToCloud("user-a");
      await vi.waitFor(async () =>
        expect(await savedRecord(control.id)).toBeDefined()
      );
      await settleTasks();
      expect(await savedRecord(record.id)).toBeUndefined();
      expect(sdk.started.map((input) => input.fileId)).not.toContain(
        record.fileId
      );
    }
  );

  it("publishes the current copy of a capture whose change's fence fails after a pass already copied that change", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    // The namespace's startup pass waits for another tab's lock.
    const held = deferred<void>();
    onTestFinished(() => held.resolve());
    const otherTab = withQueueLock(
      LOCAL_QUEUE,
      new AbortController().signal,
      () => held.promise
    );
    uninstall = installDeviceFileQueue();
    for (let turn = 0; turn < 50; turn++)
      await new Promise<void>((resolve) => setImmediate(resolve));
    // The rename's fence fails its stale mark once the pass copied it.
    const copied = deferred<void>();
    let isFenceFailed = false;
    hookEntryFiles({
      create: async (name) => {
        if (name !== "stale" || isFenceFailed) return;
        isFenceFailed = true;
        await copied.promise;
        throw new DOMException("Unreadable", "NotReadableError");
      }
    });

    await renamePhotoToReceipt(record.id);
    held.resolve();
    await otherTab;
    await vi.waitFor(() =>
      expect(readLocalCopy(record.fileId)?.name).toBe("receipt.png")
    );
    await vi.waitFor(() =>
      expect(
        Object.keys(localStorage).filter((key) => key.includes("-pending:"))
      ).toEqual([])
    );
    copied.resolve();
    await settleTasks();
    expect(isFenceFailed).toBe(true);
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeUndefined();

    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "receipt.png" })
      )
    );
  });

  it("keeps a change pending when its local file's entry cannot be opened to clear its stale mark, and copies it on the pass's retry", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // Once the pass writes the new copy, opening the file's entry fails once.
    const entry = `queued_${record.fileId}`;
    let isWritten = false;
    let isFailed = false;
    hookEntryFiles({
      create: (name) => {
        if (name === "record.json") isWritten = true;
      },
      lookup: (name) => {
        if (!isWritten || isFailed || name !== entry) return;
        isFailed = true;
        throw new DOMException("The file system is busy", "NotReadableError");
      }
    });
    await renamePhotoAndSettle(record.id);

    expect(isFailed).toBe(true);
    expect(readLocalCopy(record.fileId)?.name).toBe("receipt.png");
    expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeDefined();
    expect(
      Object.keys(localStorage).filter((key) => key.includes("-pending:"))
    ).toHaveLength(1);
    await vi.waitFor(
      () => expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeUndefined(),
      { timeout: 3_000 }
    );
  });

  it("marks a changed capture stale at once while another tab's replay holds the queue's lock, then copies the change", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    const held = deferred<void>();
    onTestFinished(() => held.resolve());
    const otherTab = withQueueLock(
      LOCAL_QUEUE,
      new AbortController().signal,
      () => held.promise
    );

    await renamePhotoToReceipt(record.id);

    await vi.waitFor(() =>
      expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeDefined()
    );
    expect(readLocalCopy(record.fileId)?.name).toBe("photo.png");
    held.resolve();
    await otherTab;
    await settleLocalFileRecords();
    expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeUndefined();
    expect(readLocalCopy(record.fileId)?.name).toBe("receipt.png");
  });

  it.each([
    ["pulls the account's records", "pull"],
    ["saves the record", "save"]
  ])(
    "marks nothing uploaded over a guest change another tab fences while the replay %s",
    async (_, step) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      // A guest tab renames the record and, without the queue's lock this
      // replay holds, marks its local file stale.
      const fence = () => writeLocalEntryFile(record.fileId, "stale");
      if (step === "pull") {
        fileCalls.onPull = async () => {
          if (!sdk.uploads.length) return;
          fileCalls.onPull = null;
          await fence();
        };
      } else {
        fileCalls.beforeMutate = async (args) => {
          const [first] = Array.isArray(args) ? args : [args];
          if ((first as { id?: string })?.id !== record.id) return;
          fileCalls.beforeMutate = null;
          await fence();
        };
      }

      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();

      expect(sdk.uploads.length).toBeGreaterThan(0);
      const entry = `queued_${record.fileId}`;
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeUndefined();
      expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeDefined();
      expect(opfs.list(LOCAL_QUEUE)).toEqual([entry]);
      if (step === "pull") {
        expect(await readAnyRecord(record.id)).toBeUndefined();
      }
    }
  );

  /**
   * Signs user-a in while another tab fences the capture just before this
   * tab's publish saves its record, so the account holds the copy the change
   * superseded, then signs out to the same guest namespace.
   */
  async function publishOutdatedThenSignOut(record: {
    id: string;
    fileId: string;
  }) {
    fileCalls.beforeMutate = async (args) => {
      const [first] = Array.isArray(args) ? args : [args];
      if ((first as { id?: string })?.id !== record.id) return;
      fileCalls.beforeMutate = null;
      await writeLocalEntryFile(record.fileId, "stale");
    };
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    const entry = `queued_${record.fileId}`;
    expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeUndefined();
    expect((await readAnyRecord(record.id))?.fileId).toBe(record.fileId);
  }

  it.each<[string, string | undefined, { name?: string; trashed?: boolean }]>([
    ["a rename", undefined, { name: "receipt.png" }],
    ["a trash", undefined, { trashed: true }],
    ["an untrash", "trash", { trashed: false }]
  ])(
    "brings the record an outdated save published up to %s fenced during that save at the next replay, then marks it uploaded",
    async (_, initial, expected) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      if (initial) {
        await datafn.file.mutate({
          operation: initial,
          id: record.id
        } as never);
      }
      await settleLocalFileRecords();
      await publishOutdatedThenSignOut(record);
      await signOutToLocal();
      await settleTasks();
      const change =
        expected.name !== undefined
          ? {
              operation: "merge",
              id: record.id,
              record: { id: record.id, name: expected.name }
            }
          : {
              operation: expected.trashed ? "trash" : "restore",
              id: record.id
            };
      await datafn.file.mutate(change as never);
      await settleTasks();

      await signInToCloud("user-a");
      const entry = `queued_${record.fileId}`;
      await vi.waitFor(() =>
        expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
      );
      const published = await readAnyRecord(record.id);
      expect(published?.fileId).toBe(record.fileId);
      if (expected.name !== undefined) {
        expect(published?.name).toBe(expected.name);
      } else {
        expect((published?.trashedAt ?? null) !== null).toBe(expected.trashed);
      }
    }
  );

  it.each<[string, "stale" | "pending", { name?: string; trashed?: boolean }]>([
    ["a rename it fences", "stale", { name: "receipt.png" }],
    ["a trash it fences", "stale", { trashed: true }],
    ["a rename it only records pending", "pending", { name: "receipt.png" }]
  ])(
    "withdraws the uploaded mark a publish writes after its last check once another tab makes %s, and publishes the newer copy at the next replay",
    async (_, hold, expected) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      const namespace = String(readLocalCopy(record.fileId)?.namespace);
      const entry = `queued_${record.fileId}`;
      const key = [namespace, record.id].map(encodeURIComponent).join(":");
      const pendingKey = `${LOCAL_QUEUE}-pending:${key}`;
      // A guest tab changes the record after the publish saved it and found
      // its copy current, just before it marks the file uploaded.
      let isChanged = false;
      hookEntryFiles({
        create: async (name) => {
          if (name !== "uploaded" || isChanged) return;
          isChanged = true;
          if (hold === "stale")
            await writeLocalEntryFile(record.fileId, "stale");
          // Its fence has not landed yet: only its pending change holds.
          else localStorage.setItem(pendingKey, "change:t");
        }
      });

      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();
      expect(isChanged).toBe(true);
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeUndefined();
      if (hold === "stale")
        expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeDefined();
      expect((await readAnyRecord(record.id))?.name).toBe("photo.png");

      await signOutToLocal();
      await settleTasks();
      await datafn.file.mutate(
        (expected.name !== undefined
          ? {
              operation: "merge",
              id: record.id,
              record: { id: record.id, name: expected.name }
            }
          : { operation: "trash", id: record.id }) as never
      );
      await settleTasks();
      await signInToCloud("user-a");
      await vi.waitFor(() =>
        expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
      );
      const published = await readAnyRecord(record.id);
      expect(published?.fileId).toBe(record.fileId);
      if (expected.name !== undefined) {
        expect(published?.name).toBe(expected.name);
      } else {
        expect((published?.trashedAt ?? null) !== null).toBe(true);
      }
    }
  );

  it.each<[string, "removal" | "lookup"]>([
    ["whose removal fails", "removal"],
    ["after a reread and an entry lookup that fail", "lookup"]
  ])(
    "keeps a withdrawal of the uploaded mark a publish wrote after its last check %s for the next replay, which publishes the newer copy another tab renamed",
    async (_, failure) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      const entry = `queued_${record.fileId}`;
      let isChanged = false;
      let lookups = 0;
      hookEntryFiles({
        create: async (name) => {
          if (name !== "uploaded" || isChanged) return;
          isChanged = true;
          await writeLocalEntryFile(record.fileId, "stale");
          if (failure === "lookup") lookups = 2;
        },
        lookup: (name) => {
          if (name !== entry || lookups <= 0) return;
          lookups -= 1;
          throw new DOMException("Unreadable", "NotReadableError");
        }
      });
      if (failure === "removal") failEntryRemoval("uploaded", 1);

      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();
      expect(isChanged).toBe(true);
      expect((await readAnyRecord(record.id))?.name).toBe("photo.png");

      await signOutToLocal();
      await settleTasks();
      await datafn.file.mutate({
        operation: "merge",
        id: record.id,
        record: { id: record.id, name: "receipt.png" }
      } as never);
      await settleTasks();
      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();

      expect((await readAnyRecord(record.id))?.name).toBe("receipt.png");
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined();
      expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain("publishing");
    }
  );

  it.each([
    ["a reread", false],
    ["a reread that fails once", true]
  ])(
    "keeps the upload of a publish whose reread verified its copy when the removal of its publishing mark fails, and uploads nothing again at the next replay's verification by %s",
    async (_, isRereadFailing) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      const entry = `queued_${record.fileId}`;
      let isFailed = false;
      let isRemovalFailing = true;
      let isArmed = false;
      let isRereading = false;
      let withdrawals = 0;
      const getDirectory = navigator.storage.getDirectory;
      const wrap = (
        dir: FileSystemDirectoryHandle
      ): FileSystemDirectoryHandle =>
        new Proxy(dir, {
          get(target, key) {
            if (key === "getDirectoryHandle")
              return async (name: string, options?: { create?: boolean }) =>
                wrap(await target.getDirectoryHandle(name, options));
            if (key === "getFileHandle")
              return async (name: string, options?: { create?: boolean }) => {
                if (name === "publishing" && isArmed) {
                  isArmed = false;
                  isRereading = true;
                } else if (
                  name === "record.json" &&
                  isRereading &&
                  !options?.create
                ) {
                  isRereading = false;
                  throw new DOMException("Unreadable", "NotReadableError");
                }
                return target.getFileHandle(name, options);
              };
            if (key !== "removeEntry") return Reflect.get(target, key);
            return async (name: string) => {
              if (name === "uploaded" && isFailed) withdrawals += 1;
              if (name === "publishing" && isRemovalFailing) {
                isFailed = true;
                throw new DOMException(
                  "The file system is busy",
                  "NotReadableError"
                );
              }
              return target.removeEntry(name);
            };
          }
        });
      navigator.storage.getDirectory = async () => wrap(await getDirectory());

      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();
      const started = sdk.started.length;
      expect(opfs.list(LOCAL_QUEUE, entry)).toContain("publishing");
      isRemovalFailing = false;
      isArmed = isRereadFailing;
      await replayLocalQueue();
      await settleTasks();
      await replayLocalQueue();
      await settleTasks();

      expect(isFailed).toBe(true);
      expect(isArmed || isRereading).toBe(false);
      expect(withdrawals).toBe(0);
      expect(sdk.started).toHaveLength(started);
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined();
      expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain("publishing");
      expect((await readAnyRecord(record.id))?.fileId).toBe(record.fileId);
    }
  );

  it.each([
    ["a whole backup", true],
    ["a backup of the queue's changes", false]
  ])(
    "leaves out of %s the uploaded mark a publish left unverified, so its restore publishes the capture again",
    async (_, isWhole) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      await writeLocalEntryFile(record.fileId, "uploaded", "version-1");
      await writeLocalEntryFile(record.fileId, "sent-thumbnail");
      await writeLocalEntryFile(record.fileId, "publishing", "{}");

      const { files } = await exportQueuedFiles(
        LOCAL_QUEUE,
        async () => null,
        isWhole
      );

      expect(files.map((copy) => copy.fileId)).toEqual([record.fileId]);
      const names = (files[0]?.marks ?? []).map((mark) => mark.name);
      expect(names).not.toContain("uploaded");
    }
  );

  it("keeps an account-side edit made after an outdated save over the guest change fenced during it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await publishOutdatedThenSignOut(record);
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "account.png" }
    } as never);
    await signOutToLocal();
    await settleTasks();
    await renamePhotoToReceipt(record.id);
    await settleTasks();

    await signInToCloud("user-a");
    const entry = `queued_${record.fileId}`;
    await vi.waitFor(() =>
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
    );
    expect((await readAnyRecord(record.id))?.name).toBe("account.png");
  });

  it.each([
    ["a restore", "trash", "restore"],
    ["an unarchive", "archive", "unarchive"]
  ])(
    "keeps %s the account made after an outdated save over the guest's later rename",
    async (_, initial, accountChange) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await datafn.file.mutate({ operation: initial, id: record.id } as never);
      await settleLocalFileRecords();
      await publishOutdatedThenSignOut(record);
      await datafn.file.mutate({
        operation: accountChange,
        id: record.id
      } as never);
      await signOutToLocal();
      await settleTasks();
      await renamePhotoToReceipt(record.id);
      await settleTasks();

      await signInToCloud("user-a");
      const entry = `queued_${record.fileId}`;
      await vi.waitFor(() =>
        expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
      );
      const published = await readAnyRecord(record.id);
      expect(published?.name).toBe("photo.png");
      expect(published?.trashedAt ?? null).toBeNull();
      expect(published?.isArchived === true).toBe(false);
    }
  );

  it("publishes no record the account deleted after its save was confirmed, and marks the capture uploaded", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await publishOutdatedThenSignOut(record);
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await signOutToLocal();
    await settleTasks();
    await renamePhotoToReceipt(record.id);
    await settleTasks();

    await signInToCloud("user-a");
    const entry = `queued_${record.fileId}`;
    await vi.waitFor(() =>
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
    );
    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(opfs.list(LOCAL_QUEUE)).toEqual([entry]);
  });

  it("publishes the record that took over a capture's file after an earlier record's save was confirmed", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await publishOutdatedThenSignOut(record);
    await signOutToLocal();
    await settleTasks();
    const copy = crypto.randomUUID();
    await datafn.file.mutate([
      {
        operation: "insert",
        id: copy,
        record: { name: "copy.png", type: "image/png", fileId: record.fileId }
      },
      { operation: "delete", id: record.id }
    ] as never);
    await settleTasks();

    await signInToCloud("user-a");
    const entry = `queued_${record.fileId}`;
    await vi.waitFor(() =>
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
    );
    expect((await readAnyRecord(copy))?.fileId).toBe(record.fileId);
  });

  it("inserts the record on a later replay when the first save was rejected", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    let isRejected = false;
    fileCalls.beforeMutate = async (args) => {
      const [first] = Array.isArray(args) ? args : [args];
      if ((first as { id?: string })?.id !== record.id) return;
      fileCalls.beforeMutate = null;
      isRejected = true;
      throw new Error("The save failed");
    };

    await signInToCloud("user-a");
    await vi.waitFor(() => expect(isRejected).toBe(true));
    await settleTasks();
    await replayLocalQueue();

    await vi.waitFor(() =>
      expect(
        opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "uploaded")
      ).toBeDefined()
    );
    expect((await readAnyRecord(record.id))?.fileId).toBe(record.fileId);
  });

  it("publishes nothing when another tab fences a capture while the publish records what it is about to save", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // Another tab deletes the guest record and fences its local file just as
    // this tab's publish writes the states its save can leave.
    const getDirectory = navigator.storage.getDirectory;
    let isFenced = false;
    const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
      new Proxy(dir, {
        get(target, key) {
          if (key === "getDirectoryHandle") {
            return async (name: string, options?: { create?: boolean }) =>
              wrap(await target.getDirectoryHandle(name, options));
          }
          if (key !== "getFileHandle") return Reflect.get(target, key);
          return async (name: string, options?: { create?: boolean }) => {
            if (name === "saved" && options?.create && !isFenced) {
              isFenced = true;
              await writeLocalEntryFile(record.fileId, "stale");
            }
            return target.getFileHandle(name, options);
          };
        }
      });
    navigator.storage.getDirectory = async () =>
      wrap(await opfs.getDirectory());

    try {
      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();
    } finally {
      navigator.storage.getDirectory = getDirectory;
    }

    expect(isFenced).toBe(true);
    const entry = `queued_${record.fileId}`;
    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeUndefined();
    expect(opfs.list(LOCAL_QUEUE)).toEqual([entry]);
  });

  it("drops a capture whose guest record another tab deletes during its save, keeping the account record that save published and the upload it references", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await publishOutdatedThenSignOut(record);
    await signOutToLocal();
    await settleTasks();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleTasks();

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
    expect(sdk.deletes).toEqual([]);
    expect((await readAnyRecord(record.id))?.fileId).toBe(record.fileId);
  });

  it.each([
    ["renames", "rename"],
    ["trashes", "trash"]
  ])(
    "leaves no outdated record in the account and no held capture when another tab %s the guest record during its publish",
    async (_, change) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      const namespace = String(readLocalCopy(record.fileId)?.namespace);
      const entry = `queued_${record.fileId}`;
      // Another tab commits its change while this tab saves the record, and
      // records and fences it just after that save.
      fileCalls.beforeMutate = async (args) => {
        const [first] = Array.isArray(args) ? args : [args];
        if ((first as { id?: string })?.id !== record.id) return;
        fileCalls.beforeMutate = null;
        return async (result) => {
          const id = [namespace, record.id].map(encodeURIComponent);
          localStorage.setItem(
            `${LOCAL_QUEUE}-pending:${id.join(":")}`,
            "change:t"
          );
          await writeLocalEntryFile(record.fileId, "stale", "changed");
          return result;
        };
      };
      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeUndefined();
      expect((await readAnyRecord(record.id))?.name).toBe("photo.png");

      // The change is in the guest namespace this tab opens next, before
      // its pass takes the queue's lock.
      const gate = deferred<void>();
      const otherTab = withQueueLock(
        LOCAL_QUEUE,
        new AbortController().signal,
        () => gate.promise
      );
      await signOutToLocal();
      await datafn.file.mutate(
        (change === "trash"
          ? { operation: "trash", id: record.id }
          : {
              operation: "merge",
              id: record.id,
              record: { id: record.id, name: "receipt.png" }
            }) as never
      );
      gate.resolve();
      await otherTab;
      await settleTasks();

      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();

      const published = await readAnyRecord(record.id);
      if (change === "trash")
        expect(published?.trashedAt ?? null).not.toBeNull();
      else expect(published?.name).toBe("receipt.png");
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined();
    }
  );

  it("keeps a guest change another tab records while a full pass removes the changes it copied, and copies it on the next pass", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const other = await capturePhoto();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // The rename's own pass cannot take the queue's lock, so the full pass
    // of the namespace opening again copies it.
    failQueueLockOnce();
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "first.png" }
    } as never);
    await settleLocalFileRecords();
    expect(readLocalCopy(record.fileId)?.name).toBe("photo.png");

    // After that pass rereads the record, another tab renames it again and
    // records its change (as this build records one: shown by this tab's
    // rename of another record) just before the pass removes the rename it
    // copied; that tab reloads before its fence lands.
    const setItem = Storage.prototype.setItem;
    const removeItem = Storage.prototype.removeItem;
    let written: [string, string] | undefined;
    let recorded: [string, string] | undefined;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (key.includes("-write:")) written ??= [key, value];
      return setItem.call(this, key, value);
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(function (
      this: Storage,
      key: string
    ) {
      if (recorded && key.includes(encodeURIComponent(record.id))) {
        setItem.call(this, ...recorded);
        recorded = undefined;
      }
      return removeItem.call(this, key);
    });
    let reads = 0;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id || ++reads < 2) return;
      fileCalls.beforeQuery = null;
      return async (result) => {
        await datafn.file.mutate({
          operation: "merge",
          id: record.id,
          record: { id: record.id, name: "second.png" },
          silent: true
        } as never);
        await datafn.file.mutate({
          operation: "merge",
          id: other.id,
          record: { id: other.id, name: "other.png" }
        } as never);
        const [key, value] = written ?? ["", ""];
        const id = encodeURIComponent(other.id);
        recorded = [key.replace(id, encodeURIComponent(record.id)), value];
        return result;
      };
    };

    await openData();
    await vi.waitFor(async () => {
      await settleLocalFileRecords();
      expect(readLocalCopy(other.fileId)?.name).toBe("other.png");
    });
    await settleTasks();

    expect(reads).toBe(2);
    expect(recorded).toBeUndefined();
    expect(readLocalCopy(record.fileId)?.name).toBe("second.png");
  });

  it("keeps a capture held when another tab fences a later change after a pass verified the copy and before it clears the marks", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // Just after this tab's pass verifies its copy of the rename, another
    // tab renames the record again (its pending entry only in its memory)
    // and fences it; the pass ends with its clear.
    const generation = `${Date.now() + 60_000}-00000000-0000-4000-8000-000000000001`;
    let reads = 0;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id || ++reads < 2) return;
      fileCalls.beforeQuery = null;
      return async (result) => {
        await datafn.file.mutate({
          operation: "merge",
          id: record.id,
          record: { id: record.id, name: "other.png" },
          silent: true
        } as never);
        await writeLocalEntryFile(record.fileId, "stale", "changed");
        await writeLocalEntryFile(record.fileId, `stale.${generation}`);
        return result;
      };
    };
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();
    expect(reads).toBe(2);
    expect(readLocalCopy(record.fileId)?.name).toBe("receipt.png");
    const entry = `queued_${record.fileId}`;
    expect(opfs.read(LOCAL_QUEUE, entry, `stale.${generation}`)).toBeDefined();

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("releases a capture held in this tab once another tab's copy covers its change's generation, and not before", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // This tab renames the record while another tab holds the queue's lock;
    // its pending entry cannot be stored, and its pass runs only once the
    // sign-in left the guest namespace.
    const gate = deferred<void>();
    const lockedTab = withQueueLock(
      LOCAL_QUEUE,
      new AbortController().signal,
      () => gate.promise
    );
    const setItem = Storage.prototype.setItem;
    let isRefused = false;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (isRefused || !key.includes("-pending:"))
        return setItem.call(this, key, value);
      isRefused = true;
      throw new DOMException("The storage is full", "QuotaExceededError");
    });
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await vi.waitFor(() =>
      expect(
        opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
      ).toBeDefined()
    );
    expect(isRefused).toBe(true);
    // The change's generation, as its fence's mark names it.
    const generation =
      opfs
        .list(LOCAL_QUEUE, `queued_${record.fileId}`)
        .find((name) => name.startsWith("stale."))
        ?.slice("stale.".length) ?? "";
    expect(generation).not.toBe("");
    await signInToCloud("user-a");
    gate.resolve();
    await lockedTab;
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.started).toEqual([]);

    // Another tab, in the guest namespace, copies the record under the
    // queue's lock and removes the change it read.
    const copyInOtherTab = (covered?: string[]) =>
      withQueueLock(LOCAL_QUEUE, new AbortController().signal, async () => {
        const copy = { ...readLocalCopy(record.fileId), name: "receipt.png" };
        // It lists only the plain mark before its reread (as between a
        // fence's two marks): the rest of its cover is what it read.
        const cover = covered && { covered, listed: ["stale"] };
        await writeQueuedFileRecord(
          LOCAL_QUEUE,
          record.fileId,
          copy as never,
          cover
        );
        for (const key of Object.keys(localStorage))
          if (/-(pending|write):/.test(key)) localStorage.removeItem(key);
      });
    // A copy its pass has not verified, then one verified to cover another
    // generation only, hold it still.
    const other = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    for (const covered of [undefined, [other]]) {
      await copyInOtherTab(covered);
      await replayLocalQueue();
      await settleTasks();
      expect(sdk.started).toEqual([]);
      expect(await readAnyRecord(record.id)).toBeUndefined();
    }

    // A copy verified to cover the change's generation releases it.
    await copyInOtherTab([generation]);
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("receipt.png")
    );
  });

  it("publishes a capture whose change's fence lands again after a pass copied and verified that change, as that fence writes no mark", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();
    const copy = readLocalCopy(record.fileId);
    expect(copy?.name).toBe("receipt.png");
    // Another tab's fence of that same rename lands only now.
    const generation = String(
      (copy?.covered as string[]).find((token) => /^\d+-/.test(token))
    );
    await markQueuedFileStale(LOCAL_QUEUE, record.fileId, false, generation);
    expect(opfs.list(LOCAL_QUEUE, `queued_${record.fileId}`)).not.toContain(
      "stale"
    );

    await signInToCloud("user-a");
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("receipt.png")
    );
  });

  it("holds a capture by a stale mark written beside a covered generation's mark, as an earlier build's or a stopped fence's beside a leftover leaves it, until the following pass verifies its copy", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    const control = await capturePhoto();
    await settleLocalFileRecords();
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();
    const copy = readLocalCopy(record.fileId);
    const generation = String(
      (copy?.covered as string[]).find((token) => /^\d+-/.test(token))
    );
    await writeLocalEntryFile(record.fileId, `stale.${generation}`);
    await writeLocalEntryFile(record.fileId, "stale", "changed");
    const isListedStale = async () =>
      (await listQueuedFiles(LOCAL_QUEUE, true)).find(
        (entry) => entry.fileId === record.fileId
      )?.stale !== undefined;
    expect(await isListedStale()).toBe(true);

    // The pass that follows (here, of another record's change) verifies it.
    await datafn.file.mutate({
      operation: "merge",
      id: control.id,
      record: { id: control.id, name: "control.png" }
    } as never);
    await settleLocalFileRecords();
    expect(await isListedStale()).toBe(false);
    await signInToCloud("user-a");
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("receipt.png")
    );
  });

  it("publishes the copy of a capture whose record another tab renames after a pass read its pending changes and before it verifies that copy", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    // As this tab's pass of a rename first reads the record, another tab
    // renames it again, records its change and fences it.
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      fileCalls.beforeQuery = null;
      await datafn.file.mutate({
        operation: "merge",
        id: record.id,
        record: { id: record.id, name: "second.png" },
        silent: true
      } as never);
      const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
      const id = [namespace, record.id, generation].map(encodeURIComponent);
      localStorage.setItem(
        `${LOCAL_QUEUE}-write:${id.join(":")}`,
        `change:${generation}`
      );
      await writeLocalEntryFile(record.fileId, "stale", "changed");
      await writeLocalEntryFile(record.fileId, `stale.${generation}`);
    };
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "first.png" }
    } as never);
    await settleLocalFileRecords();
    expect(fileCalls.beforeQuery).toBeNull();
    expect(readLocalCopy(record.fileId)?.name).toBe("second.png");

    await signInToCloud("user-a");
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("second.png")
    );
  });

  it("keeps a published record whose capture lost its uploaded mark when its next publish stops before its save and the guest record is then deleted", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    const entry = `queued_${record.fileId}`;
    await vi.waitFor(() =>
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
    );
    // The page reloaded before the uploaded mark landed; the next publish
    // stops before its save, as another tab fences a guest change.
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
    await (await queue.getDirectoryHandle(entry)).removeEntry("uploaded");
    let isFenced = false;
    hookEntryFiles({
      async create(name) {
        if (name !== "saved" || isFenced) return;
        isFenced = true;
        await writeLocalEntryFile(record.fileId, "stale", "changed");
      }
    });
    await replayLocalQueue();
    await settleTasks();
    expect(isFenced).toBe(true);
    expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeUndefined();

    const gate = deferred<void>();
    const otherTab = withQueueLock(
      LOCAL_QUEUE,
      new AbortController().signal,
      () => gate.promise
    );
    await signOutToLocal();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    gate.resolve();
    await otherTab;
    await settleTasks();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect((await readAnyRecord(record.id))?.fileId).toBe(record.fileId);
    expect(sdk.deletes).toEqual([]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
  });

  it("keeps an account record trashed to a state a stopped publish predicted when the guest record is then deleted", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await signInToCloud("user-a");
    const entry = `queued_${record.fileId}`;
    await vi.waitFor(() =>
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
    );
    // The page reloaded before the uploaded mark landed; the guest trashes
    // the record, and its next publish stops before its save, as another
    // tab fences a guest change.
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
    await (await queue.getDirectoryHandle(entry)).removeEntry("uploaded");
    await signOutToLocal();
    await datafn.file.mutate({ operation: "trash", id: record.id } as never);
    await settleLocalFileRecords();
    expect(readLocalCopy(record.fileId)?.isTrashed).toBe(true);
    let isFenced = false;
    hookEntryFiles({
      async create(name) {
        if (name !== "saved" || isFenced) return;
        isFenced = true;
        await writeLocalEntryFile(record.fileId, "stale", "changed");
      }
    });
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(isFenced).toBe(true);
    expect((await readAnyRecord(record.id))?.trashedAt ?? null).toBeNull();

    // The account trashes the record itself, then the guest deletes it.
    await datafn.file.mutate({ operation: "trash", id: record.id } as never);
    const gate = deferred<void>();
    const otherTab = withQueueLock(
      LOCAL_QUEUE,
      new AbortController().signal,
      () => gate.promise
    );
    await signOutToLocal();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    gate.resolve();
    await otherTab;
    await settleTasks();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect((await readAnyRecord(record.id))?.fileId).toBe(record.fileId);
    expect(sdk.deletes).toEqual([]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
  });

  it("marks nothing uploaded when a publish saved nothing because its copy was held, although the hold is gone by the end of that publish", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    const entry = `queued_${record.fileId}`;
    // Another tab records a guest change as the publish journals its save,
    // and its sign-out clears it before that change's fence lands.
    const key = `${LOCAL_QUEUE}-pending:${[namespace, record.id]
      .map(encodeURIComponent)
      .join(":")}`;
    let isRecorded = false;
    let checks = 0;
    hookEntryFiles({
      create(name) {
        if (name !== "saved" || isRecorded) return;
        isRecorded = true;
        localStorage.setItem(key, "change:t");
      }
    });
    failEntryLookup("uploaded", () => {
      if (isRecorded && ++checks === 2) localStorage.removeItem(key);
      return false;
    });
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(isRecorded).toBe(true);
    // Nothing holds it now: a replay publishes it before it is uploaded.
    await replayLocalQueue();
    await settleTasks();
    expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined();
    expect((await readAnyRecord(record.id))?.fileId).toBe(record.fileId);
  });

  it("releases a capture held by a change only this tab's memory holds once a pass verifies a copy after that change's fence, while the clock stands still", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now());
    // After the pass of a rename read its pending changes, a second rename
    // lands, only in this tab's memory (its pending entry cannot be stored),
    // and is fenced before the pass reads the record; its own pass cannot
    // take the queue's lock.
    const setItem = Storage.prototype.setItem;
    let isRefused = false;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      fileCalls.beforeQuery = null;
      failQueueLockOnce();
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
        this: Storage,
        key: string,
        value: string
      ) {
        if (isRefused || !key.includes("-pending:"))
          return setItem.call(this, key, value);
        isRefused = true;
        throw new DOMException("The storage is full", "QuotaExceededError");
      });
      await datafn.file.mutate({
        operation: "merge",
        id: record.id,
        record: { id: record.id, name: "second.png" }
      } as never);
      while (!opfs.list(LOCAL_QUEUE, entry).some((n) => n.startsWith("stale.")))
        await new Promise<void>((resolve) => setImmediate(resolve));
    };
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "first.png" }
    } as never);
    await settleTasks();
    clock.mockRestore();
    expect(isRefused).toBe(true);
    expect(readLocalCopy(record.fileId)?.name).toBe("second.png");

    await signInToCloud("user-a");
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("second.png")
    );
  });

  it("publishes a capture whose change an earlier build recorded once the pass that copies that change verifies the copy", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    // An earlier build's tab renames the record: its pending entry and stale
    // mark name no generation.
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "earlier.png" },
      silent: true
    } as never);
    await changeInOtherTab(namespace, record.id, record.fileId);

    await openData();
    await settleTasks();
    expect(readLocalCopy(record.fileId)?.name).toBe("earlier.png");
    await signInToCloud("user-a");
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("earlier.png")
    );
  });

  it("holds a verified copy by its plain stale mark alone while its clear stops between removing its generation mark and its stale mark, and nothing once the clear ends", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // The clear of the rename's pass stops after it removed the rename's
    // generation mark, before its stale mark (removed last, so an earlier
    // build's tab still sees the hold).
    const stop = deferred<void>();
    let isStopped = false;
    let removed = 0;
    const getDirectory = navigator.storage.getDirectory;
    const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
      new Proxy(dir, {
        get(target, key) {
          if (key === "getDirectoryHandle")
            return async (name: string, options?: { create?: boolean }) =>
              wrap(await target.getDirectoryHandle(name, options));
          if (key !== "removeEntry") return Reflect.get(target, key);
          return async (name: string) => {
            if (name.split(".")[0] === "stale" && ++removed === 2) {
              isStopped = true;
              await stop.promise;
            }
            return target.removeEntry(name);
          };
        }
      });
    navigator.storage.getDirectory = async () => wrap(await getDirectory());
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await vi.waitFor(() => expect(isStopped).toBe(true));

    const [listed] = await listQueuedFiles(LOCAL_QUEUE, true);
    expect(opfs.list(LOCAL_QUEUE, `queued_${record.fileId}`)).toContain(
      "stale"
    );
    expect(listed?.stale).toBe("changed");
    stop.resolve();
    await settleTasks();
    const [cleared] = await listQueuedFiles(LOCAL_QUEUE, true);
    expect(cleared?.stale).toBeUndefined();
    expect(cleared?.isDeleted).toBe(false);
  });

  it("keeps a capture held by another tab's fence that wrote its stale mark and not its generation's", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "other.png" },
      silent: true
    } as never);
    hookEntryFiles({
      create(name) {
        if (name.startsWith("stale."))
          throw new DOMException("The storage is full", "QuotaExceededError");
      }
    });
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    await expect(
      markQueuedFileStale(LOCAL_QUEUE, record.fileId, false, generation)
    ).rejects.toThrow();

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("waits on no timer while a pass over the local files holds the queue's lock", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const first = await capturePhoto();
    await capturePhoto();
    await settleLocalFileRecords();
    const locks = webLocks as LockManager;
    const request = locks.request.bind(locks) as (
      ...args: unknown[]
    ) => Promise<unknown>;
    let isLocked = false;
    vi.spyOn(locks, "request").mockImplementation(((...args: unknown[]) => {
      const run = args.at(-1) as LockGrantedCallback;
      if (!String(args[0]).endsWith(`:${LOCAL_QUEUE}`)) return request(...args);
      return request(args[0], args[1], async (lock: Lock) => {
        isLocked = true;
        try {
          return await run(lock);
        } finally {
          isLocked = false;
        }
      });
    }) as never);
    const timeout = globalThis.setTimeout;
    let lockedTimers = 0;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      ...args: Parameters<typeof setTimeout>
    ) => {
      if (isLocked && args[1] === 1) lockedTimers++;
      return timeout(...args);
    }) as never);

    await datafn.file.mutate({
      operation: "merge",
      id: first.id,
      record: { id: first.id, name: "receipt.png" }
    } as never);
    await openData();
    await settleTasks();

    expect(readLocalCopy(first.fileId)?.name).toBe("receipt.png");
    expect(lockedTimers).toBe(0);
  });

  it("holds a capture whose change's fence lands after a pass listed the marks, until a later pass covers that change, then publishes it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    const start = Date.now() + 1_000;
    const clock = vi.spyOn(Date, "now").mockReturnValue(start);
    // After the pass of a rename took its time and read its pending
    // changes, a second rename lands; its own pass cannot take the queue's
    // lock, and its fence lands only as the pass reads the record again.
    const fence = deferred<void>();
    hookEntryFiles({
      async create(name) {
        if (name.startsWith(`stale.${start + 10}-`)) await fence.promise;
      }
    });
    let reads = 0;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      if (++reads === 2) {
        fileCalls.beforeQuery = null;
        fence.resolve();
        const marks = () => opfs.list(LOCAL_QUEUE, entry);
        while (!marks().some((n) => n.startsWith(`stale.${start + 10}-`)))
          await new Promise<void>((resolve) => setImmediate(resolve));
        return;
      }
      failQueueLockOnce();
      clock.mockReturnValue(start + 10);
      await datafn.file.mutate({
        operation: "merge",
        id: record.id,
        record: { id: record.id, name: "second.png" }
      } as never);
      clock.mockReturnValue(start + 20);
    };
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "first.png" }
    } as never);
    await settleTasks();
    clock.mockRestore();
    expect(reads).toBe(2);
    expect(readLocalCopy(record.fileId)?.name).toBe("second.png");
    // The pass read neither that change nor its mark: the mark holds the
    // capture until a later pass covers it.
    const isMarked = () =>
      opfs
        .list(LOCAL_QUEUE, entry)
        .some((name) => name.startsWith(`stale.${start + 10}-`));
    expect(isMarked()).toBe(true);
    await openData();
    await settleLocalFileRecords();
    expect(isMarked()).toBe(false);

    await signInToCloud("user-a");
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("second.png")
    );
  });

  it("keeps a capture held, once its tab signs in, whose fence another tab's pass split, covering its change between the fence's reread of the copy and its stale mark", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    // Another tab records a change, and its fence writes its generation's
    // mark and reads the copy, not covering it yet, then pauses before its
    // stale mark while this tab copies and verifies a later rename, whose
    // pass reads that change too.
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    const key = [namespace, record.id, generation].map(encodeURIComponent);
    localStorage.setItem(
      `${LOCAL_QUEUE}-write:${key.join(":")}`,
      `change:${generation}`
    );
    const paused = deferred<void>();
    const resume = deferred<void>();
    let isPaused = false;
    hookEntryFiles({
      async create(name) {
        if (name !== "stale" || isPaused) return;
        isPaused = true;
        paused.resolve();
        await resume.promise;
      }
    });
    const otherFence = markQueuedFileStale(
      LOCAL_QUEUE,
      record.fileId,
      false,
      generation
    );
    await paused.promise;
    expect(opfs.list(LOCAL_QUEUE, entry)).toContain(`stale.${generation}`);
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "renamed.png" }
    } as never);
    await settleTasks();
    expect(readLocalCopy(record.fileId)?.name).toBe("renamed.png");
    expect(readLocalCopy(record.fileId)?.covered).toContain(generation);
    expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain(`stale.${generation}`);
    resume.resolve();
    await otherFence;

    // Its stale mark lands late; it never writes its covered generation's
    // mark again.
    expect(opfs.list(LOCAL_QUEUE, entry)).toContain("stale");
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    // No pass listed that stale mark, which an earlier build's fence may
    // rely on, so it holds until the following guest pass (a stated window).
    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(opfs.list(LOCAL_QUEUE, entry)).toContain("stale");
  });

  it("publishes, once its tab signs in, a capture whose fence read the copy before another tab's pass verified a copy covering its change and wrote its marks after", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    // A tab records a change, and its fence reads the copy, then pauses
    // before its generation's mark while another tab's pass of a later
    // rename reads that change, then copies and verifies the record.
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    const key = [namespace, record.id, generation].map(encodeURIComponent);
    localStorage.setItem(
      `${LOCAL_QUEUE}-write:${key.join(":")}`,
      `change:${generation}`
    );
    const paused = deferred<void>();
    const resume = deferred<void>();
    let isPaused = false;
    hookEntryFiles({
      async create(name) {
        if (name !== `stale.${generation}` || isPaused) return;
        isPaused = true;
        paused.resolve();
        await resume.promise;
      }
    });
    const lateFence = markQueuedFileStale(
      LOCAL_QUEUE,
      record.fileId,
      false,
      generation
    );
    await paused.promise;
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "renamed.png" }
    } as never);
    await settleTasks();
    expect(readLocalCopy(record.fileId)?.covered).toContain(generation);
    expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain("stale");
    resume.resolve();
    await lateFence;
    // It reads the copy again after its generation's mark: covered, so it
    // writes no stale mark.
    expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain("stale");

    // The fence's tab signs in before any other guest pass runs.
    await signInToCloud("user-a");
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("renamed.png")
    );
  });

  it("keeps an account record the account trashed itself after a partial first save applied the insert and not the trash, when the guest record is then deleted", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await datafn.file.mutate({ operation: "trash", id: record.id } as never);
    await settleLocalFileRecords();
    // Each save of the record during the replay applies all but its trash.
    let saves = 0;
    fileCalls.beforeMutate = async (args) => {
      const [first] = Array.isArray(args) ? args : [];
      if (first?.id !== record.id) return;
      saves++;
      (args as unknown[]).splice(1);
      return (result) => {
        const failed = { ok: false, error: new Error("The trash failed") };
        return [...(result as unknown[]), failed];
      };
    };
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    fileCalls.beforeMutate = null;
    expect(saves).toBeGreaterThan(0);
    expect((await readAnyRecord(record.id))?.trashedAt ?? null).toBeNull();

    await datafn.file.mutate({ operation: "trash", id: record.id } as never);
    await signOutToLocal();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleTasks();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    const kept = await readAnyRecord(record.id);
    expect(kept?.fileId).toBe(record.fileId);
    expect(kept?.trashedAt ?? null).not.toBeNull();
    expect(sdk.deletes).toEqual([]);
  });

  it("settles an orphaned capture that another guest record's delete fenced in the same millisecond as the pass that orphaned it", async () => {
    const orphan = await captureThenSignOutDuringUpload();
    const other = await capturePhoto();
    await settleLocalFileRecords();
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.now());
    for (const { id } of [orphan, other])
      await datafn.file.mutate({ operation: "delete", id } as never);
    await settleLocalFileRecords();
    clock.mockRestore();

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.deletes).toEqual([orphan.fileId]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
  });

  it("keeps covering a change a verified copy covered once a later pass copies another state of the record, so another tab's memory of that change does not hold it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "renamed.png" }
    } as never);
    await settleLocalFileRecords();
    const copy = readLocalCopy(record.fileId);
    const generation = String(
      (copy?.covered as string[]).find((token) => /^\d+-/.test(token))
    );
    expect(generation).toMatch(/^\d+-/);
    // A later pass copies a second rename; another tab still holds the
    // first rename's change, as its memory does after its pass failed.
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "second.png" }
    } as never);
    await settleLocalFileRecords();
    expect(readLocalCopy(record.fileId)?.name).toBe("second.png");
    const namespace = String(copy?.namespace);
    const key = [namespace, record.id, generation].map(encodeURIComponent);
    localStorage.setItem(
      `${LOCAL_QUEUE}-write:${key.join(":")}`,
      `change:${generation}`
    );

    await signInToCloud("user-a");
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("second.png")
    );
  });

  it.each([
    // Order, then held (before and after a signed-in tab's settle) when the
    // pass read the change, then when it did not. A stale mark that lands
    // after the pass listed the marks holds until the following pass (a
    // signed-in settle never clears one: an earlier build's fence may rely
    // on it).
    ["fence, pass", [false, false], [false, false]],
    ["pass, fence", [false, false], [true, true]],
    ["pass lists, fence, pass verifies", [true, true], [true, true]],
    ["pass lists, stopped fence, pass verifies", [true, true], [true, true]],
    ["stale mark, pass, generation mark", [false, false], [true, true]],
    ["fence, pass stopped before it verifies", [true, true], [true, true]],
    // Its clear removes the stale mark last, so the stop keeps it (held
    // until the next guest pass, like an interrupted pass's).
    ["fence, pass stopped while it clears", [true, true], [true, true]],
    ["stopped fence, pass", [false, false], [false, false]],
    ["pass, stopped fence", [true, true], [true, true]],
    ["fence reads the copy, pass, fence writes", [false, false], [true, true]],
    ["fence, pass, fence's stale mark", [true, true], [true, true]],
    [
      "pass lists, stale mark, fence, pass verifies before its first mark",
      [true, true],
      [true, true]
    ]
  ])(
    "holds a capture by a fence's marks until a verified copy that listed them clears them, or a locked settle finds its generations' marks covered: %s",
    async (order, ifRead, ifUnread) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      uninstall?.();
      uninstall = undefined;
      const { fileId } = record;
      const copy = readLocalCopy(fileId) as never;
      const isListedStale = async () =>
        (await listQueuedFiles(LOCAL_QUEUE, true)).find(
          (entry) => entry.fileId === fileId
        )?.stale !== undefined;
      for (const isRead of [true, false]) {
        const generation = `${Date.now()}-00000000-0000-4000-8000-00000000000${isRead ? "a" : "b"}`;
        // A fence's steps (see markQueuedFileStale), and a locked pass's:
        // it reads the pending changes, lists the marks, rereads the record,
        // then writes the copy it verified, covering the changes it read. A
        // stale mark alone is an earlier build's tab's (or a fence's whose
        // generation's mark failed): its pending change holds until a pass
        // reads it.
        let isPending = false;
        const isHeld = () => isPending;
        const staleMark = async () => {
          isPending = true;
          await writeLocalEntryFile(fileId, "stale", "changed");
        };
        const generationMark = () =>
          writeLocalEntryFile(fileId, `stale.${generation}`);
        const fence = () =>
          markQueuedFileStale(LOCAL_QUEUE, fileId, false, generation);
        let listed: string[] = [];
        const list = async () => {
          isPending = false;
          listed = await writeQueuedFileRecord(
            LOCAL_QUEUE,
            fileId,
            copy,
            "unverified"
          );
        };
        const covered = isRead ? [generation] : [];
        const verify = () =>
          writeQueuedFileRecord(LOCAL_QUEUE, fileId, copy, {
            covered,
            listed,
            isHeld
          });
        const pass = async () => {
          await list();
          await verify();
        };
        // A fence that runs `step` just before it writes the mark `name`.
        const lateFence = async (
          name: string,
          step: () => Promise<unknown>
        ) => {
          const getDirectory = navigator.storage.getDirectory;
          let isRun = false;
          hookEntryFiles({
            async create(created) {
              if (created !== name || isRun) return;
              isRun = true;
              await step();
            }
          });
          await fence().finally(() => {
            navigator.storage.getDirectory = getDirectory;
          });
        };
        const stoppedClear = async () => {
          await list();
          failEntryRemoval(`stale.${generation}`, 1);
          await verify().catch(() => undefined);
        };
        const steps: Record<string, (() => Promise<unknown>)[]> = {
          "fence, pass": [fence, pass],
          "pass, fence": [pass, fence],
          "pass lists, fence, pass verifies": [list, fence, verify],
          "pass lists, stopped fence, pass verifies": [list, staleMark, verify],
          "stale mark, pass, generation mark": [
            staleMark,
            pass,
            generationMark
          ],
          "fence, pass stopped before it verifies": [fence, list],
          "fence, pass stopped while it clears": [fence, stoppedClear],
          "stopped fence, pass": [staleMark, pass],
          "pass, stopped fence": [pass, staleMark],
          "fence reads the copy, pass, fence writes": [
            () => lateFence(`stale.${generation}`, pass)
          ],
          "fence, pass, fence's stale mark": [() => lateFence("stale", pass)],
          // The fence finds the stale mark set, so writes none: the mark
          // stays the earlier build's, whose change is pending.
          "pass lists, stale mark, fence, pass verifies before its first mark":
            [list, staleMark, () => lateFence(`stale.${generation}`, verify)]
        };
        for (const step of steps[order]) await step();
        const [before, settled] = isRead ? ifRead : ifUnread;
        expect(await isListedStale()).toBe(before);
        // A signed-in tab's settle, which reads only the copy, the marks and
        // the pending changes.
        await settleQueuedFileMarks(LOCAL_QUEUE, fileId, isHeld);
        expect(await isListedStale()).toBe(settled);

        // The pass that follows, whose reread sees the change, releases it.
        listed = [];
        await pass();
        expect(await isListedStale()).toBe(false);
      }
    }
  );

  it("keeps a capture held at sign-in by another tab's fence that stopped after its first mark while a late fence of a covered change ends", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    const { fileId } = record;
    const copy = readLocalCopy(fileId) as never;
    const [late, other] = ["a", "b"].map(
      (id) => `${Date.now()}-00000000-0000-4000-8000-00000000000${id}`
    );
    // A late fence reads the copy, then pauses before its first mark while
    // a pass reads its change and verifies a copy. Another tab's fence of a
    // later change, pending only in that tab's memory, stops after its first
    // mark; then the late fence ends.
    const paused = deferred<void>();
    const resume = deferred<void>();
    let phase = "late";
    let creates = 0;
    hookEntryFiles({
      async create() {
        if (phase === "late") {
          phase = "done";
          paused.resolve();
          await resume.promise;
        } else if (phase === "other" && ++creates === 2)
          throw new DOMException("The tab closed", "AbortError");
      }
    });
    const lateFence = markQueuedFileStale(LOCAL_QUEUE, fileId, false, late);
    await paused.promise;
    await withQueueLock(LOCAL_QUEUE, new AbortController().signal, async () => {
      const listed = await writeQueuedFileRecord(
        LOCAL_QUEUE,
        fileId,
        copy,
        "unverified"
      );
      await writeQueuedFileRecord(LOCAL_QUEUE, fileId, copy, {
        covered: [late],
        listed
      });
    });
    phase = "other";
    await expect(
      markQueuedFileStale(LOCAL_QUEUE, fileId, false, other)
    ).rejects.toThrow();
    phase = "done";
    resume.resolve();
    await lateFence;

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it.each([
    ["a local storage wipe", true],
    ["its earlier build's tab's failed pending entry", false]
  ])(
    "keeps a capture held, once its tab signs in after %s, by the stale mark an earlier build's fence found set after a pass covered a late fence's generation",
    async (_case, isStored) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      uninstall?.();
      uninstall = undefined;
      const { fileId } = record;
      const entry = `queued_${fileId}`;
      const copy = readLocalCopy(fileId) as never;
      const namespace = String(readLocalCopy(fileId)?.namespace);
      const late = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
      // A late fence reads the copy after its generation's mark; before its
      // stale mark, a pass reads its change and verifies a copy covering it.
      // Then an earlier build's tab renames the record, and its fence finds
      // that stale mark set, so writes none.
      let isPassed = false;
      const getDirectory = navigator.storage.getDirectory;
      hookEntryFiles({
        async create(name) {
          if (name === "stale" && !isPassed) {
            isPassed = true;
            await withQueueLock(LOCAL_QUEUE, new AbortController().signal, () =>
              writeQueuedFileRecord(
                LOCAL_QUEUE,
                fileId,
                copy,
                "unverified"
              ).then((listed) =>
                writeQueuedFileRecord(LOCAL_QUEUE, fileId, copy, {
                  covered: [late],
                  listed
                })
              )
            );
          }
        }
      });
      await markQueuedFileStale(LOCAL_QUEUE, fileId, false, late);
      navigator.storage.getDirectory = getDirectory;
      expect(isPassed).toBe(true);
      expect(opfs.list(LOCAL_QUEUE, entry)).toContain("stale");
      await datafn.file.mutate({
        operation: "merge",
        id: record.id,
        record: { id: record.id, name: "earlier.png" },
        silent: true
      } as never);
      if (isStored) {
        const key = [namespace, record.id].map(encodeURIComponent).join(":");
        localStorage.setItem(`${LOCAL_QUEUE}-pending:${key}`, "change:t");
      }
      localStorage.clear();

      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();

      expect(sdk.started).toEqual([]);
      expect(await readAnyRecord(record.id)).toBeUndefined();
      expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeDefined();
    }
  );

  it("sets the stale mark an earlier build's tab reads again when an orphan transition clears it beside a mark of a generation it does not cover", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    const { fileId } = record;
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    // The pass listed the stale mark; a fence of a change it did not read
    // then wrote its generation's mark.
    await writeLocalEntryFile(fileId, "stale", "changed");
    await writeLocalEntryFile(fileId, `stale.${generation}`);

    await markQueuedFileOrphaned(LOCAL_QUEUE, fileId, ["stale"], []);

    expect(opfs.read(LOCAL_QUEUE, `queued_${fileId}`, "stale")).toBeDefined();
    const [entry] = await listQueuedFiles(LOCAL_QUEUE, true);
    expect(entry?.stale).toBe("changed");
  });

  it("keeps an orphaned capture held while signed in whose orphaning pass read another guest record's change when that change's fence lands during its lookups", async () => {
    const orphan = await captureThenSignOutDuringUpload();
    const other = await capturePhoto();
    await settleLocalFileRecords();
    const namespace = String(readLocalCopy(orphan.fileId)?.namespace);
    // Another tab records a change of the other record; the pass of this
    // tab's delete reads it and lists the capture's marks; the other tab's
    // fence, which marks orphaned and deleted files, lands while the pass
    // looks the capture's file up, before it orphans the capture.
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    const key = [namespace, other.id, generation].map(encodeURIComponent);
    localStorage.setItem(
      `${LOCAL_QUEUE}-write:${key.join(":")}`,
      `change:${generation}`
    );
    let isFenced = false;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { fileId?: string } };
      if (isFenced || filters?.fileId !== orphan.fileId) return;
      isFenced = true;
      await markQueuedFileStale(LOCAL_QUEUE, orphan.fileId, false, generation);
    };
    await datafn.file.mutate({ operation: "delete", id: orphan.id } as never);
    await settleLocalFileRecords();
    fileCalls.beforeQuery = null;
    expect(isFenced).toBe(true);
    const [entry] = (await listQueuedFiles(LOCAL_QUEUE, true)).filter(
      (queued) => queued.fileId === orphan.fileId
    );
    expect(entry?.isOrphaned).toBe(true);

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    // The fence's stale mark came after the pass listed the marks, so it
    // holds until a following pass of its namespace lists it (a stated
    // window): a signed-in settle never clears a stale mark.
    expect(sdk.deletes).toEqual([]);
    const [held] = (await listQueuedFiles(LOCAL_QUEUE, true)).filter(
      (queued) => queued.fileId === orphan.fileId
    );
    expect(held?.stale).toBe("changed");
  });

  it("keeps the deleted marks of a capture whose orphan transition could not write its orphaned mark, so the deleted guest record is never published", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    const { fileId } = record;
    const entry = `queued_${fileId}`;
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    // A pass marks the record's delete, read under its lock, then orphans
    // the capture, covering that delete; its orphaned mark cannot be written.
    await markQueuedFileStale(LOCAL_QUEUE, fileId, true, generation);
    const getDirectory = navigator.storage.getDirectory;
    failEntryFile("orphaned", true);
    const listed = opfs
      .list(LOCAL_QUEUE, entry)
      .filter((name) => name.startsWith("deleted"));
    await expect(
      markQueuedFileOrphaned(LOCAL_QUEUE, fileId, listed, [generation])
    ).rejects.toThrow();
    navigator.storage.getDirectory = getDirectory;

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(opfs.read(LOCAL_QUEUE, entry, "deleted")).toBeDefined();
    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(sdk.started).toEqual([]);
  });

  it.each([
    ["a mark of a generation its copy does not cover", true, false],
    ["a pending change its copy does not cover", false, true]
  ])(
    "keeps the listed stale mark of a capture held by %s when a verified copy write stops while it settles the marks",
    async (_case, isMarked, isPending) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      uninstall?.();
      uninstall = undefined;
      const { fileId } = record;
      const copy = readLocalCopy(fileId) as never;
      const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
      await writeLocalEntryFile(fileId, "stale", "changed");
      const listed = await writeQueuedFileRecord(
        LOCAL_QUEUE,
        fileId,
        copy,
        "unverified"
      );
      expect(listed).toContain("stale");
      // A fence of a change the pass did not read lands after its listing,
      // and finds the stale mark set.
      if (isMarked) await writeLocalEntryFile(fileId, `stale.${generation}`);
      // The write stops before it could set a cleared stale mark again.
      const getDirectory = navigator.storage.getDirectory;
      failEntryFile("stale", true);
      await writeQueuedFileRecord(LOCAL_QUEUE, fileId, copy, {
        covered: [],
        listed,
        isHeld: () => isPending
      }).catch(() => undefined);
      navigator.storage.getDirectory = getDirectory;

      // An earlier build's tab reads only the stale mark.
      expect(opfs.read(LOCAL_QUEUE, `queued_${fileId}`, "stale")).toBeDefined();
    }
  );

  it("settles the marks of every local file once signed in when one local file cannot be read", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const unreadable = await capturePhoto();
    const other = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    // The other capture's delete fence named a change its copy now covers,
    // which a locked settle releases.
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    await markQueuedFileStale(LOCAL_QUEUE, other.fileId, true, generation);
    const copy = { ...readLocalCopy(other.fileId), covered: [generation] };
    await writeLocalEntryFile(
      other.fileId,
      "record.json",
      JSON.stringify(copy)
    );
    expect(
      (await listQueuedFiles(LOCAL_QUEUE, true)).map((e) => e.isDeleted)
    ).toEqual([false, true]);
    let isFailing = false;
    hookEntryFiles({
      lookup(name) {
        if (isFailing && name === `queued_${unreadable.fileId}`)
          throw new DOMException("Unreadable", "NotReadableError");
      }
    });
    isFailing = true;

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(other.id))?.fileId).toBe(other.fileId)
    );
    expect(await readAnyRecord(unreadable.id)).toBeUndefined();
  });

  it("publishes a capture whose change another tab could store only under its record's last-write entry, once a pass copied that change and its fence lands after", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    // Another tab renames the record: only the entry an earlier build's tab
    // reads was stored (its own entry was not), and its fence lands only
    // after this tab's pass copied the rename.
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "renamed.png" },
      silent: true
    } as never);
    const key = [namespace, record.id].map(encodeURIComponent).join(":");
    localStorage.setItem(
      `${LOCAL_QUEUE}-pending:${key}`,
      `change:${generation}`
    );
    uninstall?.();
    uninstall = installDeviceFileQueue();
    await settleLocalFileRecords();
    expect(readLocalCopy(record.fileId)?.name).toBe("renamed.png");
    await markQueuedFileStale(LOCAL_QUEUE, record.fileId, false, generation);

    await signInToCloud("user-a");
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("renamed.png")
    );
  });

  it.each([
    ["publishes it once its tab signs in", false],
    [
      "keeps it held once an earlier build's tab then stores a later change under that entry",
      true
    ]
  ])(
    "covers a change another tab stores under its record's last-write entry too, once a pass verified a copy after that change's fence, and %s",
    async (_, isRewritten) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      const namespace = String(readLocalCopy(record.fileId)?.namespace);
      const generation = `${Date.now() + 60_000}-00000000-0000-4000-8000-000000000001`;
      const key = [namespace, record.id].map(encodeURIComponent).join(":");
      const lastWrite = `${LOCAL_QUEUE}-pending:${key}`;
      // After the pass of this tab's rename read its pending changes, another
      // tab renames the record again, stores both its entries and fences the
      // rename before the pass reads the record and lists the marks.
      fileCalls.beforeQuery = async (args) => {
        const { filters } = args as { filters?: { id?: string } };
        if (filters?.id !== record.id) return;
        fileCalls.beforeQuery = null;
        await datafn.file.mutate({
          operation: "merge",
          id: record.id,
          record: { id: record.id, name: "second.png" },
          silent: true
        } as never);
        localStorage.setItem(lastWrite, `change:${generation}`);
        localStorage.setItem(
          `${LOCAL_QUEUE}-write:${key}:${encodeURIComponent(generation)}`,
          `change:${generation}`
        );
        await markQueuedFileStale(
          LOCAL_QUEUE,
          record.fileId,
          false,
          generation
        );
      };
      await datafn.file.mutate({
        operation: "merge",
        id: record.id,
        record: { id: record.id, name: "first.png" }
      } as never);
      await settleLocalFileRecords();
      expect(fileCalls.beforeQuery).toBeNull();
      expect(readLocalCopy(record.fileId)?.name).toBe("second.png");
      expect(localStorage.getItem(lastWrite)).toBe(`change:${generation}`);
      if (isRewritten) {
        // An earlier build's tab renames it again: it rewrites that entry with
        // a value of its own, and its fence finds no stale mark yet to write.
        await datafn.file.mutate({
          operation: "merge",
          id: record.id,
          record: { id: record.id, name: "third.png" },
          silent: true
        } as never);
        localStorage.setItem(lastWrite, "change:earlier-build-write");
      }

      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();

      if (isRewritten) {
        expect(sdk.started).toEqual([]);
        expect(await readAnyRecord(record.id)).toBeUndefined();
      } else {
        await vi.waitFor(async () =>
          expect((await readAnyRecord(record.id))?.name).toBe("second.png")
        );
      }
    }
  );

  it("settles an orphaned capture once signed in whose orphaning pass read another guest record's change when that change's fence lands while the pass reconciles the other record's file", async () => {
    const orphan = await captureThenSignOutDuringUpload();
    const other = await capturePhoto();
    await settleLocalFileRecords();
    const namespace = String(readLocalCopy(orphan.fileId)?.namespace);
    // The capture's entry is listed after the other record's file, as an
    // entry written later is.
    const name = `queued_${orphan.fileId}`;
    const files = opfs.list(LOCAL_QUEUE, name).map((file) => {
      const bytes = opfs.read(LOCAL_QUEUE, name, file);
      if (!bytes) throw new Error(`${file} is not a file`);
      return [file, bytes] as const;
    });
    const queue = await (
      await opfs.getDirectory()
    ).getDirectoryHandle(LOCAL_QUEUE);
    await queue.removeEntry(name, { recursive: true });
    const moved = await queue.getDirectoryHandle(name, { create: true });
    for (const [file, bytes] of files) {
      const handle = await moved.getFileHandle(file, { create: true });
      const writable = await handle.createWritable();
      await writable.write(bytes);
      await writable.close();
    }
    expect(opfs.list(LOCAL_QUEUE).indexOf(name)).toBeGreaterThan(
      opfs.list(LOCAL_QUEUE).indexOf(`queued_${other.fileId}`)
    );
    // Another tab records a change of the other record; the pass of this
    // tab's delete reads it and lists the local files; the other tab's
    // fence, which marks orphaned and deleted files, lands while the pass
    // looks the other record up, before it reaches the capture.
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    const key = [namespace, other.id, generation].map(encodeURIComponent);
    localStorage.setItem(
      `${LOCAL_QUEUE}-write:${key.join(":")}`,
      `change:${generation}`
    );
    let isFenced = false;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (isFenced || filters?.id !== other.id) return;
      isFenced = true;
      await markQueuedFileStale(LOCAL_QUEUE, orphan.fileId, false, generation);
    };
    await datafn.file.mutate({ operation: "delete", id: orphan.id } as never);
    await settleLocalFileRecords();
    fileCalls.beforeQuery = null;
    expect(isFenced).toBe(true);
    const [entry] = (await listQueuedFiles(LOCAL_QUEUE, true)).filter(
      (queued) => queued.fileId === orphan.fileId
    );
    expect(entry?.isOrphaned).toBe(true);
    expect(entry?.stale).toBeUndefined();

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.deletes).toEqual([orphan.fileId]);
  });

  it("keeps the cover of a record copy whose prior copy a copy write cannot read", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();
    const copy = readLocalCopy(record.fileId);
    const covered = copy?.covered as string[];
    expect(covered.length).toBeGreaterThan(0);

    failEntryFile("record.json", false, 1);
    await expect(
      writeQueuedFileRecord(
        LOCAL_QUEUE,
        record.fileId,
        { ...copy, name: "other.png" } as never,
        "unverified"
      )
    ).rejects.toThrow();

    expect(readLocalCopy(record.fileId)?.covered).toEqual(covered);
  });

  it("keeps a capture held at sign-in by the stale mark of a late fence that could write no mark of its generation, as a fence stopped before its generation's mark leaves it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    // A tab records a change; its fence cannot write its generation's mark,
    // then pauses before its stale mark while another tab's pass reads that
    // change and verifies a copy. Its stale mark alone tells nothing of whose
    // change it holds, so it holds until a guest pass lists it.
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    const key = [namespace, record.id, generation].map(encodeURIComponent);
    localStorage.setItem(
      `${LOCAL_QUEUE}-write:${key.join(":")}`,
      `change:${generation}`
    );
    const paused = deferred<void>();
    const resume = deferred<void>();
    let isPaused = false;
    hookEntryFiles({
      async create(name) {
        if (name === `stale.${generation}`)
          throw new DOMException("The disk is full", "QuotaExceededError");
        if (name !== "stale" || isPaused) return;
        isPaused = true;
        paused.resolve();
        await resume.promise;
      }
    });
    const lateFence = markQueuedFileStale(
      LOCAL_QUEUE,
      record.fileId,
      false,
      generation
    );
    await paused.promise;
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "renamed.png" }
    } as never);
    await settleTasks();
    expect(readLocalCopy(record.fileId)?.covered).toContain(generation);
    resume.resolve();
    await expect(lateFence).rejects.toThrow();
    expect(opfs.list(LOCAL_QUEUE, entry)).toContain("stale");

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(opfs.list(LOCAL_QUEUE, entry)).toContain("stale");
  });

  it("releases at a locked settle the deleted mark a delete fence wrote, naming its delete, after another record's takeover copy covering that delete was verified", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    const { fileId } = record;
    const entry = `queued_${fileId}`;
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    // A locked pass lists the marks and writes the copy of the record that
    // took the file over.
    const takeover = { ...readLocalCopy(fileId), id: `${record.id}-copy` };
    const listed = await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      takeover as never,
      "unverified"
    );
    // The deleting tab's fence writes its generation's mark and reads the
    // copy; before its deleted mark, the pass verifies the takeover's copy,
    // covering that delete.
    let isVerified = false;
    hookEntryFiles({
      async create(name) {
        if (isVerified || name !== "deleted") return;
        isVerified = true;
        await writeQueuedFileRecord(LOCAL_QUEUE, fileId, takeover as never, {
          covered: [generation],
          listed
        });
      }
    });
    await markQueuedFileStale(LOCAL_QUEUE, fileId, true, generation);
    expect(isVerified).toBe(true);
    expect(opfs.list(LOCAL_QUEUE, entry)).toEqual(
      expect.arrayContaining(["deleted", `deleted.${generation}`])
    );
    expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(true);

    // A deleted mark beside its covered generation's mark is the fence's own.
    await settleQueuedFileMarks(LOCAL_QUEUE, fileId);

    expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain("deleted");
    const [listedEntry] = await listQueuedFiles(LOCAL_QUEUE, true);
    expect(listedEntry?.isDeleted).toBe(false);
    expect(listedEntry?.stale).toBeUndefined();
  });

  it.each([
    ["with no generation", false],
    ["whose generation's mark cannot be written", true]
  ])(
    "keeps a capture held at a locked settle by a delete re-mark %s beside a deleted mark that names a covered delete",
    async (_, isFailed) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      uninstall?.();
      uninstall = undefined;
      const { fileId } = record;
      const entry = `queued_${fileId}`;
      const covered = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
      const later = `${Date.now() + 1}-00000000-0000-4000-8000-000000000002`;
      // A deleted mark names a delete the verified copy covers, as a delete
      // fence that paused across that copy's write leaves it.
      await writeQueuedFileRecord(
        LOCAL_QUEUE,
        fileId,
        readLocalCopy(fileId) as never,
        { covered: [covered], listed: [] }
      );
      await writeLocalEntryFile(fileId, "deleted", covered);
      // A later delete's re-mark writes no generation's mark.
      if (isFailed) {
        hookEntryFiles({
          create(name) {
            if (name === `deleted.${later}`)
              throw new Error("The disk is full");
          }
        });
        await expect(
          markQueuedFileStale(LOCAL_QUEUE, fileId, true, later)
        ).rejects.toThrow("The disk is full");
      } else await markQueuedFileStale(LOCAL_QUEUE, fileId, true);

      await settleQueuedFileMarks(LOCAL_QUEUE, fileId);

      expect(opfs.list(LOCAL_QUEUE, entry)).toContain("deleted");
      expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(
        true
      );
    }
  );

  it.each([
    ["whose first write of it fails", false],
    ["that cannot write it, while its pending change holds", true]
  ])(
    "keeps a capture held at a locked settle that removes a fence's covered deleted marks while a later delete's fence %s",
    async (_, isFailed) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      uninstall?.();
      uninstall = undefined;
      const { fileId } = record;
      const covered = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
      const later = `${Date.now() + 1}-00000000-0000-4000-8000-000000000002`;
      await writeQueuedFileRecord(
        LOCAL_QUEUE,
        fileId,
        readLocalCopy(fileId) as never,
        { covered: [covered], listed: [] }
      );
      await writeLocalEntryFile(fileId, "deleted", "");
      await writeLocalEntryFile(fileId, `deleted.${covered}`);
      let failures = 0;
      hookEntryFiles({
        create(name) {
          if (name === `deleted.${later}` && (isFailed || !failures++))
            throw new Error("The disk is full");
        }
      });
      let fence: Promise<unknown> | undefined;
      const at = isFailed ? `deleted.${covered}` : "deleted";
      const getDirectory = navigator.storage.getDirectory;
      const wrap = (
        dir: FileSystemDirectoryHandle
      ): FileSystemDirectoryHandle =>
        new Proxy(dir, {
          get(target, key) {
            if (key === "getDirectoryHandle")
              return async (name: string, options?: { create?: boolean }) =>
                wrap(await target.getDirectoryHandle(name, options));
            if (key !== "removeEntry") return Reflect.get(target, key);
            return async (name: string) => {
              if (name === at && !fence) {
                fence = markQueuedFileStale(LOCAL_QUEUE, fileId, true, later);
                await fence.catch(() => undefined);
              }
              return target.removeEntry(name);
            };
          }
        });
      navigator.storage.getDirectory = async () => wrap(await getDirectory());

      await settleQueuedFileMarks(LOCAL_QUEUE, fileId, () => !!fence);

      expect(fence).toBeDefined();
      if (isFailed) await expect(fence).rejects.toThrow("The disk is full");
      else await fence;
      const marks = opfs.list(LOCAL_QUEUE, `queued_${fileId}`);
      expect(marks).toContain("deleted");
      expect(marks).not.toContain(`deleted.${covered}`);
      expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(
        true
      );
    }
  );

  it("leaves no mark of a fence whose generation's mark fails after a pass verified a copy covering its change", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    const { fileId } = record;
    const copy = readLocalCopy(fileId) as never;
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    hookEntryFiles({
      async create(name) {
        if (name !== `stale.${generation}`) return;
        await writeQueuedFileRecord(LOCAL_QUEUE, fileId, copy, {
          covered: [generation],
          listed: []
        });
        throw new DOMException("The disk is full", "QuotaExceededError");
      }
    });

    await markQueuedFileStale(LOCAL_QUEUE, fileId, false, generation);

    const names = opfs.list(LOCAL_QUEUE, `queued_${fileId}`);
    expect(names.filter((name) => name.startsWith("stale"))).toEqual([]);
    expect(
      (await listQueuedFiles(LOCAL_QUEUE, true))[0]?.stale
    ).toBeUndefined();
  });

  it("writes no other generation's mark for a fence whose generation's mark cannot be written, so a locked copy covering its change releases the capture", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    const { fileId } = record;
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    hookEntryFiles({
      create(name) {
        if (name === "stale" || name === `stale.${generation}`)
          throw new DOMException("The disk is full", "QuotaExceededError");
      }
    });

    await expect(
      markQueuedFileStale(LOCAL_QUEUE, fileId, false, generation)
    ).rejects.toThrow();
    await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      readLocalCopy(fileId) as never,
      { covered: [generation], listed: [] }
    );

    const names = opfs.list(LOCAL_QUEUE, `queued_${fileId}`);
    expect(names.filter((name) => name.startsWith("stale"))).toEqual([]);
    expect(
      (await listQueuedFiles(LOCAL_QUEUE, true))[0]?.stale
    ).toBeUndefined();
  });

  it.each([
    ["sees it set once its generation's mark lands", false],
    ["keeps it set when the fence stops after its generation's mark", true]
  ])(
    "writes a delete fence's plain deleted mark first, so an earlier build's tab that reads only plain marks %s",
    async (_, isStopped) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      uninstall?.();
      uninstall = undefined;
      const { fileId } = record;
      const entry = `queued_${fileId}`;
      const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
      let isLanded = false;
      let isPlainSeen = false;
      hookEntryFiles({
        create(name) {
          if (name === `deleted.${generation}`) {
            if (!isLanded)
              isPlainSeen = opfs.list(LOCAL_QUEUE, entry).includes("deleted");
            isLanded = true;
          } else if (name === "deleted" && isLanded && isStopped)
            throw new DOMException("The page closed", "AbortError");
        }
      });

      await markQueuedFileStale(LOCAL_QUEUE, fileId, true, generation).catch(
        () => undefined
      );

      expect(isLanded).toBe(true);
      expect(isPlainSeen).toBe(true);
      expect(opfs.list(LOCAL_QUEUE, entry)).toContain("deleted");
    }
  );

  it("publishes nothing once signed in for a guest record of a retired namespace whose delete only its pending entry told before a sign-out wiped it, beside a deleted mark that names a covered delete", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleTasks();
    const { fileId } = record;
    const entry = `queued_${fileId}`;
    const namespace = String(readLocalCopy(fileId)?.namespace);
    const covered = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      readLocalCopy(fileId) as never,
      { covered: [covered], listed: [] }
    );
    await writeLocalEntryFile(fileId, "deleted", covered);
    // The device moves to a new guest namespace; a tab of the earlier one
    // deletes the guest record and closes before its fence.
    await signOutToLocal(true);
    await settleLocalFileRecords();
    const key = [namespace, record.id].map(encodeURIComponent).join(":");
    localStorage.setItem(`${LOCAL_QUEUE}-pending:${key}`, "delete");
    // A guest pass re-marks it deleted; a sign-out then wipes that entry.
    await openData();
    await settleLocalFileRecords();
    await signOutToLocal();
    await settleLocalFileRecords();

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(opfs.list(LOCAL_QUEUE, entry)).toContain("deleted");
    expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(true);
  });

  it("holds no capture by a fence that paused across a verified copy covering its change and then another record's takeover copy", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    const { fileId } = record;
    const copy = readLocalCopy(fileId);
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    // The fence reads the copy, then pauses before its generation's mark
    // while a pass verifies a copy covering its change and a later pass
    // verifies the copy of another record that took the file over; the
    // fence reads that copy again and finds its change covered.
    let isRun = false;
    hookEntryFiles({
      async create(name) {
        if (isRun || name !== `stale.${generation}`) return;
        isRun = true;
        const cover = (covered: string[]) => ({ covered, listed: [] });
        await writeQueuedFileRecord(
          LOCAL_QUEUE,
          fileId,
          copy as never,
          cover([generation])
        );
        const takeover = { ...copy, id: `${record.id}-copy` };
        await writeQueuedFileRecord(
          LOCAL_QUEUE,
          fileId,
          takeover as never,
          cover([])
        );
      }
    });
    await markQueuedFileStale(LOCAL_QUEUE, fileId, false, generation);

    expect(isRun).toBe(true);
    expect(readLocalCopy(fileId)?.covered).toContain(generation);
    await settleQueuedFileMarks(LOCAL_QUEUE, fileId);

    const [entry] = await listQueuedFiles(LOCAL_QUEUE, true);
    expect(entry?.stale).toBeUndefined();
  });

  it("settles an orphaned capture whose orphaning pass read another guest record's change when that change's fence lands after it", async () => {
    const orphan = await captureThenSignOutDuringUpload();
    const other = await capturePhoto();
    await settleLocalFileRecords();
    const namespace = String(readLocalCopy(orphan.fileId)?.namespace);
    // Another tab records a change of the other record; the pass of this
    // tab's delete reads it and orphans the capture; the other tab's fence,
    // which marks orphaned files, lands after that.
    const generation = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    const key = [namespace, other.id, generation].map(encodeURIComponent);
    localStorage.setItem(
      `${LOCAL_QUEUE}-write:${key.join(":")}`,
      `change:${generation}`
    );
    await datafn.file.mutate({ operation: "delete", id: orphan.id } as never);
    await settleLocalFileRecords();
    const [entry] = (await listQueuedFiles(LOCAL_QUEUE, true)).filter(
      (queued) => queued.fileId === orphan.fileId
    );
    expect(entry?.isOrphaned).toBe(true);
    await markQueuedFileStale(LOCAL_QUEUE, orphan.fileId, false, generation);

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.deletes).toEqual([orphan.fileId]);
  });

  it("settles an orphaned capture once another tab's orphaning pass covered a change only this tab's pending memory still holds", async () => {
    const orphan = await captureThenSignOutDuringUpload();
    const other = await capturePhoto();
    await datafn.file.mutate({ operation: "delete", id: orphan.id } as never);
    await settleLocalFileRecords();
    // This tab renames the other record, and its pass cannot take the
    // queue's lock; another tab's pass reads the rename, orphans the capture
    // again (clearing the stale marks the rename's fence wrote, which it
    // listed) and removes the pending entries it read.
    failQueueLockOnce();
    await datafn.file.mutate({
      operation: "merge",
      id: other.id,
      record: { id: other.id, name: "receipt.png" }
    } as never);
    const token = Object.values(localStorage)
      .find((value) => /^change:\d+-/.test(String(value)))
      ?.slice("change:".length);
    expect(token).toBeDefined();
    await vi.waitFor(() =>
      expect(opfs.list(LOCAL_QUEUE, `queued_${orphan.fileId}`)).toContain(
        `stale.${token}`
      )
    );
    const [entry] = (await listQueuedFiles(LOCAL_QUEUE, true)).filter(
      (queued) => queued.fileId === orphan.fileId
    );
    await markQueuedFileOrphaned(LOCAL_QUEUE, orphan.fileId, entry.marks, [
      String(token)
    ]);
    for (const key of Object.keys(localStorage))
      if (/-(pending|write):/.test(key)) localStorage.removeItem(key);

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.deletes).toEqual([orphan.fileId]);
  });

  it("keeps a capture held for an earlier build's tab by the pending entry it reads from a change until its fence's mark lands, and releases it once the change's pass verifies its copy", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    // An earlier build's tab holds a capture by its plain marks and by the
    // pending entry under the record's key, without a generation.
    const earlierKey = `${LOCAL_QUEUE}-pending:${[namespace, record.id]
      .map(encodeURIComponent)
      .join(":")}`;
    const isHeldForEarlierBuild = () =>
      ["stale", "deleted"].some((mark) =>
        opfs.list(LOCAL_QUEUE, entry).includes(mark)
      ) || localStorage.getItem(earlierKey) !== null;
    expect(isHeldForEarlierBuild()).toBe(false);
    const paused = deferred<void>();
    const resume = deferred<void>();
    let isPaused = false;
    hookEntryFiles({
      async create(name) {
        if (name !== "stale" || isPaused) return;
        isPaused = true;
        paused.resolve();
        await resume.promise;
      }
    });
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await paused.promise;
    expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain("stale");
    expect(isHeldForEarlierBuild()).toBe(true);
    resume.resolve();
    await settleLocalFileRecords();

    expect(readLocalCopy(record.fileId)?.name).toBe("receipt.png");
    expect(isHeldForEarlierBuild()).toBe(false);
    await signInToCloud("user-a");
    await replayLocalQueue();
    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("receipt.png")
    );
  });

  it("sets the plain stale mark an earlier build's tab reads again when a verified copy clears it while a later change's generation mark, written after its fence found it set, still holds", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    const { fileId } = record;
    const entry = `queued_${fileId}`;
    const copy = readLocalCopy(fileId) as never;
    const first = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    const second = `${Date.now()}-00000000-0000-4000-8000-000000000002`;
    // A pass lists a change's marks; a later change's fence finds the stale
    // mark set and writes only its generation's; the pass verifies a copy
    // covering the first change.
    await markQueuedFileStale(LOCAL_QUEUE, fileId, false, first);
    const listed = await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      copy,
      "unverified"
    );
    await markQueuedFileStale(LOCAL_QUEUE, fileId, false, second);
    await writeQueuedFileRecord(LOCAL_QUEUE, fileId, copy, {
      covered: [first],
      listed
    });

    expect(opfs.list(LOCAL_QUEUE, entry)).toContain("stale");
    expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain(`stale.${first}`);
    // The pass of the later change lists the marks and covers it.
    const next = await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      copy,
      "unverified"
    );
    await writeQueuedFileRecord(LOCAL_QUEUE, fileId, copy, {
      covered: [second],
      listed: next
    });
    expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain("stale");
    const [listedEntry] = await listQueuedFiles(LOCAL_QUEUE, true);
    expect(listedEntry?.stale).toBeUndefined();
  });

  it("reset evidence: an older fence cannot erase a newer unnamed delete hold", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const { fileId } = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;

    const older = "1800000000000-00000000-0000-4000-8000-000000000001";
    let ranNewerFence = false;
    hookEntryFiles({
      async create(name) {
        if (name !== "deleted" || ranNewerFence) return;
        ranNewerFence = true;
        await markQueuedFileStale(LOCAL_QUEUE, fileId, true);
      }
    });
    await markQueuedFileStale(LOCAL_QUEUE, fileId, true, older);
    expect(ranNewerFence).toBe(true);

    await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      readLocalCopy(fileId) as never,
      { covered: [older], listed: [] }
    );

    expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(true);
    expect(opfs.list(LOCAL_QUEUE, `queued_${fileId}`)).toContain("deleted");
  });

  it("reset evidence: an interrupted settle keeps a newer generation visible to a plain-mark reader", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const { fileId } = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;

    const covered = "1800000000000-00000000-0000-4000-8000-000000000001";
    const later = "1800000000001-00000000-0000-4000-8000-000000000002";
    await writeLocalEntryFile(fileId, "deleted", covered);
    await writeLocalEntryFile(fileId, `deleted.${covered}`);
    const getDirectory = navigator.storage.getDirectory;
    const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
      new Proxy(dir, {
        get(target, key) {
          if (key === "getDirectoryHandle")
            return async (name: string, options?: { create?: boolean }) =>
              wrap(await target.getDirectoryHandle(name, options));
          if (key !== "removeEntry") return Reflect.get(target, key);
          return async (name: string) => {
            if (name === `deleted.${covered}`) {
              await writeLocalEntryFile(fileId, `deleted.${later}`);
              throw new DOMException("Interrupted settle", "NotReadableError");
            }
            return target.removeEntry(name);
          };
        }
      });
    navigator.storage.getDirectory = async () => wrap(await getDirectory());

    await expect(
      writeQueuedFileRecord(
        LOCAL_QUEUE,
        fileId,
        readLocalCopy(fileId) as never,
        { covered: [covered], listed: ["deleted", `deleted.${covered}`] }
      )
    ).rejects.toThrow("Interrupted settle");

    const marks = opfs.list(LOCAL_QUEUE, `queued_${fileId}`);
    expect(marks).toContain(`deleted.${later}`);
    expect(marks).toContain("deleted");
  });

  it("reset evidence: a verified copy written during the fallback releases the capture", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const { fileId } = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;

    const earlier = "1800000000000-00000000-0000-4000-8000-000000000001";
    const deleted = "1800000000001-00000000-0000-4000-8000-000000000002";
    await writeLocalEntryFile(fileId, "deleted", earlier);
    let attempts = 0;
    let savedCopy = false;
    hookEntryFiles({
      async create(name) {
        if (!name.startsWith("deleted.")) return;
        attempts += 1;
        if (attempts === 1)
          throw new DOMException("Disk full", "QuotaExceededError");
        if (savedCopy) return;
        savedCopy = true;
        await writeLocalEntryFile(
          fileId,
          "record.json",
          JSON.stringify({
            ...readLocalCopy(fileId),
            covered: [earlier, deleted]
          })
        );
      }
    });
    await markQueuedFileStale(LOCAL_QUEUE, fileId, true, deleted).catch(
      (error) => {
        if (
          !(error instanceof DOMException) ||
          error.name !== "QuotaExceededError"
        )
          throw error;
      }
    );
    expect(savedCopy).toBe(true);

    await settleQueuedFileMarks(LOCAL_QUEUE, fileId);

    expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(
      false
    );
  });

  it("keeps a restored plain deleted mark without a generation's held once signed in after a late fence of a covered delete", async () => {
    const record = await captureThenSignOutDuringUpload();
    await settleLocalFileRecords();
    const { fileId } = record;
    const entry = `queued_${fileId}`;
    const covered = "1800000000000-00000000-0000-4000-8000-000000000001";
    await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      readLocalCopy(fileId) as never,
      { covered: [covered], listed: [] }
    );
    await writeLocalEntryFile(fileId, "deleted", "");
    const { files } = await exportQueuedFiles(LOCAL_QUEUE, async () => null);
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
    await queue.removeEntry(entry, { recursive: true });
    await restoreLocalQueuedFiles(files as never, () => false);

    await writeLocalEntryFile(fileId, `deleted.${covered}`);
    await signInToCloud("user-a");
    await settleQueuedFileMarks(LOCAL_QUEUE, fileId);

    expect(opfs.list(LOCAL_QUEUE, entry)).toContain("deleted");
    expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(true);
  });

  it("releases a listed plain stale mark its verified copy covers without a reload when a covered generation's mark lands during the settle", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const { fileId } = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;

    const earlier = "1800000000000-00000000-0000-4000-8000-000000000001";
    const late = "1800000000001-00000000-0000-4000-8000-000000000002";
    await writeLocalEntryFile(fileId, "stale", "changed");
    await writeLocalEntryFile(fileId, `stale.${earlier}`);
    hookEntryRemovalOnce(`stale.${earlier}`, () =>
      writeLocalEntryFile(fileId, `stale.${late}`)
    );

    await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      readLocalCopy(fileId) as never,
      { covered: [earlier, late], listed: ["stale", `stale.${earlier}`] }
    );

    const marks = opfs.list(LOCAL_QUEUE, `queued_${fileId}`);
    expect(marks).toContain(`stale.${late}`);
    expect(marks).not.toContain("stale");
    expect(
      (await listQueuedFiles(LOCAL_QUEUE, true))[0]?.stale
    ).toBeUndefined();
  });

  it("keeps a listed plain stale mark when a newer generation's mark lands while the settle removes a covered one, even if setting the plain mark again fails", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const { fileId } = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;

    const covered = "1800000000000-00000000-0000-4000-8000-000000000001";
    const newer = "1800000000001-00000000-0000-4000-8000-000000000002";
    await writeLocalEntryFile(fileId, "stale", "changed");
    await writeLocalEntryFile(fileId, `stale.${covered}`);
    hookEntryRemovalOnce(`stale.${covered}`, () =>
      writeLocalEntryFile(fileId, `stale.${newer}`)
    );
    hookEntryFiles({
      create(name) {
        if (name === "stale")
          throw new DOMException("Disk full", "QuotaExceededError");
      }
    });

    await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      readLocalCopy(fileId) as never,
      { covered: [covered], listed: ["stale", `stale.${covered}`] }
    ).catch(() => undefined);

    const marks = opfs.list(LOCAL_QUEUE, `queued_${fileId}`);
    expect(marks).toContain(`stale.${newer}`);
    expect(marks).toContain("stale");
  });

  it("releases a verified delete once signed in whose fence wrote its plain and covered generation's marks during an earlier settle", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const { fileId } = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;

    const earlier = "1800000000000-00000000-0000-4000-8000-000000000001";
    const deleted = "1800000000001-00000000-0000-4000-8000-000000000002";
    await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      readLocalCopy(fileId) as never,
      { covered: [earlier, deleted], listed: [] }
    );
    await writeLocalEntryFile(fileId, `stale.${earlier}`);
    hookEntryRemovalOnce(`stale.${earlier}`, async () => {
      await writeLocalEntryFile(fileId, "deleted");
      await writeLocalEntryFile(fileId, `deleted.${deleted}`);
    });

    await settleQueuedFileMarks(LOCAL_QUEUE, fileId);
    await settleQueuedFileMarks(LOCAL_QUEUE, fileId);

    expect(opfs.list(LOCAL_QUEUE, `queued_${fileId}`)).not.toContain("deleted");
    expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(
      false
    );
  });

  it.each([
    ["", false],
    [" and the first withdrawal and the publishing mark's rewrite fail", true]
  ])(
    "withdraws the upload of a publish whose copy another tab fenced while its publishing mark was removed%s, so the next replay publishes the newer copy",
    async (_, isFailing) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      const entry = `queued_${record.fileId}`;
      let isFenced = false;
      hookEntryRemovalOnce("publishing", async () => {
        isFenced = true;
        await writeLocalEntryFile(record.fileId, "stale");
      });
      if (isFailing) {
        failEntryRemoval("uploaded", 1);
        let isRewriteFailed = false;
        hookEntryFiles({
          create(name) {
            if (name !== "publishing" || !isFenced || isRewriteFailed) return;
            isRewriteFailed = true;
            throw new DOMException("Disk full", "QuotaExceededError");
          }
        });
      }

      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();
      expect(isFenced).toBe(true);
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeUndefined();

      await signOutToLocal();
      await settleTasks();
      await datafn.file.mutate({
        operation: "merge",
        id: record.id,
        record: { id: record.id, name: "receipt.png" }
      } as never);
      await settleTasks();
      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();

      expect((await readAnyRecord(record.id))?.name).toBe("receipt.png");
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined();
      expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain("publishing");
    }
  );

  it.each(["listing", "changes-only export"])(
    "reset evidence: %s treats a provisional upload with a delivery log as unverified",
    async (consumer) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const { fileId } = await capturePhoto();
      await settleLocalFileRecords();
      uninstall?.();
      uninstall = undefined;

      await writeLocalEntryFile(fileId, "uploaded", "test-version");
      await writeLocalEntryFile(fileId, "publishing", "{}");
      await writeLocalEntryFile(fileId, "sent-thumbnail");
      const root = await opfs.getDirectory();
      const log = await root.getDirectoryHandle(`${LOCAL_QUEUE}.uploads`, {
        create: true
      });
      const row = await log.getFileHandle(encodeURIComponent(fileId), {
        create: true
      });
      const writer = await row.createWritable();
      await writer.write(
        JSON.stringify({ versionId: "test-version", at: Date.now() })
      );
      await writer.close();

      if (consumer === "listing") {
        const entry = (await listQueuedFiles(LOCAL_QUEUE, true)).find(
          (item) => item.fileId === fileId
        );
        expect(entry?.isUploaded).toBe(false);
      } else {
        const { files } = await exportQueuedFiles(
          LOCAL_QUEUE,
          async () => null,
          false
        );
        expect(files.map((file) => file.fileId)).toContain(fileId);
      }
    }
  );

  it("keeps a fence's covered generation mark until its settle clears the deleted mark, so a settle retried after a failed removal releases the capture", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const { fileId } = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    const covered = "1800000000000-00000000-0000-4000-8000-000000000001";
    await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      readLocalCopy(fileId) as never,
      { covered: [covered], listed: [] }
    );
    await writeLocalEntryFile(fileId, "deleted", "");
    await writeLocalEntryFile(fileId, `deleted.${covered}`);
    const getDirectory = navigator.storage.getDirectory;
    failEntryRemoval("deleted", 1);

    await expect(settleQueuedFileMarks(LOCAL_QUEUE, fileId)).rejects.toThrow();
    expect(opfs.list(LOCAL_QUEUE, `queued_${fileId}`)).toContain(
      `deleted.${covered}`
    );
    navigator.storage.getDirectory = getDirectory;
    await settleQueuedFileMarks(LOCAL_QUEUE, fileId);

    const marks = opfs.list(LOCAL_QUEUE, `queued_${fileId}`);
    expect(marks.filter((name) => name.startsWith("deleted"))).toEqual([]);
    expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(
      false
    );
  });

  it("rejects a strict listing whose publishing mark of an uploaded capture cannot be read, instead of counting it uploaded", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const { fileId } = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    await writeLocalEntryFile(fileId, "uploaded", "test-version");
    await writeLocalEntryFile(fileId, "publishing", "{}");
    const getDirectory = navigator.storage.getDirectory;
    const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
      new Proxy(dir, {
        get(target, key) {
          if (key === "getDirectoryHandle")
            return async (name: string, options?: { create?: boolean }) =>
              wrap(await target.getDirectoryHandle(name, options));
          if (key !== "getFileHandle") return Reflect.get(target, key);
          return async (name: string, options?: { create?: boolean }) => {
            if (name === "publishing")
              throw new DOMException(
                "The file system is busy",
                "NotReadableError"
              );
            return target.getFileHandle(name, options);
          };
        }
      });
    navigator.storage.getDirectory = async () => wrap(await getDirectory());

    await expect(listQueuedFiles(LOCAL_QUEUE, true)).rejects.toThrow(
      "The file system is busy"
    );
  });

  it("sets no stale mark at a settle for a generation mark that lands covered after its first scan", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const { fileId } = await capturePhoto();
    await settleLocalFileRecords();
    uninstall?.();
    uninstall = undefined;
    const earlier = "1800000000000-00000000-0000-4000-8000-000000000001";
    const late = "1800000000001-00000000-0000-4000-8000-000000000002";
    await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      readLocalCopy(fileId) as never,
      { covered: [earlier, late], listed: [] }
    );
    await writeLocalEntryFile(fileId, `stale.${earlier}`);
    const getDirectory = navigator.storage.getDirectory;
    const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
      new Proxy(dir, {
        get(target, key) {
          if (key === "getDirectoryHandle")
            return async (name: string, options?: { create?: boolean }) =>
              wrap(await target.getDirectoryHandle(name, options));
          if (key !== "removeEntry") return Reflect.get(target, key);
          return async (name: string) => {
            if (name === `stale.${earlier}`)
              await writeLocalEntryFile(fileId, `stale.${late}`);
            return target.removeEntry(name);
          };
        }
      });
    navigator.storage.getDirectory = async () => wrap(await getDirectory());

    await settleQueuedFileMarks(LOCAL_QUEUE, fileId);

    expect(opfs.list(LOCAL_QUEUE, `queued_${fileId}`)).not.toContain("stale");
    expect(
      (await listQueuedFiles(LOCAL_QUEUE, true))[0]?.stale
    ).toBeUndefined();
  });

  it.each([
    ["beside a covered generation's mark", false],
    ["whose copy lists an empty covered token", true]
  ])(
    "keeps a restored claimed capture held once signed in by its backup's deleted mark %s",
    async (_, isEmptyToken) => {
      const record = await captureThenSignOutDuringUpload();
      await settleLocalFileRecords();
      const { fileId } = record;
      const entry = `queued_${fileId}`;
      const covered = "1800000000000-00000000-0000-4000-8000-000000000001";
      await writeQueuedFileRecord(
        LOCAL_QUEUE,
        fileId,
        readLocalCopy(fileId) as never,
        { covered: [covered], listed: [] }
      );
      await writeLocalEntryFile(fileId, "deleted", "");
      if (!isEmptyToken)
        await writeLocalEntryFile(fileId, `deleted.${covered}`);
      const { files } = await exportQueuedFiles(LOCAL_QUEUE, async () => null);
      const [copy] = files;
      const backup = isEmptyToken
        ? { ...copy, record: { ...copy.record, covered: [""] } }
        : copy;
      const root = await opfs.getDirectory();
      const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
      await queue.removeEntry(entry, { recursive: true });

      await restoreLocalQueuedFiles([backup as never], () => false);
      expect(opfs.list(LOCAL_QUEUE, entry)).not.toContain(`deleted.${covered}`);
      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();

      expect(await readAnyRecord(record.id)).toBeUndefined();
      expect(opfs.list(LOCAL_QUEUE, entry)).toContain("deleted");
      expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(
        true
      );
    }
  );

  it("restores no capture unheld whose backup holds the forced deleted mark beside a leftover covered generation's", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();
    const copy = readLocalCopy(record.fileId);
    const generation = String(
      (copy?.covered as string[]).find((token) => /^\d+-/.test(token))
    );
    // A clear stopped before it removed this covered mark.
    await writeLocalEntryFile(record.fileId, `deleted.${generation}`);
    const { files } = await exportQueuedFiles(LOCAL_QUEUE, async () => null);
    const [backup] = files;
    // A backup whose guest record is gone forces a deleted mark.
    const marks = [...(backup.marks ?? []), { name: "deleted", text: "" }];

    expect(isRestorableLocalCopy({ ...backup, marks })).toBe(false);
    expect(isRestorableLocalCopy(backup)).toBe(true);
  });

  it("holds a capture an earlier build's tab changes again under the same pending key after a pass verified a copy of its earlier change, before that tab's fence lands", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const namespace = String(readLocalCopy(record.fileId)?.namespace);
    const key = `${LOCAL_QUEUE}-pending:${[namespace, record.id].map(encodeURIComponent).join(":")}`;
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "first.png" },
      silent: true
    } as never);
    localStorage.setItem(key, "change:00000000-0000-4000-8000-000000000001");
    await openData();
    await settleTasks();
    expect(readLocalCopy(record.fileId)?.name).toBe("first.png");
    expect(localStorage.getItem(key)).toBeNull();

    // The earlier build reuses the key for its next change, and its fence
    // has not landed.
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "second.png" },
      silent: true
    } as never);
    localStorage.setItem(key, "change:00000000-0000-4000-8000-000000000002");
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("keeps a capture held only by a stale mark held while its pass stopped between its first copy write and its reread", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    const control = await capturePhoto();
    await settleLocalFileRecords();
    // An earlier build's fence: its plain mark alone.
    await writeLocalEntryFile(record.fileId, "stale", "changed");
    const stop = deferred<void>();
    onTestFinished(() => stop.resolve());
    let lookups = 0;
    let isStopped = false;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id || ++lookups < 2) return;
      fileCalls.beforeQuery = null;
      isStopped = true;
      await stop.promise;
      throw new Error("The page closed");
    };
    await datafn.file.mutate({
      operation: "merge",
      id: control.id,
      record: { id: control.id, name: "control.png" }
    } as never);
    await vi.waitFor(() => expect(isStopped).toBe(true));

    const [held] = (await listQueuedFiles(LOCAL_QUEUE, true)).filter(
      (entry) => entry.fileId === record.fileId
    );
    expect(held?.stale).toBeDefined();
    expect(opfs.list(LOCAL_QUEUE, `queued_${record.fileId}`)).toContain(
      "stale"
    );
  });

  it("releases this tab's memory-only change once another tab's verified copy covers it, however many changes later copies cover", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // This tab renames the record while another tab holds the queue's lock;
    // its pending entry cannot be stored, and its pass runs only once the
    // sign-in left the guest namespace.
    const gate = deferred<void>();
    const lockedTab = withQueueLock(
      LOCAL_QUEUE,
      new AbortController().signal,
      () => gate.promise
    );
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      if (!key.includes("-pending:")) return setItem.call(this, key, value);
      throw new DOMException("The storage is full", "QuotaExceededError");
    });
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    const entry = `queued_${record.fileId}`;
    await vi.waitFor(() =>
      expect(
        opfs.list(LOCAL_QUEUE, entry).some((n) => n.startsWith("stale."))
      ).toBe(true)
    );
    await signInToCloud("user-a");
    gate.resolve();
    await lockedTab;
    await settleTasks();

    // Another tab's pass lists the fence's marks, verifies the copy, then
    // its later passes cover 150 more changes of the record.
    await withQueueLock(LOCAL_QUEUE, new AbortController().signal, async () => {
      const copy = { ...readLocalCopy(record.fileId), name: "receipt.png" };
      const listed = await writeQueuedFileRecord(
        LOCAL_QUEUE,
        record.fileId,
        copy as never,
        "unverified"
      );
      await writeQueuedFileRecord(LOCAL_QUEUE, record.fileId, copy as never, {
        covered: [],
        listed
      });
      for (let later = 0; later < 150; later++) {
        const id = String(later).padStart(12, "0");
        const covered = [`${Date.now()}-00000000-0000-4000-8000-${id}`];
        await writeQueuedFileRecord(LOCAL_QUEUE, record.fileId, copy as never, {
          covered,
          listed: []
        });
      }
    });
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.name).toBe("receipt.png")
    );
  });

  it("holds a restored capture by a mark its backup's copy does not cover, keeping that copy's cover, and restores no malformed generation mark", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const { files } = await exportQueuedFiles(LOCAL_QUEUE, async () => null);
    const [copy] = files;
    const covered = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    const uncovered = `${Date.now()}-00000000-0000-4000-8000-000000000002`;
    const restored = {
      ...copy,
      record: { ...copy.record!, covered: [covered] },
      marks: [
        ...(copy.marks ?? []),
        { name: `stale.${covered}`, text: "" },
        { name: `stale.${uncovered}`, text: "" }
      ]
    };
    for (const name of ["stale.", `stale.${covered}\nstale`])
      await expect(
        restoreLocalQueuedFiles(
          [{ ...restored, marks: [...restored.marks, { name, text: "" }] }],
          () => false
        )
      ).rejects.toThrow();
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
    await queue.removeEntry(`queued_${record.fileId}`, { recursive: true });
    await restoreLocalQueuedFiles([restored], () => false);
    expect(readLocalCopy(record.fileId)?.covered).toEqual([covered]);

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("keeps a restored claimed capture held once signed in by its backup's deleted mark that names a delete its copy covers, and publishes nothing", async () => {
    const record = await captureThenSignOutDuringUpload();
    await settleLocalFileRecords();
    const { fileId } = record;
    const entry = `queued_${fileId}`;
    const covered = `${Date.now()}-00000000-0000-4000-8000-000000000001`;
    // A delete fence that paused across a verified copy covering its delete
    // left its deleted mark naming that delete; the record that copy is of
    // is then deleted before its own fence, and a guest backup is taken.
    await writeQueuedFileRecord(
      LOCAL_QUEUE,
      fileId,
      readLocalCopy(fileId) as never,
      { covered: [covered], listed: [] }
    );
    await writeLocalEntryFile(fileId, "deleted", covered);
    const { files } = await exportQueuedFiles(LOCAL_QUEUE, async () => null);
    const [copy] = files;
    expect(copy.claim).toBeDefined();
    expect(copy.marks).toContainEqual({ name: "deleted", text: covered });
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
    await queue.removeEntry(entry, { recursive: true });

    await restoreLocalQueuedFiles([copy], () => false);
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(opfs.list(LOCAL_QUEUE, entry)).toContain("deleted");
    expect((await listQueuedFiles(LOCAL_QUEUE, true))[0]?.isDeleted).toBe(true);
  });

  it("decides nothing on a runtime that replaced the one the publisher was created with, even in the same namespace", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const store = await vi.importActual<
      typeof import("@nucleum/datafn/datafn.store")
    >("@nucleum/datafn/datafn.store");
    let pulls = 0;
    let isReplaced = false;
    fileCalls.onPull = async () => {
      pulls += 1;
      if (!sdk.uploads.length || isReplaced) return;
      isReplaced = true;
      store.datafnRuntime.update((runtime) => runtime && { ...runtime });
    };
    const insertedAt: number[] = [];
    fileCalls.beforeMutate = async (args) => {
      const [first] = Array.isArray(args) ? args : [args];
      if ((first as { id?: string })?.id === record.id) insertedAt.push(pulls);
    };

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    await replayLocalQueue();

    await vi.waitFor(async () =>
      expect((await readAnyRecord(record.id))?.fileId).toBe(record.fileId)
    );
    expect(isReplaced).toBe(true);
    const replacedAt = insertedAt.length ? Math.min(...insertedAt) : 0;
    expect(replacedAt).toBeGreaterThan(1);
  });

  it("makes no mutation in either namespace when another account signs in while the publish rereads its local file", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    let isArmed = false;
    let isSwitched = false;
    fileCalls.beforeQuery = async (args) => {
      const filters = (args as { filters?: { id?: string } })?.filters;
      if (filters?.id === record.id && !isSwitched) isArmed = true;
    };
    const getDirectory = navigator.storage.getDirectory;
    const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
      new Proxy(dir, {
        get(target, key) {
          if (key === "getDirectoryHandle") {
            return async (name: string, options?: { create?: boolean }) =>
              wrap(await target.getDirectoryHandle(name, options));
          }
          if (key !== "getFileHandle") return Reflect.get(target, key);
          return async (name: string, options?: { create?: boolean }) => {
            const file = await target.getFileHandle(name, options);
            if (name !== "record.json") return file;
            const getFile = async () => {
              if (isArmed && !isSwitched) {
                isSwitched = true;
                await signInToCloud("user-b");
              }
              return file.getFile();
            };
            return { ...file, getFile };
          };
        }
      });
    navigator.storage.getDirectory = async () => wrap(await getDirectory());
    const mutated: string[] = [];
    fileCalls.beforeMutate = async (args) => {
      const [first] = Array.isArray(args) ? args : [args];
      if ((first as { id?: string })?.id === record.id) {
        mutated.push(datafn.currentNamespace() ?? "");
      }
    };

    await signInToCloud("user-a");
    await vi.waitFor(() => expect(isSwitched).toBe(true));
    await settleTasks();

    expect(mutated).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
    const entry = `queued_${record.fileId}`;
    expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeUndefined();
    expect(opfs.list(LOCAL_QUEUE)).toEqual([entry]);
  });

  it("marks a capture uploaded before deleting its upload for an account record that holds another file, so no later replay publishes it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await openData("user-a");
    await datafn.file.mutate({
      operation: "insert",
      id: record.id,
      record: { name: "restored.png", type: "image/png", fileId: "file_other" }
    } as never);
    // Another tab fences the capture while the publish pulls.
    fileCalls.onPull = async () => {
      if (!sdk.uploads.length) return;
      fileCalls.onPull = null;
      await writeLocalEntryFile(record.fileId, "stale");
    };

    await signInToCloud("user-a");
    await vi.waitFor(() => expect(sdk.deletes).toEqual([record.fileId]));
    const entry = `queued_${record.fileId}`;
    expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await signOutToLocal();
    await settleTasks();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.uploads).toHaveLength(1);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("keeps an upload another account record references when the record of the capture's ID holds another file", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await openData("user-a");
    await datafn.file.mutate([
      {
        operation: "insert",
        id: record.id,
        record: {
          name: "restored.png",
          type: "image/png",
          fileId: "file_other"
        }
      },
      {
        operation: "insert",
        id: crypto.randomUUID(),
        record: { name: "photo.png", type: "image/png", fileId: record.fileId }
      }
    ] as never);

    await signInToCloud("user-a");
    const entry = `queued_${record.fileId}`;
    await vi.waitFor(() =>
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
    );
    await settleTasks();

    expect(sdk.uploads.length).toBeGreaterThan(0);
    expect(sdk.deletes).toEqual([]);
    expect((await readAnyRecord(record.id))?.fileId).toBe("file_other");
  });

  it("marks a local file stale when its record changes in another tab after this tab's pass read it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // Once this tab's pass has read the renamed record, another tab, whose
    // changes this tab does not see, renames it again and marks its local
    // file stale without the queue's lock.
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      fileCalls.beforeQuery = null;
      return async (result: unknown) => {
        uninstall?.();
        uninstall = undefined;
        await datafn.file.mutate({
          operation: "merge",
          id: record.id,
          record: { id: record.id, name: "scan.png" }
        } as never);
        await writeLocalEntryFile(record.fileId, "stale");
        return result;
      };
    };

    await renamePhotoAndSettle(record.id);

    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeDefined();
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.started).toEqual([]);
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("copies the record that took over a capture's file when the removal's reread finds it, and publishes that record only", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const replacementId = `${record.id}-copy`;
    let lookups = 0;
    // Another tab saves a record referencing the file between the lookup
    // that found none and the removal's reread.
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { fileId?: string } };
      if (filters?.fileId !== record.fileId || ++lookups !== 2) return;
      await datafn.file.mutate({
        operation: "insert",
        id: replacementId,
        record: { name: "copy.png", type: "image/png", fileId: record.fileId }
      } as never);
    };

    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    fileCalls.beforeQuery = null;
    // The insert's own change pass copies the record again.
    await settleTasks();

    expect(lookups).toBeGreaterThan(2);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
    expect(readLocalCopy(record.fileId)?.id).toBe(replacementId);
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeUndefined();
    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect(await savedRecord(replacementId)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "copy.png" })
      )
    );
    expect(await readAnyRecord(record.id)).toBeUndefined();
  });

  it("sends no thumbnail once offline mode starts during the upload and sends it with the next replay", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    const upload = deferred<void>();
    sdk.hold = upload.promise;

    await signInToCloud("user-a");
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    context.update((value) => ({ ...value, isInOfflineMode: true }));
    upload.resolve();
    await settleTasks();

    expect(sdk.artifacts).toEqual([]);
    const entry = `queued_${record.fileId}`;
    expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeUndefined();
    expect(await readAnyRecord(record.id)).toBeUndefined();

    context.update((value) => ({ ...value, isInOfflineMode: false }));
    await vi.waitFor(() =>
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
    );
    expect(sdk.artifacts).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
  });

  it("records the delete of an upload whose ID an account record holds instead of sending it in offline mode", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    await openData("user-a");
    await datafn.file.mutate({
      operation: "insert",
      id: record.id,
      record: { name: "restored.png", type: "image/png", fileId: "file_other" }
    } as never);
    // Offline mode starts once the upload is done, before the publish.
    fileCalls.onPull = async () => {
      if (!sdk.uploads.length) return;
      fileCalls.onPull = null;
      context.update((value) => ({ ...value, isInOfflineMode: true }));
    };

    await signInToCloud("user-a");
    const entry = `queued_${record.fileId}`;
    await vi.waitFor(() =>
      expect(opfs.read(LOCAL_QUEUE, entry, "uploaded")).toBeDefined()
    );
    await settleTasks();
    expect(sdk.deletes).toEqual([]);

    context.update((value) => ({ ...value, isInOfflineMode: false }));
    goOnline();
    await vi.waitFor(() => expect(sdk.deletes).toEqual([record.fileId]));
    expect((await savedRecord(record.id))?.fileId).toBe("file_other");
  });

  it("keeps a committed capture whose local-only record is deleted while Web Locks cannot fence other tabs", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "committed")
    ).toBeDefined();

    webLocks = undefined;
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();

    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
  });

  it("keeps the staged capture of a guest save that fails while Web Locks cannot fence other tabs", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    webLocks = undefined;
    fileCalls.beforeMutate = async () => {
      throw new Error("The record save failed");
    };

    await expect(capturePhoto()).rejects.toThrow();
    await settleLocalFileRecords();

    const [entry] = opfs.list(LOCAL_QUEUE);
    expect(entry).toMatch(/^queued_/);
    expect(opfs.read(LOCAL_QUEUE, entry, "committed")).toBeUndefined();
  });

  it("keeps the bytes of a guest capture whose record saved although its save reported a failure, and commits it with its record", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    let saved: { id: string; record: { fileId: string } } | undefined;
    fileCalls.beforeMutate = async (args) => {
      fileCalls.beforeMutate = null;
      saved = args as typeof saved;
      return () => ({ ok: false, error: new Error("The save timed out") });
    };

    await expect(capturePhoto()).rejects.toThrow();
    await settleTasks();

    const fileId = saved?.record.fileId ?? "";
    expect((await savedRecord(saved?.id ?? ""))?.fileId).toBe(fileId);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${fileId}`]);
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${fileId}`, "committed")
    ).toBeDefined();
    expect(readLocalCopy(fileId)?.id).toBe(saved?.id);
  });

  it("removes the staged capture of a failed guest save only once a pass finds it abandoned and no record referencing it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    fileCalls.beforeMutate = async () => {
      fileCalls.beforeMutate = null;
      throw new Error("The record save failed");
    };
    await expect(capturePhoto()).rejects.toThrow();
    const [entry] = opfs.list(LOCAL_QUEUE);
    await openData();
    await settleTasks();
    expect(opfs.list(LOCAL_QUEUE)).toEqual([entry]);

    const now = Date.now() + 25 * 60 * 60_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const lookups: unknown[] = [];
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { fileId?: string } };
      if (`queued_${filters?.fileId}` === entry) lookups.push(filters);
    };
    await openData();
    await settleTasks();

    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
    // One lookup decides the capture is unused, and the removal reads again.
    expect(lookups.length).toBeGreaterThan(1);
  });

  it("keeps a capture a record references again by the time its removal would run", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // The pass's first lookup by file misses the record that takes the file
    // over, as one read before that record saved does.
    let lookups = 0;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { fileId?: string } };
      if (filters?.fileId !== record.fileId || ++lookups > 1) return;
      return () => ({ data: [] });
    };
    const copy = crypto.randomUUID();
    await datafn.file.mutate([
      {
        operation: "insert",
        id: copy,
        record: { name: "copy.png", type: "image/png", fileId: record.fileId }
      },
      { operation: "delete", id: record.id }
    ] as never);
    await settleLocalFileRecords();

    expect(lookups).toBeGreaterThan(1);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
  });

  it("keeps a capture while a lookup of the records that reference its file cannot tell whether one does", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // Each lookup by file resolves without a list of records, as a failed
    // query does.
    let lookups = 0;
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { fileId?: string } };
      if (filters?.fileId !== record.fileId) return;
      lookups += 1;
      return () => ({ error: new Error("The query failed") });
    };
    const copy = crypto.randomUUID();
    await datafn.file.mutate([
      {
        operation: "insert",
        id: copy,
        record: { name: "copy.png", type: "image/png", fileId: record.fileId }
      },
      { operation: "delete", id: record.id }
    ] as never);
    await settleLocalFileRecords();

    expect(lookups).toBeGreaterThan(0);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
  });

  it("decides a first publish on the account's records pulled from its authority, leaving one the authority already holds unchanged", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // The authority holds a record with the capture's ID (restored on another
    // device) that reaches this device with the first pull after the upload.
    const restored = { name: "restored.png", type: "image/png" };
    let isPulled = false;
    fileCalls.onPull = async () => {
      if (isPulled || !sdk.uploads.length) return;
      isPulled = true;
      await datafn.file.mutate({
        operation: "insert",
        id: record.id,
        record: { ...restored, fileId: "file_other" }
      } as never);
    };

    await signInToCloud("user-a");

    await vi.waitFor(() => expect(sdk.deletes).toEqual([record.fileId]));
    await vi.waitFor(() =>
      expect(
        opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "uploaded")
      ).toBeDefined()
    );
    expect(await savedRecord(record.id)).toEqual(
      expect.objectContaining({ ...restored, fileId: "file_other" })
    );
  });

  it("publishes nothing and marks nothing uploaded while the account's records cannot be pulled", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    fileCalls.onPull = async () => "fail";

    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(sdk.uploads.length).toBeGreaterThan(0);
    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "uploaded")
    ).toBeUndefined();

    fileCalls.onPull = null;
    await replayLocalQueue();
    await vi.waitFor(async () =>
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId)
    );
  });

  it("never shows or retries a failed local file for the guest while its claim cannot be read", async () => {
    const record = await captureThenSignOutDuringUpload();
    await writeLocalEntryFile(record.fileId, "failed-base");
    failEntryFile("claim.json");

    const isFailed = isQueuedFileFailed([LOCAL_QUEUE], record.fileId, null);
    await expect(isFailed.catch(() => false)).resolves.toBe(false);
    const retry = retryFailedQueuedFile([LOCAL_QUEUE], record.fileId, null);
    await expect(retry.catch(() => false)).resolves.toBe(false);
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "failed-base")
    ).toBeDefined();
  });

  it("neither uploads, publishes nor deletes a local file without Web Locks, which leave other tabs unfenced", async () => {
    const record = await captureThenSignOutDuringUpload();
    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    const kept = await capturePhoto();
    await settleLocalFileRecords();

    webLocks = undefined;
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.started).toHaveLength(1);
    expect(sdk.deletes).toEqual([]);
    expect(await savedRecord(kept.id)).toBeUndefined();
    expect(opfs.list(LOCAL_QUEUE).sort()).toEqual(
      [`queued_${record.fileId}`, `queued_${kept.fileId}`].sort()
    );
  });

  it("never uploads or claims a local file for another account while its claim cannot be read", async () => {
    const record = await captureThenSignOutDuringUpload();
    const claim = opfs.read(
      LOCAL_QUEUE,
      `queued_${record.fileId}`,
      "claim.json"
    );
    expect(claim).toBeDefined();

    failEntryFile("claim.json");
    await signInToCloud("user-b");
    await replayLocalQueue();
    await settleTasks();

    expect(sdk.started).toHaveLength(1);
    expect(await savedRecord(record.id)).toBeUndefined();
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "claim.json")
    ).toEqual(claim);
  });

  it.each(["", "{"])(
    "never uploads, publishes or deletes a claimed local file for any account while its claim.json reads %j",
    async (text) => {
      const record = await captureThenSignOutDuringUpload();
      await writeLocalEntryFile(record.fileId, "claim.json", text);

      for (const userId of ["user-b", "user-a"]) {
        await signInToCloud(userId);
        await replayLocalQueue();
        await settleTasks();
        expect(sdk.started).toHaveLength(1);
        expect(await savedRecord(record.id)).toBeUndefined();
      }
      await signOutToLocal();
      await datafn.file.mutate({ operation: "delete", id: record.id } as never);
      await settleLocalFileRecords();
      await signInToCloud("user-a");
      await replayLocalQueue();
      await settleTasks();

      expect(sdk.started).toHaveLength(1);
      expect(sdk.deletes).toEqual([]);
      expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
      const claim = opfs.read(
        LOCAL_QUEUE,
        `queued_${record.fileId}`,
        "claim.json"
      );
      expect(claim && new TextDecoder().decode(claim)).toBe(text);
    }
  );

  it("sends an orphaned capture's recorded delete only while no record of the claiming account references its file, and drops one a record references", async () => {
    const referenced = await captureThenSignOutDuringUpload();
    const claim = opfs.read(
      LOCAL_QUEUE,
      `queued_${referenced.fileId}`,
      "claim.json"
    );
    const unreferenced = await capturePhoto();
    await settleLocalFileRecords();
    await writeLocalEntryFile(
      unreferenced.fileId,
      "claim.json",
      new TextDecoder().decode(claim)
    );
    for (const { id } of [referenced, unreferenced])
      await datafn.file.mutate({ operation: "delete", id } as never);
    await settleLocalFileRecords();
    // The settles find the app offline and record the deletes.
    hookEntryFiles({
      create: (name) => {
        if (name !== "discarded") return;
        context.update((value) => ({ ...value, isInOfflineMode: true }));
      }
    });
    await signInToCloud("user-a");
    await replayLocalQueue();
    await settleTasks();
    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
    expect(sdk.deletes).toEqual([]);

    // Another device published a record of one file; a record without a
    // file references neither.
    const published = { name: "photo.png", type: "image/png" };
    for (const [id, fileId] of [
      ["published", referenced.fileId],
      ["fileless", undefined]
    ])
      await datafn.file.mutate({
        operation: "insert",
        id,
        record: { ...published, ...(fileId && { fileId }) }
      } as never);
    context.update((value) => ({ ...value, isInOfflineMode: false }));
    goOnline();
    await vi.waitFor(() => expect(sdk.deletes).toEqual([unreferenced.fileId]));

    await datafn.file.mutate({ operation: "delete", id: "published" } as never);
    goOnline();
    await settleTasks();
    expect(sdk.deletes).toEqual([unreferenced.fileId]);
  });

  /**
   * Signs in to user-a and records checked deletes of `fileIds` at its
   * authority, as a settle of orphaned captures that found the app offline.
   */
  async function recordCheckedDeletes(fileIds: string[]) {
    await bootData(localAccount);
    await signInToCloud("user-a");
    await settleTasks();
    const uploader = await captureFileQueueUploader();
    for (const fileId of fileIds)
      await recordFileFnPendingDelete(uploader!, fileId, true);
  }

  /** Inserts an account record that references the file. */
  async function insertReference(fileId: string) {
    await datafn.file.mutate({
      operation: "insert",
      id: `record_${fileId}`,
      record: { name: "photo.png", type: "image/png", fileId }
    } as never);
  }

  it("pulls the account's records again for each checked delete, so a record that arrives during an earlier delete keeps its file", async () => {
    const fileIds = ["file_first", "file_second", "file_third"];
    await recordCheckedDeletes(fileIds);
    let referenced: string | undefined;
    fileCalls.onPull = async () => {
      if (sdk.deletes.length !== 1 || referenced) return;
      referenced = fileIds.find((fileId) => !sdk.deletes.includes(fileId))!;
      await insertReference(referenced);
    };

    goOnline();
    await vi.waitFor(() => expect(sdk.deletes).toHaveLength(2));
    await settleTasks();
    goOnline();
    await settleTasks();
    expect(sdk.deletes).toHaveLength(2);
    expect(sdk.deletes).not.toContain(referenced);
  });

  it("sends a checked delete only on records pulled in the DataFn runtime that answers, not one reopened during the pull", async () => {
    const fileIds = ["file_first", "file_second"];
    await recordCheckedDeletes(fileIds);
    const store = await vi.importActual<
      typeof import("@nucleum/datafn/datafn.store")
    >("@nucleum/datafn/datafn.store");
    let pulls = 0;
    let replacedAt: number | undefined;
    fileCalls.onPull = async () => {
      pulls += 1;
      if (sdk.deletes.length !== 1 || replacedAt !== undefined) return;
      replacedAt = pulls;
      store.datafnRuntime.update((runtime) => runtime && { ...runtime });
    };
    // How many pulls began in the runtime that replaced it, at each delete.
    const pullsSinceReplaced: number[] = [];
    sdk.onDelete = async () => {
      pullsSinceReplaced.push(pulls - (replacedAt ?? pulls + 1));
    };

    goOnline();
    await vi.waitFor(() => expect(sdk.deletes.sort()).toEqual(fileIds));
    sdk.onDelete = null;
    expect(pullsSinceReplaced[0]).toBe(-1);
    expect(pullsSinceReplaced[1]).toBeGreaterThan(0);
  });

  /** Has each delete's request dispatched through its client's fetch. */
  function dispatchDeletes(before: (fileId: string) => Promise<void>) {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    sdk.beforeDelete = async (fileId, dispatch) => {
      await before(fileId);
      await dispatch(`https://files.example.test/files/${fileId}`, {
        method: "DELETE"
      });
    };
  }

  it("sends no checked delete whose file a record references once it was found unreferenced, and keeps it until a drain finds the reference", async () => {
    await recordCheckedDeletes(["file_referenced", "file_unreferenced"]);
    const attempts: string[] = [];
    dispatchDeletes(async (fileId) => {
      attempts.push(fileId);
      if (fileId !== "file_referenced") return;
      // A record of the file arrives with a pull while the delete is sent.
      await insertReference(fileId);
      await datafn.sync.pullNow();
    });

    goOnline();
    await vi.waitFor(() => expect(sdk.deletes).toEqual(["file_unreferenced"]));
    goOnline();
    await settleTasks();
    sdk.beforeDelete = null;
    expect(attempts.filter((id) => id === "file_referenced")).toHaveLength(1);
    expect(sdk.deletes).toEqual(["file_unreferenced"]);
  });

  it("sends no checked delete once its DataFn runtime was replaced after its check, and sends it on a later drain that checks it again", async () => {
    await recordCheckedDeletes(["file_unreferenced"]);
    const store = await vi.importActual<
      typeof import("@nucleum/datafn/datafn.store")
    >("@nucleum/datafn/datafn.store");
    let refused = 0;
    dispatchDeletes(async () => {
      if (refused++) return;
      store.datafnRuntime.update((runtime) => runtime && { ...runtime });
    });

    goOnline();
    await vi.waitFor(() => expect(sdk.deletes).toEqual(["file_unreferenced"]));
    sdk.beforeDelete = null;
    expect(refused).toBe(2);
  });

  it("records a checked delete without device file storage where a build that sends every delete unchecked never reads it", async () => {
    vi.spyOn(navigator.storage, "getDirectory").mockImplementation(async () => {
      const root = await opfs.getDirectory();
      return {
        ...root,
        getDirectoryHandle: (name: string, options?: object) =>
          name.startsWith("filefn-pending-deletes")
            ? Promise.reject(new DOMException("Denied", "NotAllowedError"))
            : root.getDirectoryHandle(name, options)
      } as FileSystemDirectoryHandle;
    });
    await bootData(localAccount);
    await signInToCloud("user-a");
    await settleTasks();
    const uploader = (await captureFileQueueUploader())!;
    await recordFileFnPendingDelete(uploader, "file_checked", true);
    await recordFileFnPendingDelete(uploader, "file_checked");
    await recordFileFnPendingDelete(uploader, "file_legacy");
    const keys = Object.keys(localStorage);
    expect(keys.filter((key) => key.includes("file_checked"))).toHaveLength(1);
    const legacy = keys.filter((key) =>
      key.startsWith("filefn-pending-deletes")
    );
    expect(legacy.map((key) => key.split(":").pop())).toEqual(["file_legacy"]);
    await insertReference("file_checked");

    goOnline();
    await vi.waitFor(() => expect(sdk.deletes).toEqual(["file_legacy"]));
    await settleTasks();
    expect(sdk.deletes).toEqual(["file_legacy"]);
    expect(
      Object.keys(localStorage).filter((key) => key.includes("deletes"))
    ).toEqual([]);
  });

  it("keeps a delete recorded checked checked when this session also holds it unchecked", async () => {
    vi.spyOn(navigator.storage, "getDirectory").mockImplementation(async () => {
      const root = await opfs.getDirectory();
      return {
        ...root,
        getDirectoryHandle: (name: string, options?: object) =>
          name.startsWith("filefn-pending-deletes")
            ? Promise.reject(new DOMException("Denied", "NotAllowedError"))
            : root.getDirectoryHandle(name, options)
      } as FileSystemDirectoryHandle;
    });
    await bootData(localAccount);
    await signInToCloud("user-a");
    await settleTasks();
    const uploader = (await captureFileQueueUploader())!;
    // Local storage refused the unchecked record, which this session keeps.
    const { setItem } = Storage.prototype;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key,
      value
    ) {
      if (key.startsWith("filefn-pending-") && key.includes("file_referenced"))
        throw new DOMException("Full", "QuotaExceededError");
      setItem.call(this, key, value);
    });
    await recordFileFnPendingDelete(uploader, "file_referenced");
    await recordFileFnPendingDelete(uploader, "file_referenced", true);
    await recordFileFnPendingDelete(uploader, "file_unreferenced", true);
    await insertReference("file_referenced");

    goOnline();
    await vi.waitFor(() => expect(sdk.deletes).toEqual(["file_unreferenced"]));
    await settleTasks();
    expect(sdk.deletes).toEqual(["file_unreferenced"]);
  });

  it("keeps a capture from an earlier guest namespace and publishes it at the first cloud sign-in", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();

    // A sign-out cleared the device's DataFn ID: a new guest namespace opens,
    // which holds no record of the earlier guest's capture.
    await signOutToLocal(true);
    await settleLocalFileRecords();
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);

    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId)
    );
    expect(sdk.uploads.map((upload) => upload.fileId)).toEqual([record.fileId]);
    expect(sdk.deletes).toEqual([]);
  });

  it("publishes a claimed capture at its account after a sign-out opened a new guest namespace", async () => {
    const record = await captureThenSignOutDuringUpload(true);
    await settleLocalFileRecords();
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeUndefined();

    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId)
    );
    expect(sdk.deletes).toEqual([]);
    expect(sdk.started.map((upload) => upload.idempotencyKey)).toEqual([
      `queued_${record.fileId}:0`,
      `queued_${record.fileId}:0`
    ]);
  });

  it("uploads a local-only user's capture only once a live session confirms the cloud account", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();

    // A cached cloud session restored: its client binds and sends nothing.
    account.set(cloudAccount("user-a"));
    startAccountUploadReplay();
    await openData("user-a");
    goOnline();
    await vi.waitFor(() => expect(sdk.baseUrls).not.toEqual([]));
    await settleTasks();
    expect(sdk.started).toEqual([]);

    // A live session of another user contradicts the account.
    confirmLiveSession("user-b");
    account.set(cloudAccount("user-a"));
    goOnline();
    await settleTasks();
    expect(sdk.started).toEqual([]);

    confirmLiveSession("user-a");

    await vi.waitFor(async () =>
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId)
    );
    expect(sdk.uploads.map((upload) => upload.fileId)).toEqual([record.fileId]);
  });

  it("uploads a local-only user's capture when the app's offline mode ends", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    context.update((value) => ({ ...value, isInOfflineMode: true }));

    await signInToCloud("user-a");
    await vi.waitFor(() => expect(sdk.baseUrls).not.toEqual([]));
    await settleTasks();
    expect(sdk.started).toEqual([]);

    context.update((value) => ({ ...value, isInOfflineMode: false }));

    await vi.waitFor(async () =>
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId)
    );
  });

  it("keeps the bytes on the record of a capture made after sign-out while DataFn still holds the account's data", async () => {
    await bootData(cloudAccount("user-a"));
    uninstall = installDeviceFileQueue();
    // Signed out: no cloud account, but DataFn has not left the account's data.
    account.set(localAccount);

    const record = await capturePhoto();

    const saved = await savedRecord(record.id);
    expect(saved?.fileId).toBeUndefined();
    expect(new TextDecoder().decode(saved?.data as Uint8Array)).toBe(
      "photo bytes"
    );
    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
    expect(opfs.list("nucleum-file-queue-account-user-a")).toEqual([]);
  });

  it("never uploads an offline capture whose record did not save, even when the queue replays while it is staged", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const stage = OPFSStore.prototype.stagePendingUpload;
    vi.spyOn(OPFSStore.prototype, "stagePendingUpload").mockImplementation(
      async function (this: InstanceType<typeof OPFSStore>, pending) {
        await stage.call(this, pending);
        isOnline = true;
        const uploader = await captureFileQueueUploader();
        if (!uploader) throw new Error("No FileFn client");
        await replayFileQueue(
          "nucleum-file-queue-account-user-a",
          uploader.client,
          uploader.signal
        );
        // DataFn moves to another account's data: the record save is fenced.
        await openData("user-b");
      }
    );

    await expect(capturePhoto()).rejects.toThrow();

    expect(sdk.started).toEqual([]);
    expect(opfs.list("nucleum-file-queue-account-user-a")).toEqual([]);
  });

  it("keeps the bytes on the record when the device has no private file system", async () => {
    const { storage: _storage, ...withoutStorage } = globalThis.navigator;
    vi.stubGlobal("navigator", { ...withoutStorage, onLine: false });
    await bootData(cloudAccount("user-a"));

    const record = await capturePhoto();

    const saved = await savedRecord(record.id);
    expect(saved?.fileId).toBeUndefined();
    expect(new TextDecoder().decode(saved?.data as Uint8Array)).toBe(
      "photo bytes"
    );
  });

  it.each([
    ["another account signs in", () => account.set(cloudAccount("user-b"))],
    [
      "the account signs out",
      () =>
        account.set({
          dataMode: UserDataMode.NONE,
          sessionType: UserSessionType.UNDETERMINED
        })
    ]
  ])(
    "does not show an account's queued file when %s while it is read",
    async (_case, leave) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const gate = deferred<void>();
      const getDirectory = opfs.getDirectory;
      vi.stubGlobal("navigator", {
        ...globalThis.navigator,
        storage: {
          getDirectory: async () => {
            await gate.promise;
            return getDirectory();
          }
        }
      });

      const lookup = resolveFileUrl(record.fileId, "full");
      leave();
      gate.resolve();

      expect(await lookup).toBeUndefined();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:queued");
    }
  );
});

// Reloading resets the module registry, which later tests' imports would
// see, so these run last.
describe("guest changes a page reload interrupts", () => {
  /**
   * Reloads the page: the queue's modules and the account start again with
   * none of the earlier page's state, signed in to the cloud account, or
   * without `userId` in the device's guest namespace.
   */
  async function reloadPage(userId?: string) {
    uninstall?.();
    uninstall = undefined;
    vi.resetModules();
    const page = {
      account: (await import("@nucleum/client/runtime/account/account.store"))
        .default,
      queue: await import("./device-file-queue"),
      client: await import("./filefn-client")
    };
    onTestFinished(() => {
      page.client.endAccountUploadReplay();
      page.account.set({
        dataMode: UserDataMode.NONE,
        sessionType: UserSessionType.UNDETERMINED
      });
    });
    page.account.set(userId ? cloudAccount(userId) : localAccount);
    if (userId)
      page.client.startAccountUploadReplay({ userId, region: "useast" });
    await openData(userId);
    uninstall = page.queue.installDeviceFileQueue();
    await settleTasks();
    await page.queue.settleLocalFileRecords();
    return page;
  }

  it.each([
    ["was neither fenced nor copied", false],
    ["outlived an earlier change's later stale mark", true]
  ])(
    "never publishes a capture whose guest delete %s before the sign-in, after the default sign-out and a reload",
    async (_case, isMarkedLate) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      await settleLocalFileRecords();
      // The delete's mark cannot be written (or an earlier rename's fence,
      // which read no mark, writes its own after it), and the sign-in aborts
      // its pass as it reads the record.
      if (!isMarkedLate) failEntryFile("deleted", true, 1);
      fileCalls.beforeQuery = async (args) => {
        const { filters } = args as { filters?: { id?: string } };
        if (filters?.id !== record.id) return;
        fileCalls.beforeQuery = null;
        await signInToCloud("user-a");
      };
      await datafn.file.mutate({ operation: "delete", id: record.id } as never);
      await vi.waitFor(() =>
        expect(datafn.currentNamespace()).toBe("user:user-a")
      );
      await settleTasks();
      if (isMarkedLate)
        await writeLocalEntryFile(record.fileId, "stale", "changed");

      // The default sign-out clears the device's storage and DataFn ID; the
      // page reloads in a new guest namespace, then signs in.
      endAccountUploadReplay();
      localStorage.clear();
      device = { ...device, dapId: `device-${crypto.randomUUID()}` };
      const page = await reloadPage();
      // A capture made after the reload publishes: the replay ran.
      const control = await capturePhoto(
        (await import("./file-upload")).fileUpload
      );
      await page.queue.settleLocalFileRecords();
      page.account.set(cloudAccount("user-a"));
      page.client.startAccountUploadReplay({
        userId: "user-a",
        region: "useast"
      });
      await openData("user-a");
      const uploader = await page.client.captureFileQueueUploader();
      expect(uploader).toBeTruthy();
      await page.queue.uploadLocalQueuedFiles(
        uploader as NonNullable<typeof uploader>
      );
      await settleTasks();

      expect(sdk.started.map((input) => input.fileId)).toEqual([
        control.fileId
      ]);
      expect(await savedRecord(control.id)).toBeDefined();
      expect(await readAnyRecord(record.id)).toBeUndefined();
    }
  );

  it.each(["rename", "delete"])(
    "publishes no outdated copy of a capture whose guest %s a reload interrupted before a pass copied it",
    async (change) => {
      await bootData(localAccount);
      uninstall = installDeviceFileQueue();
      const record = await capturePhoto();
      const control = await capturePhoto();
      await settleLocalFileRecords();
      // The change's pass cannot list the local files, nor can its stale mark
      // be written, before the page reloads signed in to the account.
      failEntryFile(change === "delete" ? "deleted" : "stale", true);
      const busy = new DOMException(
        "The file system is busy",
        "NotReadableError"
      );
      vi.spyOn(OPFSStore.prototype, "listPendingUploads")
        .mockRejectedValueOnce(busy)
        .mockRejectedValueOnce(busy);
      await datafn.file.mutate(
        (change === "delete"
          ? { operation: "delete", id: record.id }
          : {
              operation: "merge",
              id: record.id,
              record: { id: record.id, name: "receipt.png" }
            }) as never
      );
      await settleLocalFileRecords();

      let page = await reloadPage("user-a");
      const uploader = await page.client.captureFileQueueUploader();
      expect(uploader).toBeTruthy();
      await page.queue.uploadLocalQueuedFiles(
        uploader as NonNullable<typeof uploader>
      );
      await settleTasks();
      // The unchanged capture publishes: the replay ran.
      expect(sdk.started.map((input) => input.fileId)).toEqual([
        control.fileId
      ]);
      expect(await savedRecord(control.id)).toBeDefined();
      expect(await readAnyRecord(record.id)).toBeUndefined();

      page = await reloadPage();
      page.account.set(cloudAccount("user-a"));
      page.client.startAccountUploadReplay({
        userId: "user-a",
        region: "useast"
      });
      await openData("user-a");

      if (change === "delete") {
        await vi.waitFor(() =>
          expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${control.fileId}`])
        );
        await settleTasks();
        expect(sdk.started.map((input) => input.fileId)).toEqual([
          control.fileId
        ]);
        expect(await readAnyRecord(record.id)).toBeUndefined();
      } else {
        await vi.waitFor(async () =>
          expect(await savedRecord(record.id)).toEqual(
            expect.objectContaining({ name: "receipt.png" })
          )
        );
      }
    }
  );
});
