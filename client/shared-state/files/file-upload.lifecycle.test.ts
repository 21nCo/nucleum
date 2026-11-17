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
  deleted: [] as string[]
}));
vi.mock("@filefn/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@filefn/client")>();
  return {
    ...actual,
    createFileFnClient: (config: {
      baseUrl: string;
    }): Partial<FileFnClient> => {
      sdk.baseUrls.push(config.baseUrl);
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
    account: { dataMode: UserDataMode.LOCAL, userId: "file-upload-lifecycle" },
    dapId: "fixture",
    env: `test-${crypto.randomUUID()}`
  });
  recordInserts.inserts = 0;
  sdk.baseUrls = [];
  sdk.uploads = [];
  sdk.artifacts = [];
  sdk.deleted = [];
});

afterEach(async () => {
  account.set(signedOut);
  await destroyNucleumDatafn();
  await clientStorage.remove(ClientStorageKey.REGION);
  account.set(initialAccount);
  toasts.reset();
  vi.unstubAllEnvs();
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
