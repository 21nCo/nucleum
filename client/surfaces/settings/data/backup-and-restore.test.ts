import "fake-indexeddb/auto";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import {
  createFakeLocks,
  createFakeOpfs
} from "../../../../tests/fixtures/opfs";

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
  deleted: [] as string[],
  /** Holds every upload's completion until it settles, when set. */
  hold: null as Promise<void> | null
}));
vi.mock("@filefn/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@filefn/client")>();
  return {
    ...actual,
    createFileFnClient: (): Partial<FileFnClient> => ({
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
        sdk.deleted.push(fileId);
      },
      uploadArtifact: async (input) => {
        sdk.artifacts.push(input);
        return {} as Awaited<ReturnType<FileFnClient["uploadArtifact"]>>;
      },
      getPendingLocalDescriptor: async () => null
    })
  };
});

/**
 * The device's DataFn runs local-only; a fake of its sync stands in for the
 * account's authority, whose pulls bring nothing.
 */
const AUTHORITY_URL = "https://account-useast-dev.nucleum.app/datafn";
/**
 * What DataFn does in the test: whether its pulls fail, what they wait for,
 * its import result, and whether the import still saves the records first.
 */
const data = vi.hoisted(() => ({
  isPullFailing: false,
  pullHold: null as Promise<void> | null,
  heldPulls: 0,
  importResult: null as unknown,
  isImportSaving: false
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
    if (data.pullHold) data.heldPulls++;
    await data.pullHold;
    emit("sync_started", { phase: "pull" });
    if (data.isPullFailing) {
      emit("sync_failed", { phase: "pull" });
      return;
    }
    emit("sync_applied", { phase: "pull", cursors: { file: `${pull}` } });
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
      if (key === "importData" && data.importResult) {
        return async (...args: Parameters<typeof target.importData>) => {
          if (data.isImportSaving) await target.importData(...args);
          return data.importResult;
        };
      }
      return Reflect.get(target, key);
    }
  });
  const datafnRuntime = derived(actual.datafnRuntime, (runtime) =>
    runtime
      ? { ...runtime, mode: "sync" as const, remoteUrl: AUTHORITY_URL }
      : null
  );
  return { ...actual, datafn, datafnRuntime };
});

/**
 * Runs, when set, once a restore staged its queued files, before it imports
 * the records (`during`).
 */
const preflight = vi.hoisted(() => ({
  during: null as (() => Promise<void>) | null
}));
/** The queue replays the FileFn clients started, by queue. */
const replays = vi.hoisted(() => new Map<string, Promise<void>[]>());
vi.mock("@nucleum/shared-state/files/file-queue", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@nucleum/shared-state/files/file-queue")
    >();
  return {
    ...actual,
    stageRestoredFiles: async (
      ...args: Parameters<typeof actual.stageRestoredFiles>
    ) => {
      const staged = await actual.stageRestoredFiles(...args);
      await preflight.during?.();
      return staged;
    },
    replayFileQueue: (...args: Parameters<typeof actual.replayFileQueue>) => {
      const replay = actual.replayFileQueue(...args);
      replays.set(args[0], [...(replays.get(args[0]) ?? []), replay]);
      return replay;
    }
  };
});

const { fileUpload } = await import("@nucleum/shared-state/files/file-upload");
const { resolveFileUrl } = await import("@nucleum/shared-state/files/file-url");
const { UNCOMMITTED_GRACE_MS, dequeueFile } =
  await import("@nucleum/shared-state/files/file-queue");
const { createBackupBlob, restoreBackup } =
  await import("./backup-and-restore");

const QUEUE_A = "nucleum-file-queue-account-user-a";
const QUEUE_B = "nucleum-file-queue-account-user-b";
const REPLAY_LOCK = "nucleum-file-queue-replay:";

/** One device file system: the queue keeps its handles for the page's life. */
const opfs = createFakeOpfs();
let isOnline = true;
/** The blobs behind the object URLs the queue made, by URL. */
const objectUrls = new Map<string, Blob>();
/** The names of the Web Locks requested, in order. */
let lockNames: string[] = [];
/** The queue replay passes each account's queue ran, by queue. */
let passes: Map<string, Promise<unknown>[]>;
/** The device's Web Locks; a new set stands for a reloaded page. */
let locks: LockManager;
/** Whether the browser has Web Locks. */
let hasLocks = true;
/** Returns the device's OPFS root (see failingWrites). */
let getDirectory: () => Promise<FileSystemDirectoryHandle>;

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

/** A new device (or a browser whose storage was cleared). */
function newDevice() {
  return {
    dapId: `device-${crypto.randomUUID()}`,
    env: `test-${crypto.randomUUID()}`
  };
}
let device = newDevice();

