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
  uploads: [] as UploadInput[],
  artifacts: [] as UploadArtifactInput[],
  baseUrls: [] as string[]
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
        uploadFile: (input) =>
          ({
            uploadSessionId: "ses_1",
            fileId: input.fileId,
            onProgress: () => undefined,
            abort: () => undefined,
            done: async () => {
              sdk.uploads.push(input);
              return { fileId: input.fileId!, versionId: "ver_1" };
            }
          }) as ReturnType<FileFnClient["uploadFile"]>,
        uploadArtifact: async (input) => {
          sdk.artifacts.push(input);
          return {} as Awaited<ReturnType<FileFnClient["uploadArtifact"]>>;
        },
        getPendingLocalDescriptor: async () => null
      };
    }
  };
});

const migration = vi.hoisted(() => ({ calls: [] as string[] }));
vi.mock(
  "@nucleum/persistence/migrations/device-file-bytes.migration",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@nucleum/persistence/migrations/device-file-bytes.migration")
      >();
    return {
      ...actual,
      migrateDeviceFileBytes: (
        host: Parameters<typeof actual.migrateDeviceFileBytes>[0]
      ) => {
        migration.calls.push(host.namespace);
        return actual.migrateDeviceFileBytes(host);
      }
    };
  }
);

const { fileUpload } = await import("./file-upload");
const { resolveFileUrl } = await import("./file-url");
const { installDeviceFileQueue, uploadLocalQueuedFiles } =
  await import("./device-file-queue");
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
  sdk.uploads = [];
  sdk.artifacts = [];
  sdk.baseUrls = [];
  migration.calls = [];
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
  it("keeps an offline cloud capture in the account's queue, renders it from the device and uploads it on reconnect", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;

    const record = await capturePhoto();

    const saved = await savedRecord(record.id);
    expect(saved?.fileId).toBe(record.fileId);
    expect(saved?.data ?? null).toBeNull();
    expect(saved?.thumbnailData ?? null).toBeNull();
    expect(opfs.list("nucleum-file-queue-account-user-a")).toEqual([
      `queued_${record.fileId}`
    ]);
    expect(await resolveFileUrl(record.fileId, "full")).toBe("blob:queued");
    expect(sdk.uploads).toEqual([]);

    goOnline();

    await vi.waitFor(() =>
      expect(opfs.list("nucleum-file-queue-account-user-a")).toEqual([])
    );
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId, fileName: "photo.png" })
    ]);
    expect(sdk.artifacts).toEqual([
      expect.objectContaining({
        fileId: record.fileId,
        kind: "thumbnail-medium"
      })
    ]);
    expect(sdk.baseUrls).toContain(
      "https://account-useast-dev.nucleum.app/files"
    );
  });

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

  it("moves a local-only user's record bytes, trashed and archived too, into the queue and uploads them with their records on first cloud sign-in", async () => {
    await bootData(localAccount);
    const [legacy] = await fileUpload.saveLocalFile({
      id: "file:legacy_photo" as never,
      fileName: "legacy.png",
      contentType: "image/png",
      blob: new Blob(["legacy bytes"], { type: "image/png" }),
      thumbnailBlob: new Blob(["legacy thumb"], { type: "image/jpeg" })
    });
    const [trashed] = await fileUpload.saveLocalFile({
      id: "file:trashed_photo" as never,
      fileName: "trashed.png",
      contentType: "image/png",
      blob: new Blob(["trashed bytes"], { type: "image/png" })
    });
    const [archived] = await fileUpload.saveLocalFile({
      id: "file:archived_photo" as never,
      fileName: "archived.png",
      contentType: "image/png",
      blob: new Blob(["archived bytes"], { type: "image/png" })
    });
    await datafn.file.mutate({ operation: "trash", id: trashed.id } as never);
    await datafn.file.mutate({
      operation: "merge",
      id: archived.id,
      record: { id: archived.id, isArchived: true }
    });
    const readAny = async (id: string) =>
      (
        await datafn.file.query({
          filters: { id },
          metadata: { includeTrashed: true, includeArchived: true }
        })
      ).data?.[0] as Record<string, unknown> | undefined;
    expect(await savedRecord(trashed.id)).toBeUndefined();
    expect(await savedRecord(archived.id)).toBeUndefined();

    uninstall = installDeviceFileQueue();

    expect(migration.calls).toEqual([expect.stringMatching(/^guest:/)]);
    const ids = [legacy.id, trashed.id, archived.id];
    const fileIds: string[] = [];
    await vi.waitFor(async () => {
      fileIds.length = 0;
      for (const id of ids) {
        const record = await readAny(id);
        expect(record?.fileId).toEqual(expect.stringMatching(/^file_m/));
        expect(record?.data ?? null).toBeNull();
        expect(record?.thumbnailData ?? null).toBeNull();
        fileIds.push(String(record?.fileId));
      }
    });
    expect(opfs.list("nucleum-file-queue-local").sort()).toEqual(
      fileIds.map((fileId) => `queued_${fileId}`).sort()
    );
    const [legacyFileId] = fileIds;
    expect(
      new TextDecoder().decode(
        opfs.read(
          "nucleum-file-queue-local",
          `queued_${legacyFileId}`,
          "data.bin"
        )
      )
    ).toBe("legacy bytes");
    expect(await resolveFileUrl(legacyFileId, "full")).toBe("blob:queued");

    await signInToCloud("user-a");

    await vi.waitFor(() => expect(sdk.uploads).toHaveLength(3));
    expect(sdk.uploads.map((upload) => upload.fileId).sort()).toEqual(
      [...fileIds].sort()
    );
    expect(sdk.artifacts).toEqual([
      expect.objectContaining({ fileId: legacyFileId })
    ]);
    await vi.waitFor(async () => {
      for (const [index, id] of ids.entries()) {
        expect((await readAny(id))?.fileId).toBe(fileIds[index]);
      }
    });
  });

  it("leaves the bytes an account's records synced alone for the production cutover", async () => {
    await bootData(cloudAccount("user-a"));
    const [legacy] = await fileUpload.saveLocalFile({
      id: "file:synced_photo" as never,
      fileName: "synced.png",
      contentType: "image/png",
      blob: new Blob(["synced bytes"], { type: "image/png" })
    });

    uninstall = installDeviceFileQueue();

    expect(migration.calls).toEqual([]);
    const saved = await savedRecord(legacy.id);
    expect(saved?.fileId).toBeUndefined();
    expect(new TextDecoder().decode(saved?.data as Uint8Array)).toBe(
      "synced bytes"
    );
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

  it("uploads an offline capture whose reconnect came while it was being staged without another reconnect", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const thumbnail = deferred<Blob>();
    codec.compressImageToTargetSize.mockReturnValueOnce(thumbnail.promise);

    const capture = fileUpload.uploadFileV2(
      "image/png",
      "photo.png",
      new Blob(["photo bytes"], { type: "image/png" }),
      { isGenerateThumbnail: true }
    ) as Promise<{ fileId: string }[]>;
    await vi.waitFor(() =>
      expect(codec.compressImageToTargetSize).toHaveBeenCalled()
    );
    const listed = vi.spyOn(OPFSStore.prototype, "listPendingUploads");
    goOnline();
    // The reconnect's replay finds the queue still empty.
    await vi.waitFor(() => expect(listed).toHaveBeenCalled());
    await listed.mock.results[0]?.value;
    expect(sdk.uploads).toEqual([]);
    thumbnail.resolve(new Blob(["thumb bytes"], { type: "image/jpeg" }));
    const [record] = await capture;

    await vi.waitFor(() =>
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ])
    );
    await vi.waitFor(() =>
      expect(opfs.list("nucleum-file-queue-account-user-a")).toEqual([])
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
