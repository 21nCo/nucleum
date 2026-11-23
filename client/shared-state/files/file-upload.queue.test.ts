import "fake-indexeddb/auto";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
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
  onDelete: null as (() => Promise<void>) | null
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
  const handlers = new Set<(event: never) => void>();
  const emit = (type: string, context: Record<string, unknown>) => {
    for (const handler of handlers) {
      handler({ type, timestampMs: Date.now(), context } as never);
    }
  };
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
      if (key === "subscribe") {
        return (handler: (event: never) => void) => {
          handlers.add(handler);
          return () => handlers.delete(handler);
        };
      }
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
  startAccountUploadReplay
} = await import("./filefn-client");
const {
  isQueuedFileFailed,
  replayFileQueue,
  retryFailedQueuedFile,
  withQueueLock
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
    userInfo: {
      id: `user:${userId}`,
      email: `${userId}@example.test`,
      nickName: userId,
      joinDate: new Date(0),
      lastLogin: new Date(0),
      region: "useast"
    }
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

/** Makes the next request of the queue's lock fail, as a busy browser can. */
function failQueueLockOnce() {
  const locks = webLocks as LockManager;
  const request = locks.request.bind(locks) as (
    ...args: unknown[]
  ) => Promise<unknown>;
  let isFailed = false;
  vi.spyOn(locks, "request").mockImplementation(((...args: unknown[]) => {
    if (isFailed || (args[1] as LockOptions)?.mode === "shared")
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
async function capturePhoto(upload = fileUpload) {
  codec.compressImageToTargetSize.mockResolvedValueOnce(
    new Blob(["thumb bytes"], { type: "image/jpeg" })
  );
  const [record] = (await upload.uploadFileV2(
    "image/png",
    "photo.png",
    new Blob(["photo bytes"], { type: "image/png" }),
    { isGenerateThumbnail: true }
  )) as { id: string; fileId: string }[];
  return record;
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
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("File", NodeFile);
  vi.stubEnv(
    "VITE_ACCOUNT_BASE_URL_TEMPLATE",
    "https://account-{region}-dev.nucleum.app"
  );
  opfs.clear();
  device = {
    dapId: `device-${crypto.randomUUID()}`,
    env: `test-${crypto.randomUUID()}`
  };
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
  URL.createObjectURL ??= () => "";
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:queued");
  URL.revokeObjectURL ??= () => undefined;
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
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

    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();
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

    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
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

    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
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
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
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
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      fileCalls.beforeQuery = null;
      await signInToCloud("user-a");
    };
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await vi.waitFor(() =>
      expect(datafn.currentNamespace()).toBe("user:user-a")
    );
    await settleTasks();
    await replayLocalQueue();

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
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { id?: string } };
      if (filters?.id !== record.id) return;
      fileCalls.beforeQuery = null;
      await signInToCloud("user-a");
    };
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await vi.waitFor(() =>
      expect(datafn.currentNamespace()).toBe("user:user-a")
    );
    await settleTasks();
    await replayLocalQueue();
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
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();
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
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
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
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();

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
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();

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
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();
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

    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
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

  it("publishes a capture whose rename's pending entry could not be stored once another tab copies the rename and this tab signs in before its pass's retry", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
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
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();
    const entry = `queued_${record.fileId}`;
    expect(isRefused).toBe(true);
    expect(readLocalCopy(record.fileId)?.name).toBe("photo.png");
    expect(opfs.read(LOCAL_QUEUE, entry, "stale")).toBeDefined();
    // Another tab's pass copies the rename to the local file.
    const copy = { ...readLocalCopy(record.fileId), name: "receipt.png" };
    await writeLocalEntryFile(
      record.fileId,
      "record.json",
      JSON.stringify(copy)
    );
    await removeLocalEntryFile(record.fileId, "stale");

    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "receipt.png" })
      )
    );
  });

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

    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
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
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();

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

    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);

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
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
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
      await datafn.file.mutate({
        operation: "merge",
        id: record.id,
        record: { id: record.id, name: "receipt.png" }
      } as never);
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
    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
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

    await datafn.file.mutate({
      operation: "merge",
      id: record.id,
      record: { id: record.id, name: "receipt.png" }
    } as never);
    await settleLocalFileRecords();

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