/** Boots local DataFn in the account's namespace, then signs the account in. */
async function bootData(value: UserAccount) {
  await destroyNucleumDatafn();
  await initializeNucleumDatafn({
    product: Product.MEMOTRON,
    account: { dataMode: UserDataMode.LOCAL, userId: value.userId },
    ...device,
    isOffline: true
  });
  account.set(value);
}

/** Clears the browser's OPFS and DataFn storage, as on another device. */
async function clearBrowser() {
  account.set({
    dataMode: UserDataMode.NONE,
    sessionType: UserSessionType.UNDETERMINED
  });
  await destroyNucleumDatafn();
  opfs.clear();
  device = newDevice();
}

async function capturePhoto() {
  codec.compressImageToTargetSize.mockResolvedValueOnce(
    new Blob(["thumb bytes"], { type: "image/jpeg" })
  );
  const [record] = (await fileUpload.uploadFileV2(
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

async function readQueuedBytes(fileId: string, variant: "full" | "thumbnail") {
  const url = await resolveFileUrl(fileId, variant);
  const blob = url ? objectUrls.get(url) : undefined;
  return blob ? await blob.text() : undefined;
}

async function backupText() {
  return (await createBackupBlob()).text();
}

/** A backup as the file a user picks to restore. */
async function backupFile() {
  return new File([await createBackupBlob()], "backup.json");
}

/**
 * The OPFS root, whose new files at a path `write` matches cannot be
 * written: `write` returns the error to reject with, or a promise that never
 * settles (a page closed mid-write); whose files at a path `remove` matches
 * cannot be removed; and whose writes to files at a path `close` matches
 * fail (or never settle) when they close, once the file exists.
 */
function failingWrites(
  write: (path: string[]) => Error | "hang" | undefined,
  remove: (path: string[]) => Error | undefined = () => undefined,
  close: (path: string[]) => Error | "hang" | undefined = () => undefined
) {
  const settle = (failure: Error | "hang" | undefined) =>
    failure === "hang" ? new Promise<never>(() => undefined) : failure;
  const wrapFile = (
    handle: FileSystemFileHandle,
    path: string[]
  ): FileSystemFileHandle =>
    new Proxy(handle, {
      get(target, key) {
        if (key === "createWritable") {
          return async () => {
            const writable = await target.createWritable();
            return new Proxy(writable, {
              get(stream, name) {
                if (name === "close") {
                  return async () => {
                    const failure = await settle(close(path));
                    if (failure) throw failure;
                    return stream.close();
                  };
                }
                const value = Reflect.get(stream, name) as unknown;
                return typeof value === "function" ? value.bind(stream) : value;
              }
            });
          };
        }
        const value = Reflect.get(target, key) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      }
    });
  const wrap = (
    dir: FileSystemDirectoryHandle,
    path: string[]
  ): FileSystemDirectoryHandle =>
    new Proxy(dir, {
      get(target, key) {
        if (key === "getDirectoryHandle") {
          return async (name: string, options?: { create?: boolean }) =>
            wrap(await target.getDirectoryHandle(name, options), [
              ...path,
              name
            ]);
        }
        if (key === "removeEntry") {
          return (name: string, options?: FileSystemRemoveOptions) => {
            const failure = remove([...path, name]);
            if (failure) return Promise.reject(failure);
            return target.removeEntry(name, options);
          };
        }
        if (key === "getFileHandle") {
          return async (name: string, options?: { create?: boolean }) => {
            const failure = options?.create && write([...path, name]);
            if (failure === "hang") return new Promise(() => undefined);
            if (failure) throw failure;
            return wrapFile(await target.getFileHandle(name, options), [
              ...path,
              name
            ]);
          };
        }
        const value = Reflect.get(target, key) as unknown;
        return typeof value === "function" ? value.bind(target) : value;
      }
    });
  return async () => wrap(await opfs.getDirectory(), []);
}

/** Waits for the replays of a queue started so far to end. */
async function replayed(queue: string) {
  await vi.waitFor(() => expect(replays.get(queue)?.length).toBeTruthy());
  await Promise.all(replays.get(queue) ?? []);
}

/** A backup's text with its queued files captured at another time. */
function withCapturedAt(text: string, createdAt: string) {
  const at = text.indexOf(',"fileQueueBytes":"');
  return (
    text
      .slice(0, at)
      .replaceAll(/"createdAt":"[^"]*"/g, `"createdAt":"${createdAt}"`) +
    text.slice(at)
  );
}

function goOnline() {
  isOnline = true;
  window.dispatchEvent(new Event("online"));
}

/**
 * Loads a fresh copy of the queue module, over the device's OPFS and Web
 * Locks: another tab, or the page before a reload.
 */
async function openQueueTab() {
  vi.resetModules();
  return vi.importActual<
    typeof import("@nucleum/shared-state/files/file-queue")
  >("@nucleum/shared-state/files/file-queue");
}

/**
 * Replays user-a's queue in a fresh copy of the queue module, through a
 * FileFn client recording into `sdk` like the page's own, with the page's
 * records of user-a.
 */
async function replayInOtherTab() {
  const tab = await openQueueTab();
  const { createFileFnClient } = await import("@filefn/client");
  return tab.replayFileQueue(
    QUEUE_A,
    createFileFnClient({} as never),
    new AbortController().signal,
    undefined,
    {
      owner: { userId: "user-a", baseUrl: AUTHORITY_URL },
      isCurrent: () => true,
      sync: async () => true,
      isReferenced: async (fileId) => {
        const result = await datafn.file.query({ filters: { fileId } });
        return Boolean(result.data?.length);
      },
      discard: async (fileId) => {
        sdk.deleted.push(fileId);
      }
    }
  );
}

/** How many times the page and its other tabs requested user-a's queue. */
function countQueueLocks() {
  return lockNames.filter((name) => name === `${REPLAY_LOCK}${QUEUE_A}`).length;
}

const initialAccount = account.get();

beforeEach(() => {
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("File", NodeFile);
  vi.stubEnv(
    "VITE_ACCOUNT_BASE_URL_TEMPLATE",
    "https://account-{region}-dev.nucleum.app"
  );
  opfs.clear();
  device = newDevice();
  isOnline = true;
  lockNames = [];
  passes = new Map();
  locks = createFakeLocks();
  getDirectory = opfs.getDirectory;
  replays.clear();
  hasLocks = true;
  const lockManager = {
    query: () => locks.query(),
    request: (...args: Parameters<LockManager["request"]>) => {
      const [name] = args;
      lockNames.push(name);
      const pass = locks.request(...args);
      const queue = name.slice(REPLAY_LOCK.length);
      if (name.startsWith(REPLAY_LOCK)) {
        passes.set(queue, [...(passes.get(queue) ?? []), pass]);
      }
      return pass;
    }
  };
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    get onLine() {
      return isOnline;
    },
    get locks() {
      return hasLocks ? lockManager : undefined;
    },
    storage: { getDirectory: () => getDirectory() }
  });
  objectUrls.clear();
  URL.createObjectURL ??= () => "";
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    const url = `blob:queued-${objectUrls.size}`;
    objectUrls.set(url, blob as Blob);
    return url;
  });
  URL.revokeObjectURL ??= () => undefined;
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  configurePersistenceLogger({ error: vi.fn(), info: vi.fn() });
  sdk.started = [];
  sdk.uploads = [];
  sdk.artifacts = [];
  sdk.deleted = [];
  sdk.hold = null;
  preflight.during = null;
  data.isPullFailing = false;
  data.pullHold = null;
  data.heldPulls = 0;
  data.importResult = null;
  data.isImportSaving = false;
});

