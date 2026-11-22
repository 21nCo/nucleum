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
import { createFakeOpfs } from "../../../tests/fixtures/opfs";

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

const { fileUpload } = await import("./file-upload");
const { resolveFileUrl } = await import("./file-url");
const {
  installDeviceFileQueue,
  settleLocalFileRecords,
  uploadLocalQueuedFiles
} = await import("./device-file-queue");
const { captureFileQueueUploader } = await import("./filefn-client");
const { replayFileQueue } = await import("./file-queue");
const { OPFSStore } = await import("@filefn/client");

/** One device file system: the queue keeps its handles for the page's life. */
const opfs = createFakeOpfs();
let isOnline = true;
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

/** Signs a cloud account in, then moves DataFn to its namespace, as the app does. */
async function signInToCloud(userId: string) {
  account.set(cloudAccount(userId));
  await openData(userId);
}

/** Signs out to local-only mode, back in the device's guest namespace. */
async function signOutToLocal() {
  account.set(localAccount);
  await openData();
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
async function captureThenSignOutDuringUpload() {
  await bootData(localAccount);
  uninstall = installDeviceFileQueue();
  const record = await capturePhoto();
  await settleLocalFileRecords();
  let release!: () => void;
  sdk.hold = new Promise<void>((done) => (release = done));
  await signInToCloud("user-a");
  await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
  await signOutToLocal();
  release();
  sdk.hold = null;
  return record;
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
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    get onLine() {
      return isOnline;
    },
    locks: undefined,
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
    await vi.waitFor(() => expect(sdk.baseUrls).not.toEqual([]));
    await uploadLocalQueuedFiles();
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
    await uploadLocalQueuedFiles();
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
    await uploadLocalQueuedFiles();
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
    await uploadLocalQueuedFiles();
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
