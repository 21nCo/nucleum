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
import type { QueuedFileReferences } from "@nucleum/shared-state/files/file-queue";

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
  exportStartHook: null as (() => Promise<void>) | null,
  /** Answers, when set, each query of the file records, given DataFn's. */
  fileQuery: null as
    | ((query: (args: unknown) => Promise<unknown>, args: unknown) => unknown)
    | null
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
      if (key === "file" && data.fileQuery) {
        const { fileQuery } = data;
        const file = target.file;
        return new Proxy(file, {
          get(table, name) {
            if (name !== "query") return Reflect.get(table, name);
            return (args: unknown) =>
              fileQuery((query) => table.query(query as never), args);
          }
        });
      }
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
  data.fileQuery = null;
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
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
        ? new Error("The adoption cannot be recorded")
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
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
        ? new Error("The adoption cannot be recorded")
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

  it.each([
    [
      "leaves out a file whose thumbnail the upload log records delivered",
      null,
      false
    ],
    [
      "carries the thumbnail of a file FileFn rejected it from for good",
      422,
      true
    ]
  ])(
    "%s, though its sent mark could not be written and its pass stopped before removing it",
    async (_, status, isCarried) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      sdk.artifactError = status ? fileFnError(status) : null;
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
      expect(sdk.artifacts).toHaveLength(isCarried ? 0 : 1);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(opfs.list(QUEUE_A, entry)).not.toContain("sent-thumbnail");
      expect(uploadLogText().includes(`${record.fileId}~thumbnail:ver_1`)).toBe(
        !isCarried
      );

      const text = await backupText();

      expect(text.startsWith('{"fileQueue"')).toBe(isCarried);
      expect(text).not.toContain(btoa("photo bytes"));
      if (!isCarried) return;
      const index = JSON.parse(
        text.slice('{"fileQueue":'.length, text.indexOf(',"fileQueueBytes":"'))
      ) as {
        files: { uploadedVersionId?: string; thumbnail?: unknown }[];
      };
      expect(index.files).toEqual([
        expect.objectContaining({ uploadedVersionId: "ver_1" })
      ]);
      expect(index.files[0].thumbnail).toBeDefined();
    }
  );

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

  it("requests a delivered original no more for a restored file its account adopted, once its pass stopped before removing it without its uploaded mark", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
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
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(opfs.list(QUEUE_A, entry)).toContain("sent-thumbnail");

    data.isPullFailing = false;
    getDirectory = opfs.getDirectory;
    replays.clear();
    isOnline = false;
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("rejects a restore when a file's thumbnail row of the upload log cannot be read, importing no record and keeping the queued file", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    const root = await opfs.getDirectory();
    const log = await root.getDirectoryHandle(UPLOAD_LOG, { create: true });
    const row = await (
      await log.getFileHandle(encodeURIComponent(record.fileId), {
        create: true
      })
    ).createWritable();
    await row.write(JSON.stringify({ versionId: "ver_1", at: Date.now() }));
    await row.close();
    getDirectory = failingWrites(
      () => undefined,
      undefined,
      undefined,
      (path) =>
        path[0] === UPLOAD_LOG && path[1]?.endsWith("~thumbnail")
          ? new DOMException("The row cannot be read", "NotReadableError")
          : undefined
    );

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow();
    getDirectory = opfs.getDirectory;

    expect(await savedRecord(record.id)).toBeUndefined();
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(sdk.uploads).toEqual([]);
  });

  it("keeps the deadline of the replay DataFn started again asked for when a retry pass of the replaced runtime runs after it, and uploads the restored file once its hold expires", async () => {
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
      if (delay < 5_000) return setTimer(run, delay);
      timers.push({ run, delay });
      return 0;
    }) as never);
    goOnline();
    await replayed(QUEUE_A);
    expect(isKept(entry)).toBe(true);
    const [deadline] = timers.filter((timer) => timer.delay >= 60 * 60_000);
    expect(deadline).toBeDefined();

    isOnline = false;
    const second = await capturePhoto();
    sdk.artifactError = fileFnError(503);
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    const retries = timers.filter((timer) => timer.delay < 60 * 60_000);
    expect(retries.length).toBeGreaterThan(0);
    sdk.artifactError = null;
    let releasePull!: () => void;
    data.pullHold = new Promise((resolve) => (releasePull = resolve));
    replays.clear();
    await bootData(cloudAccount("user-a"));
    await vi.waitFor(() => expect(data.heldPulls).toBeGreaterThan(0));
    for (const retry of retries) retry.run();
    data.pullHold = null;
    releasePull();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([entry]));
    await Promise.all(replays.get(QUEUE_A) ?? []);

    getDirectory = opfs.getDirectory;
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + 2_000
    );
    replays.clear();
    deadline.run();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads.map((upload) => upload.fileId).sort()).toEqual(
      [record.fileId, second.fileId].sort()
    );
    expect(sdk.deleted).toEqual([]);
  });
});

describe("TIDY-622 r6 checkpoint probe", () => {
  const fileFnError = (status: number) =>
    new FileFnHttpError("The thumbnail was not taken", status, {});
  // family account-queue-restore-dedupe-is-page-local (file-queue.ts:2120)
  it("probeA: a restored file whose delivered original's log row cannot be read is not requested again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    // First pass: original delivered, uploaded mark cannot be written, pull fails so the pass stops.
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
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(sdk.started).toHaveLength(1);
    expect(opfs.list(UPLOAD_LOG)).toContain(encodeURIComponent(record.fileId));
    // Second pass: the original's log row read fails transiently.
    data.isPullFailing = false;
    getDirectory = failingWrites(
      () => undefined,
      undefined,
      undefined,
      (path) =>
        path[0] === UPLOAD_LOG && path[1] === encodeURIComponent(record.fileId)
          ? new DOMException("The row cannot be read", "NotReadableError")
          : undefined
    );
    replays.clear();
    isOnline = false;
    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;
    // Required: an unknown original disposition sends no original request.
    expect(sdk.started).toHaveLength(1);
  });

  // family account-queue-backup-copies-completed-uploads (file-queue.ts:2159-2166, 2586)
  it("probeB: a thumbnail FileFn rejected for good is not requested again after the pass stopped", async () => {
    let attempts = 0;
    Object.defineProperty(sdk, "artifactError", {
      configurable: true,
      get() {
        attempts++;
        return fileFnError(422);
      },
      set() {}
    });
    try {
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
      expect(sdk.started).toHaveLength(1);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      const first = attempts / 2;
      expect(first).toBe(1);
      data.isPullFailing = false;
      replays.clear();
      isOnline = false;
      goOnline();
      await replayed(QUEUE_A);
      // Required: exactly one artifact request for a terminal rejection.
      expect(attempts / 2).toBe(1);
    } finally {
      Object.defineProperty(sdk, "artifactError", {
        configurable: true,
        writable: true,
        value: null
      });
    }
  });
});

