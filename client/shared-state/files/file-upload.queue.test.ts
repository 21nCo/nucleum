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
  hold: null as Promise<void> | null
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
  beforeMutate: null as ((args: unknown) => Promise<void | AfterCall>) | null
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
const { replayFileQueue, withQueueLock } = await import("./file-queue");
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

/** Opens local DataFn in the namespace of the account (of none: the guest). */
async function openData(userId?: string) {
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
 * ID opens.
 */
async function signOutToLocal(isNewGuest = false) {
  endAccountUploadReplay();
  account.set(localAccount);
  if (isNewGuest)
    device = { ...device, dapId: `device-${crypto.randomUUID()}` };
  await openData();
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
async function writeLocalEntryFile(fileId: string, name: string, text = "") {
  const root = await opfs.getDirectory();
  const queue = await root.getDirectoryHandle(LOCAL_QUEUE);
  const entry = await queue.getDirectoryHandle(`queued_${fileId}`);
  const file = await entry.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(text);
  await writable.close();
}

/** Makes every read of a queued file's claim fail, as an unreadable file does. */
function failClaimReads() {
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
          if (name !== "claim.json") return file;
          const unreadable = new DOMException("Unreadable", "NotReadableError");
          return { ...file, getFile: () => Promise.reject(unreadable) };
        };
      }
    });
  navigator.storage.getDirectory = async () => wrap(await opfs.getDirectory());
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
  device = {
    dapId: `device-${crypto.randomUUID()}`,
    env: `test-${crypto.randomUUID()}`
  };
  isOnline = true;
  webLocks = createFakeLocks();
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

  it("deletes the claiming account's file when the local-only record is deleted before its record was published", async () => {
    const record = await captureThenSignOutDuringUpload();

    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();
    // Only the claiming account can tell whether the record was published.
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);
    expect(sdk.deletes).toEqual([]);

    await signInToCloud("user-b");
    await replayLocalQueue();
    expect(sdk.deletes).toEqual([]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([`queued_${record.fileId}`]);

    await signInToCloud("user-a");

    await vi.waitFor(() => expect(sdk.deletes).toEqual([record.fileId]));
    await vi.waitFor(() => expect(opfs.list(LOCAL_QUEUE)).toEqual([]));
    expect(sdk.started).toHaveLength(1);
    expect(await savedRecord(record.id)).toBeUndefined();
  });

  it("keeps the claiming account's file when its record was published before the local-only record was deleted", async () => {
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

    await vi.waitFor(() => expect(opfs.list(LOCAL_QUEUE)).toEqual([]));
    expect(sdk.deletes).toEqual([]);
    expect(sdk.started).toHaveLength(1);
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
  });

  it("leaves a deleted local-only record's file to the account another tab claimed it for after this tab's reconcile listed it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    // Another tab's replay claims the file for user-a while this tab's
    // reconcile of the deleted record looks the file up in the records.
    fileCalls.beforeQuery = async (args) => {
      const { filters } = args as { filters?: { fileId?: string } };
      if (filters?.fileId !== record.fileId) return;
      fileCalls.beforeQuery = null;
      const claim = { userId: "user-a", baseUrl: sdk.baseUrls[0] ?? "" };
      await writeLocalEntryFile(
        record.fileId,
        "claim.json",
        JSON.stringify(claim)
      );
    };

    await datafn.file.mutate({ operation: "delete", id: record.id } as never);
    await settleLocalFileRecords();

    expect(opfs.list(LOCAL_QUEUE, `queued_${record.fileId}`)).toContain(
      "orphaned"
    );
    expect(sdk.deletes).toEqual([]);
  });

  it("never deletes a claimed file whose record another replay is publishing when its account settles its orphaned files", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    let settling: Promise<void> | undefined;
    // The file is marked orphaned while the replay publishes its record, and
    // another replay of the account settles its orphaned files meanwhile.
    fileCalls.beforeMutate = async (args) => {
      const [first] = Array.isArray(args) ? args : [];
      if (first?.operation !== "insert" || first.id !== record.id) return;
      fileCalls.beforeMutate = null;
      await writeLocalEntryFile(record.fileId, "orphaned");
      settling = replayLocalQueue();
      for (let turn = 0; turn < 200; turn++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    };

    await signInToCloud("user-a");
    await vi.waitFor(async () =>
      expect((await savedRecord(record.id))?.fileId).toBe(record.fileId)
    );
    await vi.waitFor(() => expect(settling).toBeDefined());
    await settling;

    expect(sdk.deletes).toEqual([]);
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "uploaded")
    ).toBeDefined();
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

  it("keeps a claimed file orphaned when another tab deletes its record while this tab copies an earlier change of it", async () => {
    const record = await captureThenSignOutDuringUpload();
    await settleLocalFileRecords();
    let otherTab: Promise<unknown> | undefined;
    // This tab has read the renamed record when another tab, whose changes
    // this tab does not see, deletes it and marks the claimed file orphaned
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
            await writeLocalEntryFile(record.fileId, "orphaned");
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
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "orphaned")
    ).toBeDefined();
    await signInToCloud("user-a");
    await replayLocalQueue();
    expect(await readAnyRecord(record.id)).toBeUndefined();
    expect(sdk.deletes).toEqual([record.fileId]);
    expect(opfs.list(LOCAL_QUEUE)).toEqual([]);
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

  it("publishes the last copy of a capture held stale at sign-in once a sign-out opened a new guest namespace", async () => {
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
    // namespace never starts again, so its record cannot be read again.
    await signOutToLocal(true);
    await settleLocalFileRecords();
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeUndefined();
    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "photo.png" })
      )
    );
    expect(sdk.uploads.map((upload) => upload.fileId)).toEqual([record.fileId]);
  });

  it("keeps a change whose pass could not list the local files and publishes no outdated copy of it", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();
    const record = await capturePhoto();
    await settleLocalFileRecords();
    vi.spyOn(OPFSStore.prototype, "listPendingUploads").mockRejectedValueOnce(
      new DOMException("The file system is busy", "NotReadableError")
    );
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
    expect(
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "stale")
    ).toBeDefined();

    await signOutToLocal();
    await settleLocalFileRecords();
    await signInToCloud("user-a");

    await vi.waitFor(async () =>
      expect(await savedRecord(record.id)).toEqual(
        expect.objectContaining({ fileId: record.fileId, name: "receipt.png" })
      )
    );
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

    failClaimReads();
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
      opfs.read(LOCAL_QUEUE, `queued_${record.fileId}`, "orphaned")
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