afterEach(async () => {
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
});

describe("backup and restore of files the account upload queue still holds", () => {
  it("restores an offline capture's original and thumbnail on a cleared browser and uploads it once online", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    expect(await savedRecord(record.id)).toBeUndefined();
    expect(opfs.list(QUEUE_A)).toEqual([]);

    await restoreBackup(backup, { triggerCloneUp: () => false });

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
    expect(await readQueuedBytes(record.fileId, "thumbnail")).toBe(
      "thumb bytes"
    );
    expect(sdk.started).toEqual([]);

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId, fileName: "photo.png" })
    ]);
    expect(sdk.artifacts).toEqual([
      expect.objectContaining({
        fileId: record.fileId,
        kind: "thumbnail-medium"
      })
    ]);
  });

  it("uploads the restored files right away when the restore runs online", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    await clearBrowser();
    isOnline = true;
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it("uploads a file once when the restored queue already holds it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(passes.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
  });

  it("uploads a file once when it is restored while its upload runs", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    let release!: () => void;
    sdk.hold = new Promise((resolve) => (release = resolve));

    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    const restore = restoreBackup(backup, { triggerCloneUp: () => false });
    release();
    await restore;

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(passes.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it("keeps a file restored into another signed-in account in its own account's queue without uploading it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    lockNames = [];

    goOnline();

    await vi.waitFor(() => expect(passes.get(QUEUE_B)?.length).toBeTruthy());
    await Promise.all(passes.get(QUEUE_B) ?? []);
    expect(lockNames).not.toContain(`${REPLAY_LOCK}${QUEUE_A}`);
    expect(sdk.started).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);
    expect(opfs.list(QUEUE_B)).toEqual([]);
  });

  it("restores nothing from a backup whose queued files it cannot read", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupText();
    expect(backup.startsWith('{"fileQueue":{"version":1,')).toBe(true);

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    const unreadable = new File(
      [
        backup.replace(
          '{"fileQueue":{"version":1,',
          '{"fileQueue":{"version":2,'
        )
      ],
      "backup.json"
    );

    await expect(
      restoreBackup(unreadable, { triggerCloneUp: () => false })
    ).rejects.toThrow("The backup's pending files cannot be read");
    expect(await savedRecord(record.id)).toBeUndefined();
    expect(opfs.list(QUEUE_A)).toEqual([]);
  });

  it("restores nothing when the signed-in account changes before the records are imported", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    const cloneUp = vi.fn(() => true);
    preflight.during = () => bootData(cloudAccount("user-b"));

    await expect(
      restoreBackup(backup, { triggerCloneUp: cloneUp })
    ).rejects.toThrow("The account changed while the backup was restored");
    preflight.during = null;
    expect(datafn.currentNamespace()).toBe("user:user-b");
    expect(cloneUp).not.toHaveBeenCalled();
    expect(await savedRecord(record.id)).toBeUndefined();
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(opfs.list(QUEUE_B)).toEqual([]);
  });

  it("restores nothing when this device cannot keep the backup's queued files", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    vi.stubGlobal("navigator", { ...globalThis.navigator, storage: {} });
    const cloneUp = vi.fn(() => true);

    await expect(
      restoreBackup(backup, { triggerCloneUp: cloneUp })
    ).rejects.toThrow("This device cannot keep the backup's pending files");
    expect(cloneUp).not.toHaveBeenCalled();
    expect(await savedRecord(record.id)).toBeUndefined();
  });

  it("carries no file bytes for a capture already uploaded to FileFn", async () => {
    await bootData(cloudAccount("user-a"));
    const record = await capturePhoto();
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);

    const backup = JSON.parse(await backupText()) as Record<string, unknown>;

    expect(backup.fileQueue).toBeUndefined();
    expect(opfs.list(QUEUE_A)).toEqual([]);
  });

  it("writes and reads a large queued file in parts, never as one string", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const size = 7 * 2 ** 20;
    const bytes = new Uint8Array(size).map((_, index) => index % 251);
    const [record] = (await fileUpload.uploadFileV2(
      "image/png",
      "large.png",
      new Blob([bytes], { type: "image/png" })
    )) as { id: string; fileId: string }[];
    let longestPart = 0;
    class PartsBlob extends NodeBlob {
      constructor(parts?: unknown[], options?: BlobPropertyBag) {
        for (const part of parts ?? []) {
          if (typeof part === "string") {
            longestPart = Math.max(longestPart, part.length);
          }
        }
        super(parts as ConstructorParameters<typeof NodeBlob>[0], options);
      }
    }
    vi.stubGlobal("Blob", PartsBlob);
    const backup = await backupFile();
    vi.stubGlobal("Blob", NodeBlob);

    expect(backup.size).toBeGreaterThan((size / 3) * 4);
    expect(longestPart).toBeGreaterThan(0);
    expect(longestPart).toBeLessThanOrEqual(4 * 2 ** 20);

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    let longestRead = 0;
    const text = NodeBlob.prototype.text;
    vi.spyOn(NodeBlob.prototype, "text").mockImplementation(async function (
      this: NodeBlob
    ) {
      const value = await text.call(this);
      longestRead = Math.max(longestRead, value.length);
      return value;
    });
    await restoreBackup(backup, { triggerCloneUp: () => false });
    vi.mocked(NodeBlob.prototype.text).mockRestore();

    expect(longestRead).toBeLessThanOrEqual(4 * 2 ** 20);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    const url = await resolveFileUrl(record.fileId, "full");
    const restored = new Uint8Array(await objectUrls.get(url!)!.arrayBuffer());
    expect(Buffer.from(restored).equals(Buffer.from(bytes))).toBe(true);
  });

  it("leaves out a file whose upload completed though its pass stopped before removing it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    let release!: () => void;
    sdk.hold = new Promise((resolve) => (release = resolve));

    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    data.isPullFailing = true;
    release();
    await Promise.all(passes.get(QUEUE_A) ?? []);
    isOnline = false;
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);

    const backup = JSON.parse(await backupText()) as Record<string, unknown>;

    expect(backup.fileQueue).toBeUndefined();
    expect(backup.fileQueueBytes).toBeUndefined();
  });

  it("neither uploads nor discards a file restored into another account once its capturing account signs in", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const text = await backupText();
    const marker = JSON.stringify({
      userId: "user-a",
      baseUrl: "https://account-useast-dev.nucleum.app/files",
      attempt: "attempt-1"
    });
    const started = JSON.stringify([
      { name: "started-attempt-1", text: marker }
    ]);
    expect(text).toContain('"isCommitted":true,"started":[]');
    const backup = new File(
      [text.replace('"started":[]', `"started":${started}`)],
      "backup.json"
    );

    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    sdk.started = [];
    passes = new Map();

    await bootData(cloudAccount("user-a"));
    goOnline();

    await vi.waitFor(() => expect(passes.get(QUEUE_A)?.length).toBeTruthy());
    await Promise.all(passes.get(QUEUE_A) ?? []);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);
  });

  it("keeps the queued files untouched when the records could not all be restored and none references them", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    data.importResult = {
      ok: true,
      stats: { resources: { file: { skipped: 1 } }, joins: {} }
    };
    replays.clear();

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("DataFn restore failed");
    expect(await savedRecord(record.id)).toBeUndefined();
    expect(replays.get(QUEUE_A)).toBeUndefined();

    goOnline();
    await replayed(QUEUE_A);

    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);
  });

  it("keeps a queued file whose record a failed restore saved, and uploads it once online", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    data.importResult = {
      ok: true,
      stats: { resources: { file: { skipped: 1 } }, joins: {} }
    };
    data.isImportSaving = true;

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("DataFn restore failed");
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deleted).toEqual([]);
  });

  it("carries a file an offline restore left for its account's replay in the next backup, and uploads it once online", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(opfs.list(QUEUE_A, entry)).toContain("restored");

    const next = JSON.parse(await backupText()) as {
      fileQueue?: { files: { fileId: string }[] };
    };
    expect(next.fileQueue?.files).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("keeps a restored file while its replay cannot take it over, and uploads it once a later replay does", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    getDirectory = failingWrites(
      () => undefined,
      (path) =>
        path.join("/") === `${QUEUE_A}/${entry}/restored`
          ? new Error("The mark cannot be removed")
          : undefined
    );

    goOnline();
    await replayed(QUEUE_A);

    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A, entry)).toContain("restored");

    getDirectory = opfs.getDirectory;
    replays.clear();
    isOnline = false;
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deleted).toEqual([]);
  });

  it("restores a file a replay removed from the queue while the restore waited for it, and uploads it once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    account.set({
      dataMode: UserDataMode.NONE,
      sessionType: UserSessionType.UNDETERMINED
    });
    await destroyNucleumDatafn();
    device = newDevice();
    await bootData(cloudAccount("user-a"));
    expect(await savedRecord(record.id)).toBeUndefined();
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);
    let release!: () => void;
    data.pullHold = new Promise((resolve) => (release = resolve));

    const queueLocks = () =>
      lockNames.filter((name) => name === `${REPLAY_LOCK}${QUEUE_A}`).length;

    goOnline();
    await vi.waitFor(() => expect(data.heldPulls).toBe(1));
    const requested = queueLocks();
    const restore = restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(queueLocks()).toBe(requested + 1));
    release();
    await restore;

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    await vi.waitFor(() => expect(sdk.uploads).toHaveLength(1));
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deleted).toEqual([]);
  });

  it("leaves a file a closed page left half written untouched though its record is in place, until a restore writes it again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;

    opfs.clear();
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    let isClosing = false;
    getDirectory = failingWrites((path) => {
      if (!path[2]?.startsWith("thumbnail-")) return undefined;
      isClosing = true;
      return "hang";
    });
    void restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(isClosing).toBe(true));
    locks = createFakeLocks();
    getDirectory = opfs.getDirectory;

    goOnline();
    await replayed(QUEUE_A);

    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    isOnline = false;
    await restoreBackup(backup, { triggerCloneUp: () => false });
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
  });

  it("writes a queued file again over an empty entry a closed capture left, and uploads it once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(QUEUE_A, { create: true });
    await queue.getDirectoryHandle(`queued_${record.fileId}`, { create: true });

    await restoreBackup(backup, { triggerCloneUp: () => false });

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it.each([
    ["with", true],
    ["without", false]
  ])(
    "keeps a capture past its grace restored into another account untouched by its own account's replay %s Web Locks, and uploads it once that account restores it",
    async (_, isLocking) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const capturedAt = new Date(
        Date.now() - 3 * UNCOMMITTED_GRACE_MS
      ).toISOString();
      const backup = new File(
        [withCapturedAt(await backupText(), capturedAt)],
        "backup.json"
      );

      await clearBrowser();
      hasLocks = isLocking;
      await bootData(cloudAccount("user-b"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
      replays.clear();

      await bootData(cloudAccount("user-a"));
      goOnline();
      await replayed(QUEUE_A);

      expect(await savedRecord(record.id)).toBeUndefined();
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);

      await restoreBackup(backup, { triggerCloneUp: () => false });

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("restores no record and keeps no queued file when a queued file cannot be written", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const first = await capturePhoto();
    const second = await capturePhoto();
    const backup = await backupFile();

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    const written: string[] = [];
    getDirectory = failingWrites((path) => {
      written.push(path.join("/"));
      if (path[1] !== `queued_${second.fileId}`) return undefined;
      if (!path[2]?.startsWith("thumbnail-")) return undefined;
      return Object.assign(new Error("The quota is exceeded"), {
        name: "QuotaExceededError"
      });
    });
    const cloneUp = vi.fn(() => true);

    await expect(
      restoreBackup(backup, { triggerCloneUp: cloneUp })
    ).rejects.toThrow("The quota is exceeded");
    getDirectory = opfs.getDirectory;

    expect(written).toContain(
      `${QUEUE_A}/queued_${first.fileId}/thumbnail-jpeg`
    );
    expect(cloneUp).not.toHaveBeenCalled();
    expect(await savedRecord(first.id)).toBeUndefined();
    expect(await savedRecord(second.id)).toBeUndefined();
    expect(opfs.list(QUEUE_A)).toEqual([]);
  });

  it("writes again a restored file a closed page left half written, which no replay touched, and uploads it once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    let isClosing = false;
    getDirectory = failingWrites((path) => {
      if (!path[2]?.startsWith("thumbnail-")) return undefined;
      isClosing = true;
      return "hang";
    });
    void restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(isClosing).toBe(true));
    locks = createFakeLocks();
    getDirectory = opfs.getDirectory;
    expect(opfs.list(QUEUE_A, entry)).toContain("restored");
    expect(opfs.list(QUEUE_A, entry)).toContain("committed");
    expect(opfs.list(QUEUE_A, entry)).not.toContain("thumbnail-jpeg");

    goOnline();
    await replayed(QUEUE_A);

    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    isOnline = false;
    await restoreBackup(backup, { triggerCloneUp: () => false });

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(
      new TextDecoder().decode(opfs.read(QUEUE_A, entry, "restored"))
    ).toBe("account");
    expect(await readQueuedBytes(record.fileId, "thumbnail")).toBe(
      "thumb bytes"
    );

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
  });

  it("uploads right away when a restore online finds every queued file already held", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();

    isOnline = true;
    await restoreBackup(backup, { triggerCloneUp: () => false });

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it("keeps a file an offline restore left for its account when a later restore cannot write, and uploads it once online", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const first = await capturePhoto();
    const earlier = await backupFile();
    const second = await capturePhoto();
    const later = await backupFile();
    const entry = `queued_${first.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(earlier, { triggerCloneUp: () => false });
    const held = opfs.list(QUEUE_A, entry).sort();

    getDirectory = failingWrites((path) =>
      path[0] === QUEUE_A
        ? Object.assign(new Error("The quota is exceeded"), {
            name: "QuotaExceededError"
          })
        : undefined
    );
    await expect(
      restoreBackup(later, { triggerCloneUp: () => false })
    ).rejects.toThrow("The quota is exceeded");
    getDirectory = opfs.getDirectory;

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(opfs.list(QUEUE_A, entry).sort()).toEqual(held);
    expect(
      new TextDecoder().decode(opfs.read(QUEUE_A, entry, "restored"))
    ).toBe("account");
    expect(await savedRecord(second.id)).toBeUndefined();

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: first.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("leaves a file an offline restore left for its account as it is when another account restores the backup", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const held = opfs.list(QUEUE_A, entry).sort();
    expect(held).toContain("committed");

    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });

    expect(opfs.list(QUEUE_A, entry).sort()).toEqual(held);
    expect(
      new TextDecoder().decode(opfs.read(QUEUE_A, entry, "restored"))
    ).toBe("account");

    await bootData(cloudAccount("user-a"));
    const next = JSON.parse(await backupText()) as {
      fileQueue?: { files: { fileId: string }[] };
    };
    expect(next.fileQueue?.files).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("uploads a file restored into another account once a record of its capturing account references it, and carries it in that account's backups meanwhile", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const records = await datafn.exportData();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(opfs.list(QUEUE_A, entry)).toContain("committed");
    expect(
      new TextDecoder().decode(opfs.read(QUEUE_A, entry, "restored"))
    ).toBe("other");

    await bootData(cloudAccount("user-a"));
    await datafn.importData(records, { triggerCloneUp: false });
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    const next = JSON.parse(await backupText()) as {
      fileQueue?: { files: { fileId: string }[] };
    };
    expect(next.fileQueue?.files).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("keeps a file restored into another account as it is when its own account's restore cannot write, and uploads it once that account restores it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const first = await capturePhoto();
    const earlier = await backupFile();
    const second = await capturePhoto();
    const later = await backupFile();
    const entry = `queued_${first.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(earlier, { triggerCloneUp: () => false });
    const held = opfs.list(QUEUE_A, entry).sort();
    expect(held).toContain("committed");

    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[0] === QUEUE_A
        ? Object.assign(new Error("The quota is exceeded"), {
            name: "QuotaExceededError"
          })
        : undefined
    );
    await expect(
      restoreBackup(later, { triggerCloneUp: () => false })
    ).rejects.toThrow("The quota is exceeded");
    getDirectory = opfs.getDirectory;

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(opfs.list(QUEUE_A, entry).sort()).toEqual(held);
    expect(
      new TextDecoder().decode(opfs.read(QUEUE_A, entry, "restored"))
    ).toBe("other");
    expect(await savedRecord(first.id)).toBeUndefined();
    expect(await savedRecord(second.id)).toBeUndefined();

    await restoreBackup(earlier, { triggerCloneUp: () => false });
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: first.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["with", true],
    ["without", false]
  ])(
    "keeps a file restored into another account marked when its account restores a backup without its record and replays past its grace %s Web Locks, and uploads it once that account restores the record",
    async (_, isLocking) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const capturedAt = new Date(
        Date.now() - 3 * UNCOMMITTED_GRACE_MS
      ).toISOString();
      const backup = new File(
        [withCapturedAt(await backupText(), capturedAt)],
        "backup.json"
      );
      const entry = `queued_${record.fileId}`;

      await clearBrowser();
      hasLocks = isLocking;
      await bootData(cloudAccount("user-b"));
      await restoreBackup(backup, { triggerCloneUp: () => false });

      await bootData(cloudAccount("user-a"));
      const unbound = await backupFile();
      expect(
        (
          JSON.parse(await unbound.text()) as {
            fileQueue?: { files: unknown[] };
          }
        ).fileQueue?.files
      ).toEqual([expect.objectContaining({ fileId: record.fileId })]);
      await restoreBackup(unbound, { triggerCloneUp: () => false });
      expect(await savedRecord(record.id)).toBeUndefined();
      replays.clear();

      goOnline();
      await replayed(QUEUE_A);

      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(opfs.list(QUEUE_A, entry)).toContain("restored");

      await restoreBackup(backup, { triggerCloneUp: () => false });

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("keeps a file marked when a backup carrying it without its record is restored into a cleared browser of its account", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const capturedAt = new Date(
      Date.now() - 3 * UNCOMMITTED_GRACE_MS
    ).toISOString();
    const backup = new File(
      [withCapturedAt(await backupText(), capturedAt)],
      "backup.json"
    );
    const entry = `queued_${record.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-a"));
    const unbound = await backupFile();

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(unbound, { triggerCloneUp: () => false });
    expect(await savedRecord(record.id)).toBeUndefined();
    expect(
      new TextDecoder().decode(opfs.read(QUEUE_A, entry, "restored"))
    ).toBe("account");
    replays.clear();

    goOnline();
    await replayed(QUEUE_A);

    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(opfs.list(QUEUE_A, entry)).toContain("restored");
  });

  it("does not restore again a file whose upload completed before the restore started while its replay still checks its record", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    let releaseUpload!: () => void;
    sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    let releasePull!: () => void;
    data.pullHold = new Promise((resolve) => (releasePull = resolve));
    releaseUpload();
    await vi.waitFor(() => expect(data.heldPulls).toBe(1));
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);

    const requested = countQueueLocks();
    const restore = restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(countQueueLocks()).toBe(requested + 1));
    releasePull();
    await restore;

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("does not restore again a file another tab uploaded and removed while the restore waited for the queue", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    let releaseUpload!: () => void;
    sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
    isOnline = true;
    const otherTab = replayInOtherTab();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));

    const requested = countQueueLocks();
    const restore = restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(countQueueLocks()).toBe(requested + 1));
    releaseUpload();
    await otherTab;
    await restore;

    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("does not restore again a file the page before a reload uploaded", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    isOnline = true;
    await replayInOtherTab();
    expect(sdk.uploads).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([]);

    await restoreBackup(backup, { triggerCloneUp: () => false });

    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("restores again a file its replay discarded after uploading it, once its record was deleted, and uploads it again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    let releaseUpload!: () => void;
    sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    let releasePull!: () => void;
    data.pullHold = new Promise((resolve) => (releasePull = resolve));
    releaseUpload();
    await vi.waitFor(() => expect(data.heldPulls).toBe(1));
    const deleted = (await datafn.file.mutate({
      operation: "delete",
      id: record.id
    } as never)) as { ok?: boolean };
    expect(deleted.ok).not.toBe(false);
    releasePull();
    await vi.waitFor(() => expect(sdk.deleted).toEqual([record.fileId]));
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(passes.get(QUEUE_A) ?? []);

    await restoreBackup(backup, { triggerCloneUp: () => false });

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    await vi.waitFor(() => expect(sdk.uploads).toHaveLength(2));
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId }),
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deleted).toEqual([record.fileId]);
  });

  it.each([
    ["with", true],
    ["without", false]
  ])(
    "keeps a file the queue holds complete without its record while a replay runs before the restore imports it %s Web Locks, and uploads it once",
    async (_, isLocking) => {
      hasLocks = isLocking;
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const backup = await backupFile();
      const entry = `queued_${record.fileId}`;
      expect(opfs.list(QUEUE_A, entry)).toContain("committed");

      account.set({
        dataMode: UserDataMode.NONE,
        sessionType: UserSessionType.UNDETERMINED
      });
      await destroyNucleumDatafn();
      device = newDevice();
      await bootData(cloudAccount("user-a"));
      expect(await savedRecord(record.id)).toBeUndefined();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      replays.clear();
      preflight.during = async () => {
        goOnline();
        await replayed(QUEUE_A);
        expect(sdk.started).toEqual([]);
        expect(sdk.deleted).toEqual([]);
        expect(opfs.list(QUEUE_A)).toEqual([entry]);
      };

      await restoreBackup(backup, { triggerCloneUp: () => false });
      preflight.during = null;

      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
      expect(sdk.artifacts).toHaveLength(1);
      expect(sdk.deleted).toEqual([]);
    }
  );
  it.each([
    ["rejects", "reject"],
    ["is cut short by a closed page", "hang"]
  ] as const)(
    "keeps a file the queue holds complete in its backups, and uploads it once a record references it, when a restore that keeps it %s after marking it",
    async (_, failure) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const kept = await capturePhoto();
      const added = await capturePhoto();
      const backup = await backupFile();
      const entry = `queued_${kept.fileId}`;
      const addedEntry = `queued_${added.fileId}`;

      account.set({
        dataMode: UserDataMode.NONE,
        sessionType: UserSessionType.UNDETERMINED
      });
      await destroyNucleumDatafn();
      device = newDevice();
      await bootData(cloudAccount("user-a"));
      await dequeueFile(QUEUE_A, added.fileId);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      const held = opfs.list(QUEUE_A, entry).sort();

      let isFailing = false;
      const fail = () => {
        isFailing = true;
        return failure === "reject"
          ? Object.assign(new Error("The quota is exceeded"), {
              name: "QuotaExceededError"
            })
          : ("hang" as const);
      };
      getDirectory = failingWrites(
        (path) => (path[1] === addedEntry ? fail() : undefined),
        undefined,
        (path) => (path[1] === entry ? fail() : undefined)
      );
      const restore = restoreBackup(backup, { triggerCloneUp: () => false });
      if (failure === "reject") {
        await expect(restore).rejects.toThrow("The quota is exceeded");
      } else {
        void restore;
        await vi.waitFor(() => expect(isFailing).toBe(true));
        locks = createFakeLocks();
      }
      getDirectory = opfs.getDirectory;

      expect(opfs.list(QUEUE_A, entry)).toEqual(expect.arrayContaining(held));
      expect(await savedRecord(kept.id)).toBeUndefined();
      const next = JSON.parse(await backupText()) as {
        fileQueue?: { files: { fileId: string }[] };
      };
      expect(next.fileQueue?.files).toEqual([
        expect.objectContaining({ fileId: kept.fileId })
      ]);

      goOnline();
      await replayed(QUEUE_A);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      expect(opfs.list(QUEUE_A)).toContain(entry);

      isOnline = false;
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect((await savedRecord(kept.id))?.fileId).toBe(kept.fileId);

      goOnline();

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      const uploaded = (fileId: string) =>
        sdk.uploads.filter((input) => input.fileId === fileId);
      expect(sdk.started).toHaveLength(2);
      expect(uploaded(kept.fileId)).toHaveLength(1);
      expect(uploaded(added.fileId)).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(2);
      expect(sdk.deleted).toEqual([]);
    }
  );
});