describe("delivery evidence, stale timers and reclaiming of queued files", () => {
  const fileFnError = (status: number) =>
    new FileFnHttpError("The thumbnail was not taken", status, {});
  const unreadable = (isRead: (path: string[]) => boolean) =>
    failingWrites(
      () => undefined,
      undefined,
      undefined,
      (path) =>
        isRead(path)
          ? new DOMException("The row cannot be read", "NotReadableError")
          : undefined
    );

  /** Uploads a capture whose pass stops (a failed pull) before removing it. */
  async function uploadUntilPullFails(entry: string) {
    let releaseUpload!: () => void;
    sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    data.isPullFailing = true;
    releaseUpload();
    await replayed(QUEUE_A);
    data.isPullFailing = false;
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
  }

  it("sends nothing for a restored file whose original's upload log row cannot be read, retries it, and rejects a backup and a restore that need that row", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    getDirectory = failingWrites((path) =>
      path[1] === entry && path[2] === "uploaded"
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await uploadUntilPullFails(entry);
    expect(opfs.list(QUEUE_A, entry)).not.toContain("uploaded");
    const isOriginalRow = (path: string[]) =>
      path[0] === UPLOAD_LOG && path[1] === encodeURIComponent(record.fileId);

    getDirectory = unreadable(isOriginalRow);
    replays.clear();
    isOnline = false;
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    expect(sdk.started).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    await expect(backupText()).rejects.toThrow();
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow();
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    getDirectory = opfs.getDirectory;
    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["with Web Locks", true],
    ["without Web Locks", false]
  ])(
    "records a delivery its upload log cannot take beside the queue, %s, so a restore of the older backup after a reload sends neither component again, and moves it into the log once storage recovers",
    async (_, isLocked) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const backup = await backupFile();
      hasLocks = isLocked;
      const full = () =>
        failingWrites((path) =>
          path[0] === UPLOAD_LOG
            ? new DOMException("The quota is exceeded", "QuotaExceededError")
            : undefined
        );
      getDirectory = full();
      goOnline();
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);

      isOnline = false;
      replays.clear();
      await bootData(cloudAccount("user-a"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect(opfs.list(QUEUE_A)).toEqual([]);
      goOnline();
      await replayed(QUEUE_A);
      expect(opfs.list(HOLDS_A)).toEqual([
        `delivered~${record.fileId}~1~ver_1`
      ]);

      getDirectory = opfs.getDirectory;
      replays.clear();
      isOnline = false;
      goOnline();
      await replayed(QUEUE_A);
      expect(opfs.list(HOLDS_A)).toEqual([]);
      expect(uploadLogText()).toContain(`${record.fileId}~thumbnail:ver_1`);
      isOnline = false;
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect(opfs.list(QUEUE_A)).toEqual([]);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(1);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("requests a thumbnail FileFn rejected for good once across passes, while a backup taken meanwhile carries its exact bytes without the original", async () => {
    let requests = 0;
    const rejected = fileFnError(422);
    const uploadArtifact = vi.fn();
    Object.defineProperty(sdk, "artifactError", {
      configurable: true,
      get() {
        uploadArtifact();
        return rejected;
      },
      set() {}
    });
    try {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      await uploadUntilPullFails(entry);
      requests = uploadArtifact.mock.calls.length;
      expect(requests).toBeGreaterThan(0);
      isOnline = false;
      expect(opfs.list(QUEUE_A, entry)).not.toContain("sent-thumbnail");

      const text = await backupText();
      const head = ',"fileQueueBytes":"';
      const at = text.indexOf(head) + head.length;
      const index = JSON.parse(
        text.slice('{"fileQueue":'.length, text.indexOf(head))
      ) as {
        files: {
          uploadedVersionId?: string;
          data: [number, number];
          thumbnail?: { data: [number, number] };
        }[];
      };
      const decode = ([start, end]: [number, number]) =>
        atob(text.slice(at + start, at + end));
      expect(index.files).toEqual([
        expect.objectContaining({ uploadedVersionId: "ver_1" })
      ]);
      expect(decode(index.files[0].data)).toBe("");
      expect(decode(index.files[0].thumbnail!.data)).toBe("thumb bytes");

      replays.clear();
      goOnline();
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      await Promise.all(replays.get(QUEUE_A) ?? []);
      expect(uploadArtifact.mock.calls.length).toBe(requests);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.deleted).toEqual([]);
    } finally {
      Object.defineProperty(sdk, "artifactError", {
        configurable: true,
        writable: true,
        value: null
      });
    }
  });

  it("leaves out of a backup a file with an empty uploaded mark and a sent thumbnail without reading its unreadable thumbnail row, and rejects one whose thumbnail needs that row", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    await uploadUntilPullFails(entry);
    isOnline = false;
    expect(opfs.list(QUEUE_A, entry)).toContain("sent-thumbnail");
    const queued = await writeQueuedEntryFile(entry, "uploaded", "");
    getDirectory = unreadable(
      (path) => path[0] === UPLOAD_LOG && path[1]?.endsWith("~thumbnail")
    );

    expect((await backupText()).startsWith('{"fileQueue"')).toBe(false);

    await writeQueuedEntryFile(entry, "uploaded", "ver_1");
    await queued.removeEntry("sent-thumbnail");
    await expect(backupText()).rejects.toThrow();
    getDirectory = opfs.getDirectory;
    expect((await backupText()).startsWith('{"fileQueue"')).toBe(false);
  });

  it("leaves the retry budget to the runtime DataFn started again when retries of the replaced runtime come due while no replay runs, and sends the thumbnail without another trigger", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      sdk.artifactError = fileFnError(503);
      goOnline();
      await replayed(QUEUE_A);
      expect(sdk.uploads).toHaveLength(1);
      replays.clear();
      await bootData(cloudAccount("user-a"));
      await replayed(QUEUE_A);
      for (let at = 0; at < 700_000; at += 5_000) {
        await vi.advanceTimersByTimeAsync(5_000);
        await Promise.all(replays.get(QUEUE_A) ?? []);
      }
      expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);
      sdk.artifactError = null;
      for (let at = 0; at < 100_000; at += 5_000) {
        await vi.advanceTimersByTimeAsync(5_000);
        await Promise.all(replays.get(QUEUE_A) ?? []);
      }

      expect(opfs.list(QUEUE_A)).toEqual([]);
      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.artifacts).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
    } finally {
      vi.useRealTimers();
    }
    expect(sdk.deleted).toEqual([]);
  });

  it("runs no pass for a deadline of the replaced runtime that comes due while no replay runs, so the runtime DataFn started again keeps its retries and sends the thumbnail without another trigger", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
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
    getDirectory = opfs.getDirectory;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      goOnline();
      await replayed(QUEUE_A);
      expect(sdk.started).toEqual([]);
      expect(vi.getTimerCount()).toBe(1);
      isOnline = false;
      replays.clear();
      await bootData(cloudAccount("user-a"));
      isOnline = true;
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS + 2_000
      );
      await vi.advanceTimersByTimeAsync(RESTORE_HOLD_LIFETIME_MS + 2_000);
      for (let at = 0; at < 800_000; at += 5_000) {
        await vi.advanceTimersByTimeAsync(5_000);
        await Promise.all(replays.get(QUEUE_A) ?? []);
      }
      expect(sdk.started).toEqual([]);

      sdk.artifactError = fileFnError(503);
      isOnline = false;
      goOnline();
      await replayed(QUEUE_A);
      expect(sdk.uploads).toHaveLength(1);
      sdk.artifactError = null;
      for (let at = 0; at < 40_000; at += 5_000) {
        await vi.advanceTimersByTimeAsync(5_000);
        await Promise.all(replays.get(QUEUE_A) ?? []);
      }

      expect(opfs.list(QUEUE_A)).toEqual([]);
      expect(sdk.artifacts).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ]);
    } finally {
      vi.useRealTimers();
    }
    expect(sdk.deleted).toEqual([]);
  });

  it("removes a restored file whose record is deleted while its restore's retained hold holds it, though neither its adoption nor the removal of its restoring mark could be recorded, once storage recovered and the hold expired, without uploading it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
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
    expect(isKept(entry)).toBe(true);
    expect(isHeldForAccount(entry)).toBe(true);
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

  it("sends no delete for a file a record of the same runtime references by the time its discard finds it acts alone, without Web Locks, and uploads it once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    await deleteRecord(record.id);
    hasLocks = false;
    let isPaused = false;
    getDirectory = failingWrites((path) => {
      if (path[0] !== HOLDS_A || !path[1]?.startsWith("dispatch~")) {
        return undefined;
      }
      if (isPaused) return undefined;
      isPaused = true;
      return datafn.file
        .mutate({
          operation: "insert",
          id: "file-reference-1",
          record: {
            id: "file-reference-1",
            label: "Photo",
            type: "image/png",
            size: 11,
            name: "photo.png",
            fileId: record.fileId
          }
        } as never)
        .then(() => undefined);
    });

    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;

    expect(isPaused).toBe(true);
    expect(sdk.deleted).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");

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

  it("keeps a file restored into another account for its capturing account when the restore could not mark it settled, also once its hold and its grace ended", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(backup, { triggerCloneUp: () => false });
    getDirectory = opfs.getDirectory;
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 2_000
    );
    await bootData(cloudAccount("user-a"));

    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("keeps a file a record references by the time its removal as unreferenced marks the change, with Web Locks, and uploads it once", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    await deleteRecord(record.id);
    let isPaused = false;
    getDirectory = failingWrites((path) => {
      if (path[0] !== `${QUEUE_A}.revision` || isPaused) return undefined;
      isPaused = true;
      return datafn.file
        .mutate({
          operation: "insert",
          id: "file-reference-2",
          record: {
            id: "file-reference-2",
            label: "Photo",
            type: "image/png",
            size: 11,
            name: "photo.png",
            fileId: record.fileId
          }
        } as never)
        .then(() => undefined);
    });

    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;

    expect(isPaused).toBe(true);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
    replays.clear();
    isOnline = false;
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("uploads a restored file its record references once its retained hold expired, though its adoption still cannot be recorded", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites(
      (path) =>
        path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined,
      (path) =>
        path[2]?.startsWith("restoring-")
          ? new Error("The restoring mark cannot be removed")
          : undefined
    );
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(isHeldForAccount(entry)).toBe(true);
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
    );

    goOnline();

    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    getDirectory = opfs.getDirectory;
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("sends a delivered thumbnail no more after a restore of the older backup when only its upload log row could not be written", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    getDirectory = failingWrites((path) =>
      path[0] === UPLOAD_LOG && path[1]?.endsWith("~thumbnail")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(uploadLogText()).not.toContain("~thumbnail");

    isOnline = false;
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(opfs.list(QUEUE_A)).toEqual([]);
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;
    expect(sdk.started).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("requests a capture's uploaded original no more while its uploaded mark cannot be read, and sends only its pending thumbnail once it can", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    sdk.artifactError = fileFnError(503);
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    expect(sdk.started).toHaveLength(1);
    expect(opfs.list(QUEUE_A, entry)).toContain("uploaded");
    const root = await opfs.getDirectory();
    await (
      await root.getDirectoryHandle(UPLOAD_LOG)
    ).removeEntry(encodeURIComponent(record.fileId));
    sdk.artifactError = null;
    getDirectory = unreadable(
      (path) => path[1] === entry && path[2] === "uploaded"
    );

    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    expect(sdk.started).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    getDirectory = opfs.getDirectory;
    replays.clear();
    isOnline = false;
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("rejects a backup of an uploaded file whose uploaded mark cannot be read, though its thumbnail is marked sent", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    await uploadUntilPullFails(entry);
    isOnline = false;
    expect(opfs.list(QUEUE_A, entry)).toContain("sent-thumbnail");
    getDirectory = unreadable(
      (path) => path[1] === entry && path[2] === "uploaded"
    );

    await expect(backupText()).rejects.toThrow();
    getDirectory = opfs.getDirectory;
    expect((await backupText()).startsWith('{"fileQueue"')).toBe(false);
  });

  it("keeps a file its own account restored for it when a restore into another account kept it, though neither restore could mark it settled, also once their holds and its grace ended", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    await deleteRecord(record.id);
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(opfs.list(QUEUE_A, entry).some((n) => n.startsWith("own-"))).toBe(
      true
    );
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    getDirectory = opfs.getDirectory;
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 2_000
    );
    await bootData(cloudAccount("user-a"));

    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["one of the file's delivered rows records its thumbnail sent", true],
    ["no delivered row records its thumbnail sent", false]
  ])(
    "restores a delivered file's thumbnail only when it was not sent, when %s",
    async (_, isSent) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const backup = await backupFile();
      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      const root = await opfs.getDirectory();
      const holds = await root.getDirectoryHandle(HOLDS_A, { create: true });
      await holds.getFileHandle(`delivered~${record.fileId}~0~ver_1`, {
        create: true
      });
      if (isSent) {
        await holds.getFileHandle(`delivered~${record.fileId}~1~ver_1`, {
          create: true
        });
      }

      await restoreBackup(backup, { triggerCloneUp: () => false });

      expect(opfs.list(QUEUE_A)).toEqual(
        isSent ? [] : [`queued_${record.fileId}`]
      );
      expect(await readQueuedBytes(record.fileId, "full")).toBeUndefined();
    }
  );
});

