import "fake-indexeddb/auto";
import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FileFnHttpError,
  type FileFnClient,
  type UploadArtifactInput,
  type UploadInput
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
  hold: null as Promise<void> | null,
  /** What every thumbnail upload rejects with, when set. */
  artifactError: null as Error | null
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
        if (sdk.artifactError) throw sdk.artifactError;
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
  isImportSaving: false,
  /** Runs, when set, once a record export read the records. */
  exportHook: null as (() => Promise<void>) | null,
  /** Runs, when set, before a record export reads the records. */
  exportStartHook: null as (() => Promise<void>) | null
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
      if (key === "exportData" && (data.exportHook || data.exportStartHook)) {
        const { exportHook, exportStartHook } = data;
        return async (...args: Parameters<typeof target.exportData>) => {
          await exportStartHook?.();
          const records = await target.exportData(...args);
          await exportHook?.();
          return records;
        };
      }
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
const {
  RESTORE_HOLD_LIFETIME_MS,
  UNCOMMITTED_GRACE_MS,
  dequeueFile,
  resolveQueuedFileUrl
} = await import("@nucleum/shared-state/files/file-queue");
const { createBackupBlob, restoreBackup } =
  await import("./backup-and-restore");

const QUEUE_A = "nucleum-file-queue-account-user-a";
const QUEUE_B = "nucleum-file-queue-account-user-b";
const REPLAY_LOCK = "nucleum-file-queue-replay:";
/** user-a's queue's upload log, beside the queue: one row per file. */
const UPLOAD_LOG = `${QUEUE_A}.uploads`;

/** user-a's upload log as text, one `<file ID>:<row>` line per file. */
function uploadLogText() {
  return opfs
    .list(UPLOAD_LOG)
    .map((name) => {
      const row = new TextDecoder().decode(opfs.read(UPLOAD_LOG, name));
      return `${decodeURIComponent(name)}:${row}`;
    })
    .join("\n");
}

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

/** Deletes a record, as the user does. */
async function deleteRecord(id: string) {
  const deleted = (await datafn.file.mutate({
    operation: "delete",
    id
  } as never)) as { ok?: boolean };
  expect(deleted.ok).not.toBe(false);
  expect(await savedRecord(id)).toBeUndefined();
}

/** Writes a file of an entry of user-a's queue. */
async function writeQueuedEntryFile(entry: string, name: string, text: string) {
  const root = await opfs.getDirectory();
  const queued = await (
    await root.getDirectoryHandle(QUEUE_A)
  ).getDirectoryHandle(entry);
  const writable = await (
    await queued.getFileHandle(name, { create: true })
  ).createWritable();
  await writable.write(text);
  await writable.close();
  return queued;
}

/** user-a's queue's restore hold rows, beside the queue. */
const HOLDS_A = `${QUEUE_A}.holds`;

/** Whether a restore session's hold row holds an entry of user-a's queue. */
function isKept(entry: string) {
  const fileId = entry.slice("queued_".length);
  return opfs
    .list(HOLDS_A)
    .some((row) => row.startsWith("hold~") && row.split("~")[2] === fileId);
}

/** Whether a restore started writing an entry of user-a's queue but never published it. */
function isUnpublished(entry: string) {
  const names = opfs.list(QUEUE_A, entry);
  const restoring = names.find((name) => name.startsWith("restoring-"));
  return (
    restoring !== undefined &&
    !names.includes(restoring.replace("restoring-", "published-"))
  );
}

/**
 * Whether a restore wrote an entry of user-a's queue that its account has
 * not adopted yet, so it is held for the account.
 */
function isHeldForAccount(entry: string) {
  const names = opfs.list(QUEUE_A, entry);
  const generation = names
    .find((name) => name.startsWith("restoring-"))
    ?.slice("restoring-".length);
  const adoption = `adopted~${entry.slice("queued_".length)}~${generation}`;
  return (
    generation !== undefined &&
    !names.includes(`adopted-${generation}`) &&
    !opfs.list(HOLDS_A).includes(adoption)
  );
}

/**
 * The started marker an upload attempt of a queued file's owner leaves (its
 * page closed before the upload ended), from the file's claim.
 */
function startedMarkerOf(entry: string) {
  const claim = JSON.parse(
    new TextDecoder().decode(opfs.read(QUEUE_A, entry, "claim.json"))
  ) as Record<string, unknown>;
  return {
    name: "started-attempt-1",
    text: JSON.stringify({ ...claim, attempt: "attempt-1" })
  };
}

/** A backup as the file a user picks to restore. */
async function backupFile() {
  return new File([await createBackupBlob()], "backup.json");
}

/**
 * The OPFS root, whose new files at a path `write` matches cannot be
 * written: `write` returns the error to reject with, a promise that never
 * settles (a page closed mid-write), or a promise the write waits for
 * before it goes on; whose files at a path `remove` matches
 * cannot be removed; whose writes to files at a path `close` matches
 * fail (or never settle) when they close, once the file exists; and whose
 * files at a path `open` matches cannot be opened at all.
 */
