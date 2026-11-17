import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
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
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import {
  datafn,
  destroyNucleumDatafn,
  initializeNucleumDatafn
} from "@nucleum/datafn/datafn.store";
import { toasts } from "@nucleum/shared-state/notifications/notification.store";

const codec = vi.hoisted(() => ({
  compressImageToTargetSize: vi.fn(),
  convertHeicToPng: vi.fn()
}));
vi.mock("@nucleum/client/runtime/media/image-codec", () => codec);

/** The SDK clients the real FileFn client runtime creates, faked below it. */
const sdk = vi.hoisted(() => ({
  baseUrls: [] as string[],
  uploads: [] as UploadInput[],
  artifacts: [] as UploadArtifactInput[],
  deleted: [] as string[],
  configs: [] as unknown[],
  isRealSdk: false
}));
vi.mock("@filefn/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@filefn/client")>();
  return {
    ...actual,
    createFileFnClient: (
      config: Parameters<typeof actual.createFileFnClient>[0]
    ): Partial<FileFnClient> => {
      sdk.baseUrls.push(config.baseUrl);
      sdk.configs.push(config);
      if (sdk.isRealSdk) return actual.createFileFnClient(config);
      return {
        uploadFile: (input) => {
          sdk.uploads.push(input);
          return {
            uploadSessionId: "ses_1",
            fileId: input.fileId,
            onProgress: () => undefined,
            abort: () => undefined,
            done: async () => ({
              fileId: input.fileId!,
              versionId: "ver_1"
            })
          } as ReturnType<FileFnClient["uploadFile"]>;
        },
        uploadArtifact: async (input) => {
          sdk.artifacts.push(input);
          return { artifactId: `art_${input.kind}` } as Awaited<
            ReturnType<FileFnClient["uploadArtifact"]>
          >;
        },
        deleteFile: async (fileId) => {
          sdk.deleted.push(fileId);
        },
        getPendingLocalDescriptor: async () => null
      };
    }
  };
});

const recordInserts = vi.hoisted(() => ({ inserts: 0 }));
/** Counts file record inserts. */
vi.mock("@nucleum/datafn/datafn.store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@nucleum/datafn/datafn.store")>();
  const bind = (target: object, key: PropertyKey) => {
    const value = Reflect.get(target, key);
    return typeof value === "function" ? value.bind(target) : value;
  };
  const file = new Proxy(actual.datafn.file, {
    get(target, key) {
      if (key !== "mutate") return bind(target, key);
      return async (...args: Parameters<typeof target.mutate>) => {
        recordInserts.inserts += 1;
        return target.mutate(...args);
      };
    }
  });
  return {
    ...actual,
    datafn: new Proxy(actual.datafn, {
      get: (target, key) => (key === "file" ? file : bind(target, key))
    })
  };
});

const { fileUpload } = await import("./file-upload");

/** An in-memory origin private file system with the calls FileFn uses. */
function createFakeOpfsDir(): FileSystemDirectoryHandle {
  const dirs = new Map<string, FileSystemDirectoryHandle>();
  const files = new Set<string>();
  const missing = () => new DOMException("Not found", "NotFoundError");
  return {
    async getDirectoryHandle(name: string, options?: { create?: boolean }) {
      if (!dirs.has(name)) {
        if (!options?.create) throw missing();
        dirs.set(name, createFakeOpfsDir());
      }
      return dirs.get(name)!;
    },
    async getFileHandle(name: string, options?: { create?: boolean }) {
      if (!files.has(name) && !options?.create) throw missing();
      files.add(name);
      return {} as FileSystemFileHandle;
    },
    async removeEntry(name: string) {
      files.delete(name);
      dirs.delete(name);
    },
    async *keys() {
      yield* [...dirs.keys(), ...files];
    }
  } as unknown as FileSystemDirectoryHandle;
}

/** Gives the test page an origin private file system that keeps its data. */
function installFakeOpfs() {
  const root = createFakeOpfsDir();
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    onLine: true,
    locks: undefined,
    storage: { getDirectory: async () => root }
  });
}

/** Starts an image upload while the next account change is made at once. */
function startUploadDuringAcquisition() {
  const upload = fileUpload.uploadFileV2(
    "image/jpeg",
    "photo.jpg",
    new Blob(["original image bytes"], { type: "image/jpeg" })
  );
  upload.catch(() => undefined);
  return upload;
}

const signedOut: UserAccount = {
  dataMode: UserDataMode.NONE,
  sessionType: UserSessionType.UNDETERMINED
};

function cloudAccount(userId: string, region?: string): UserAccount {
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
      region
    }
  };
}

/**
 * Starts an image upload whose on-device thumbnail stays pending until the
 * returned `finishProcessing` runs; the thumbnail then fails, so the upload
 * has no artifacts.
 */