describe("binding, protection, delivery and retries of restored queued files", () => {
  const fileFnError = (status: number) =>
    new FileFnHttpError("The thumbnail was not taken", status, {});
  const unreadable = (isRead: (path: string[]) => boolean) =>
    failingWrites(
      () => undefined,
      undefined,
      undefined,
      (path) =>
        isRead(path)
          ? new DOMException("The file cannot be read", "NotReadableError")
          : undefined
    );
  const failingAdoption = () =>
    failingWrites((path) =>
      path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
        ? new Error("The adoption cannot be recorded")
        : undefined
    );
  const foreignRows = () =>
    opfs.list(HOLDS_A).filter((row) => row.startsWith("foreign~"));

  /** The thumbnail bytes a backup carries for its only queued file. */
  async function backedUpThumbnail() {
    const text = await backupText();
    const head = ',"fileQueueBytes":"';
    const at = text.indexOf(head) + head.length;
    const index = JSON.parse(
      text.slice('{"fileQueue":'.length, text.indexOf(head))
    ) as { files: { thumbnail?: { data: [number, number] } }[] };
    expect(index.files).toHaveLength(1);
    const [start, end] = index.files[0].thumbnail!.data;
    return atob(text.slice(at + start, at + end));
  }

  /** Captures offline, backs up, clears the browser and restores as user-a. */
  async function restoreCapture() {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    return { record, entry: `queued_${record.fileId}`, backup };
  }

  it("writes no adoption for a restored file no record references, so a restore into another account then protects it from its capturing account's replay", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingAdoption();
    await restoreBackup(backup, { triggerCloneUp: () => false });
    getDirectory = opfs.getDirectory;
    expect(isHeldForAccount(entry)).toBe(true);
    await deleteRecord(record.id);
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
    );
    let reads = 0;
    data.fileQuery = (query, args) => {
      const { filters } = (args ?? {}) as { filters?: { fileId?: string } };
      if (filters?.fileId === record.fileId && ++reads > 1) {
        return Promise.resolve({ data: undefined });
      }
      return query(args);
    };
    goOnline();
    await replayed(QUEUE_A);
    data.fileQuery = null;
    expect(reads).toBeGreaterThan(1);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(
      opfs.list(QUEUE_A, entry).some((n) => n.startsWith("adopted-"))
    ).toBe(false);

    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(foreignRows()).toHaveLength(1);
    await bootData(cloudAccount("user-a"));
    replays.clear();
    isOnline = false;
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
    expect(await readQueuedBytes(record.fileId, "thumbnail")).toBe(
      "thumb bytes"
    );
    expect(await backedUpThumbnail()).toBe("thumb bytes");
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("keeps a restored file's thumbnail queued and backed up when FileFn reports a conflict, and sends it once FileFn takes it without requesting the original again", async () => {
    const { entry } = await restoreCapture();
    sdk.artifactError = fileFnError(409);
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    expect(sdk.started).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(opfs.list(QUEUE_A, entry)).not.toContain("rejected-thumbnail");
    expect(await backedUpThumbnail()).toBe("thumb bytes");

    sdk.artifactError = null;
    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it("keeps a restored file queued while its thumbnail cannot be read, and sends the thumbnail once it can without requesting the original again", async () => {
    const { entry } = await restoreCapture();
    getDirectory = unreadable(
      (path) => path[1] === entry && path[2]?.startsWith("thumbnail-")
    );
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    getDirectory = opfs.getDirectory;
    expect(sdk.started).toHaveLength(1);
    expect(sdk.artifacts).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await backedUpThumbnail()).toBe("thumb bytes");

    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["cannot be recorded", false],
    ["is recorded", true]
  ])(
    "removes and discards a file restored into another account once its capturing account's replay acted on it and its record is deleted on a later page, when its adoption %s",
    async (_, isAdoptionWritable) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const records = await datafn.exportData();
      const backup = await backupFile();
      const entry = `queued_${record.fileId}`;
      await clearBrowser();
      await bootData(cloudAccount("user-b"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect(isHeldForAccount(entry)).toBe(true);
      await bootData(cloudAccount("user-a"));
      await datafn.importData(records, { triggerCloneUp: false });
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
      if (!isAdoptionWritable) getDirectory = failingAdoption();
      sdk.artifactError = fileFnError(503);
      goOnline();
      await replayed(QUEUE_A);
      isOnline = false;
      expect(sdk.uploads).toHaveLength(1);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);

      sdk.artifactError = null;
      await deleteRecord(record.id);
      replays.clear();
      goOnline();
      await replayed(QUEUE_A);
      getDirectory = opfs.getDirectory;

      expect(opfs.list(QUEUE_A)).toEqual([]);
      expect(sdk.started).toHaveLength(1);
      expect(sdk.artifacts).toEqual([]);
      expect(sdk.deleted).toEqual([record.fileId]);
    }
  );

  it("keeps a file restored into another account that its capturing account's records never referenced, also once its hold and its grace ended", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-a"));
    getDirectory = failingAdoption();
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
    );
    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("keeps a file its own account's restore settled while no record references it, also once its hold and its grace ended", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    await deleteRecord(record.id);
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(
      opfs.list(QUEUE_A, entry).some((n) => n.startsWith("settled-"))
    ).toBe(true);
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
    );
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["leaves no foreign protection", false],
    ["keeps the foreign protection an earlier restore committed", true]
  ])(
    "%s on a file kept by a restore into another account that rolls back after a later file fails to stage",
    async (_, isProtectedBefore) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      await deleteRecord(record.id);
      const backupOne = await backupFile();
      const second = await capturePhoto();
      const entryTwo = `queued_${second.fileId}`;
      const backupTwo = await backupFile();
      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      getDirectory = failingWrites((path) =>
        path[2]?.startsWith("settled-")
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );
      await restoreBackup(backupOne, { triggerCloneUp: () => false });
      getDirectory = opfs.getDirectory;
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      await bootData(cloudAccount("user-b"));
      if (isProtectedBefore) {
        await restoreBackup(backupOne, { triggerCloneUp: () => false });
      }
      const before = foreignRows();
      expect(before).toHaveLength(isProtectedBefore ? 1 : 0);

      getDirectory = failingWrites((path) =>
        path[1] === entryTwo && path[2]?.startsWith("restoring-")
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );
      await expect(
        restoreBackup(backupTwo, { triggerCloneUp: () => false })
      ).rejects.toThrow();
      getDirectory = opfs.getDirectory;

      expect(foreignRows()).toEqual(before);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
    }
  );

  it("requests a capture's original no more while its upload log row cannot be read after its uploaded mark could not be written, reuses its version once it can, and counts one request and one transfer", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    sdk.artifactError = fileFnError(503);
    getDirectory = failingWrites((path) =>
      path[1] === entry && path[2] === "uploaded"
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    expect(sdk.started).toHaveLength(1);
    expect(opfs.list(QUEUE_A, entry)).not.toContain("uploaded");
    expect(uploadLogText()).toContain("ver_1");
    sdk.artifactError = null;

    getDirectory = unreadable(
      (path) =>
        path[0] === UPLOAD_LOG && path[1] === encodeURIComponent(record.fileId)
    );
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    expect(sdk.started).toHaveLength(1);
    expect(sdk.artifacts).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    getDirectory = opfs.getDirectory;
    replays.clear();
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deleted).toEqual([]);
  });

  it("requests a capture's original once when its upload log confirms no delivery, though an earlier attempt left its started marker", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const marker = startedMarkerOf(entry);
    await writeQueuedEntryFile(entry, marker.name, marker.text);

    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
  });

  it("gives the runtime DataFn started again for the same account its own retries after the replaced runtime spent all of its own while current", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      sdk.artifactError = fileFnError(503);
      goOnline();
      await replayed(QUEUE_A);
      for (let at = 0; at < 800_000; at += 5_000) {
        await vi.advanceTimersByTimeAsync(5_000);
        await Promise.all(replays.get(QUEUE_A) ?? []);
      }
      const spent = countQueueLocks();
      expect(spent).toBe(5);
      for (let at = 0; at < 800_000; at += 5_000) {
        await vi.advanceTimersByTimeAsync(5_000);
      }
      expect(countQueueLocks()).toBe(spent);

      replays.clear();
      await bootData(cloudAccount("user-a"));
      await replayed(QUEUE_A);
      expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);
      sdk.artifactError = null;
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));

      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("never requests the queue for a deadline of the replaced runtime, so the expired hold stays until the explicit online trigger", async () => {
    const { entry } = await (async () => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const backup = await backupFile();
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
      getDirectory = opfs.getDirectory;
      return { entry: `queued_${record.fileId}` };
    })();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      goOnline();
      await replayed(QUEUE_A);
      expect(sdk.started).toEqual([]);
      expect(vi.getTimerCount()).toBe(1);
      isOnline = false;
      replays.clear();
      await bootData(cloudAccount("user-a"));
      isOnline = true;
      const requested = countQueueLocks();
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS + 2_000
      );
      await vi.advanceTimersByTimeAsync(RESTORE_HOLD_LIFETIME_MS + 2_000);
      expect(countQueueLocks()).toBe(requested);
      expect(isKept(entry)).toBe(true);
      expect(sdk.started).toEqual([]);

      isOnline = false;
      goOnline();
      await replayed(QUEUE_A);
      expect(countQueueLocks()).toBeGreaterThan(requested);
      expect(sdk.uploads).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries removing a file a restore never published while the removal fails, and removes it once storage recovers, without another trigger", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    opfs.clear();
    let isPublishing = false;
    getDirectory = failingWrites((path) => {
      if (!path[2]?.startsWith("published-")) return undefined;
      isPublishing = true;
      return "hang";
    });
    void restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(isPublishing).toBe(true));
    locks = createFakeLocks();
    expect(isUnpublished(entry)).toBe(true);
    let isRemovalFailing = true;
    getDirectory = failingWrites(
      () => undefined,
      (path) =>
        isRemovalFailing && path[0] === QUEUE_A && path[1] === entry
          ? new DOMException("The entry cannot be removed", "InvalidStateError")
          : undefined
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      isOnline = true;
      await replayInOtherTab();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      isRemovalFailing = false;
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    } finally {
      vi.useRealTimers();
    }
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("removes and discards a file its own account's restore settled unreferenced once a later record bound it, though its adoption cannot be recorded, when that record is deleted on a later page", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const records = await datafn.exportData();
    await deleteRecord(record.id);
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(
      opfs.list(QUEUE_A, entry).some((n) => n.startsWith("settled-"))
    ).toBe(true);
    await datafn.importData(records, { triggerCloneUp: false });
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    getDirectory = failingAdoption();
    sdk.artifactError = fileFnError(503);
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    expect(sdk.uploads).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    sdk.artifactError = null;
    await deleteRecord(record.id);
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.deleted).toEqual([record.fileId]);
  });

  it("binds a restored file its replay took on a record's reference before the upload request, so an attempt that went offline before sending it leaves the file bound and removed once the record is deleted", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const records = await datafn.exportData();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-a"));
    await datafn.importData(records, { triggerCloneUp: false });
    getDirectory = failingWrites((path) => {
      if (path[2]?.startsWith("started-")) isOnline = false;
      return path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
        ? new Error("The adoption cannot be recorded")
        : undefined;
    });
    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;
    expect(isOnline).toBe(false);
    expect(sdk.started).toEqual([]);
    expect(
      opfs.list(QUEUE_A, entry).some((n) => n.startsWith("started-"))
    ).toBe(false);

    await deleteRecord(record.id);
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("rejects a restore into another account that cannot create the foreign row of a file it keeps, before importing any record, leaving the file as it was", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    const ownBackup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    const full = new DOMException(
      "The quota is exceeded",
      "QuotaExceededError"
    );
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-") ? full : undefined
    );
    await restoreBackup(ownBackup, { triggerCloneUp: () => false });
    const before = opfs.list(QUEUE_A, entry);
    await bootData(cloudAccount("user-b"));
    getDirectory = failingWrites((path) =>
      path[1]?.startsWith("foreign~") ? full : undefined
    );

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow();
    getDirectory = opfs.getDirectory;
    expect(await savedRecord(record.id)).toBeUndefined();
    expect(foreignRows()).toEqual([]);
    expect(opfs.list(QUEUE_A, entry)).toEqual(before);
    expect(
      new TextDecoder().decode(opfs.read(QUEUE_A, entry, "data.bin"))
    ).toBe("photo bytes");
  });

  it("keeps a file a restore into another account kept protected for its records once that restore is cut short after their import, also once every hold and its grace ended", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const records = await datafn.exportData();
    const backup = await backupFile();
    await deleteRecord(record.id);
    const ownBackup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(ownBackup, { triggerCloneUp: () => false });
    getDirectory = opfs.getDirectory;
    await bootData(cloudAccount("user-b"));
    preflight.during = async () => {
      await datafn.importData(records, { triggerCloneUp: false });
      throw new Error("The page closed");
    };
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The page closed");
    preflight.during = null;
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);

    await bootData(cloudAccount("user-a"));
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
    );
    goOnline();
    await replayed(QUEUE_A);

    expect(foreignRows()).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(await readQueuedBytes(record.fileId, "full")).toBe("photo bytes");
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["saved none of its records leaves the file it kept as it was", false],
    ["saved its records protects the file it kept", true]
  ])(
    "a restore into another account whose import failed but %s",
    async (_, isImportSaving) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      const backup = await backupFile();
      await deleteRecord(record.id);
      const ownBackup = await backupFile();
      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      getDirectory = failingWrites((path) =>
        path[2]?.startsWith("settled-")
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );
      await restoreBackup(ownBackup, { triggerCloneUp: () => false });
      getDirectory = opfs.getDirectory;
      const before = opfs.list(QUEUE_A, entry);
      await bootData(cloudAccount("user-b"));
      data.importResult = { ok: false, errors: [{ message: "Not saved" }] };
      data.isImportSaving = isImportSaving;

      await expect(
        restoreBackup(backup, { triggerCloneUp: () => false })
      ).rejects.toThrow("Not saved");

      expect(foreignRows()).toHaveLength(isImportSaving ? 1 : 0);
      if (!isImportSaving) expect(opfs.list(QUEUE_A, entry)).toEqual(before);
    }
  );

  it("shares one bounded retry budget across the replay triggers of one runtime", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    await capturePhoto();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      sdk.artifactError = fileFnError(503);
      goOnline();
      await replayed(QUEUE_A);
      await vi.advanceTimersByTimeAsync(1_000);
      isOnline = false;
      goOnline();
      await replayed(QUEUE_A);
      for (let at = 0; at < 2_000_000; at += 5_000) {
        await vi.advanceTimersByTimeAsync(5_000);
      }
      const passes = countQueueLocks();
      expect(passes).toBeLessThanOrEqual(6);
      for (let at = 0; at < 2_000_000; at += 5_000) {
        await vi.advanceTimersByTimeAsync(5_000);
      }
      expect(countQueueLocks()).toBe(passes);
    } finally {
      vi.useRealTimers();
    }
  });

  it("records a delivery the full upload log could not take once the store removed the file, though looking the entry up again fails", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const full = failingWrites((path) =>
      path[0] === UPLOAD_LOG
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    const forward = (target: object, key: PropertyKey) => {
      const value = Reflect.get(target, key) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    };
    const gone = (queue: FileSystemDirectoryHandle) =>
      new Proxy(queue, {
        get(target, key) {
          if (key !== "getDirectoryHandle") return forward(target, key);
          return async (name: string, options?: { create?: boolean }) => {
            if (name === entry && !opfs.list(QUEUE_A).includes(entry)) {
              throw new DOMException("It cannot be read", "NotReadableError");
            }
            return target.getDirectoryHandle(name, options);
          };
        }
      });
    getDirectory = async () =>
      new Proxy(await full(), {
        get(root, key) {
          if (key !== "getDirectoryHandle") return forward(root, key);
          return async (name: string, options?: { create?: boolean }) => {
            const handle = await root.getDirectoryHandle(name, options);
            return name === QUEUE_A ? gone(handle) : handle;
          };
        }
      });
    goOnline();
    await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    await Promise.all(replays.get(QUEUE_A) ?? []);
    getDirectory = opfs.getDirectory;

    expect(opfs.list(HOLDS_A)).toEqual([`delivered~${record.fileId}~1~ver_1`]);
    expect(sdk.started).toHaveLength(1);
  });

  it("binds a restored file without a thumbnail its replay took on a record's reference, so it is removed and discarded once its pass stopped before cleanup and the record is deleted", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const [record] = (await fileUpload.uploadFileV2(
      "application/pdf",
      "notes.pdf",
      new Blob(["pdf bytes"], { type: "application/pdf" }),
      { isGenerateThumbnail: false }
    )) as { id: string; fileId: string }[];
    const records = await datafn.exportData();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-a"));
    await datafn.importData(records, { triggerCloneUp: false });
    getDirectory = failingAdoption();
    let releaseUpload!: () => void;
    sdk.hold = new Promise((resolve) => (releaseUpload = resolve));
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    data.isPullFailing = true;
    releaseUpload();
    await replayed(QUEUE_A);
    data.isPullFailing = false;
    isOnline = false;
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    await deleteRecord(record.id);
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    getDirectory = opfs.getDirectory;

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.deleted).toEqual([record.fileId]);
  });

  it("keeps the foreign row of a file two restores into another account keep while one imports nothing and the other imports its records", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await deleteRecord(record.id);
    const ownBackup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(ownBackup, { triggerCloneUp: () => false });
    getDirectory = opfs.getDirectory;
    await bootData(cloudAccount("user-b"));
    let releaseSecond!: () => void;
    const secondGate = new Promise<void>(
      (resolve) => (releaseSecond = resolve)
    );
    let isSecondStaged = false;
    let second: Promise<void> | undefined;
    preflight.during = async () => {
      preflight.during = async () => {
        isSecondStaged = true;
        await secondGate;
      };
      second = restoreBackup(backup, { triggerCloneUp: () => false });
      await vi.waitFor(() => expect(isSecondStaged).toBe(true));
    };
    data.importResult = { ok: false, errors: [{ message: "Not saved" }] };

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("Not saved");
    expect(foreignRows()).toHaveLength(1);
    data.importResult = null;
    releaseSecond();
    await second;
    preflight.during = null;

    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(foreignRows()).toHaveLength(1);
  });

  it("binds a restored file its replay took on a record's reference before a delivery read that cannot be read stops it, so it is removed once the record is deleted", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const records = await datafn.exportData();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-a"));
    await datafn.importData(records, { triggerCloneUp: false });
    getDirectory = failingWrites(
      (path) =>
        path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
          ? new Error("The adoption cannot be recorded")
          : undefined,
      undefined,
      undefined,
      (path) =>
        path[0] === UPLOAD_LOG
          ? new DOMException("The row cannot be read", "NotReadableError")
          : undefined
    );
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    getDirectory = opfs.getDirectory;
    expect(sdk.started).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);

    await deleteRecord(record.id);
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toEqual([]);
  });
});

