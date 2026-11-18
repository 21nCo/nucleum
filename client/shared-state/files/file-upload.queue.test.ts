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
const { installDeviceFileQueue } = await import("./device-file-queue");

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

/** Boots local DataFn in the account's namespace, then signs the account in. */
async function bootData(value: UserAccount) {
  await initializeNucleumDatafn({
    product: Product.MEMOTRON,
    account: { dataMode: UserDataMode.LOCAL, userId: value.userId },
    dapId: `device-${crypto.randomUUID()}`,
    env: `test-${crypto.randomUUID()}`,
    isOffline: true
  });
  account.set(value);
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

  it("keeps a local-only user's capture in the device queue and uploads it when they first sign in to cloud", async () => {
    await bootData(localAccount);
    uninstall = installDeviceFileQueue();

    const record = await capturePhoto();

    expect((await savedRecord(record.id))?.data ?? null).toBeNull();
    expect(opfs.list("nucleum-file-queue-local")).toEqual([
      `queued_${record.fileId}`
    ]);
    expect(await resolveFileUrl(record.fileId, "full")).toBe("blob:queued");
    expect(sdk.baseUrls).toEqual([]);

    account.set(cloudAccount("user-a"));

    await vi.waitFor(() =>
      expect(opfs.list("nucleum-file-queue-local")).toEqual([])
    );
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it("moves a local-only user's record bytes written before the queue into it and uploads them on first cloud sign-in", async () => {
    await bootData(localAccount);
    const [legacy] = await fileUpload.saveLocalFile({
      id: "file:legacy_photo" as never,
      fileName: "legacy.png",
      contentType: "image/png",
      blob: new Blob(["legacy bytes"], { type: "image/png" }),
      thumbnailBlob: new Blob(["legacy thumb"], { type: "image/jpeg" })
    });

    uninstall = installDeviceFileQueue();

    expect(migration.calls).toEqual([expect.stringMatching(/^guest:/)]);
    let moved: Record<string, unknown> | undefined;
    await vi.waitFor(async () => {
      moved = await savedRecord(legacy.id);
      expect(moved?.fileId).toEqual(expect.stringMatching(/^file_m/));
    });
    expect(moved?.data ?? null).toBeNull();
    expect(moved?.thumbnailData ?? null).toBeNull();
    const entry = `queued_${String(moved?.fileId)}`;
    expect(opfs.list("nucleum-file-queue-local")).toEqual([entry]);
    expect(
      new TextDecoder().decode(
        opfs.read("nucleum-file-queue-local", entry, "data.bin")
      )
    ).toBe("legacy bytes");
    expect(await resolveFileUrl(String(moved?.fileId), "full")).toBe(
      "blob:queued"
    );

    account.set(cloudAccount("user-a"));

    await vi.waitFor(() =>
      expect(opfs.list("nucleum-file-queue-local")).toEqual([])
    );
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: moved?.fileId })
    ]);
    expect(sdk.artifacts).toEqual([
      expect.objectContaining({ fileId: moved?.fileId })
    ]);
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
});