async function startUploadWithPendingProcessing() {
  let finish: (thumbnail: Blob | undefined) => void = () => undefined;
  codec.compressImageToTargetSize.mockImplementationOnce(
    () =>
      new Promise<Blob | undefined>((resolve) => {
        finish = resolve;
      })
  );
  const upload = fileUpload.uploadFileV2(
    "image/jpeg",
    "photo.jpg",
    new Blob(["original image bytes"], { type: "image/jpeg" }),
    { isGenerateThumbnail: true }
  );
  upload.catch(() => undefined);
  await vi.waitFor(() =>
    expect(codec.compressImageToTargetSize).toHaveBeenCalledTimes(1)
  );
  return { upload, finishProcessing: () => finish(undefined) };
}

async function savedFiles() {
  return (await datafn.file.query({})).data ?? [];
}

const initialAccount = account.get();

beforeEach(async () => {
  vi.stubEnv(
    "VITE_ACCOUNT_BASE_URL_TEMPLATE",
    "https://account-{region}-dev.nucleum.app"
  );
  await initializeNucleumDatafn({
    product: Product.MEMOTRON,
    account: { dataMode: UserDataMode.LOCAL, userId: "user-a" },
    dapId: "fixture",
    env: `test-${crypto.randomUUID()}`
  });
  recordInserts.inserts = 0;
  sdk.baseUrls = [];
  sdk.uploads = [];
  sdk.artifacts = [];
  sdk.deleted = [];
  sdk.configs = [];
  sdk.isRealSdk = false;
});