describe("confirmed removal, recoverable binding and foreign protection of queued files", () => {
  const foreignRows = () =>
    opfs.list(HOLDS_A).filter((row) => row.startsWith("foreign~"));
  const forward = (target: object, key: PropertyKey) => {
    const value = Reflect.get(target, key) as unknown;
    return typeof value === "function" ? value.bind(target) : value;
  };
  /**
   * `root`, whose lookups of `entry` in user-a's queue fail, as unreadable,
   * while `isFailing` says so.
   */
  const failingLookup =
    (
      root: () => Promise<FileSystemDirectoryHandle>,
      entry: string,
      isFailing: () => boolean
    ) =>
    async () =>
      new Proxy(await root(), {
        get(target, key) {
          if (key !== "getDirectoryHandle") return forward(target, key);
          return async (name: string, options?: { create?: boolean }) => {
            const handle = await target.getDirectoryHandle(name, options);
            if (name !== QUEUE_A) return handle;
            return new Proxy(handle, {
              get(queue, child) {
                if (child !== "getDirectoryHandle")
                  return forward(queue, child);
                return async (found: string, opened?: { create?: boolean }) => {
                  if (found === entry && isFailing()) {
                    throw new DOMException(
                      "It cannot be read",
                      "NotReadableError"
                    );
                  }
                  return queue.getDirectoryHandle(found, opened);
                };
              }
            });
          };
        }
      });

  it.each([
    ["with Web Locks", true],
    ["without Web Locks", false]
  ])(
    "requests a delivered capture's original and thumbnail no more %s once removing it could not be confirmed, and removes it on the retry",
    async (_, isLocked) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      hasLocks = isLocked;
      let isRemovalFailing = true;
      getDirectory = failingWrites(
        () => undefined,
        (path) =>
          isRemovalFailing && path.join("/") === `${QUEUE_A}/${entry}`
            ? new DOMException(
                "The entry cannot be removed",
                "InvalidStateError"
              )
            : undefined
      );
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        isOnline = true;
        await replayInOtherTab();
        expect(opfs.list(QUEUE_A)).toEqual([entry]);
        expect(sdk.started).toHaveLength(1);
        expect(sdk.artifacts).toHaveLength(1);
        expect(vi.getTimerCount()).toBeGreaterThan(0);

        isRemovalFailing = false;
        await vi.advanceTimersByTimeAsync(5_000);
        await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      } finally {
        vi.useRealTimers();
      }
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(1);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("retries removing a file a restore never published while the removal is refused and looking it up again fails, and removes it once storage recovers, without another trigger", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    opfs.clear();
    let isPublishing = false;
    getDirectory = failingWrites((path) => {
      if (!path[2]?.startsWith("published-")) return undefined;
      isPublishing = true;
      return "hang";
    });
    void restoreBackup(backup, { triggerCloneUp: () => false });
    await vi.waitFor(() => expect(isPublishing).toBe(true));
    locks = createFakeLocks();
    expect(isUnpublished(entry)).toBe(true);
    let isRemovalFailing = true;
    let failedLookups = 0;
    getDirectory = failingLookup(
      failingWrites(
        () => undefined,
        (path) => {
          if (!isRemovalFailing || path.join("/") !== `${QUEUE_A}/${entry}`) {
            return undefined;
          }
          failedLookups = 1;
          return new DOMException("It cannot be removed", "InvalidStateError");
        }
      ),
      entry,
      () => failedLookups-- > 0
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      isOnline = true;
      await replayInOtherTab();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      isRemovalFailing = false;
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    } finally {
      vi.useRealTimers();
    }
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("keeps a delivery the full upload log could not take, and requests nothing more on the retry, once the store removed the file though looking it up again fails", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    getDirectory = failingLookup(
      failingWrites((path) =>
        path[0] === UPLOAD_LOG
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      ),
      entry,
      () => !opfs.list(QUEUE_A).includes(entry)
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      isOnline = true;
      await replayInOtherTab();
      expect(opfs.list(QUEUE_A)).toEqual([]);
      await vi.advanceTimersByTimeAsync(5_000);
      await replayed(QUEUE_A).catch(() => undefined);
    } finally {
      vi.useRealTimers();
    }
    getDirectory = opfs.getDirectory;

    expect(opfs.list(HOLDS_A)).toEqual([`delivered~${record.fileId}~1~ver_1`]);
    expect(sdk.started).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
  });

  it("binds a restored file its replay took on a record's reference once storage recovers, though its adoption, its binding and its delivery could not be written or read, so it is removed once the record is deleted in a new runtime", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const records = await datafn.exportData();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-a"));
    await datafn.importData(records, { triggerCloneUp: false });
    getDirectory = failingWrites(
      (path) =>
        path[2]?.startsWith("adopted-") ||
        path[1]?.startsWith("adopted~") ||
        path[2]?.startsWith("bound-")
          ? new Error("The binding cannot be recorded")
          : undefined,
      undefined,
      undefined,
      (path) =>
        path[0] === UPLOAD_LOG
          ? new DOMException("The row cannot be read", "NotReadableError")
          : undefined
    );
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    getDirectory = opfs.getDirectory;
    expect(sdk.started).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(
      opfs.list(QUEUE_A, entry).some((name) => name.startsWith("bound-"))
    ).toBe(false);

    await deleteRecord(record.id);
    await bootData(cloudAccount("user-a"));
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toEqual([]);
  });

  it.each([
    ["imported no record frees the file for its capturing account", false],
    ["saved a matching record keeps the file protected", true]
  ])(
    "a restore into another account cut short once it staged and %s, once that account's replay finds its hold expired",
    async (_, isSaved) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      const records = await datafn.exportData();
      const backup = await backupFile();
      await deleteRecord(record.id);
      const ownBackup = await backupFile();
      await clearBrowser();
      await bootData(cloudAccount("user-a"));
      getDirectory = failingWrites((path) =>
        path[2]?.startsWith("settled-")
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );
      await restoreBackup(ownBackup, { triggerCloneUp: () => false });
      getDirectory = opfs.getDirectory;
      await bootData(cloudAccount("user-b"));
      preflight.during = async () => {
        if (isSaved)
          await datafn.importData(records, { triggerCloneUp: false });
        throw new Error("The page closed");
      };
      await expect(
        restoreBackup(backup, { triggerCloneUp: () => false })
      ).rejects.toThrow("The page closed");
      preflight.during = null;
      expect(foreignRows()).toHaveLength(1);

      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
      );
      goOnline();
      await replayed(QUEUE_B);
      isOnline = false;
      expect(foreignRows()).toHaveLength(isSaved ? 1 : 0);

      await bootData(cloudAccount("user-a"));
      replays.clear();
      goOnline();
      await replayed(QUEUE_A);

      expect(opfs.list(QUEUE_A)).toEqual(isSaved ? [entry] : []);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("frees a file a restore into another account kept once that account's replay removes the foreign row the restore could not remove after its import saved nothing", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    const ownBackup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(ownBackup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-b"));
    getDirectory = failingWrites(
      () => undefined,
      (path) =>
        path[0] === HOLDS_A && path[1]?.startsWith("foreign~")
          ? new DOMException("The row cannot be removed", "InvalidStateError")
          : undefined
    );
    data.importResult = { ok: false, errors: [{ message: "Not saved" }] };
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("Not saved");
    data.importResult = null;
    getDirectory = opfs.getDirectory;
    expect(foreignRows()).toHaveLength(1);

    goOnline();
    await replayed(QUEUE_B);
    isOnline = false;
    expect(foreignRows()).toEqual([]);

    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
    );
    await bootData(cloudAccount("user-a"));
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["with Web Locks", true],
    ["without Web Locks", false]
  ])(
    "requests a delivered capture's original and thumbnail no more %s once removing it could not be confirmed and its delivered mark could not be written, and removes it on the retry",
    async (_, isLocked) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      hasLocks = isLocked;
      let isRemovalFailing = true;
      getDirectory = failingWrites(
        (path) =>
          path.join("/") === `${QUEUE_A}/${entry}/delivered`
            ? new DOMException("The quota is exceeded", "QuotaExceededError")
            : undefined,
        (path) =>
          isRemovalFailing && path.join("/") === `${QUEUE_A}/${entry}`
            ? new DOMException(
                "The entry cannot be removed",
                "InvalidStateError"
              )
            : undefined
      );
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        isOnline = true;
        await replayInOtherTab();
        expect(opfs.list(QUEUE_A)).toEqual([entry]);
        expect(opfs.list(QUEUE_A, entry)).not.toContain("delivered");
        expect(sdk.started).toHaveLength(1);

        isRemovalFailing = false;
        await vi.advanceTimersByTimeAsync(5_000);
        await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      } finally {
        vi.useRealTimers();
      }
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(1);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("frees a file a restore into another account cut short before its import kept, once its hold expires, though that account's replay ran while the hold was live and no other trigger follows", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await deleteRecord(record.id);
    const ownBackup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(ownBackup, { triggerCloneUp: () => false });
    getDirectory = opfs.getDirectory;
    await bootData(cloudAccount("user-b"));
    preflight.during = async () => {
      throw new Error("The page closed");
    };
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The page closed");
    preflight.during = null;
    expect(foreignRows()).toHaveLength(1);

    const now = Date.now();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      goOnline();
      await replayed(QUEUE_B);
      expect(foreignRows()).toHaveLength(1);

      vi.spyOn(Date, "now").mockReturnValue(
        now + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
      );
      await vi.advanceTimersByTimeAsync(RESTORE_HOLD_LIFETIME_MS + 2_000);
      await vi.waitFor(() => expect(foreignRows()).toEqual([]));
    } finally {
      vi.useRealTimers();
    }
    isOnline = false;
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("removes the foreign row a restore into another account could not remove, once that account's replay could not remove it either, on the retry without another trigger", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await deleteRecord(record.id);
    const ownBackup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(ownBackup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-b"));
    getDirectory = failingWrites(
      () => undefined,
      (path) =>
        path[0] === HOLDS_A && path[1]?.startsWith("foreign~")
          ? new DOMException("The row cannot be removed", "InvalidStateError")
          : undefined
    );
    data.importResult = { ok: false, errors: [{ message: "Not saved" }] };
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("Not saved");
    data.importResult = null;
    expect(foreignRows()).toHaveLength(1);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      goOnline();
      await replayed(QUEUE_B);
      expect(foreignRows()).toHaveLength(1);

      getDirectory = opfs.getDirectory;
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.waitFor(() => expect(foreignRows()).toEqual([]));
    } finally {
      vi.useRealTimers();
    }
    isOnline = false;
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("uploads a referenced restored file its replay took without recording its adoption or binding once its adoption can be written, though its binding still cannot", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const records = await datafn.exportData();
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-a"));
    await datafn.importData(records, { triggerCloneUp: false });
    const isBinding = (path: string[]) => path[2]?.startsWith("bound-");
    getDirectory = failingWrites(
      (path) =>
        path[2]?.startsWith("adopted-") ||
        path[1]?.startsWith("adopted~") ||
        isBinding(path)
          ? new Error("The binding cannot be recorded")
          : undefined,
      undefined,
      undefined,
      (path) =>
        path[0] === UPLOAD_LOG
          ? new DOMException("The row cannot be read", "NotReadableError")
          : undefined
    );
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    expect(sdk.started).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([`queued_${record.fileId}`]);

    getDirectory = failingWrites((path) =>
      isBinding(path) ? new Error("The binding cannot be recorded") : undefined
    );
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);

    expect(sdk.started).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([]);
  });

  it.each([
    ["with Web Locks", true],
    ["without Web Locks", false]
  ])(
    "revokes the download URL of a file the store removed %s once the retry finds it gone, though looking it up right after the removal failed",
    async (_, isLocked) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      hasLocks = isLocked;
      const url = await resolveQueuedFileUrl(
        [QUEUE_A],
        record.fileId,
        "download"
      );
      expect(url).toBeTruthy();
      let isLookupFailing = true;
      getDirectory = failingLookup(
        opfs.getDirectory,
        entry,
        () => isLookupFailing && !opfs.list(QUEUE_A).includes(entry)
      );
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        goOnline();
        await replayed(QUEUE_A);
        expect(opfs.list(QUEUE_A)).toEqual([]);
        expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(url);

        isLookupFailing = false;
        await vi.advanceTimersByTimeAsync(5_000);
        await vi.waitFor(() =>
          expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
        );
      } finally {
        vi.useRealTimers();
      }
      expect(sdk.started).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(1);
    }
  );

  it("keeps the download URL of a file whose removal the store refused while looking it up again failed, and revokes it once the file is removed", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    let isRemovalFailing = true;
    let failedLookups = 0;
    getDirectory = failingLookup(
      failingWrites(
        () => undefined,
        (path) => {
          if (!isRemovalFailing || path.join("/") !== `${QUEUE_A}/${entry}`) {
            return undefined;
          }
          failedLookups = 1;
          return new DOMException("It cannot be removed", "InvalidStateError");
        }
      ),
      entry,
      () => failedLookups-- > 0
    );
    const tab = await openQueueTab();
    const { createFileFnClient } = await import("@filefn/client");
    const download = () =>
      tab.resolveQueuedFileUrl([QUEUE_A], record.fileId, "download");
    const url = await download();
    expect(url).toBeTruthy();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      isOnline = true;
      await tab.replayFileQueue(
        QUEUE_A,
        createFileFnClient({} as never),
        new AbortController().signal,
        undefined,
        {
          owner: { userId: "user-a", baseUrl: AUTHORITY_URL },
          isCurrent: () => true,
          sync: async () => true,
          isReferenced: async () => true,
          discard: async (fileId) => {
            sdk.deleted.push(fileId);
          }
        }
      );
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(url);
      expect(await download()).toBe(url);

      isRemovalFailing = false;
      await vi.advanceTimersByTimeAsync(60_000);
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    } finally {
      vi.useRealTimers();
    }
    await vi.waitFor(() =>
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)
    );
    expect(sdk.started).toHaveLength(1);
    expect(sdk.deleted).toEqual([]);
  });
});

