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
/** What DataFn does in the test: whether its pulls fail, its import result. */
const data = vi.hoisted(() => ({
  isPullFailing: false,
  importResult: null as unknown
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
        return async () => data.importResult;
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

/** Runs while a restore lists the queued files it must not overwrite, when set. */
const preflight = vi.hoisted(() => ({
  during: null as (() => Promise<void>) | null
}));
vi.mock("@nucleum/shared-state/files/file-queue", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@nucleum/shared-state/files/file-queue")
    >();
  return {
    ...actual,
    listQueuedFileIds: async (dir: string) => {
      const held = await actual.listQueuedFileIds(dir);
      await preflight.during?.();
      return held;
    }
  };
});

const { fileUpload } = await import("@nucleum/shared-state/files/file-upload");
const { resolveFileUrl } = await import("@nucleum/shared-state/files/file-url");
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

function goOnline() {
  isOnline = true;
  window.dispatchEvent(new Event("online"));
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
  const locks = createFakeLocks();
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    get onLine() {
      return isOnline;
    },
    locks: {
      ...locks,
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
    },
    storage: { getDirectory: opfs.getDirectory }
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
  data.importResult = null;
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
    // As a backup taken after the capturing account's upload was sent holds.
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

  it("restores no queued file when the records could not all be restored", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    await capturePhoto();
    const backup = await backupFile();

    await clearBrowser();
    await bootData(cloudAccount("user-a"));
    data.importResult = {
      ok: true,
      stats: { resources: { file: { skipped: 1 } }, joins: {} }
    };
    lockNames = [];

    await expect(
      restoreBackup(backup, { triggerCloneUp: () => false })
    ).rejects.toThrow("DataFn restore failed");
    expect(opfs.list(QUEUE_A)).toEqual([]);
    expect(lockNames).not.toContain(`${REPLAY_LOCK}${QUEUE_A}`);
  });
});