afterEach(async () => {
  account.set(signedOut);
  await destroyNucleumDatafn();
  await clientStorage.remove(ClientStorageKey.REGION);
  account.set(initialAccount);
  toasts.reset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("uploadFileV2 fenced by the FileFn client lifetime", () => {
  it("saves no record when the stored region changes during processing while the session carries none", async () => {
    await clientStorage.set(ClientStorageKey.REGION, "useast");
    account.set(cloudAccount("user-a"));
    const { upload, finishProcessing } =
      await startUploadWithPendingProcessing();

    await clientStorage.set(ClientStorageKey.REGION, "euwest");
    finishProcessing();

    await expect(upload).rejects.toMatchObject({ name: "AbortError" });
    expect(sdk.uploads).toHaveLength(1);
    expect(sdk.artifacts).toEqual([]);
    expect(sdk.baseUrls[0]).toBe(
      "https://account-useast-dev.nucleum.app/files"
    );
    expect(recordInserts.inserts).toBe(0);
    expect(await savedFiles()).toHaveLength(0);
    expect(get(toasts)).toHaveLength(1);
  });

  it("saves no record when the account signs out and back in during processing", async () => {
    account.set(cloudAccount("user-a", "useast"));
    const { upload, finishProcessing } =
      await startUploadWithPendingProcessing();

    account.set(signedOut);
    account.set(cloudAccount("user-a", "useast"));
    finishProcessing();

    await expect(upload).rejects.toMatchObject({ name: "AbortError" });
    expect(sdk.artifacts).toEqual([]);
    expect(recordInserts.inserts).toBe(0);
    expect(await savedFiles()).toHaveLength(0);
    expect(get(toasts)).toHaveLength(1);
  });

  it("saves no record when another account signs in during processing", async () => {
    account.set(cloudAccount("user-a", "useast"));
    const { upload, finishProcessing } =
      await startUploadWithPendingProcessing();

    account.set(cloudAccount("user-b", "useast"));
    finishProcessing();

    await expect(upload).rejects.toMatchObject({ name: "AbortError" });
    expect(recordInserts.inserts).toBe(0);
    expect(await savedFiles()).toHaveLength(0);
  });

  it.each([
    {
      change: "fills in its effective region",
      before: cloudAccount("user-a"),
      after: cloudAccount("user-a", "useast")
    },
    {
      change: "recases its region",
      before: cloudAccount("user-a", "useast"),
      after: cloudAccount("user-a", " UsEast ")
    }
  ])(
    "saves the record when the session $change during processing",
    async ({ before, after }) => {
      await clientStorage.set(ClientStorageKey.REGION, "useast");
      account.set(before);
      const { upload, finishProcessing } =
        await startUploadWithPendingProcessing();

      account.set(after);
      finishProcessing();

      const [record] = await upload;
      expect(sdk.baseUrls).toEqual([
        "https://account-useast-dev.nucleum.app/files"
      ]);
      expect(record).toMatchObject({ fileId: sdk.uploads[0].fileId });
      expect(recordInserts.inserts).toBe(1);
      expect(await savedFiles()).toEqual([
        expect.objectContaining({
          id: record.id,
          fileId: sdk.uploads[0].fileId
        })
      ]);
      expect(sdk.deleted).toEqual([]);
      expect(get(toasts)).toHaveLength(0);
    }
  );
});

describe("uploadFileV2 owned by the account that started it", () => {
  it.each([
    {
      change: "another account signs in",
      next: [cloudAccount("user-b", "useast")]
    },
    {
      change: "the account signs out and back in",
      next: [signedOut, cloudAccount("user-a", "useast")]
    }
  ])(
    "uploads nothing when $change while the client is created",
    async ({ next }) => {
      account.set(cloudAccount("user-a", "useast"));
      const upload = startUploadDuringAcquisition();
      for (const value of next) account.set(value);

      await expect(upload).rejects.toMatchObject({ name: "AbortError" });
      expect(sdk.uploads).toEqual([]);
      expect(recordInserts.inserts).toBe(0);
      expect(await savedFiles()).toHaveLength(0);
    }
  );

  it("saves no record and deletes the file when the stored region cannot be read before the save", async () => {
    await clientStorage.set(ClientStorageKey.REGION, "useast");
    account.set(cloudAccount("user-a"));
    const { upload, finishProcessing } =
      await startUploadWithPendingProcessing();

    vi.spyOn(clientStorage, "get").mockRejectedValue(
      new Error("storage unavailable")
    );
    finishProcessing();

    await expect(upload).rejects.toThrow("storage unavailable");
    expect(recordInserts.inserts).toBe(0);
    expect(await savedFiles()).toHaveLength(0);
    expect(sdk.deleted).toEqual([sdk.uploads[0].fileId]);
  });

  it("saves no record when DataFn moves to another account's data before the save", async () => {
    account.set(cloudAccount("user-a", "useast"));
    const { upload, finishProcessing } =
      await startUploadWithPendingProcessing();

    await initializeNucleumDatafn({
      product: Product.MEMOTRON,
      account: { dataMode: UserDataMode.LOCAL, userId: "user-b" },
      dapId: "fixture",
      env: `test-${crypto.randomUUID()}`
    });
    finishProcessing();

    await expect(upload).rejects.toMatchObject({ name: "AbortError" });
    expect(recordInserts.inserts).toBe(0);
    expect(await savedFiles()).toHaveLength(0);
    expect(sdk.deleted).toEqual([sdk.uploads[0].fileId]);
  });

  it("deletes the file through the owner's next client after a sign-out, never through another account", async () => {
    installFakeOpfs();
    account.set(cloudAccount("user-a", "useast"));
    const { upload, finishProcessing } =
      await startUploadWithPendingProcessing();

    account.set(signedOut);
    finishProcessing();
    await expect(upload).rejects.toMatchObject({ name: "AbortError" });
    const ownerFileId = sdk.uploads[0].fileId;
    expect(sdk.deleted).toEqual([]);

    account.set(cloudAccount("user-b", "useast"));
    await fileUpload
      .uploadFileV2(
        "image/jpeg",
        "other.jpg",
        new Blob(["other"], { type: "image/jpeg" }),
        { isErrorToastSuppressed: true }
      )
      .catch(() => undefined);
    expect(sdk.uploads).toHaveLength(2);
    expect(sdk.deleted).not.toContain(ownerFileId);

    account.set(cloudAccount("user-a", "useast"));
    await vi.waitFor(() => expect(sdk.deleted).toContain(ownerFileId));
    expect(recordInserts.inserts).toBe(0);
  });

  it("sends the original HEIC bytes through the real SDK in every mode", async () => {
    sdk.isRealSdk = true;
    const requests: { url: string; body: unknown }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(input), body: init?.body });
        return new Response(JSON.stringify({ error: "rejected" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      })
    );
    account.set(cloudAccount("user-a", "useast"));
    for (const mode of ["local", "both", "remote"]) {
      vi.stubEnv("VITE_FILE_PROCESSING_MODE", mode);
      requests.length = 0;
      const error = await fileUpload
        .uploadFileV2(
          "image/heic",
          "IMG_1.heic",
          new Blob(["heic bytes"], { type: "image/heic" }),
          { isErrorToastSuppressed: true }
        )
        .catch((reason: unknown) => reason);

      expect(error).not.toMatchObject({
        code: "FILEFN_HEIC_CONVERSION_FAILED"
      });
      expect(requests.length).toBeGreaterThan(0);
      expect(String(requests[0].body)).toContain("IMG_1.heic");
      expect(String(requests[0].body)).toContain("image/heic");
    }
    expect(sdk.configs[0]).toMatchObject({
      preprocessing: { heic: { enabled: false } }
    });
  });
});