describe("who may bind, protect or reclaim a restored queued file", () => {
  const foreignRows = () =>
    opfs.list(HOLDS_A).filter((row) => row.startsWith("foreign~"));
  const isBindingWrite = (path: string[]) =>
    path[2]?.startsWith("adopted-") ||
    path[1]?.startsWith("adopted~") ||
    path[2]?.startsWith("bound-");
  const isLogUnreadable = (path: string[]) =>
    path[0] === UPLOAD_LOG
      ? new DOMException("The row cannot be read", "NotReadableError")
      : undefined;

  /**
   * Captures a file under user-a, restores it into user-b, then lets
   * user-a's replay take it on its record's reference while its adoption
   * cannot be written, nor its binding (`isUnbound`), and its delivery
   * cannot be read, so it sends nothing.
   */
  async function takeWithoutBinding(isLocked: boolean, isUnbound = true) {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const records = await datafn.exportData();
    const backup = await backupFile();
    await clearBrowser();
    hasLocks = isLocked;
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-a"));
    await datafn.importData(records, { triggerCloneUp: false });
    getDirectory = failingWrites(
      (path) =>
        isBindingWrite(path) && (isUnbound || !path[2]?.startsWith("bound-"))
          ? new Error("The binding cannot be recorded")
          : undefined,
      undefined,
      undefined,
      isLogUnreadable
    );
    const root = await opfs.getDirectory();
    await root.getDirectoryHandle(UPLOAD_LOG, { create: true });
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    getDirectory = opfs.getDirectory;
    expect(sdk.started).toEqual([]);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    const isBound = opfs
      .list(QUEUE_A, entry)
      .some((name) => name.startsWith("bound-"));
    expect(isBound).toBe(!isUnbound);
    return { record, entry, backup };
  }

  it.each([
    ["with Web Locks", true],
    ["without Web Locks", false]
  ])(
    "keeps a file a newer restore into another account protects %s, though its capturing account's replay bound it on a reference before the record was deleted",
    async (_, isLocked) => {
      const { record, entry, backup } = await takeWithoutBinding(
        isLocked,
        false
      );
      await deleteRecord(record.id);
      await bootData(cloudAccount("user-b"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect(foreignRows()).toHaveLength(1);

      await bootData(cloudAccount("user-a"));
      replays.clear();
      goOnline();
      await replayed(QUEUE_A);
      isOnline = false;
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it.each([
    ["with Web Locks", true, false],
    ["without Web Locks", false, false],
    ["with Web Locks, while its binding still fails", true, true],
    ["without Web Locks, while its binding still fails", false, true]
  ])(
    "keeps a file a newer restore into another account protects %s, though its capturing account's replay took it on a reference it could not bind before the record was deleted, and frees it once that protection is gone",
    async (_, isLocked, isBindingFailing) => {
      const { record, entry, backup } = await takeWithoutBinding(isLocked);
      await deleteRecord(record.id);
      await bootData(cloudAccount("user-b"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect(foreignRows()).toHaveLength(1);

      await bootData(cloudAccount("user-a"));
      getDirectory = failingWrites((path) =>
        isBindingFailing && path[2]?.startsWith("bound-")
          ? new Error("The binding cannot be recorded")
          : undefined
      );
      replays.clear();
      goOnline();
      await replayed(QUEUE_A);
      isOnline = false;
      getDirectory = opfs.getDirectory;
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);

      await bootData(cloudAccount("user-b"));
      await deleteRecord(record.id);
      replays.clear();
      goOnline();
      await replayed(QUEUE_B);
      isOnline = false;
      expect(foreignRows()).toEqual([]);

      await bootData(cloudAccount("user-a"));
      replays.clear();
      goOnline();
      await replayed(QUEUE_A);
      isOnline = false;
      expect(opfs.list(QUEUE_A)).toEqual([]);
      expect(sdk.started).toEqual([]);
    }
  );

  it.each([
    ["with Web Locks", true],
    ["without Web Locks", false]
  ])(
    "removes a file its capturing account's replay took on a reference it could not bind, in the pass that records its adoption once only its binding still fails, after the record was deleted %s",
    async (_, isLocked) => {
      const { record } = await takeWithoutBinding(isLocked);
      await deleteRecord(record.id);
      getDirectory = failingWrites((path) =>
        path[2]?.startsWith("bound-")
          ? new Error("The binding cannot be recorded")
          : undefined
      );
      replays.clear();
      goOnline();
      await replayed(QUEUE_A);
      isOnline = false;
      getDirectory = opfs.getDirectory;

      expect(opfs.list(QUEUE_A)).toEqual([]);
      expect(sdk.started).toEqual([]);
    }
  );

  it("keeps the foreign row of a file a restore into another account kept when that account's records in another DataFn scope do not reference it, so its capturing account never reclaims the only copy", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    const ownBackup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(ownBackup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    getDirectory = opfs.getDirectory;
    expect(foreignRows()).toHaveLength(1);

    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
    );
    const tab = await openQueueTab();
    const { createFileFnClient } = await import("@filefn/client");
    await tab.replayFileQueue(
      QUEUE_B,
      createFileFnClient({} as never),
      new AbortController().signal,
      undefined,
      {
        owner: { userId: "user-b", baseUrl: AUTHORITY_URL },
        view: () => "user:user-b|https://another.example.test|direct",
        isCurrent: () => true,
        sync: async () => true,
        isReferenced: async () => false,
        discard: async (fileId) => {
          sdk.deleted.push(fileId);
        }
      }
    );
    expect(foreignRows()).toHaveLength(1);

    await bootData(cloudAccount("user-a"));
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("protects a file a restore into another account kept again when its import resumes after its hold expired and that account's replay removed its foreign row meanwhile, so its capturing account never reclaims the only copy", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await deleteRecord(record.id);
    const ownBackup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    const isSettling = (path: string[]) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined;
    getDirectory = failingWrites(isSettling);
    await restoreBackup(ownBackup, { triggerCloneUp: () => false });
    await bootData(cloudAccount("user-b"));
    const later = Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS;
    preflight.during = async () => {
      vi.spyOn(Date, "now").mockReturnValue(later + 1_000);
      getDirectory = opfs.getDirectory;
      goOnline();
      await replayed(QUEUE_B);
      isOnline = false;
      expect(foreignRows()).toEqual([]);
      getDirectory = failingWrites(isSettling);
    };
    await restoreBackup(backup, { triggerCloneUp: () => false });
    preflight.during = null;
    getDirectory = opfs.getDirectory;
    expect(foreignRows()).toHaveLength(1);

    vi.spyOn(Date, "now").mockReturnValue(
      later + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 2_000
    );
    await bootData(cloudAccount("user-a"));
    replays.clear();
    goOnline();
    await replayed(QUEUE_A);
    isOnline = false;
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it.each([
    ["with Web Locks", true],
    ["without Web Locks", false]
  ])(
    "requests a delivered capture's original and thumbnail no more %s once removing it could not be confirmed while neither its uploaded mark, its upload log row, its delivered row nor its delivered mark could be written, and removes it on the retry once storage recovers",
    async (_, isLocked) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      hasLocks = isLocked;
      let isFailing = true;
      getDirectory = failingWrites(
        (path) =>
          isFailing &&
          (path.join("/") === `${QUEUE_A}/${entry}/uploaded` ||
            path.join("/") === `${QUEUE_A}/${entry}/delivered` ||
            path[0] === UPLOAD_LOG ||
            (path[0] === HOLDS_A && path[1]?.startsWith("delivered~")))
            ? new DOMException("The quota is exceeded", "QuotaExceededError")
            : undefined,
        (path) =>
          isFailing && path.join("/") === `${QUEUE_A}/${entry}`
            ? new DOMException(
                "The entry cannot be removed",
                "InvalidStateError"
              )
            : undefined
      );
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        isOnline = true;
        await replayInOtherTab();
        expect(opfs.list(QUEUE_A)).toEqual([entry]);
        expect(opfs.list(QUEUE_A, entry)).not.toContain("uploaded");
        expect(sdk.uploads).toHaveLength(1);

        isFailing = false;
        await vi.advanceTimersByTimeAsync(5_000);
        await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
      } finally {
        vi.useRealTimers();
      }
      expect(sdk.started).toHaveLength(1);
      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.artifacts).toHaveLength(1);
      expect(sdk.deleted).toEqual([]);
    }
  );

  it("rejects, importing nothing, a restore into another account whose kept file its capturing account reclaimed once the restore's hold expired, before its import resumed", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await deleteRecord(record.id);
    const ownBackup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(ownBackup, { triggerCloneUp: () => false });
    getDirectory = opfs.getDirectory;
    await bootData(cloudAccount("user-b"));
    preflight.during = async () => {
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
      );
      goOnline();
      await replayed(QUEUE_B);
      expect(foreignRows()).toEqual([]);
      await replayInOtherTab();
      isOnline = false;
      expect(opfs.list(QUEUE_A)).toEqual([]);
    };
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("A queued file changed while the backup was restored");
    preflight.during = null;

    const found = await datafn.file.query({
      filters: { fileId: record.fileId }
    });
    expect(found.data).toEqual([]);
    expect(sdk.started).toEqual([]);
  });

  it("names one DataFn scope for a local copy whatever its connectivity, and another for each other copy or a direct authority", async () => {
    const { toRecordsView } = await openQueueTab();
    const scope = (remoteUrl: string | null, storageDbName: string | null) =>
      toRecordsView({ namespace: "user:user-b", remoteUrl, storageDbName });
    expect(scope(null, "memotron_user_user-b")).toBe(
      scope(AUTHORITY_URL, "memotron_user_user-b")
    );
    expect(scope(AUTHORITY_URL, "another_user_user-b")).not.toBe(
      scope(AUTHORITY_URL, "memotron_user_user-b")
    );
    expect(scope(AUTHORITY_URL, null)).not.toBe(
      scope(AUTHORITY_URL, "memotron_user_user-b")
    );
    expect(scope("https://another.example.test/datafn", null)).not.toBe(
      scope(AUTHORITY_URL, null)
    );
  });

  it("imports nothing when the account changes while a restore protects its files again before the import", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    let release = () => undefined as void;
    let isRenewing = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    preflight.during = async () => {
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS
      );
      getDirectory = failingWrites((path) => {
        if (path[0] !== HOLDS_A || !path[1]?.startsWith("hold~")) return;
        isRenewing = true;
        return gate;
      });
    };
    const restored = restoreBackup(backup, { triggerCloneUp: () => false });
    const rejected = expect(restored).rejects.toThrow(
      "The account changed while the backup was restored"
    );
    await vi.waitFor(() => expect(isRenewing).toBe(true));
    await bootData(cloudAccount("user-b"));
    release();
    await rejected;
    preflight.during = null;
    getDirectory = opfs.getDirectory;

    const found = await datafn.file.query({
      filters: { fileId: record.fileId }
    });
    expect(found.data).toEqual([]);
  });

  it("restores a backup whose queued file another tab delivered and removed while the restore was paused past its hold, without uploading it again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    await capturePhoto();
    const backup = await backupFile();
    preflight.during = async () => {
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
      );
      isOnline = true;
      await replayInOtherTab();
      isOnline = false;
      expect(opfs.list(QUEUE_A)).toEqual([]);
    };
    await restoreBackup(backup, { triggerCloneUp: () => false });
    preflight.during = null;

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
  });

  it("sends a confirmed delivery's thumbnail no more on the page's retry once another tab's replay recorded it sent in the upload log, though the removal could not be confirmed and the thumbnail could not be read before", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    let isFailing = true;
    getDirectory = failingWrites(
      () => undefined,
      (path) =>
        isFailing && path.join("/") === `${QUEUE_A}/${entry}`
          ? new DOMException("The entry cannot be removed", "InvalidStateError")
          : undefined,
      undefined,
      (path) =>
        isFailing && path[2]?.startsWith("thumbnail-")
          ? new DOMException("It cannot be read", "NotReadableError")
          : undefined
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      isOnline = true;
      await replayInOtherTab();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(sdk.uploads).toHaveLength(1);
      expect(sdk.artifacts).toEqual([]);

      const version = new TextDecoder().decode(
        opfs.read(QUEUE_A, entry, "uploaded")
      );
      const root = await opfs.getDirectory();
      const log = await root.getDirectoryHandle(UPLOAD_LOG, { create: true });
      const row = await log.getFileHandle(`${record.fileId}~thumbnail`, {
        create: true
      });
      const writable = await row.createWritable();
      await writable.write(version);
      await writable.close();

      isFailing = false;
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    } finally {
      vi.useRealTimers();
    }
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toEqual([]);
  });

  it("keeps a file another restore into another account protects when a paused restore that wrote it cannot hold it again and rolls back, also once that restore's hold expired and it could not mark the file settled", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    let restores = 0;
    preflight.during = async () => {
      if (++restores > 1) return;
      getDirectory = failingWrites((path) =>
        path[2]?.startsWith("settled-")
          ? new DOMException("The quota is exceeded", "QuotaExceededError")
          : undefined
      );
      await restoreBackup(backup, { triggerCloneUp: () => false });
      expect(foreignRows()).toHaveLength(1);
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
      );
      getDirectory = failingWrites((path) =>
        path[0] === HOLDS_A && path[1]?.startsWith("hold~")
          ? new Error("The hold cannot be created")
          : undefined
      );
    };
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The hold cannot be created");
    preflight.during = null;
    getDirectory = opfs.getDirectory;

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(foreignRows()).toHaveLength(1);
  });

  it("keeps a file a paused restore into another account protects again once that account's replay removed its foreign row, though its capturing account's replay bound it on a reference while the earlier row was there, once the record is deleted", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    await deleteRecord(record.id);
    const { createFileFnClient } = await import("@filefn/client");
    let isReferenced = true;
    const replayOfA = async () => {
      const tab = await openQueueTab();
      await tab.replayFileQueue(
        QUEUE_A,
        createFileFnClient({} as never),
        new AbortController().signal,
        undefined,
        {
          owner: { userId: "user-a", baseUrl: AUTHORITY_URL },
          isCurrent: () => true,
          sync: async () => true,
          isReferenced: async () => isReferenced,
          discard: async (fileId) => {
            sdk.deleted.push(fileId);
          }
        }
      );
    };
    preflight.during = async () => {
      expect(foreignRows()).toHaveLength(1);
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
      );
      const root = await opfs.getDirectory();
      await root.getDirectoryHandle(UPLOAD_LOG, { create: true });
      getDirectory = failingWrites(
        (path) =>
          path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
            ? new Error("The adoption cannot be recorded")
            : undefined,
        undefined,
        undefined,
        isLogUnreadable
      );
      isOnline = true;
      await replayOfA();
      getDirectory = opfs.getDirectory;
      expect(
        opfs.list(QUEUE_A, entry).some((name) => name.startsWith("bound-"))
      ).toBe(true);

      replays.clear();
      goOnline();
      await replayed(QUEUE_B);
      isOnline = false;
      expect(foreignRows()).toEqual([]);
    };
    await restoreBackup(backup, { triggerCloneUp: () => false });
    preflight.during = null;
    expect(foreignRows()).toHaveLength(1);

    isReferenced = false;
    isOnline = true;
    await replayOfA();
    isOnline = false;
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("keeps a confirmed delivery's capture queued on the page's retry while its thumbnail and its delivery evidence cannot be read, and sends the thumbnail once they can, without requesting the original again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    let isRemovalFailing = true;
    let isUnreadable = true;
    getDirectory = failingWrites(
      () => undefined,
      (path) =>
        isRemovalFailing && path.join("/") === `${QUEUE_A}/${entry}`
          ? new DOMException("The entry cannot be removed", "InvalidStateError")
          : undefined,
      undefined,
      (path) =>
        isUnreadable &&
        (path[2]?.startsWith("thumbnail-") ||
          (!isRemovalFailing &&
            (path.join("/") === `${QUEUE_A}/${entry}/uploaded` ||
              path[0] === UPLOAD_LOG)))
          ? new DOMException("It cannot be read", "NotReadableError")
          : undefined
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      isOnline = true;
      await replayInOtherTab();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(sdk.uploads).toHaveLength(1);

      isRemovalFailing = false;
      await vi.advanceTimersByTimeAsync(5_000);
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(sdk.artifacts).toEqual([]);

      isUnreadable = false;
      await vi.advanceTimersByTimeAsync(30_000);
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    } finally {
      vi.useRealTimers();
    }
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);
  });

  it("sends a confirmed delivery's thumbnail no more on the page's retry once the upload log records it sent at the confirmed version, though the original's mark and log row cannot be read", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    let isFirst = true;
    getDirectory = failingWrites(
      () => undefined,
      (path) =>
        isFirst && path.join("/") === `${QUEUE_A}/${entry}`
          ? new DOMException("The entry cannot be removed", "InvalidStateError")
          : undefined,
      undefined,
      (path) => {
        const isThumbnail = path[2]?.startsWith("thumbnail-");
        const isOriginal =
          path.join("/") === `${QUEUE_A}/${entry}/uploaded` ||
          (path[0] === UPLOAD_LOG && path[1] === record.fileId);
        return (isFirst && isThumbnail) || (!isFirst && isOriginal)
          ? new DOMException("It cannot be read", "NotReadableError")
          : undefined;
      }
    );
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      isOnline = true;
      await replayInOtherTab();
      expect(opfs.list(QUEUE_A)).toEqual([entry]);
      expect(sdk.artifacts).toEqual([]);

      const version = new TextDecoder().decode(
        opfs.read(QUEUE_A, entry, "uploaded")
      );
      const root = await opfs.getDirectory();
      const log = await root.getDirectoryHandle(UPLOAD_LOG, { create: true });
      const row = await log.getFileHandle(`${record.fileId}~thumbnail`, {
        create: true
      });
      const writable = await row.createWritable();
      await writable.write(version);
      await writable.close();

      isFirst = false;
      await vi.advanceTimersByTimeAsync(5_000);
      await vi.waitFor(() => expect(opfs.list(QUEUE_A)).toEqual([]));
    } finally {
      vi.useRealTimers();
    }
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toEqual([]);
  });

  it("keeps a file its capturing account bound while a paused restore into another account that wrote it could not hold it again and rolls back", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    const { createFileFnClient } = await import("@filefn/client");
    preflight.during = async () => {
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
      );
      const root = await opfs.getDirectory();
      await root.getDirectoryHandle(UPLOAD_LOG, { create: true });
      getDirectory = failingWrites(
        (path) =>
          path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
            ? new Error("The adoption cannot be recorded")
            : undefined,
        undefined,
        undefined,
        isLogUnreadable
      );
      isOnline = true;
      const tab = await openQueueTab();
      await tab.replayFileQueue(
        QUEUE_A,
        createFileFnClient({} as never),
        new AbortController().signal,
        undefined,
        {
          owner: { userId: "user-a", baseUrl: AUTHORITY_URL },
          isCurrent: () => true,
          sync: async () => true,
          isReferenced: async () => true,
          discard: async (fileId) => {
            sdk.deleted.push(fileId);
          }
        }
      );
      isOnline = false;
      expect(
        opfs.list(QUEUE_A, entry).some((name) => name.startsWith("bound-"))
      ).toBe(true);
      getDirectory = failingWrites((path) =>
        path[0] === HOLDS_A && path[1]?.startsWith("hold~")
          ? new Error("The hold cannot be created")
          : undefined
      );
    };
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The hold cannot be created");
    preflight.during = null;
    getDirectory = opfs.getDirectory;

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });

  it("rejects, importing nothing, a restore paused past its hold whose queued file another tab removed with only its original recorded delivered, and stages the thumbnail again on the next restore without uploading the original again", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const backup = await backupFile();
    const entry = `queued_${record.fileId}`;
    preflight.during = async () => {
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
      );
      isOnline = true;
      await replayInOtherTab();
      isOnline = false;
      expect(opfs.list(QUEUE_A)).toEqual([]);
      const root = await opfs.getDirectory();
      const log = await root.getDirectoryHandle(UPLOAD_LOG);
      await log.removeEntry(`${encodeURIComponent(record.fileId)}~thumbnail`);
    };
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("A queued file changed while the backup was restored");
    preflight.during = null;
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(1);

    await restoreBackup(backup, { triggerCloneUp: () => false });
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    goOnline();
    await replayed(QUEUE_A);

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toHaveLength(2);
  });

  /** Another FileFn authority than the accounts' own. */
  const EUWEST_URL = "https://account-euwest-dev.nucleum.app/files";

  /**
   * Captures a file under user-a, leaves its generation unadopted (its own
   * restore could not settle it), and signs `userId` in, whose restore of
   * the backup keeps that generation under a foreign row; `during` runs,
   * with the backed-up records, once that restore staged.
   */
  async function keepForAnotherAccount(
    userId: string,
    during: (
      records: Awaited<ReturnType<typeof datafn.exportData>>
    ) => Promise<void>
  ) {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const records = await datafn.exportData();
    const backup = await backupFile();
    await deleteRecord(record.id);
    const ownBackup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    getDirectory = failingWrites((path) =>
      path[2]?.startsWith("settled-")
        ? new DOMException("The quota is exceeded", "QuotaExceededError")
        : undefined
    );
    await restoreBackup(ownBackup, { triggerCloneUp: () => false });
    getDirectory = opfs.getDirectory;
    await bootData(cloudAccount(userId));
    preflight.during = () => during(records);
    return { record, backup };
  }

  /**
   * Replays a queue in a fresh copy of the queue module (a reloaded page),
   * with the references `toReferences` gives for that copy.
   */
  async function replayFresh(
    queue: string,
    toReferences: (
      tab: Awaited<ReturnType<typeof openQueueTab>>
    ) => QueuedFileReferences
  ) {
    const tab = await openQueueTab();
    const { createFileFnClient } = await import("@filefn/client");
    isOnline = true;
    await tab.replayFileQueue(
      queue,
      createFileFnClient({} as never),
      new AbortController().signal,
      undefined,
      toReferences(tab)
    );
    isOnline = false;
  }

  it("keeps a file for a restore into another account under foreign rows whose names stay within the 255 bytes a filename may have, with production-shaped IDs, through renewal, settlement and the account's cleanup", async () => {
    const userId = "acct_000000000000000b";
    const queue = `nucleum-file-queue-account-${userId}`;
    const nameLimit = (path: string[]) =>
      new TextEncoder().encode(path.at(-1)).byteLength > 255
        ? new DOMException("The name is too long", "InvalidModificationError")
        : undefined;
    let first = "";
    const { record, backup } = await keepForAnotherAccount(userId, async () => {
      [first] = foreignRows();
      const root = await opfs.getDirectory();
      await (await root.getDirectoryHandle(HOLDS_A)).removeEntry(first);
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS / 2 + 1_000
      );
    });
    getDirectory = failingWrites(nameLimit);
    await restoreBackup(backup, { triggerCloneUp: () => false });
    preflight.during = null;

    const rows = foreignRows();
    expect(first).toMatch(/^foreign~/);
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toBe(first);
    for (const row of [first, ...rows]) {
      expect(new TextEncoder().encode(row).byteLength).toBeLessThan(256);
    }

    await deleteRecord(record.id);
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
    );
    goOnline();
    await replayed(queue);
    isOnline = false;
    getDirectory = opfs.getDirectory;
    expect(foreignRows()).toEqual([]);
  });

  /**
   * Restores user-a's backup into user-b, keeping user-a's unadopted
   * generation, from a local copy or (`isDirect`) the direct authority, cut
   * short once its import saved user-b's record; then lets DataFn leave
   * user-b's local copy, retiring it unless `isCloneLeft`, and returns
   * user-b's FileFn authority and the local copy's name.
   */
  async function keepAndLeaveScope(
    isDirect: boolean,
    isCloneLeft: boolean,
    fileFnRegion = "useast"
  ) {
    const { backup } = await keepForAnotherAccount(
      "user-b",
      async (records) => {
        await datafn.importData(records, { triggerCloneUp: false });
        throw new Error("The page closed");
      }
    );
    const session = cloudAccount("user-b");
    const region = fileFnRegion;
    account.set({ ...session, userInfo: { ...session.userInfo!, region } });
    const authority = AUTHORITY_URL.replace(/\/datafn$/, "/files");
    const fileQueue = await import("@nucleum/shared-state/files/file-queue");
    const direct = fileQueue.toRecordsView({
      namespace: "user:user-b",
      remoteUrl: AUTHORITY_URL,
      storageDbName: null
    });
    const view = vi.spyOn(fileQueue, "toRecordsView");
    if (isDirect) view.mockReturnValue(direct);
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The page closed");
    view.mockRestore();
    preflight.during = null;
    expect(foreignRows()).toHaveLength(1);
    const [clone, ...others] = (await indexedDB.databases())
      .map(({ name }) => name ?? "")
      .filter((name) => name.includes(device.env))
      .filter((name) => name.endsWith("_user_user-b"));
    expect(others).toEqual([]);
    await destroyNucleumDatafn();
    if (!isCloneLeft) {
      const { deleteDatafnLocalClone } =
        await import("@nucleum/datafn/storage-lifecycle");
      await deleteDatafnLocalClone(clone);
    }
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + RESTORE_HOLD_LIFETIME_MS + UNCOMMITTED_GRACE_MS + 1_000
    );
    return { authority, clone };
  }

  it.each([
    [
      "keeps a local copy's row while that copy is still on the device",
      false,
      true,
      false,
      "user:user-b",
      "",
      1
    ],
    [
      "keeps a local copy's row for another namespace's direct authority",
      false,
      false,
      false,
      "user:user-c",
      "",
      1
    ],
    [
      "keeps a local copy's row for another FileFn authority's direct authority",
      false,
      false,
      false,
      "user:user-b",
      EUWEST_URL,
      1
    ],
    [
      "keeps a local copy's row while the direct authority references the file",
      false,
      false,
      true,
      "user:user-b",
      "",
      1
    ],
    [
      "keeps a retired local copy's row when the direct authority finds no record referencing the file",
      false,
      false,
      false,
      "user:user-b",
      "",
      1
    ],
    [
      "keeps a direct authority's row while the local copy brought up to date with it references the file",
      true,
      true,
      true,
      "user:user-b",
      "",
      1
    ],
    [
      "keeps a direct authority's row for another FileFn authority's local copy",
      true,
      true,
      false,
      "user:user-b",
      EUWEST_URL,
      1
    ],
    [
      "keeps a direct authority's row when the local copy brought up to date with it finds no record referencing the file",
      true,
      true,
      false,
      "user:user-b",
      "",
      1
    ]
  ])(
    "keeps the foreign row of a restore after DataFn changed the account's kind of scope: %s",
    async (_, isDirect, isCloneLeft, isReferenced, namespace, other, count) => {
      const { authority, clone } = await keepAndLeaveScope(
        isDirect,
        isCloneLeft
      );

      await replayFresh(QUEUE_B, (tab) => ({
        owner: { userId: "user-b", baseUrl: other || authority },
        isCurrent: () => true,
        sync: async () => true,
        isReferenced: async () => isReferenced,
        discard: async () => undefined,
        view: () =>
          tab.toRecordsView({
            namespace,
            remoteUrl: AUTHORITY_URL,
            storageDbName: isDirect ? clone : null
          })
      }));

      expect(foreignRows()).toHaveLength(count);
      expect(sdk.started).toEqual([]);
    }
  );

  it("keeps a direct authority's row, and the bytes of the account that captured the file, while a local copy at the same FileFn authority finds no record referencing the file after a successful pull", async () => {
    const { authority, clone } = await keepAndLeaveScope(true, true);
    const [entry] = opfs.list(QUEUE_A);
    const files = opfs.list(QUEUE_A, entry);
    const listing = vi.spyOn(indexedDB, "databases");

    await replayFresh(QUEUE_B, (tab) => ({
      owner: { userId: "user-b", baseUrl: authority },
      isCurrent: () => true,
      sync: async () => true,
      isReferenced: async () => false,
      discard: async () => undefined,
      view: () =>
        tab.toRecordsView({
          namespace: "user:user-b",
          remoteUrl: AUTHORITY_URL,
          storageDbName: clone
        })
    }));
    expect(foreignRows()).toHaveLength(1);
    await replayFresh(QUEUE_A, () => ({
      owner: { userId: "user-a", baseUrl: AUTHORITY_URL },
      isCurrent: () => true,
      sync: async () => true,
      isReferenced: async () => false,
      discard: async (fileId) => {
        sdk.deleted.push(fileId);
      }
    }));

    expect(foreignRows()).toHaveLength(1);
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(opfs.list(QUEUE_A, entry)).toEqual(files);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
    expect(listing).not.toHaveBeenCalled();
  });

  it.each([
    ["is removed once the record is deleted", false, ""],
    [
      "stays queued while a newer restore into another account protects it",
      true,
      ""
    ],
    ["stays queued for a replay at another FileFn authority", false, EUWEST_URL]
  ])(
    "takes a binding its replay began but could not finish writing before the page stopped as its account's, so a restored file whose restore rolled back meanwhile %s",
    async (_, isProtected, other) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      const backup = await backupFile();
      await clearBrowser();
      await bootData(cloudAccount("user-b"));
      let isReferenced = true;
      const references = (): QueuedFileReferences => ({
        owner: { userId: "user-a", baseUrl: AUTHORITY_URL },
        isCurrent: () => true,
        sync: async () => true,
        isReferenced: async () => isReferenced,
        discard: async (fileId) => {
          sdk.deleted.push(fileId);
        }
      });
      preflight.during = async () => {
        vi.spyOn(Date, "now").mockReturnValue(
          Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
        );
        getDirectory = failingWrites(
          (path) =>
            path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
              ? new Error("The adoption cannot be recorded")
              : undefined,
          undefined,
          (path) =>
            path[2]?.startsWith("bound-")
              ? new Error("The binding cannot be written")
              : undefined
        );
        await replayFresh(QUEUE_A, references);
        getDirectory = opfs.getDirectory;
        isReferenced = false;
        await bootData(cloudAccount("user-c"));
      };
      await expect(
        restoreBackup(backup, { triggerCloneUp: () => false })
      ).rejects.toThrow("The account changed while the backup was restored");
      preflight.during = null;
      const marks = opfs.list(QUEUE_A, entry);
      const bound = marks.find((name) => name.startsWith("bound-"));
      expect(bound).toBeDefined();
      expect(opfs.read(QUEUE_A, entry, bound!)?.byteLength ?? 0).toBe(0);
      expect(sdk.started).toEqual([]);

      if (isProtected) {
        await bootData(cloudAccount("user-b"));
        await restoreBackup(backup, { triggerCloneUp: () => false });
        expect(foreignRows()).toHaveLength(1);
      }
      await replayFresh(QUEUE_A, () => ({
        ...references(),
        owner: { userId: "user-a", baseUrl: other || AUTHORITY_URL }
      }));

      const isKept = isProtected || Boolean(other);
      expect(opfs.list(QUEUE_A)).toEqual(isKept ? [entry] : []);
      expect(sdk.started).toEqual([]);
    }
  );

  it("keeps a local copy's row for its direct authority when the restore's FileFn authority was not the authority its DataFn records synced with", async () => {
    const { resolveFileFnBaseUrl } =
      await import("@nucleum/shared-state/files/filefn-client");
    expect(resolveFileFnBaseUrl("euwest")).toBe(EUWEST_URL);
    await keepAndLeaveScope(false, false, "euwest");

    for (const baseUrl of [
      EUWEST_URL,
      AUTHORITY_URL.replace(/\/datafn$/, "/files")
    ]) {
      await replayFresh(QUEUE_B, (tab) => ({
        owner: { userId: "user-b", baseUrl },
        isCurrent: () => true,
        sync: async () => true,
        isReferenced: async () => false,
        discard: async () => undefined,
        view: () =>
          tab.toRecordsView({
            namespace: "user:user-b",
            remoteUrl: AUTHORITY_URL,
            storageDbName: null
          })
      }));
    }

    expect(foreignRows()).toHaveLength(1);
  });

  it("restores a backup carrying no queued file while the account's FileFn authority cannot be read", async () => {
    await bootData(cloudAccount("user-a"));
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    const session = cloudAccount("user-a");
    const read = clientStorage.get.bind(clientStorage);
    vi.spyOn(clientStorage, "get").mockImplementation(async (key) =>
      key === ClientStorageKey.REGION
        ? Promise.reject(new Error("The region cannot be read"))
        : read(key)
    );
    account.set({
      ...session,
      userInfo: { ...session.userInfo!, region: undefined as never }
    });

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).resolves.toBeUndefined();
  });

  it.each([
    [
      "never lets an earlier binding at another FileFn authority remove a file a later binding took",
      false
    ],
    [
      "lets the later binding remove the file once its record is deleted, though the earlier binding's mark cannot be read",
      true
    ]
  ])(
    "binds a restored file its replays took at two FileFn authorities by the later binding only: %s",
    async (_, isLater) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const record = await capturePhoto();
      const entry = `queued_${record.fileId}`;
      const backup = await backupFile();
      await clearBrowser();
      await bootData(cloudAccount("user-b"));
      await restoreBackup(backup, { triggerCloneUp: () => false });
      const useast = AUTHORITY_URL.replace(/\/datafn$/, "/files");
      const references =
        (baseUrl: string, isReferenced: boolean) =>
        (): QueuedFileReferences => ({
          owner: { userId: "user-a", baseUrl },
          isCurrent: () => true,
          sync: async () => true,
          isReferenced: async () => isReferenced,
          discard: async (fileId) => {
            sdk.deleted.push(fileId);
          }
        });
      const root = await opfs.getDirectory();
      await root.getDirectoryHandle(UPLOAD_LOG, { create: true });
      getDirectory = failingWrites(
        (path) =>
          path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
            ? new Error("The adoption cannot be recorded")
            : undefined,
        undefined,
        undefined,
        isLogUnreadable
      );
      await replayFresh(QUEUE_A, references(useast, true));
      await replayFresh(QUEUE_A, references(EUWEST_URL, true));
      const marks = opfs
        .list(QUEUE_A, entry)
        .filter((name) => name.startsWith("bound-"))
        .sort((a, b) => Number(a.split("~")[2]) - Number(b.split("~")[2]));
      expect(marks).toHaveLength(2);
      getDirectory = failingWrites(
        () => undefined,
        undefined,
        undefined,
        (path) =>
          isLater && path[2] === marks[0]
            ? new DOMException("The mark cannot be read", "NotReadableError")
            : undefined
      );

      await replayFresh(
        QUEUE_A,
        references(isLater ? EUWEST_URL : useast, false)
      );
      getDirectory = opfs.getDirectory;

      expect(opfs.list(QUEUE_A)).toEqual(isLater ? [] : [entry]);
      expect(sdk.started).toEqual([]);
    }
  );

  it("drops a take its replay could not bind once a later replay at another FileFn authority bound the file, so the earlier take never removes it after its own record is deleted", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const useast = AUTHORITY_URL.replace(/\/datafn$/, "/files");
    const references = (baseUrl: string, isReferenced: boolean) => ({
      owner: { userId: "user-a", baseUrl },
      isCurrent: () => true,
      sync: async () => true,
      isReferenced: async () => isReferenced,
      discard: async (fileId: string) => {
        sdk.deleted.push(fileId);
      }
    });
    const root = await opfs.getDirectory();
    await root.getDirectoryHandle(UPLOAD_LOG, { create: true });
    const failing = (isBindingFailing: boolean) =>
      failingWrites(
        (path) =>
          path[2]?.startsWith("adopted-") ||
          path[1]?.startsWith("adopted~") ||
          (isBindingFailing && path[2]?.startsWith("bound-"))
            ? new Error("The binding cannot be recorded")
            : undefined,
        undefined,
        undefined,
        isLogUnreadable
      );
    const page = await openQueueTab();
    const { createFileFnClient } = await import("@filefn/client");
    const replayPage = async (baseUrl: string, isReferenced: boolean) => {
      isOnline = true;
      await page.replayFileQueue(
        QUEUE_A,
        createFileFnClient({} as never),
        new AbortController().signal,
        undefined,
        references(baseUrl, isReferenced)
      );
      isOnline = false;
    };
    getDirectory = failing(true);
    await replayPage(useast, true);
    expect(opfs.list(QUEUE_A, entry).some((n) => n.startsWith("bound-"))).toBe(
      false
    );
    getDirectory = failing(false);
    await replayFresh(QUEUE_A, () => references(EUWEST_URL, true));
    await replayPage(useast, false);
    getDirectory = opfs.getDirectory;

    await replayFresh(QUEUE_A, () => references(useast, false));

    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(sdk.started).toEqual([]);
  });

  it("names the authority on a local copy's row whose restore could not tell it once a pass at that authority finds the file referenced, and keeps the row for the direct authority that succeeded the retired copy", async () => {
    const { clone } = await keepAndLeaveScope(false, true, "euwest");
    const useast = AUTHORITY_URL.replace(/\/datafn$/, "/files");
    const [unnamed] = foreignRows();
    const pass = (storageDbName: string | null, isReferenced: boolean) =>
      replayFresh(QUEUE_B, (tab) => ({
        owner: { userId: "user-b", baseUrl: useast },
        isCurrent: () => true,
        sync: async () => true,
        isReferenced: async () => isReferenced,
        discard: async () => undefined,
        view: () =>
          tab.toRecordsView({
            namespace: "user:user-b",
            remoteUrl: AUTHORITY_URL,
            storageDbName
          })
      }));
    await pass(clone, true);
    const [named] = foreignRows();
    expect(foreignRows()).toHaveLength(1);
    expect(named).not.toBe(unnamed);
    const { deleteDatafnLocalClone } =
      await import("@nucleum/datafn/storage-lifecycle");
    await deleteDatafnLocalClone(clone);

    await pass(null, true);
    expect(foreignRows()).toEqual([named]);
    await pass(null, false);

    expect(foreignRows()).toEqual([named]);
    expect(sdk.started).toEqual([]);
  });

  /**
   * Captures a file under user-a, restores it into user-b, protects its
   * generation with a foreign row (as a restore into another account kept
   * it), and lets user-a's replay bind it on its record's reference while
   * its adoption cannot be written, and its delivery cannot be read, so it
   * sends nothing; then adds a newer binding of user-a at the same FileFn
   * authority whose write was cut short. Returns the file's entry, the
   * foreign rows and user-a's references.
   */
  async function bindTwice() {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    await restoreBackup(backup, { triggerCloneUp: () => false });
    const published = opfs
      .list(QUEUE_A, entry)
      .find((name) => name.startsWith("published-"));
    expect(published).toBeDefined();
    const generation = published!.slice("published-".length);
    const root = await opfs.getDirectory();
    await (
      await root.getDirectoryHandle(HOLDS_A, { create: true })
    ).getFileHandle(
      `foreign~${record.fileId}~${generation}~test-session~d-test-scope~~test-row`,
      { create: true }
    );
    const rows = foreignRows();
    expect(rows).toHaveLength(1);
    const state = { isReferenced: true };
    const references = (): QueuedFileReferences => ({
      owner: { userId: "user-a", baseUrl: AUTHORITY_URL },
      isCurrent: () => true,
      sync: async () => true,
      isReferenced: async () => state.isReferenced,
      discard: async (fileId) => {
        sdk.deleted.push(fileId);
      }
    });
    await root.getDirectoryHandle(UPLOAD_LOG, { create: true });
    getDirectory = failingWrites(
      (path) =>
        path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
          ? new Error("The adoption cannot be recorded")
          : undefined,
      undefined,
      undefined,
      isLogUnreadable
    );
    await replayFresh(QUEUE_A, references);
    getDirectory = opfs.getDirectory;
    const marks = opfs
      .list(QUEUE_A, entry)
      .filter((name) => name.startsWith("bound-"));
    expect(marks).toHaveLength(1);
    const text = new TextDecoder().decode(opfs.read(QUEUE_A, entry, marks[0]));
    expect(JSON.parse(text).foreign).toEqual(rows);
    const [mark, digest, order] = marks[0].split("~");
    const queue = await root.getDirectoryHandle(QUEUE_A);
    await (
      await queue.getDirectoryHandle(entry)
    ).getFileHandle(`${mark}~${digest}~${Number(order) + 1}`, { create: true });
    return { entry, rows, state, references };
  }

  it.each([
    [
      "removes the file once its record is deleted, though a newer binding of the account at the same FileFn authority was cut short",
      false
    ],
    [
      "keeps the file while a foreign row the complete binding did not find protects it",
      true
    ]
  ])(
    "takes the newest complete binding of the account at its FileFn authority: %s",
    async (_, isProtected) => {
      const { entry, rows, state, references } = await bindTwice();
      if (isProtected) {
        const root = await opfs.getDirectory();
        await (
          await root.getDirectoryHandle(HOLDS_A)
        ).getFileHandle(rows[0].replace(/~[^~]*$/, "~newer-restore"), {
          create: true
        });
      }
      state.isReferenced = false;

      await replayFresh(QUEUE_A, references);

      expect(opfs.list(QUEUE_A)).toEqual(isProtected ? [entry] : []);
      expect(foreignRows()).toHaveLength(isProtected ? 2 : 1);
      expect(sdk.started).toEqual([]);
      expect(sdk.deleted).toEqual([]);
    }
  );
  it("keeps on rollback a file its account bound, though a newer binding of the account was cut short, and lets the account's replay remove it once its record is deleted", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const entry = `queued_${record.fileId}`;
    const backup = await backupFile();
    await clearBrowser();
    await bootData(cloudAccount("user-b"));
    let isReferenced = true;
    const references = (): QueuedFileReferences => ({
      owner: { userId: "user-a", baseUrl: AUTHORITY_URL },
      isCurrent: () => true,
      sync: async () => true,
      isReferenced: async () => isReferenced,
      discard: async (fileId) => {
        sdk.deleted.push(fileId);
      }
    });
    preflight.during = async () => {
      vi.spyOn(Date, "now").mockReturnValue(
        Date.now() + RESTORE_HOLD_LIFETIME_MS + 1_000
      );
      getDirectory = failingWrites(
        (path) =>
          path[2]?.startsWith("adopted-") || path[1]?.startsWith("adopted~")
            ? new Error("The adoption cannot be recorded")
            : undefined,
        undefined,
        undefined,
        isLogUnreadable
      );
      await replayFresh(QUEUE_A, references);
      getDirectory = opfs.getDirectory;
      const [bound, ...others] = opfs
        .list(QUEUE_A, entry)
        .filter((name) => name.startsWith("bound-"));
      expect(others).toEqual([]);
      expect(opfs.read(QUEUE_A, entry, bound)?.byteLength).toBeGreaterThan(0);
      const [mark, digest, order] = bound.split("~");
      const root = await opfs.getDirectory();
      const queue = await root.getDirectoryHandle(QUEUE_A);
      await (
        await queue.getDirectoryHandle(entry)
      ).getFileHandle(`${mark}~${digest}~${Number(order) + 1}`, {
        create: true
      });
      isReferenced = false;
      await bootData(cloudAccount("user-c"));
    };
    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("The account changed while the backup was restored");
    preflight.during = null;
    expect(opfs.list(QUEUE_A)).toEqual([entry]);
    expect(foreignRows()).toEqual([]);

    await replayFresh(QUEUE_A, references);

    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(sdk.started).toEqual([]);
    expect(sdk.deleted).toEqual([]);
  });
});