function failingWrites(
  write: (path: string[]) => Error | "hang" | Promise<void> | undefined,
  remove: (path: string[]) => Error | undefined = () => undefined,
  close: (path: string[]) => Error | "hang" | undefined = () => undefined,
  open: (path: string[]) => Error | undefined = () => undefined
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
            const opened = open([...path, name]);
            if (opened) throw opened;
            const failure = options?.create && write([...path, name]);
            if (failure === "hang") return new Promise(() => undefined);
            if (failure instanceof Promise) await failure;
            else if (failure) throw failure;
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
 * records of user-a, until `signal` aborts, at `owner`'s authority.
 */
async function replayInOtherTab(
  signal = new AbortController().signal,
  owner = { userId: "user-a", baseUrl: AUTHORITY_URL }
) {
  const tab = await openQueueTab();
  const { createFileFnClient } = await import("@filefn/client");
  return tab.replayFileQueue(
    QUEUE_A,
    createFileFnClient({} as never),
    signal,
    undefined,
    {
      owner,
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
  sdk.artifactError = null;
  preflight.during = null;
  data.isPullFailing = false;
  data.pullHold = null;
  data.heldPulls = 0;
  data.importResult = null;
  data.isImportSaving = false;
  data.exportHook = null;
  data.exportStartHook = null;
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
    const requested = countQueueLocks();
    const restore = restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(countQueueLocks()).toBe(requested + 1));
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

  it("carries a file an offline restore handed to its account's replay in the next backup, and uploads it once online", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(isHeldForAccount(entry)).toBe(false);

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

  it("keeps a restored file held while neither its restore nor its replay can record its adoption, and uploads it once a later replay does after the restore's hold expired", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites(
      (path) =>
        path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
          ? new Error("The adoption cannot be recorded")
          : undefined,
      (path) =>
        path[2]?.startsWith("restoring-")
          ? new Error("The restoring mark cannot be removed")
          : undefined
    );
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(isHeldForAccount(entry)).toBe(true);

    goOnline();
    await replayed(QUEUE_A);

    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(isHeldForAccount(entry)).toBe(true);
    expect(isKept(entry)).toBe(true);

    getDirectory = opfs.getDirectory;
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
    );
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

  it("removes a file a closed page left unpublished, neither uploading nor discarding it, though its record is in place, until a restore writes it again", async () => {
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
    expect(isUnpublished(entry)).toBe(true);

    goOnline();
    await replayed(QUEUE_A);

    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([]);

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

  it("writes again a restored file a closed page left unpublished, which a replay removed, and uploads it once", async () => {
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
    expect(isUnpublished(entry)).toBe(true);
    expect(opfs.list(QUEUE_A, entry)).toContain("committed");
    expect(opfs.list(QUEUE_A, entry)).not.toContain("thumbnail-jpeg");
    expect(await readQueuedBytes(record.fileId, "full")).toBeUndefined();

    goOnline();
    await replayed(QUEUE_A);

    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([]);

    isOnline = false;
    await restoreBackup(backup, { triggerCloneUp: () => false });

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(isHeldForAccount(entry)).toBe(false);
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
    expect(isHeldForAccount(entry)).toBe(false);
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

  it("leaves a file a failed offline restore left for its account held for it as it was when another account restores the backup", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    data.importResult = {
      ok: true,
      stats: { resources: { file: { skipped: 1 } }, joins: {} }
    };
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("DataFn restore failed");
    data.importResult = null;
    expect(await savedRecord(record.id)).toBeUndefined();
    const held = opfs.list(QUEUE_A, entry).sort();
    expect(held).toContain("committed");

    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });

    expect(opfs.list(QUEUE_A, entry).sort()).toEqual(held);
    expect(isHeldForAccount(entry)).toBe(true);

    await bootData(cloudAccount("user-a"));
    const next = JSON.parse(await backupText()) as {
      fileQueue?: { files: { fileId: string }[] };
    };
    expect(next.fileQueue?.files).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);

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
    expect(isHeldForAccount(entry)).toBe(true);

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
    expect(isHeldForAccount(entry)).toBe(true);
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
      expect(isHeldForAccount(entry)).toBe(true);

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
    expect(isHeldForAccount(entry)).toBe(true);
    replays.clear();

    goOnline();
    await replayed(QUEUE_A);

    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(isHeldForAccount(entry)).toBe(true);
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
    "keeps a file the queue holds complete in its backups, and uploads it once a record references it, when a restore that keeps it %s after holding it, held only while that restore may still import or its hold is live",
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

      expect(isKept(entry)).toBe(failure === "hang");

      goOnline();
      await replayed(QUEUE_A);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      expect(opfs.list(QUEUE_A).includes(entry)).toBe(failure === "hang");

      isOnline = false;
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect((await savedRecord(kept.id))?.fileId).toBe(kept.fileId);
      if (failure === "hang") {
        replays.clear();
        goOnline();
        await replayed(QUEUE_A);
        expect(opfs.list(QUEUE_A)).toEqual([entry]);
        isOnline = false;
        vi.spyOn(Date, "now").mockReturnValue(
          Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
        );
      }

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

  it.each([
    ["cannot be created", "create"],
    ["cannot be closed", "close"],
    ["cannot be read", "open"]
  ] as const)(
    "finishes an upload FileFn confirmed when the queue's upload log %s, and sends it no more",
    async (_, fault) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      let faults = 0;
      const failAt = (kind: typeof fault) => (path: string[]) => {
        if (kind !== fault || path[0] !== UPLOAD_LOG) return undefined;
        faults++;
        return new DOMException("The log is unavailable", "UnknownError");
      };
      getDirectory = failingWrites(
        failAt("create"),
        undefined,
        failAt("close"),
        failAt("open")
      );

      goOnline();

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(passes.get(QUEUE_A) ?? []);
      expect(faults).toBeGreaterThan(0);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
      expect(sdk.artifacts).toHaveLength(1);
      expect(sdk.deleted).toEqual([]);

      replays.clear();
      isOnline = false;
      goOnline();
      await replayed(QUEUE_A);
      await Promise.all(passes.get(QUEUE_A) ?? []);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(1);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("removes a file its replay discarded when the queue's upload log cannot be written, and deletes it once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    let writes = 0;
    let removals = 0;
    getDirectory = failingWrites(
      (path) => {
        if (path[0] !== UPLOAD_LOG || ++writes < 2) return undefined;
        return new DOMException("The quota is exceeded", "QuotaExceededError");
      },
      (path) => {
        if (path[0] !== UPLOAD_LOG) return undefined;
        removals++;
        return new DOMException("The log is unavailable", "UnknownError");
      }
    );
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

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(passes.get(QUEUE_A) ?? []);
    // The upload and its thumbnail sent (failing), then the discard removing
    // the file's row (failing).
    expect(writes).toBe(2);
    expect(removals).toBe(1);
    expect(sdk.deleted).toEqual([record.fileId]);

    replays.clear();
    isOnline = false;
    goOnline();
    await replayed(QUEUE_A);
    await Promise.all(passes.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.deleted).toEqual([record.fileId]);
  });

  it("keeps a file a failed restore added once another restore of the backup kept it and imported its record, and uploads it once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    let restores = 0;
    preflight.during = async () => {
      if (++restores > 1) return;
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
      await bootData(cloudAccount("user-b"));
    };

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The account changed while the backup was restored");
    preflight.during = null;
    expect(restores).toBe(2);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    await bootData(cloudAccount("user-a"));
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("rolls back a file a failed restore wrote, which its hold kept a replay off meanwhile, and uploads it once restored again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await dequeueFile(QUEUE_A, record.fileId);
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);

    replays.clear();
    preflight.during = async () => {
      goOnline();
      await replayed(QUEUE_A);
      isOnline = false;
      expect(sdk.started).toEqual([]);
      expect(isHeldForAccount(entry)).toBe(true);
      expect(isKept(entry)).toBe(true);
      await bootData(cloudAccount("user-b"));
    };

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The account changed while the backup was restored");
    preflight.during = null;
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(isKept(entry)).toBe(false);

    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["with", true],
    ["without", false]
  ])(
    "keeps a file whose upload completed though its pass could not check its record, when the queue holds it without its record and a replay runs before the restore imports it %s Web Locks, and removes it once the record is imported without uploading it again",
    async (_, isLocking) => {
      hasLocks = isLocking;
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const backup = await backupFile();
      const entry = `queued_${record.fileId}`;
      let releaseUpload!: () => void;
      sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
      replays.clear();
      goOnline();
      await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
      data.isPullFailing = true;
      releaseUpload();
      await replayed(QUEUE_A);
      isOnline = false;
      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(1);
      expect(opfs.list(QUEUE_A, entry)).toContain("uploaded");
      expect(
        opfs.list(QUEUE_A, entry).some((name) => name.startsWith("started"))
      ).toBe(true);

      account.set({
        dataMode: UserDataMode.NONE,
        sessionType: UserSessionType.UNDETERMINED
      });
      await destroyNucleumDatafn();
      device = newDevice();
      data.isPullFailing = false;
      await bootData(cloudAccount("user-a"));
      expect(await savedRecord(record.id)).toBeUndefined();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      replays.clear();
      preflight.during = async () => {
        goOnline();
        await replayed(QUEUE_A);
        expect(sdk.started).toHaveLength(1);
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
    ["never started", false],
    ["started", true]
  ])(
    "removes a file an offline restore brought back with its record once the record is deleted before it uploads, when its upload %s",
    async (_, isStarted) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      let text = await backupText();
      let started: { name: string; text: string }[] = [];
      if (isStarted) {
        let releaseUpload!: () => void;
        sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
        replays.clear();
        goOnline();
        await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
        started = opfs
          .list(QUEUE_A, entry)
          .filter((name) => name.startsWith("started"))
          .map((name) => ({
            name,
            text: new TextDecoder().decode(opfs.read(QUEUE_A, entry, name))
          }));
        expect(started).toHaveLength(1);
        releaseUpload();
        await replayed(QUEUE_A);
        isOnline = false;
        expect(opfs.list(QUEUE_A)).toEqual([]);
        const at = text.indexOf(',"fileQueueBytes":"');
        text =
          text
            .slice(0, at)
            .replace('"started":[]', `"started":${JSON.stringify(started)}`) +
          text.slice(at);
      }
      const backup = new File([text], "backup.json");

      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
      const restored = opfs.list(QUEUE_A, entry);
      expect(isHeldForAccount(entry)).toBe(false);
      expect(isKept(entry)).toBe(false);
      for (const { name } of started) expect(restored).toContain(name);

      const deleted = (await datafn.file.mutate({
        operation: "delete",
        id: record.id
      } as never)) as { ok?: boolean };
      expect(deleted.ok).not.toBe(false);
      expect(await savedRecord(record.id)).toBeUndefined();
      replays.clear();
      goOnline();

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.started).toHaveLength(isStarted ? 1 : 0);
      expect(sdk.deleted).toEqual(isStarted ? [record.fileId] : []);
      const next = JSON.parse(await backupText()) as { fileQueue?: unknown };
      expect(next.fileQueue).toBeUndefined();
    }
  );

  it.each([
    ["never started", false],
    ["started", true]
  ])(
    "removes a file whose record was deleted offline once its own account restores a backup without the record on the same browser, when its upload %s",
    async (_, isStarted) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      if (isStarted) {
        const marker = startedMarkerOf(entry);
        await writeQueuedEntryFile(entry, marker.name, marker.text);
      }
      await deleteRecord(record.id);
      const backup = await backupFile();
      expect(
        (
          JSON.parse(await backup.text()) as {
            fileQueue?: { files: unknown[] };
          }
        ).fileQueue?.files
      ).toEqual([expect.objectContaining({ fileId: record.fileId })]);

      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect(await savedRecord(record.id)).toBeUndefined();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(isKept(entry)).toBe(false);
      replays.clear();
      goOnline();

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual(isStarted ? [record.fileId] : []);
      const next = JSON.parse(await backupText()) as { fileQueue?: unknown };
      expect(next.fileQueue).toBeUndefined();
    }
  );

  it("removes a capture past its grace whose record never saved once its own account restores a backup of it on the same browser", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    await deleteRecord(record.id);
    const metadata = JSON.parse(
      new TextDecoder().decode(opfs.read(QUEUE_A, entry, "metadata.json"))
    ) as Record<string, unknown>;
    const queued = await writeQueuedEntryFile(
      entry,
      "metadata.json",
      JSON.stringify({
        ...metadata,
        createdAt: new Date(Date.now() - 3 * UNCOMMITTED_GRACE_MS).toISOString()
      })
    );
    await queued.removeEntry("committed");
    const backup = await backupFile();

    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(isKept(entry)).toBe(false);
    replays.clear();
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["the account changes", "account"],
    ["its records are imported only in part", "import"]
  ] as const)(
    "hands a file the queue held complete back to the replay when its own account's restore rejects after keeping it because %s, and removes it once online",
    async (_, cause) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      await deleteRecord(record.id);
      const backup = await backupFile();
      let isKeptWhileRestoring = false;
      preflight.during = async () => {
        isKeptWhileRestoring = isKept(entry);
        if (cause === "account") await bootData(cloudAccount("user-b"));
      };
      if (cause === "import") {
        data.importResult = {
          ok: true,
          stats: { resources: { file: { skipped: 1 } }, joins: {} }
        };
      }

      await expect(
        restoreBackup(backup, { triggerCloneUp: () => false })
      ).rejects.toThrow(
        cause === "account"
          ? "The account changed while the backup was restored"
          : "DataFn restore failed"
      );
      preflight.during = null;
      data.importResult = null;
      if (cause === "account") await bootData(cloudAccount("user-a"));
      expect(isKeptWhileRestoring).toBe(true);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(isKept(entry)).toBe(false);
      replays.clear();
      goOnline();

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it.each([
    ["never started", false],
    ["started", true]
  ])(
    "hands a restored file whose record a partly failed restore saved back to the replay, and removes it once the record is deleted offline, when its upload %s",
    async (_, isStarted) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      const marker = startedMarkerOf(entry);
      let text = await backupText();
      if (isStarted) {
        const at = text.indexOf(',"fileQueueBytes":"');
        text =
          text
            .slice(0, at)
            .replace('"started":[]', `"started":${JSON.stringify([marker])}`) +
          text.slice(at);
      }
      const backup = new File([text], "backup.json");

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
      data.importResult = null;
      data.isImportSaving = false;
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
      const restored = opfs.list(QUEUE_A, entry);
      expect(isHeldForAccount(entry)).toBe(false);
      expect(restored.includes(marker.name)).toBe(isStarted);

      await deleteRecord(record.id);
      replays.clear();
      goOnline();

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual(isStarted ? [record.fileId] : []);
    }
  );

  it.each([
    ["with", true],
    ["without", false]
  ])(
    "keeps a file the queue holds complete for a restore still running after another restore that kept it settles %s Web Locks, and uploads it once that restore imports its record",
    async (_, isLocking) => {
      hasLocks = isLocking;
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const backup = await backupFile();
      const entry = `queued_${record.fileId}`;

      account.set({
        dataMode: UserDataMode.NONE,
        sessionType: UserSessionType.UNDETERMINED
      });
      await destroyNucleumDatafn();
      device = newDevice();
      await bootData(cloudAccount("user-a"));
      expect(await savedRecord(record.id)).toBeUndefined();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);

      let resume!: () => void;
      const resumed = new Promise<void>((resolve) => (resume = resolve));
      let later!: Promise<void>;
      let restores = 0;
      preflight.during = async () => {
        if (++restores > 1) return resumed;
        later = restoreBackup(backup, { triggerCloneUp: () => false });
        await vi.waitFor(() => expect(restores).toBe(2));
        data.importResult = {
          ok: true,
          stats: { resources: { file: { skipped: 1 } }, joins: {} }
        };
      };

      await expect(
        restoreBackup(backup, { triggerCloneUp: () => false })
      ).rejects.toThrow("DataFn restore failed");
      data.importResult = null;
      expect(await savedRecord(record.id)).toBeUndefined();
      expect(isKept(entry)).toBe(true);
      replays.clear();
      goOnline();
      await replayed(QUEUE_A);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);

      resume();
      await later;
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

  it("stops holding a file the queue holds complete for a restore a closed page cut short once that restore's hold row outlives its lifetime, and removes it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    await deleteRecord(record.id);
    const backup = await backupFile();
    let isStaged = false;
    preflight.during = () => {
      isStaged = true;
      return new Promise<void>(() => undefined);
    };
    void restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(isStaged).toBe(true));
    preflight.during = null;
    locks = createFakeLocks();
    expect(isKept(entry)).toBe(true);

    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);

    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
    );
    replays.clear();
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });
});