describe("backup and restore of a local-only user's files", () => {
  const localAccount: UserAccount = {
    dataMode: UserDataMode.LOCAL,
    sessionType: UserSessionType.RETURNING
  };
  /**
   * Decodes record bytes as a backup restores them: JSON carries a record's
   * bytes as an object of its byte values, as for a record that kept them.
   */
  const decode = (bytes: unknown) =>
    new TextDecoder().decode(
      Uint8Array.from(Object.values(bytes as Record<string, number>))
    );

  it("restores a local-only user's capture, whose bytes the device's local queue holds, with its original and thumbnail on a cleared browser", async () => {
    await bootData(localAccount);
    const record = await capturePhoto();
    expect(opfs.list("nucleum-file-queue-local")).toEqual([
      `queued_${record.fileId}`
    ]);
    expect((await savedRecord(record.id))?.data).toBeUndefined();
    const backup = await backupFile();

    await clearBrowser();
    await bootData(localAccount);
    await restoreBackup(backup, { triggerCloneUp: () => false });

    const restored = await savedRecord(record.id);
    expect(restored?.fileId).toBeUndefined();
    expect(decode(restored?.data)).toBe("photo bytes");
    expect(decode(restored?.thumbnailData)).toBe("thumb bytes");
    expect(sdk.started).toEqual([]);
  });

  it("restores a local-only user's capture an account already received, whose bytes the device still holds, with its original and thumbnail", async () => {
    await bootData(localAccount);
    const record = await capturePhoto();
    // The first cloud sign-in uploaded the file and its thumbnail; the
    // device's local queue keeps them, marked uploaded.
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle("nucleum-file-queue-local");
    const entry = await queue.getDirectoryHandle(`queued_${record.fileId}`);
    for (const [mark, text] of [
      ["uploaded", "v1"],
      ["sent-thumbnail", ""]
    ]) {
      const writable = await (
        await entry.getFileHandle(mark, { create: true })
      ).createWritable();
      await writable.write(text);
      await writable.close();
    }
    const backup = await backupFile();

    await clearBrowser();
    await bootData(localAccount);
    await restoreBackup(backup, { triggerCloneUp: () => false });

    const restored = await savedRecord(record.id);
    expect(restored?.fileId).toBeUndefined();
    expect(decode(restored?.data)).toBe("photo bytes");
    expect(decode(restored?.thumbnailData)).toBe("thumb bytes");
  });

  it("restores a local-only user's empty capture as an empty file, not as a record whose file resolves nowhere", async () => {
    await bootData(localAccount);
    const [record] = (await fileUpload.uploadFileV2(
      "text/plain",
      "empty.txt",
      new Blob([], { type: "text/plain" })
    )) as { id: string; fileId: string }[];
    expect(opfs.list("nucleum-file-queue-local")).toEqual([
      `queued_${record.fileId}`
    ]);
    const backup = await backupFile();

    await clearBrowser();
    await bootData(localAccount);
    await restoreBackup(backup, { triggerCloneUp: () => false });

    const restored = await savedRecord(record.id);
    expect(restored).toBeDefined();
    expect(restored?.fileId).toBeUndefined();
    expect(decode(restored?.data)).toBe("");
    expect(restored?.size).toBe(0);
  });

  const LOCAL_QUEUE = "nucleum-file-queue-local";
  const HELD_FILES = [
    "record.json",
    "claim.json",
    "committed",
    "stale",
    "orphaned",
    "deleted",
    "discarded"
  ];

  /** Writes a file of a local file's entry, as the device's local queue does. */
  async function writeLocalFile(fileId: string, name: string, text = "") {
    const root = await opfs.getDirectory();
    const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
    const entry = await queue.getDirectoryHandle(`queued_${fileId}`);
    const writable = await (
      await entry.getFileHandle(name, { create: true })
    ).createWritable();
    await writable.write(text);
    await writable.close();
  }

  /** Reads the record copy, claim and marks of a local file's entry. */
  function readHeldState(fileId: string) {
    return HELD_FILES.map((name) => {
      const bytes = opfs.read(LOCAL_QUEUE, `queued_${fileId}`, name);
      return [name, bytes && new TextDecoder().decode(bytes)];
    });
  }

  /**
   * Captures a photo as a guest whose namespace a sign-out then retires: it
   * cleared the device's DataFn ID, so a new guest namespace opens.
   */
  async function captureInRetiredGuest() {
    await bootData(localAccount);
    const record = await capturePhoto();
    device = newDevice();
    await bootData(localAccount);
    expect(await savedRecord(record.id)).toBeUndefined();
    return record;
  }

  it("carries the held captures no guest record references, also a retired guest namespace's, and restores them still held", async () => {
    const retired = await captureInRetiredGuest();
    await writeLocalFile(retired.fileId, "stale", "changed");
    const claimed = await capturePhoto();
    const claim = { userId: "user-a", baseUrl: "https://files.example.test" };
    await writeLocalFile(claimed.fileId, "claim.json", JSON.stringify(claim));
    // The guest record of the claimed, not uploaded capture was deleted.
    await deleteRecord(claimed.id);
    await writeLocalFile(claimed.fileId, "orphaned");
    // A guest record deleted before its change marked its capture.
    const unfenced = await capturePhoto();
    await deleteRecord(unfenced.id);
    const held = [retired, claimed].map(({ fileId }) => readHeldState(fileId));
    expect(held[0][0][1]).toContain(retired.id);
    expect(held[1][1][1]).toBe(JSON.stringify(claim));

    const backup = await backupFile();
    expect(
      [retired, claimed].map(({ fileId }) => readHeldState(fileId))
    ).toEqual(held);
    await clearBrowser();
    await bootData(localAccount);
    await restoreBackup(backup, { triggerCloneUp: () => false });

    expect(opfs.list(LOCAL_QUEUE).sort()).toEqual(
      [retired, claimed, unfenced]
        .map(({ fileId }) => `queued_${fileId}`)
        .sort()
    );
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${unfenced.fileId}`, "deleted")
    ).toBeDefined();
    expect(
      [retired, claimed].map(({ fileId }) => readHeldState(fileId))
    ).toEqual(held);
    expect(await readQueuedBytes(claimed.fileId, "full")).toBe("photo bytes");
    expect(await readQueuedBytes(retired.fileId, "thumbnail")).toBe(
      "thumb bytes"
    );
    expect(await savedRecord(claimed.id)).toBeUndefined();
    expect(sdk.started).toEqual([]);
  });

  it("backs up a guest's captures while a local file of another guest namespace cannot be read, but not while one of its own cannot", async () => {
    const other = await captureInRetiredGuest();
    await writeLocalFile(other.fileId, "metadata.json", "{");
    const record = await capturePhoto();

    const backup = await backupFile();
    await writeLocalFile(record.fileId, "metadata.json", "{");
    await expect(createBackupBlob()).rejects.toThrow();
    await clearBrowser();
    await bootData(localAccount);
    await restoreBackup(backup, { triggerCloneUp: () => false });

    const restored = await savedRecord(record.id);
    expect(restored?.fileId).toBeUndefined();
    expect(decode(restored?.data)).toBe("photo bytes");
    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
  });
});