describe("restore sessions, generations and publication of queued files", () => {
  /** A FileFn error a retry may not change, or one it may. */
  function fileFnError(status: number) {
    return new FileFnHttpError("The thumbnail was not taken", status, {});
  }

  it.each([
    ["with", true],
    ["without", false]
  ])(
    "keeps a file for a restore still running once an overlapping restore of it settles and its record is deleted %s Web Locks, and uploads it once",
    async (_, isLocking) => {
      hasLocks = isLocking;
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const backup = await backupFile();
      const entry = `queued_${record.fileId}`;
      let resume!: () => void;
      const resumed = new Promise<void>((resolve) => (resume = resolve));
      let later: Promise<void> | undefined;
      let restores = 0;
      preflight.during = async () => {
        if (++restores > 1) return resumed;
        later = restoreBackup(backup, { triggerCloneUp: () => false });
        await vi.waitFor(() => expect(restores).toBe(2));
      };

      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect(isKept(entry)).toBe(true);
      await deleteRecord(record.id);
      replays.clear();
      goOnline();
      await replayed(QUEUE_A);

      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);

      preflight.during = null;
      resume();
      await later;
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
      expect(isKept(entry)).toBe(false);
      goOnline();

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it.each([
    ["while that restore holds it", false],
    ["once that restore's hold expired", true]
  ])(
    "leaves the file another restore wrote in its place when a restore rolls back after its own was replaced, %s, and uploads it once",
    async (_, isExpired) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const backup = await backupFile();
      const entry = `queued_${record.fileId}`;
      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      let resume!: () => void;
      const resumed = new Promise<void>((resolve) => (resume = resolve));
      let later: Promise<void> | undefined;
      let restores = 0;
      let replacement: string[] = [];
      preflight.during = async () => {
        if (++restores > 1) return resumed;
        await dequeueFile(QUEUE_A, record.fileId);
        later = restoreBackup(backup, { triggerCloneUp: () => false });
        await vi.waitFor(() => expect(restores).toBe(2));
        replacement = opfs.list(QUEUE_A, entry).sort();
        if (isExpired) {
          vi.spyOn(Date, "now").mockReturnValue(
            Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
          );
        }
        await bootData(cloudAccount("user-b"));
      };

      await expect(
        restoreBackup(backup, { triggerCloneUp: () => false })
      ).rejects.toThrow("The account changed while the backup was restored");
      preflight.during = null;

      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(opfs.list(QUEUE_A, entry).sort()).toEqual(replacement);
      expect(isHeldForAccount(entry)).toBe(true);

      await bootData(cloudAccount("user-a"));
      resume();
      // The later restore began in the runtime user-b replaced.
      await expect(later).rejects.toThrow(
        "The account changed while the backup was restored"
      );
      await restoreBackup(backup, { triggerCloneUp: () => false });
      goOnline();

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it.each([
    ["while that restore holds it", false],
    ["once that restore's hold expired", true]
  ])(
    "leaves the file another restore wrote in its place when a restore rolls back after its own was replaced, %s, and that restore completes and uploads it once",
    async (_, isExpired) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const backup = await backupFile();
      const entry = `queued_${record.fileId}`;
      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      let resume!: () => void;
      const resumed = new Promise<void>((resolve) => (resume = resolve));
      let later: Promise<void> | undefined;
      let restores = 0;
      let replacement: string[] = [];
      preflight.during = async () => {
        if (++restores > 1) return resumed;
        await dequeueFile(QUEUE_A, record.fileId);
        // The account switches away and back before the later restore
        // begins, so only this restore's runtime was replaced.
        await bootData(cloudAccount("user-b"));
        await bootData(cloudAccount("user-a"));
        later = restoreBackup(backup, { triggerCloneUp: () => false });
        await vi.waitFor(() => expect(restores).toBe(2));
        replacement = opfs.list(QUEUE_A, entry).sort();
        if (isExpired) {
          vi.spyOn(Date, "now").mockReturnValue(
            Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
          );
        }
      };

      await expect(
        restoreBackup(backup, { triggerCloneUp: () => false })
      ).rejects.toThrow("The account changed while the backup was restored");
      preflight.during = null;

      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(opfs.list(QUEUE_A, entry).sort()).toEqual(replacement);
      expect(isHeldForAccount(entry)).toBe(true);

      resume();
      await later;
      goOnline();

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("keeps a file a restore into another account relied on when an earlier restore of it rolls back, and uploads it once its account restores its record", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    let restores = 0;
    preflight.during = async () => {
      if (++restores > 1) return;
      await bootData(cloudAccount("user-b"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
    };

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The account changed while the backup was restored");
    preflight.during = null;

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(isHeldForAccount(entry)).toBe(true);
    expect(
      opfs.list(QUEUE_A, entry).some((name) => name.startsWith("settled-"))
    ).toBe(true);

    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deleted).toEqual([]);
  });

  it("resolves no bytes of a file a restore is still writing", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    opfs.clear();
    let isStaging = false;
    getDirectory = failingWrites((path) => {
      if (!path[2]?.startsWith("thumbnail-")) return undefined;
      isStaging = true;
      return "hang";
    });
    void restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(isStaging).toBe(true));
    getDirectory = opfs.getDirectory;

    expect(opfs.list(QUEUE_A, entry)).toContain("data.bin");
    expect(isUnpublished(entry)).toBe(true);
    expect(await readQueuedBytes(record.fileId, "full")).toBeUndefined();
    expect(await readQueuedBytes(record.fileId, "thumbnail")).toBeUndefined();
    locks = createFakeLocks();
  });

  it("leaves out of backups, and removes on the next replay, a file whose restore was cut short just before publishing it, and uploads it once restored again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    opfs.clear();
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    let isPublishing = false;
    getDirectory = failingWrites((path) => {
      if (!path[2]?.startsWith("published-")) return undefined;
      isPublishing = true;
      return "hang";
    });
    void restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(isPublishing).toBe(true));
    locks = createFakeLocks();
    getDirectory = opfs.getDirectory;
    expect(isUnpublished(entry)).toBe(true);
    expect(opfs.list(QUEUE_A, entry)).toEqual(
      expect.arrayContaining(["data.bin", "committed", "thumbnail-jpeg"])
    );

    expect(await readQueuedBytes(record.fileId, "full")).toBeUndefined();
    expect((await backupText()).startsWith('{"fileQueue"')).toBe(false);

    goOnline();
    await replayed(QUEUE_A);
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);

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

  it.each([
    ["with", true],
    ["without", false]
  ])(
    "copies the bytes of a file whose record a backup exports though a replay would remove the file between the two reads %s Web Locks",
    async (_, isLocking) => {
      hasLocks = isLocking;
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      let isReplayed = false;
      data.exportHook = async () => {
        data.exportHook = null;
        await deleteRecord(record.id);
        replays.clear();
        goOnline();
        await Promise.race([
          replayed(QUEUE_A),
          new Promise((resolve) => setTimeout(resolve, 200))
        ]);
        isReplayed = opfs.list(QUEUE_A).length === 0;
      };

      const text = await backupText();
      expect(isReplayed).toBe(false);
      await replayed(QUEUE_A);
      expect(opfs.list(QUEUE_A)).toEqual([]);
      expect(text.includes(record.id)).toBe(true);

      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      await restoreBackup(new File([text], "backup.json"), {
        triggerCloneUp: () => false
      });
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
      expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
      expect(await readQueuedBytes(record.fileId, "thumbnail")).toBe(
        "thumb bytes"
      );
    }
  );

  it.each(["metadata.json", "data.bin", "thumbnail-jpeg"])(
    "fails a backup visibly when a queued file's %s cannot be read, and fails a restore that finds it before importing a record, keeping the file",
    async (name) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      const backup = await backupFile();
      await deleteRecord(record.id);
      const held = opfs.list(QUEUE_A, entry).sort();
      let faults = 0;
      getDirectory = failingWrites(
        () => undefined,
        undefined,
        undefined,
        (path) => {
          if (path[1] !== entry || path[2] !== name) return undefined;
          faults++;
          return new DOMException("The file cannot be read", "UnknownError");
        }
      );

      await expect(createBackupBlob()).rejects.toThrow(
        "The file cannot be read"
      );
      await expect(
        restoreBackup(backup, { triggerCloneUp: () => false })
      ).rejects.toThrow("The file cannot be read");
      getDirectory = opfs.getDirectory;

      expect(faults).toBeGreaterThan(1);
      expect(await savedRecord(record.id)).toBeUndefined();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(opfs.list(QUEUE_A, entry).sort()).toEqual(held);
      expect(isKept(entry)).toBe(false);
    }
  );

  it("removes a file a restore adopted through an adoption row once its record is deleted, though its adopted mark could not be created", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("adopted-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(backup, { triggerCloneUp: () => false });
    getDirectory = opfs.getDirectory;
    expect(
      opfs.list(QUEUE_A, entry).some((name) => name.startsWith("adopted-"))
    ).toBe(false);
    expect(opfs.list(HOLDS_A)).toEqual([expect.stringMatching(/^adopted~/)]);
    expect(isHeldForAccount(entry)).toBe(false);

    await deleteRecord(record.id);
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("carries a thumbnail FileFn could not take yet without its confirmed original, and a restore sends the thumbnail once without the original", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    sdk.artifactError = fileFnError(503);
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    const text = await backupText();
    const index = JSON.parse(
      text.slice('{"fileQueue":'.length, text.indexOf(',"fileQueueBytes":"'))
    ) as {
      files: {
        uploadedVersionId?: string;
        data: [number, number];
        thumbnail?: { data: [number, number] };
      }[];
    };
    expect(index.files).toEqual([
      expect.objectContaining({ uploadedVersionId: "ver_1" })
    ]);
    const [file] = index.files;
    expect(file.data[1] - file.data[0]).toBe(0);
    expect(file.thumbnail).toBeDefined();
    expect(text.includes(btoa("photo bytes"))).toBe(false);

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    sdk.artifactError = null;
    await restoreBackup(new File([text], "backup.json"), {
      triggerCloneUp: () => false
    });
    expect(await readQueuedBytes(record.fileId, "thumbnail")).toBe(
      "thumb bytes"
    );
    expect(await readQueuedBytes(record.fileId, "full")).toBeUndefined();
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toEqual([
      expect.objectContaining({ fileId: record.fileId, versionId: "ver_1" })
    ]);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["FileFn could not take it yet", 503, 1],
    ["its account's credentials expired", 401, 1],
    ["FileFn rejected it for good", 422, 0]
  ])(
    "sends a thumbnail again on a later pass without its confirmed original when %s",
    async (_, status, sent) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      sdk.artifactError = fileFnError(status);
      goOnline();
      await replayed(QUEUE_A);
      expect(opfs.list(QUEUE_A).length).toBe(sent);

      sdk.artifactError = null;
      replays.clear();
      isOnline = false;
      goOnline();
      await replayed(QUEUE_A);

      expect(opfs.list(QUEUE_A)).toEqual([]);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
      expect(sdk.artifacts).toHaveLength(sent);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("sends a delivered thumbnail no more when its pass stopped before removing the file", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    let releaseUpload!: () => void;
    sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    data.isPullFailing = true;
    releaseUpload();
    await replayed(QUEUE_A);
    expect(sdk.artifacts).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(opfs.list(QUEUE_A, entry)).toContain("sent-thumbnail");

    data.isPullFailing = false;
    replays.clear();
    isOnline = false;
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId }),
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["its thumbnail was sent", null, false],
    ["its thumbnail is still to be sent", 503, true]
  ])(
    "leaves a confirmed original out of a backup though its uploaded mark was not written, when %s",
    async (_, status, isCarried) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      sdk.artifactError = status ? fileFnError(status) : null;
      getDirectory = failingWrites((path) =>
        path[1] === entry && path[2] === "uploaded"
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );
      let releaseUpload!: () => void;
      sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
      goOnline();
      await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
      data.isPullFailing = true;
      releaseUpload();
      await replayed(QUEUE_A);
      getDirectory = opfs.getDirectory;
      isOnline = false;
      expect(sdk.uploads).toHaveLength(1);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(opfs.list(QUEUE_A, entry)).not.toContain("uploaded");
      expect(uploadLogText()).toContain(record.fileId);

      const text = await backupText();
      expect(text.includes(btoa("photo bytes"))).toBe(false);
      expect(text.startsWith('{"fileQueue"')).toBe(isCarried);
      if (isCarried) expect(text).toContain('"uploadedVersionId":"ver_1"');
    }
  );

  it("takes a backup's snapshot again when another tab removes a file unuploaded between its reads, so no record is carried without its bytes", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    data.exportHook = async () => {
      data.exportHook = null;
      await deleteRecord(record.id);
      await dequeueFile(QUEUE_A, record.fileId);
    };

    const text = await backupText();

    expect(data.exportHook).toBeNull();
    expect(text.includes(record.id)).toBe(false);
    expect(text.startsWith('{"fileQueue"')).toBe(false);
  });

  it("leaves out of a backup, and writes again on a restore, a file whose capture has not finished writing its metadata", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    const queued = await writeQueuedEntryFile(entry, "metadata.json", "");
    for (const name of opfs.list(QUEUE_A, entry)) {
      if (!["data.bin", "metadata.json"].includes(name)) {
        await queued.removeEntry(name);
      }
    }

    expect((await backupText()).startsWith('{"fileQueue"')).toBe(false);

    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it("removes a file a closed page left with only its restoring mark once a replay runs", async () => {
    await bootData(cloudAccount("user-a"));
    const entry = "queued_file_abandoned01";
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(QUEUE_A, { create: true });
    const dir = await queue.getDirectoryHandle(entry, { create: true });
    await dir.getFileHandle("restoring-generation-1", { create: true });
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    replays.clear();
    isOnline = false;
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toEqual([]);
  });

  it("keeps holding a file a restore into another account relied on when its settled mark cannot be created, so an earlier restore's rollback keeps it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    let restores = 0;
    preflight.during = async () => {
      if (++restores > 1) return;
      await bootData(cloudAccount("user-b"));
      getDirectory = failingWrites((path) =>
        path[2]?.startsWith("settled-")
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );
      await restoreBackup(backup, { triggerCloneUp: () => false });
      getDirectory = opfs.getDirectory;
    };

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The account changed while the backup was restored");
    preflight.during = null;

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(isHeldForAccount(entry)).toBe(true);
    expect(isKept(entry)).toBe(true);
  });

  it("carries a pending thumbnail without its original when the original's uploaded mark is left empty, using the version the upload log records", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    sdk.artifactError = fileFnError(503);
    getDirectory = failingWrites(
      () => undefined,
      undefined,
      (path) =>
        path[1] === entry && path[2] === "uploaded"
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
    );
    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;
    isOnline = false;
    expect(opfs.read(QUEUE_A, entry, "uploaded")).toEqual(new Uint8Array());

    const text = await backupText();
    expect(text.includes(btoa("photo bytes"))).toBe(false);
    expect(text).toContain('"uploadedVersionId":"ver_1"');
  });

  it("keeps holding a file for a restore still importing when the clock is set back, so a replay neither removes nor discards it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    await deleteRecord(record.id);
    const backup = await backupFile();
    let isStaged = false;
    preflight.during = () => {
      isStaged = true;
      return new Promise<void>(() => undefined);
    };
    void restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(isStaged).toBe(true));
    preflight.during = null;
    locks = createFakeLocks();
    expect(isKept(entry)).toBe(true);
    vi.spyOn(Date, "now").mockReturnValue(Date.now() - 60 * 60_000);

    replays.clear();
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(isKept(entry)).toBe(true);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  /**
   * The OPFS root, which runs `before` once, right before the first new file
   * whose path `at` matches is created (or, with `isCreated` false, the
   * first existing one is opened).
   */
  function beforeCreating(
    at: (path: string[]) => boolean,
    before: () => Promise<void>,
    isCreated = true
  ) {
    let isDone = false;
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
          if (key === "getFileHandle") {
            return async (name: string, options?: { create?: boolean }) => {
              const isCreating = Boolean(options?.create);
              if (isCreating === isCreated && !isDone && at([...path, name])) {
                isDone = true;
                await before();
              }
              return target.getFileHandle(name, options);
            };
          }
          const value = Reflect.get(target, key) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        }
      });
    return async () => wrap(await opfs.getDirectory(), []);
  }

  it.each([
    ["with", true],
    ["without", false]
  ])(
    "takes a backup's snapshot again when a file is added and removed again between its reads %s Web Locks, so no record is carried without its bytes",
    async (_, isLocking) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      hasLocks = isLocking;
      let added: { id: string; fileId: string } | undefined;
      data.exportStartHook = async () => {
        data.exportStartHook = null;
        added = await capturePhoto();
      };
      data.exportHook = async () => {
        data.exportHook = null;
        await deleteRecord(added!.id);
        await (await openQueueTab()).dequeueFile(QUEUE_A, added!.fileId);
      };

      const text = await backupText();

      expect(added).toBeDefined();
      expect(data.exportHook).toBeNull();
      expect(text.includes(added!.id)).toBe(false);
      expect(text.startsWith('{"fileQueue"')).toBe(false);
    }
  );

  it("rejects a backup during which the records switched to another account and back, so it never carries one account's records with another's files", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    await capturePhoto();
    data.exportStartHook = async () => {
      data.exportStartHook = null;
      await bootData(cloudAccount("user-b"));
    };
    data.exportHook = async () => {
      data.exportHook = null;
      await bootData(cloudAccount("user-a"));
    };

    await expect(createBackupBlob()).rejects.toThrow(
      "The account changed while the backup was made"
    );
    expect(data.exportHook).toBeNull();
  });

  it.each([
    ["missing", true],
    ["empty", false]
  ])(
    "rejects a backup and a restore, keeping the queued file, when the metadata of a file whose capture finished is %s",
    async (_, isRemoved) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      const backup = await backupFile();
      await deleteRecord(record.id);
      const queued = await writeQueuedEntryFile(entry, "metadata.json", "");
      if (isRemoved) await queued.removeEntry("metadata.json");

      await expect(createBackupBlob()).rejects.toThrow("metadata is missing");
      await expect(
        restoreBackup(backup, { triggerCloneUp: () => false })
      ).rejects.toThrow("metadata is missing");

      expect(await savedRecord(record.id)).toBeUndefined();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(
        new TextDecoder().decode(opfs.read(QUEUE_A, entry, "data.bin"))
      ).toBe("photo bytes");
    }
  );

  it("rejects a restore without Web Locks, keeping another tab's restored file, when that tab writes the file after the restore found it missing", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(QUEUE_A, { create: true });
    const left = await queue.getDirectoryHandle(entry, { create: true });
    await left.getFileHandle("restoring-generation-1", { create: true });
    hasLocks = false;
    getDirectory = beforeCreating(
      (path) => path[0] === HOLDS_A && path[1].startsWith("hold~"),
      async () => {
        const tab = await openQueueTab();
        await tab.stageRestoredFiles(
          QUEUE_A,
          [
            {
              fileId: record.fileId,
              fileName: "photo.png",
              contentType: "image/png",
              policy: "nucleus-durable-default",
              createdAt: new Date().toISOString(),
              retryCount: 0,
              data: new TextEncoder().encode("other tab bytes"),
              isCommitted: true,
              started: []
            }
          ],
          { isOwnAccount: true }
        );
      }
    );

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("Another tab is changing a queued file");

    expect(await savedRecord(record.id)).toBeUndefined();
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(
      new TextDecoder().decode(opfs.read(QUEUE_A, entry, "data.bin"))
    ).toBe("other tab bytes");
    expect(isKept(entry)).toBe(true);
  });

  it("rejects a restore without Web Locks that would hold a file another tab's replay is discarding, so no record is restored without its original", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await deleteRecord(record.id);
    hasLocks = false;
    isOnline = true;
    let restored: Promise<unknown> | undefined;
    const tab = await openQueueTab();
    const { createFileFnClient } = await import("@filefn/client");

    await tab.replayFileQueue(
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
          restored = restoreBackup(backup, { triggerCloneUp: () => false });
          await restored.catch(() => undefined);
          sdk.deleted.push(fileId);
        }
      }
    );

    await expect(restored).rejects.toThrow(
      "Another tab is changing a queued file"
    );
    expect(await savedRecord(record.id)).toBeUndefined();
    expect(sdk.deleted).toEqual([record.fileId]);
    expect(opfs.list(QUEUE_A)).toEqual([]);
  });

  it("resolves no bytes of a generation that replaced the one it found published while it read it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const metadata = opfs.read(QUEUE_A, entry, "metadata.json")!;
    const replace = async () => {
      const root = await opfs.getDirectory();
      const queue = await root.getDirectoryHandle(QUEUE_A);
      await queue.removeEntry(entry, { recursive: true });
      const next = await queue.getDirectoryHandle(entry, { create: true });
      await next.getFileHandle("restoring-generation-2", { create: true });
      for (const [name, bytes] of [
        ["data.bin", new TextEncoder().encode("replacement bytes")],
        ["metadata.json", metadata]
      ] as const) {
        const writable = await (
          await next.getFileHandle(name, { create: true })
        ).createWritable();
        await writable.write(bytes);
        await writable.close();
      }
    };
    let isReplaced = false;
    const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
      new Proxy(dir, {
        get(target, key) {
          if (key === "getDirectoryHandle") {
            return async (name: string, options?: { create?: boolean }) =>
              wrap(await target.getDirectoryHandle(name, options));
          }
          if (key === "keys" && target.name === entry && !isReplaced) {
            return async function* () {
              yield* target.keys();
              isReplaced = true;
              await replace();
            };
          }
          const value = Reflect.get(target, key) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        }
      });
    getDirectory = async () => wrap(await opfs.getDirectory());

    const url = await resolveQueuedFileUrl([QUEUE_A], record.fileId, "full");

    expect(isReplaced).toBe(true);
    expect(url).toBeNull();
  });

  it("sends no thumbnail once offline mode is on while the thumbnail is read, and sends it once online again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    let isArmed = true;
    getDirectory = failingWrites(
      () => undefined,
      undefined,
      undefined,
      (path) => {
        if (isArmed && path[1] === entry && path[2]?.startsWith("thumbnail-")) {
          isArmed = false;
          isOnline = false;
        }
        return undefined;
      }
    );
    goOnline();
    await replayed(QUEUE_A);

    expect(isArmed).toBe(false);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    getDirectory = opfs.getDirectory;
    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
  });

  it("sends a thumbnail no more once it was delivered and its file left the queue, when an older backup carrying it without its original is restored", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    sdk.artifactError = fileFnError(503);
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    const backup = await backupFile();
    expect(await backup.text()).toContain('"uploadedVersionId":"ver_1"');

    sdk.artifactError = null;
    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.artifacts).toHaveLength(1);

    await restoreBackup(backup, { triggerCloneUp: () => false });
    await Promise.all(replays.get(QUEUE_A) ?? []);

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.uploads).toHaveLength(1);
  });

  it("runs a replay once a restore's retained hold expires, and uploads the file without another trigger", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites(
      (path) =>
        path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
          ? new Error("The adoption cannot be recorded")
          : undefined,
      (path) =>
        path[2]?.startsWith("restoring-")
          ? new Error("The restoring mark cannot be removed")
          : undefined
    );
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const timers: { run: () => void; delay: number }[] = [];
    const setTimer = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      run: () => void,
      delay = 0
    ) => {
      if (delay < 60 * 60_000) return setTimer(run, delay);
      timers.push({ run, delay });
      return 0;
    }) as never);

    goOnline();
    await replayed(QUEUE_A);
    expect(sdk.started).toEqual([]);
    expect(isKept(entry)).toBe(true);
    expect(timers).toHaveLength(1);
    expect(timers[0].delay).toBeGreaterThan(RESTORE_HOLD_LIFETIME_MS - 60_000);

    getDirectory = opfs.getDirectory;
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + 2_000
    );
    replays.clear();
    timers[0].run();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deleted).toEqual([]);
  });

  /** Moves an entry of user-a's queue aside, returning what puts it back. */
  async function takeEntryAside(entry: string) {
    const files = opfs
      .list(QUEUE_A, entry)
      .map((name) => [name, opfs.read(QUEUE_A, entry, name)!] as const);
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(QUEUE_A);
    await queue.removeEntry(entry, { recursive: true });
    return async (replaced: Record<string, Uint8Array> = {}) => {
      const dir = await queue.getDirectoryHandle(entry, { create: true });
      for (const [name, bytes] of [...files, ...Object.entries(replaced)]) {
        const writable = await (
          await dir.getFileHandle(name, { create: true })
        ).createWritable();
        await writable.write(replaced[name] ?? bytes);
        await writable.close();
      }
    };
  }

  it("takes a backup's snapshot again when a file is published between its copy and its last read", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const first = await capturePhoto();
    const record = await capturePhoto();
    const putBack = await takeEntryAside(`queued_${record.fileId}`);
    hasLocks = false;
    getDirectory = beforeCreating(
      (path) => path[1] === `queued_${first.fileId}` && path[2] === "data.bin",
      () => putBack(),
      false
    );

    const text = await backupText();
    const index = text.slice(0, text.indexOf(',"fileQueueBytes":"'));

    expect(index).toContain(`"fileId":"${first.fileId}"`);
    expect(index).toContain(`"fileId":"${record.fileId}"`);
  });

  it("keeps a file another tab's restore wrote over an abandoned entry while a replay without Web Locks was about to remove that entry", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(QUEUE_A, { create: true });
    const left = await queue.getDirectoryHandle(entry, { create: true });
    await left.getFileHandle("restoring-generation-1", { create: true });
    hasLocks = false;
    getDirectory = beforeCreating(
      (path) => path[0] === HOLDS_A && path[1].startsWith("acting~"),
      async () => {
        isOnline = false;
        await restoreBackup(backup, { triggerCloneUp: () => false });
        isOnline = true;
      }
    );
    isOnline = true;

    await replayInOtherTab();

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
  });

  it("neither discards nor removes a file without Web Locks once another tab restored its record after the replay found it deleted", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    hasLocks = false;
    getDirectory = beforeCreating(
      (path) => path[0] === HOLDS_A && path[1].startsWith("acting~"),
      async () => {
        isOnline = false;
        await restoreBackup(backup, { triggerCloneUp: () => false });
        isOnline = true;
      }
    );
    isOnline = true;

    await replayInOtherTab();

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
  });

  it("resolves a download again once another generation replaced the one its held URL was read from", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const download = async () => {
      const url = await resolveQueuedFileUrl(
        [QUEUE_A],
        record.fileId,
        "download"
      );
      return url ? objectUrls.get(url)?.text() : url;
    };
    expect(await download()).toBe("photo bytes");

    const putBack = await takeEntryAside(entry);
    await putBack({
      "restoring-generation-2": new Uint8Array(),
      "published-generation-2": new Uint8Array(),
      "data.bin": new TextEncoder().encode("replacement bytes")
    });
    const root = await opfs.getDirectory();
    const dir = await (
      await root.getDirectoryHandle(QUEUE_A)
    ).getDirectoryHandle(entry);
    for (const name of opfs.list(QUEUE_A, entry)) {
      const isMark = /^(restoring|published)-/.test(name);
      if (isMark && !name.endsWith("generation-2")) await dir.removeEntry(name);
    }

    expect(await download()).toBe("replacement bytes");
  });

  it.each([
    ["without its original", true],
    ["whole, as before its original uploaded", false]
  ])(
    "restores again a thumbnail its replay could not read, from a backup carrying it %s, and sends it once",
    async (_, isThumbnailOnly) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      let backup = await backupFile();
      if (isThumbnailOnly) {
        sdk.artifactError = fileFnError(503);
        goOnline();
        await replayed(QUEUE_A);
        isOnline = false;
        backup = await backupFile();
        expect(await backup.text()).toContain('"uploadedVersionId":"ver_1"');
      }

      sdk.artifactError = null;
      getDirectory = failingWrites(
        () => undefined,
        undefined,
        undefined,
        (path) =>
          path[1] === entry && path[2]?.startsWith("thumbnail-")
            ? new DOMException("Unreadable", "NotReadableError")
            : undefined
      );
      replays.clear();
      goOnline();
      await replayed(QUEUE_A);
      getDirectory = opfs.getDirectory;
      expect(sdk.artifacts).toEqual([]);
      expect(uploadLogText()).not.toMatch(/~thumbnail:/);

      replays.clear();
      await restoreBackup(backup, { triggerCloneUp: () => false });
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);

      expect(sdk.artifacts).toHaveLength(1);
      expect(sdk.uploads).toHaveLength(1);
    }
  );

  it("restores nothing when DataFn is started again for the same account while the restore stages its files", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    preflight.during = async () => {
      preflight.during = null;
      await bootData(cloudAccount("user-a"));
    };

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The account changed while the backup was restored");

    expect(await savedRecord(record.id)).toBeUndefined();
    expect(opfs.list(QUEUE_A)).toEqual([]);
  });

  it("takes a backup's snapshot again when another tab's replay without Web Locks discards a delivered file between its reads", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    let releaseUpload!: () => void;
    sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    data.isPullFailing = true;
    releaseUpload();
    await replayed(QUEUE_A);
    data.isPullFailing = false;
    isOnline = false;
    expect(opfs.list(QUEUE_A, `queued_${record.fileId}`)).toContain(
      "sent-thumbnail"
    );
    hasLocks = false;
    const owner = JSON.parse(
      new TextDecoder().decode(
        opfs.read(QUEUE_A, `queued_${record.fileId}`, "claim.json")
      )
    ) as { userId: string; baseUrl: string };
    data.exportHook = async () => {
      data.exportHook = null;
      await deleteRecord(record.id);
      isOnline = true;
      const tab = await openQueueTab();
      const { createFileFnClient } = await import("@filefn/client");
      let isDiscarded = false;
      await tab.replayFileQueue(
        QUEUE_A,
        createFileFnClient({} as never),
        new AbortController().signal,
        undefined,
        {
          owner,
          isCurrent: () => !isDiscarded,
          sync: async () => true,
          isReferenced: async () => false,
          discard: async (fileId) => {
            isDiscarded = true;
            sdk.deleted.push(fileId);
          }
        }
      );
      isOnline = false;
    };

    const text = await backupText();

    expect(sdk.deleted).toEqual([record.fileId]);
    expect(text.includes(record.id)).toBe(false);
  });

  it("resolves the generation that replaced the one it found published once reading that one fails", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const putBack = await takeEntryAside(entry);
    await putBack();
    getDirectory = beforeCreating(
      (path) => path[1] === entry && path[2] === "data.bin",
      async () => {
        const replace = await takeEntryAside(entry);
        await replace({
          "data.bin": new TextEncoder().encode("replacement bytes")
        });
        const root = await opfs.getDirectory();
        const dir = await (
          await root.getDirectoryHandle(QUEUE_A)
        ).getDirectoryHandle(entry);
        for (const name of opfs.list(QUEUE_A, entry)) {
          if (/^(restoring|published)-/.test(name)) await dir.removeEntry(name);
        }
        await dir.getFileHandle("restoring-generation-2", { create: true });
        await dir.getFileHandle("published-generation-2", { create: true });
        throw new DOMException("The generation was retired", "NotFoundError");
      },
      false
    );

    expect(await readQueuedBytes(record.fileId, "full")).toBe(
      "replacement bytes"
    );
  });

  it("keeps a file a rolling-back restore wrote once another tab's restore adopted it, without Web Locks", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    hasLocks = false;
    preflight.during = async () => {
      preflight.during = null;
      getDirectory = beforeCreating(
        (path) => path[0] === HOLDS_A && path[1].startsWith("acting~"),
        async () => {
          const tab = await openQueueTab();
          const staged = await tab.stageRestoredFiles(
            QUEUE_A,
            [
              {
                fileId: record.fileId,
                fileName: "photo.png",
                contentType: "image/png",
                policy: "nucleus-durable-default",
                createdAt: new Date().toISOString(),
                retryCount: 0,
                data: new TextEncoder().encode("photo bytes"),
                isCommitted: true,
                started: []
              }
            ],
            { isOwnAccount: true }
          );
          expect(staged.kept).toHaveLength(1);
          await tab.settleRestoredFiles(staged, async () => true);
        }
      );
      await bootData(cloudAccount("user-b"));
    };

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The account changed while the backup was restored");

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(isHeldForAccount(entry)).toBe(false);
    expect(
      new TextDecoder().decode(opfs.read(QUEUE_A, entry, "data.bin"))
    ).toBe("photo bytes");
  });

  it("keeps a capture as staged, with no second copy, when the queue's change mark cannot be written once the file is staged", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    let closes = 0;
    getDirectory = failingWrites(
      () => undefined,
      undefined,
      (path) =>
        path[0] === `${QUEUE_A}.revision` && ++closes === 2
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
    );

    const record = await capturePhoto();
    getDirectory = opfs.getDirectory;

    expect(closes).toBeGreaterThanOrEqual(2);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);
  });

  it("neither discards nor removes a file once its replay without Web Locks outlived its acting row while another tab restored its record, and uploads it once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    hasLocks = false;
    getDirectory = beforeCreating(
      (path) => path[0] === `${QUEUE_A}.revision`,
      async () => {
        vi.spyOn(Date, "now").mockReturnValue(Date.now() + 11 * 60_000);
        isOnline = false;
        await restoreBackup(backup, { triggerCloneUp: () => false });
        isOnline = true;
      }
    );
    isOnline = true;
    const otherTab = new AbortController();

    await replayInOtherTab(otherTab.signal);
    otherTab.abort();
    getDirectory = opfs.getDirectory;

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");

    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deleted).toEqual([]);
  });

  it("sends no discard when the account switches while the replay writes the queue's change mark, and discards the file once back in its account", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    await deleteRecord(record.id);
    hasLocks = false;
    getDirectory = beforeCreating(
      (path) => path[0] === `${QUEUE_A}.revision`,
      () => bootData(cloudAccount("user-b"))
    );

    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;

    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    await bootData(cloudAccount("user-a"));
    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.deleted).toEqual([record.fileId]);
    expect(sdk.uploads).toEqual([]);
  });

  it("removes a file when the queue's change mark cannot be written, and a backup between its reads takes its snapshot again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    let exports = 0;
    data.exportStartHook = async () => {
      exports++;
    };
    data.exportHook = async () => {
      data.exportHook = null;
      getDirectory = failingWrites((path) =>
        path[0] === `${QUEUE_A}.revision`
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );
      await (await openQueueTab()).dequeueFile(QUEUE_A, record.fileId);
      getDirectory = opfs.getDirectory;
    };

    const text = await backupText();

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(exports).toBe(2);
    expect(text.startsWith('{"fileQueue"')).toBe(false);
  });

  it("shares one download URL between lookups that overlap a replacement of the file, never revoking the replacement's URL", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const download = () =>
      resolveQueuedFileUrl([QUEUE_A], record.fileId, "download");
    let lookups = 0;
    let second: Promise<string | undefined | null> | undefined;
    const paused = beforeCreating(
      (path) => path[1] === entry && path[2] === "data.bin",
      async () => {
        const putBack = await takeEntryAside(entry);
        await putBack({
          "restoring-generation-2": new Uint8Array(),
          "published-generation-2": new Uint8Array(),
          "data.bin": new TextEncoder().encode("replacement bytes")
        });
        const root = await opfs.getDirectory();
        const dir = await (
          await root.getDirectoryHandle(QUEUE_A)
        ).getDirectoryHandle(entry);
        for (const name of opfs.list(QUEUE_A, entry)) {
          const isMark = /^(restoring|published)-/.test(name);
          if (isMark && !name.endsWith("generation-2")) {
            await dir.removeEntry(name);
          }
        }
        lookups = 0;
        second = download();
        await vi.waitFor(() => expect(lookups).toBeGreaterThan(0));
      },
      false
    );
    getDirectory = () => {
      lookups++;
      return paused();
    };

    const first = await download();
    const urls = [first, await second];
    getDirectory = opfs.getDirectory;

    expect(urls[0]).toBeTruthy();
    expect(urls[1]).toBe(urls[0]);
    expect(await objectUrls.get(urls[0]!)?.text()).toBe("replacement bytes");
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(urls[0]);
    expect(await download()).toBe(urls[0]);
  });

  it.each([
    ["in the same page", false],
    ["after a reload", true]
  ])(
    "requests a restored file's original once when the pull after its upload fails, and removes it on the next replay %s",
    async (_, isReloaded) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const backup = await backupFile();
      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
      let release!: () => void;
      sdk.hold = new Promise<void>((resolve) => (release = resolve));

      replays.clear();
      goOnline();
      await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
      data.isPullFailing = true;
      release();
      await replayed(QUEUE_A);
      expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);

      data.isPullFailing = false;
      if (isReloaded) {
        const { userId, baseUrl } = JSON.parse(
          startedMarkerOf(`queued_${record.fileId}`).text
        ) as { userId: string; baseUrl: string };
        const otherTab = new AbortController();
        await replayInOtherTab(otherTab.signal, { userId, baseUrl });
        otherTab.abort();
      } else {
        replays.clear();
        goOnline();
        await replayed(QUEUE_A);
      }

      expect(opfs.list(QUEUE_A)).toEqual([]);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(1);
    }
  );

  it("removes a delivered restored file when its store is too full to write the upload log, records the delivery once that frees space, and a restore of the older backup delivers it no more", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    // The store is full while the file's bytes are in it.
    getDirectory = failingWrites((path) =>
      path[0] === UPLOAD_LOG && opfs.list(QUEUE_A).length
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );

    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;
    expect(opfs.list(QUEUE_A)).toEqual([]);

    replays.clear();
    await restoreBackup(backup, { triggerCloneUp: () => false });
    await Promise.all(replays.get(QUEUE_A) ?? []);

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
  });

  /**
   * The OPFS root, which runs `before` once, right before the first lookup
   * of the directory `name` at its root after a file whose path `after`
   * matches is created.
   */
  function beforeLookingUp(
    after: (path: string[]) => boolean,
    name: string,
    before: () => Promise<void>
  ) {
    let isArmed = false;
    let isDone = false;
    const armed = beforeCreating(after, async () => {
      isArmed = true;
    });
    return async () =>
      new Proxy(await armed(), {
        get(target, key) {
          if (key === "getDirectoryHandle") {
            return async (dir: string, options?: { create?: boolean }) => {
              if (isArmed && !isDone && dir === name) {
                isDone = true;
                await before();
              }
              return target.getDirectoryHandle(dir, options);
            };
          }
          const value = Reflect.get(target, key) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        }
      });
  }

  it("sends no discard when its replay without Web Locks outlives its acting row while reading the hold rows, during which another tab restored the file's record", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    hasLocks = false;
    getDirectory = beforeLookingUp(
      (path) => path[0] === `${QUEUE_A}.revision`,
      HOLDS_A,
      async () => {
        vi.spyOn(Date, "now").mockReturnValue(Date.now() + 11 * 60_000);
        isOnline = false;
        await restoreBackup(backup, { triggerCloneUp: () => false });
        isOnline = true;
      }
    );
    isOnline = true;
    const otherTab = new AbortController();

    await replayInOtherTab(otherTab.signal);
    otherTab.abort();
    getDirectory = opfs.getDirectory;

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
  });

  it("keeps a file a rolling-back restore without Web Locks was removing once its acting row outlived its lifetime while another restore adopted it, and uploads it once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    const { files } = await (
      await openQueueTab()
    ).exportQueuedFiles(QUEUE_A, async () => null);
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    hasLocks = false;
    const tab = await openQueueTab();
    const staged = await tab.stageRestoredFiles(QUEUE_A, files, {
      isOwnAccount: true
    });
    getDirectory = beforeCreating(
      (path) => path[0] === `${QUEUE_A}.revision`,
      async () => {
        vi.spyOn(Date, "now").mockReturnValue(Date.now() + 11 * 60_000);
        await restoreBackup(backup, { triggerCloneUp: () => false });
      }
    );

    await tab.unstageRestoredFiles(staged);
    getDirectory = opfs.getDirectory;

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");

    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deleted).toEqual([]);
  });

  it("records a delivered restored file in the upload log when a restore's settlement removes it, so restoring the backup again sends neither its original nor its thumbnail", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    getDirectory = failingWrites((path) =>
      path[0] === UPLOAD_LOG
        ? new DOMException("The log cannot be written", "NotReadableError")
        : undefined
    );
    let release!: () => void;
    sdk.hold = new Promise<void>((resolve) => (release = resolve));
    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    data.isPullFailing = true;
    release();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;
    data.isPullFailing = false;
    isOnline = false;
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);

    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(opfs.list(QUEUE_A)).toEqual([]);
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(opfs.list(QUEUE_A)).toEqual([]);
    replays.clear();
    goOnline();
    await Promise.all(replays.get(QUEUE_A) ?? []);

    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
  });

  it.each([
    ["holding a file", true],
    ["that is empty", false]
  ])(
    "takes a backup of a queue %s that has no change mark while none can be written, as no file can be added meanwhile",
    async (_, isCaptured) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      if (isCaptured) await capturePhoto();
      const root = await opfs.getDirectory();
      await root.removeEntry(`${QUEUE_A}.revision`).catch(String);
      getDirectory = failingWrites((path) =>
        path[0] === `${QUEUE_A}.revision`
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );

      const text = await backupText();

      expect(text.startsWith('{"fileQueue"')).toBe(isCaptured);
      expect(text.includes(btoa("photo bytes"))).toBe(isCaptured);
    }
  );

  it("takes a backup's snapshot again when a file is added and removed between its reads of a queue that had no change mark", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const root = await opfs.getDirectory();
    await root.removeEntry(`${QUEUE_A}.revision`).catch(String);
    let exports = 0;
    data.exportStartHook = async () => {
      exports++;
    };
    data.exportHook = async () => {
      data.exportHook = null;
      const tab = await openQueueTab();
      await tab.enqueueFile(QUEUE_A, {
        fileId: "file_added_meanwhile",
        fileName: "added.png",
        contentType: "image/png",
        blob: new Blob(["added bytes"], { type: "image/png" })
      });
      await tab.dequeueFile(QUEUE_A, "file_added_meanwhile");
    };

    const text = await backupText();

    expect(exports).toBe(2);
    expect(text.startsWith('{"fileQueue"')).toBe(false);
  });

  it("sends no discard when the clock that let another tab restore the file is set back before its replay without Web Locks resumes", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    hasLocks = false;
    getDirectory = beforeCreating(
      (path) => path[0] === `${QUEUE_A}.revision`,
      async () => {
        const ahead = vi
          .spyOn(Date, "now")
          .mockReturnValue(Date.now() + 11 * 60_000);
        isOnline = false;
        await restoreBackup(backup, { triggerCloneUp: () => false });
        isOnline = true;
        ahead.mockRestore();
      }
    );
    isOnline = true;
    const otherTab = new AbortController();

    await replayInOtherTab(otherTab.signal);
    otherTab.abort();
    getDirectory = opfs.getDirectory;

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
  });

  it("discards and removes a file whose record was deleted when the store is too full for the queue's change mark, and a backup between its reads takes its snapshot again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    await deleteRecord(record.id);
    hasLocks = false;
    let exports = 0;
    data.exportStartHook = async () => {
      exports++;
    };
    data.exportHook = async () => {
      data.exportHook = null;
      getDirectory = failingWrites((path) =>
        path[0] === `${QUEUE_A}.revision`
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );
      isOnline = true;
      const otherTab = new AbortController();
      await replayInOtherTab(otherTab.signal);
      otherTab.abort();
      isOnline = false;
      getDirectory = opfs.getDirectory;
    };

    const text = await backupText();

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.deleted).toEqual([record.fileId]);
    expect(exports).toBe(2);
    expect(text.startsWith('{"fileQueue"')).toBe(false);
  });

  it("sends no discard when DataFn is started again for the same account with the file's record while the replay writes the queue's change mark, and uploads the file once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const records = await datafn.exportData();
    await deleteRecord(record.id);
    hasLocks = false;
    getDirectory = beforeCreating(
      (path) => path[0] === `${QUEUE_A}.revision`,
      async () => {
        await bootData(cloudAccount("user-a"));
        await datafn.importData(records, { triggerCloneUp: false });
      }
    );

    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(sdk.deleted).toEqual([]);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it("lets no other tab restore an older backup of a delivered file before its replay records the delivery the full store kept it from logging, and sends neither component again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const { userId, baseUrl } = JSON.parse(startedMarkerOf(entry).text) as {
      userId: string;
      baseUrl: string;
    };
    hasLocks = false;
    let restored: unknown;
    let isPaused = false;
    getDirectory = failingWrites((path) => {
      if (path[0] !== UPLOAD_LOG) return undefined;
      if (opfs.list(QUEUE_A).length) {
        return new DOMException("The quota is exceeded", "QuotaExceededError");
      }
      if (isPaused) return undefined;
      isPaused = true;
      return restoreBackup(backup, { triggerCloneUp: () => false }).then(
        () => undefined,
        (error: unknown) => {
          restored = error;
        }
      );
    });
    isOnline = true;
    const otherTab = new AbortController();

    await replayInOtherTab(otherTab.signal, { userId, baseUrl });
    otherTab.abort();
    getDirectory = opfs.getDirectory;
    expect(isPaused).toBe(true);
    replays.clear();
    goOnline();
    await Promise.all(replays.get(QUEUE_A) ?? []);

    expect(restored).toBeInstanceOf(Error);
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
  });

  it("resolves no download URL, and holds none, once a lookup of another account's queues released it while it was read", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    getDirectory = beforeCreating(
      (path) => path[1] === entry && path[2] === "data.bin",
      async () => {
        await resolveQueuedFileUrl([QUEUE_B], record.fileId, "download");
      },
      false
    );

    const url = await resolveQueuedFileUrl(
      [QUEUE_A],
      record.fileId,
      "download"
    );
    getDirectory = opfs.getDirectory;

    expect(url).toBeNull();
    for (const created of objectUrls.keys()) {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(created);
    }
  });

  /**
   * The OPFS root, armed once a new file whose path `armedAt` matches is
   * created; the first listing of user-a's hold rows after that runs
   * `before` once it read the names, which it then returns as read then.
   */
  function afterListingHolds(
    armedAt: (path: string[]) => boolean,
    before: () => Promise<void>
  ) {
    const state = { isArmed: false, isDone: false };
    const armed = beforeCreating(armedAt, async () => {
      state.isArmed = true;
    });
    const holds = (dir: FileSystemDirectoryHandle) =>
      new Proxy(dir, {
        get(target, key) {
          if (key === "keys") {
            return async function* () {
              const names: string[] = [];
              const listed = target as unknown as {
                keys(): AsyncIterable<string>;
              };
              for await (const name of listed.keys()) names.push(name);
              const isActing = names.some((name) => name.startsWith("acting~"));
              if (state.isArmed && !state.isDone && isActing) {
                state.isDone = true;
                await before();
              }
              yield* names;
            };
          }
          const value = Reflect.get(target, key) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        }
      });
    const open = async () =>
      new Proxy(await armed(), {
        get(target, key) {
          if (key === "getDirectoryHandle") {
            return async (name: string, options?: { create?: boolean }) => {
              const dir = await target.getDirectoryHandle(name, options);
              return name === HOLDS_A ? holds(dir) : dir;
            };
          }
          const value = Reflect.get(target, key) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        }
      });
    return { state, open };
  }

  it("sends no discard when another tab restores the file after its replay without Web Locks last listed the hold rows, the clock reading its acting row expired meanwhile and then set back", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    hasLocks = false;
    const paused = afterListingHolds(
      (path) => path[0] === `${QUEUE_A}.revision`,
      async () => {
        const ahead = vi
          .spyOn(Date, "now")
          .mockReturnValue(Date.now() + 11 * 60_000);
        isOnline = false;
        await restoreBackup(backup, { triggerCloneUp: () => false });
        isOnline = true;
        ahead.mockRestore();
      }
    );
    getDirectory = paused.open;
    isOnline = true;
    const otherTab = new AbortController();

    await replayInOtherTab(otherTab.signal);
    otherTab.abort();
    getDirectory = opfs.getDirectory;

    expect(paused.state.isDone).toBe(true);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
  });

  it.each([
    ["the same account", ["user-a"]],
    ["another account and back", ["user-b", "user-a"]]
  ])(
    "sends no discard when DataFn is started again for %s with the file's record after the replay's no-reference query, and uploads the file once",
    async (_, userIds) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const records = await datafn.exportData();
      await deleteRecord(record.id);
      hasLocks = false;
      let isRestarted = false;
      getDirectory = beforeLookingUp(
        (path) => path[0] === `${QUEUE_A}.revision`,
        HOLDS_A,
        async () => {
          for (const userId of userIds) await bootData(cloudAccount(userId));
          await datafn.importData(records, { triggerCloneUp: false });
          isRestarted = true;
        }
      );

      replays.clear();
      goOnline();
      await replayed(QUEUE_A);
      await vi.waitFor(() => expect(isRestarted).toBe(true));
      getDirectory = opfs.getDirectory;
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);

      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
      expect(sdk.deleted).toEqual([]);
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
    }
  );

  it("keeps both delivery rows when two tabs without Web Locks log their uploads at once, so restoring the older backup sends neither file again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const first = await capturePhoto();
    const second = await capturePhoto();
    const backup = await backupFile();
    hasLocks = false;
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let isPaused = false;
    getDirectory = failingWrites((path) => {
      if (path[0] !== UPLOAD_LOG || isPaused) return undefined;
      isPaused = true;
      return released;
    });
    isOnline = true;
    const tab1 = new AbortController();
    const tab2 = new AbortController();
    const logged = (suffix = "") =>
      opfs
        .list(UPLOAD_LOG)
        .map(decodeURIComponent)
        .filter((name) => name.split("~")[1] === (suffix || undefined))
        .map((name) => name.split("~")[0]);

    const one = replayInOtherTab(tab1.signal);
    await vi.waitFor(() => expect(isPaused).toBe(true));
    const two = replayInOtherTab(tab2.signal);
    await vi.waitFor(() => expect(logged().length).toBeGreaterThan(0));
    release();
    await one;
    await two;
    tab1.abort();
    tab2.abort();
    getDirectory = opfs.getDirectory;
    const uploaded = new Set(
      sdk.uploads.map((upload: { fileId?: string }) => upload.fileId)
    );
    const uploads = sdk.uploads.length;
    isOnline = false;
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const restaged = opfs.list(QUEUE_A);
    replays.clear();
    goOnline();
    await Promise.all(replays.get(QUEUE_A) ?? []);

    expect(logged().sort()).toEqual([first.fileId, second.fileId].sort());
    expect(logged("thumbnail").sort()).toEqual(
      [first.fileId, second.fileId].sort()
    );
    expect([...uploaded].sort()).toEqual([first.fileId, second.fileId].sort());
    expect(restaged).toEqual([]);
    expect(sdk.uploads).toHaveLength(uploads);
  });

  it("rejects a restore when a file's delivery row cannot be read, importing no record and keeping the queued file", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    const root = await opfs.getDirectory();
    const log = await root.getDirectoryHandle(UPLOAD_LOG, { create: true });
    await log.getFileHandle(encodeURIComponent(record.fileId), {
      create: true
    });
    getDirectory = failingWrites(
      () => undefined,
      undefined,
      undefined,
      (path) =>
        path[0] === UPLOAD_LOG
          ? new DOMException("The row is unreadable", "NotReadableError")
          : undefined
    );

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow();
    getDirectory = opfs.getDirectory;

    expect(await savedRecord(record.id)).toBeUndefined();
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(opfs.read(QUEUE_A, entry, "data.bin")?.byteLength).toBeGreaterThan(
      0
    );
    expect(sdk.uploads).toEqual([]);
  });

  it.each([
    ["rejects", "{"],
    ["resolves no URL", null]
  ])(
    "gives a download lookup that finds a complete replacement its own URL when the retired generation's held read %s",
    async (_, metadata) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      const backup = await backupFile();
      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
      const download = () =>
        resolveQueuedFileUrl([QUEUE_A], record.fileId, "download");
      let second: string | undefined | null = "pending";
      const queue = async () =>
        (await opfs.getDirectory()).getDirectoryHandle(QUEUE_A);
      getDirectory = beforeCreating(
        (path) => path[1] === entry && path[2] === "data.bin",
        async () => {
          const putBack = await takeEntryAside(entry);
          await putBack({
            "restoring-generation-2": new Uint8Array(),
            "published-generation-2": new Uint8Array(),
            "data.bin": new TextEncoder().encode("replacement bytes")
          });
          const dir = await (await queue()).getDirectoryHandle(entry);
          for (const name of opfs.list(QUEUE_A, entry)) {
            const isMark = /^(restoring|published)-/.test(name);
            if (isMark && !name.endsWith("generation-2")) {
              await dir.removeEntry(name);
            }
          }
          void download().then((url) => (second = url));
          await vi.waitFor(() => expect(second).not.toBe("pending"));
          if (metadata === null) {
            await dir.removeEntry("published-generation-2");
          } else {
            const writable = await (
              await dir.getFileHandle("metadata.json")
            ).createWritable();
            await writable.write(metadata);
            await writable.close();
          }
        },
        false
      );

      const first = await download();
      getDirectory = opfs.getDirectory;

      expect(first ?? null).toBeNull();
      expect(second).toBeTruthy();
      expect(await objectUrls.get(second!)?.text()).toBe("replacement bytes");
      expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(second);
    }
  );

  it("keeps the download URL a lookup returned from the replacement it read meanwhile, sharing it with the next lookup", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const download = () =>
      resolveQueuedFileUrl([QUEUE_A], record.fileId, "download");
    getDirectory = beforeCreating(
      (path) => path[1] === entry && path[2] === "data.bin",
      async () => {
        const putBack = await takeEntryAside(entry);
        await putBack({
          "restoring-generation-2": new Uint8Array(),
          "published-generation-2": new Uint8Array(),
          "data.bin": new TextEncoder().encode("replacement bytes")
        });
        const dir = await (
          await (await opfs.getDirectory()).getDirectoryHandle(QUEUE_A)
        ).getDirectoryHandle(entry);
        for (const name of opfs.list(QUEUE_A, entry)) {
          const isMark = /^(restoring|published)-/.test(name);
          if (isMark && !name.endsWith("generation-2")) {
            await dir.removeEntry(name);
          }
        }
      },
      false
    );

    const first = await download();
    getDirectory = opfs.getDirectory;
    const next = await download();

    expect(await objectUrls.get(first!)?.text()).toBe("replacement bytes");
    expect(next).toBe(first);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(first);
  });

  it("sends no discard from a retry pass when DataFn is started again for the same account with the file's record after its no-reference query, and uploads the file once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const records = await datafn.exportData();
    await deleteRecord(record.id);
    hasLocks = false;
    data.isPullFailing = true;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      replays.clear();
      goOnline();
      await replayed(QUEUE_A);
      expect(sdk.deleted).toEqual([]);
      data.isPullFailing = false;
      let isRestarted = false;
      getDirectory = beforeLookingUp(
        (path) => path[0] === `${QUEUE_A}.revision`,
        HOLDS_A,
        async () => {
          await bootData(cloudAccount("user-a"));
          await datafn.importData(records, { triggerCloneUp: false });
          isRestarted = true;
        }
      );

      await vi.advanceTimersByTimeAsync(5_000);
      await vi.waitFor(() => expect(isRestarted).toBe(true));
      getDirectory = opfs.getDirectory;
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
    } finally {
      vi.useRealTimers();
    }

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(sdk.deleted).toEqual([]);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it.each([
    ["restores the file once the row expired", -1_000, true],
    ["rejects while the row is live", RESTORE_HOLD_LIFETIME_MS, false]
  ])(
    "without Web Locks, a restore meeting the dispatch row a closed tab left for the file %s",
    async (_, expiresIn, isRestored) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      const backup = await backupFile();
      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      hasLocks = false;
      const row = ["dispatch", "closed-tab", record.fileId, ""].join("~");
      const holds = await (
        await opfs.getDirectory()
      ).getDirectoryHandle(HOLDS_A, { create: true });
      await holds.getFileHandle(`${row}~${Date.now() + expiresIn}`, {
        create: true
      });

      const restored = restoreBackup(backup, { triggerCloneUp: () => false });

      if (isRestored) {
        await restored;
        expect(opfs.list(QUEUE_A)).toEqual([entry]);
        expect(opfs.list(HOLDS_A).some((name) => name.startsWith(row))).toBe(
          false
        );
        expect(await readQueuedBytes(record.fileId, "full")).toBe(
          "photo bytes"
        );
      } else {
        await expect(restored).rejects.toThrow();
        expect(await savedRecord(record.id)).toBeUndefined();
      }
    }
  );

  it.each([
    ["its sent mark is there", false, 1],
    ["its sent mark could not be written either", true, 2]
  ])(
    "requests a restored file's delivered original no more when its upload log's thumbnail row cannot be read, sending the thumbnail again only when %s",
    async (_, isSentMarkLost, artifacts) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      const backup = await backupFile();
      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
      getDirectory = failingWrites((path) =>
        path[1] === entry &&
        (path[2] === "uploaded" ||
          (isSentMarkLost && path[2] === "sent-thumbnail"))
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );
      let releaseUpload!: () => void;
      sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
      goOnline();
      await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
      data.isPullFailing = true;
      releaseUpload();
      await replayed(QUEUE_A);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(opfs.list(QUEUE_A, entry)).not.toContain("uploaded");
      expect(uploadLogText()).toContain(`${record.fileId}~thumbnail:ver_1`);

      data.isPullFailing = false;
      getDirectory = failingWrites(
        () => undefined,
        undefined,
        undefined,
        (path) =>
          path[0] === UPLOAD_LOG && path[1]?.endsWith("~thumbnail")
            ? new DOMException("The row cannot be read", "NotReadableError")
            : undefined
      );
      replays.clear();
      isOnline = false;
      goOnline();
      await replayed(QUEUE_A);

      expect(opfs.list(QUEUE_A)).toEqual([]);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(artifacts);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("leaves out of a backup a file whose thumbnail the upload log records delivered, though its sent mark could not be written and its pass stopped before removing it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    getDirectory = failingWrites((path) =>
      path[1] === entry && path[2] === "sent-thumbnail"
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    let releaseUpload!: () => void;
    sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    data.isPullFailing = true;
    releaseUpload();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;
    isOnline = false;
    expect(sdk.artifacts).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(opfs.list(QUEUE_A, entry)).not.toContain("sent-thumbnail");
    expect(uploadLogText()).toContain(`${record.fileId}~thumbnail:ver_1`);

    const backup = JSON.parse(await backupText()) as Record<string, unknown>;

    expect(backup.fileQueue).toBeUndefined();
    expect(backup.fileQueueBytes).toBeUndefined();
  });

  it("runs the replay DataFn started again asked for, not a retry pass of the replaced runtime that came due meanwhile, and sends the thumbnail without another trigger", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      sdk.artifactError = fileFnError(503);
      goOnline();
      await replayed(QUEUE_A);
      expect(sdk.uploads).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(1);
      isOnline = false;
      const second = await capturePhoto();
      let releaseUpload!: () => void;
      sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
      replays.clear();
      goOnline();
      await vi.waitFor(() =>
        expect(sdk.started.map((input) => input.fileId)).toContain(
          second.fileId
        )
      );
      await bootData(cloudAccount("user-a"));

      await vi.advanceTimersByTimeAsync(600_000);
      sdk.artifactError = null;
      releaseUpload();

      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(sdk.uploads.map((input) => input.fileId).sort()).toEqual(
        [record.fileId, second.fileId].sort()
      );
      expect(sdk.artifacts.map((input) => input.fileId).sort()).toEqual(
        [record.fileId, second.fileId].sort()
      );
    } finally {
      vi.useRealTimers();
    }
    expect(sdk.deleted).toEqual([]);
  });

  it("runs the replay DataFn started again asked for, not a deadline pass of the replaced runtime that came due meanwhile, and uploads the restored file without another trigger", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites(
      (path) =>
        path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
          ? new Error("The adoption cannot be recorded")
          : undefined,
      (path) =>
        path[2]?.startsWith("restoring-")
          ? new Error("The restoring mark cannot be removed")
          : undefined
    );
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const timers: { run: () => void; delay: number }[] = [];
    const setTimer = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      run: () => void,
      delay = 0
    ) => {
      if (delay < 60 * 60_000) return setTimer(run, delay);
      timers.push({ run, delay });
      return 0;
    }) as never);
    goOnline();
    await replayed(QUEUE_A);
    expect(isKept(entry)).toBe(true);
    expect(timers).toHaveLength(1);

    getDirectory = opfs.getDirectory;
    isOnline = false;
    const second = await capturePhoto();
    let releaseUpload!: () => void;
    sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    await bootData(cloudAccount("user-a"));
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + 2_000
    );
    timers[0].run();
    releaseUpload();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads.map((upload) => upload.fileId).sort()).toEqual(
      [record.fileId, second.fileId].sort()
    );
    expect(sdk.deleted).toEqual([]);
  });

  it("removes a restored file whose record is deleted before its hold expires, though neither its adopted mark nor its adoption row could be created, without uploading it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
        ? new Error("The adoption cannot be recorded")
        : undefined
    );
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    await deleteRecord(record.id);
    getDirectory = opfs.getDirectory;
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
    );

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });
});
