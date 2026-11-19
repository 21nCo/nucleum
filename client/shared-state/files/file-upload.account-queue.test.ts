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
  hold: null as Promise<void> | null,
  /** Sends each upload's first request and each delete, when set. */
  isSending: false
}));
vi.mock("@filefn/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@filefn/client")>();
  return {
    ...actual,
    createFileFnClient: (
      config: Parameters<typeof actual.createFileFnClient>[0]
    ): Partial<FileFnClient> => {
      sdk.baseUrls.push(config.baseUrl);
      const send = async (path: string, init: RequestInit) => {
        if (sdk.isSending)
          await config.fetch?.(`${config.baseUrl}${path}`, init);
      };
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
              await send("/upload/init", {
                method: "POST",
                body: JSON.stringify({
                  fileId: input.fileId,
                  idempotencyKey: input.idempotencyKey
                })
              });
              sdk.uploads.push(input);
              return { fileId: input.fileId!, versionId: "ver_1" };
            }
          } as ReturnType<FileFnClient["uploadFile"]>;
        },
        deleteFile: async (fileId) => {
          sdk.deletes.push(fileId);
          await send(`/${fileId}`, { method: "DELETE" });
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
 * The account's DataFn authority. The device's DataFn runs local-only, so a
 * fake of its sync stands in: DataFn syncs with `url`, and each pull runs
 * `onPull` (which applies what the pull brings) and then applies, or fails
 * when `isFailing`.
 */
const authority = vi.hoisted(() => ({
  url: "https://account-useast-dev.nucleum.app/datafn",
  pulls: 0,
  isFailing: false,
  onPull: null as null | ((pull: number) => Promise<void>),
  /** Runs after each file query, before its result returns, when set. */
  onFileQuery: null as null | ((input: unknown) => Promise<void>)
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
  const pullNow = async () => {
    const pull = ++authority.pulls;
    emit("sync_started", { phase: "pull" });
    await authority.onPull?.(pull);
    if (authority.isFailing) emit("sync_failed", { phase: "pull" });
    else emit("sync_applied", { phase: "pull", cursors: { file: `${pull}` } });
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
      if (key === "file" && authority.onFileQuery) {
        const { onFileQuery } = authority;
        const table = target.file;
        return new Proxy(table, {
          get: (_, name) =>
            name === "query"
              ? async (input: Parameters<typeof table.query>[0]) => {
                  const result = await table.query(input);
                  await onFileQuery(input);
                  return result;
                }
              : Reflect.get(table, name)
        });
      }
      return Reflect.get(target, key);
    }
  });
  const datafnRuntime = derived(actual.datafnRuntime, (runtime) =>
    runtime
      ? { ...runtime, mode: "sync" as const, remoteUrl: authority.url }
      : null
  );
  return { ...actual, datafn, datafnRuntime };
});

const { fileUpload } = await import("./file-upload");
const { resolveFileUrl } = await import("./file-url");
const {
  captureFileQueueUploader,
  recordFileFnPendingDelete,
  resolveFileFnBaseUrl
} = await import("./filefn-client");
const { replayFileQueue } = await import("./file-queue");
const { OPFSStore } = await import("@filefn/client");

const ACCOUNT_QUEUE = "nucleum-file-queue-account-user-a";

/** One device file system: the queue keeps its handles for the page's life. */
const opfs = createFakeOpfs();
let isOnline = true;

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

async function deleteRecord(id: string) {
  const result = (await datafn.file.mutate({
    operation: "delete",
    id
  } as never)) as { ok?: boolean };
  expect(result.ok).not.toBe(false);
}

function goOnline() {
  isOnline = true;
  window.dispatchEvent(new Event("online"));
}

/**
 * Records each queue replay pass, which runs under the queue's Web Lock (not
 * the lock a client's own offline replay holds until it is torn down).
 */
function trackReplayPasses() {
  const locks = createFakeLocks();
  const passes: Promise<unknown>[] = [];
  Object.defineProperty(globalThis.navigator, "locks", {
    configurable: true,
    value: {
      ...locks,
      request: (...args: Parameters<LockManager["request"]>) => {
        const pass = locks.request(...args);
        if (args[0].startsWith("nucleum-file-queue-replay")) passes.push(pass);
        return pass;
      }
    }
  });
  return passes;
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
  sdk.isSending = false;
  authority.url = "https://account-useast-dev.nucleum.app/datafn";
  authority.pulls = 0;
  authority.isFailing = false;
  authority.onPull = null;
  authority.onFileQuery = null;
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

describe("files a signed-in cloud account captures offline", () => {
  it("keeps an offline cloud capture in the account's queue, renders it from the device and uploads it on reconnect", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;

    const record = await capturePhoto();

    const saved = await savedRecord(record.id);
    expect(saved?.fileId).toBe(record.fileId);
    expect(saved?.data ?? null).toBeNull();
    expect(saved?.thumbnailData ?? null).toBeNull();
    expect(opfs.list(ACCOUNT_QUEUE)).toEqual([`queued_${record.fileId}`]);
    expect(await resolveFileUrl(record.fileId, "full")).toBe("blob:queued");
    expect(sdk.uploads).toEqual([]);

    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId, fileName: "photo.png" })
    ]);
    expect(sdk.artifacts).toEqual([
      expect.objectContaining({
        fileId: record.fileId,
        kind: "thumbnail-medium"
      })
    ]);
    expect(sdk.deletes).toEqual([]);
    expect(sdk.baseUrls).toContain(
      "https://account-useast-dev.nucleum.app/files"
    );
  });

  it("never uploads an offline capture whose record was deleted before reconnect, and removes it from the device", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const kept = await capturePhoto();
    const deleted = await capturePhoto();

    await deleteRecord(deleted.id);
    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.started).toEqual([
      expect.objectContaining({ fileId: kept.fileId })
    ]);
    expect(await resolveFileUrl(deleted.fileId, "full")).not.toBe(
      "blob:queued"
    );
  });

  it("uploads a trashed capture, whose record still references it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const trashed = await capturePhoto();
    await datafn.file.mutate({ operation: "trash", id: trashed.id } as never);

    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: trashed.fileId })
    ]);
    expect(sdk.deletes).toEqual([]);
  });

  it("deletes the uploaded file when its record is deleted during the upload", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const upload = deferred<void>();
    sdk.hold = upload.promise;

    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    await deleteRecord(record.id);
    upload.resolve();

    await vi.waitFor(() => expect(sdk.deletes).toEqual([record.fileId]));
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
  });

  it("keeps the queue while DataFn is outside the account's namespace and uploads once it opens the account's records", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    await openData();
    const passes = trackReplayPasses();

    goOnline();
    await vi.waitFor(() => expect(passes).toHaveLength(1));
    await passes[0];

    expect(sdk.started).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toEqual([`queued_${record.fileId}`]);

    await openData("user-a");

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it("keeps the bytes on the record when the account signs in offline while DataFn still holds the guest's data", async () => {
    await bootData(localAccount);
    account.set(cloudAccount("user-a"));
    isOnline = false;

    const record = await capturePhoto();

    const saved = await savedRecord(record.id);
    expect(saved?.fileId).toBeUndefined();
    expect(new TextDecoder().decode(saved?.data as Uint8Array)).toBe(
      "photo bytes"
    );
    expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]);
  });

  it("keeps a local-only user's capture on its record", async () => {
    await bootData(localAccount);

    const record = await capturePhoto();

    const saved = await savedRecord(record.id);
    expect(saved?.fileId).toBeUndefined();
    expect(new TextDecoder().decode(saved?.data as Uint8Array)).toBe(
      "photo bytes"
    );
    expect(opfs.list("nucleum-file-queue-local")).toEqual([]);
    expect(sdk.baseUrls).toEqual([]);
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
        await replayFileQueue(ACCOUNT_QUEUE, uploader.client, uploader.signal);
        await openData("user-b");
      }
    );

    await expect(capturePhoto()).rejects.toThrow();

    expect(sdk.started).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]);
  });

  it("fails an offline capture and drops its staged file when the account signs out before the record saves", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const stage = OPFSStore.prototype.stagePendingUpload;
    vi.spyOn(OPFSStore.prototype, "stagePendingUpload").mockImplementation(
      async function (this: InstanceType<typeof OPFSStore>, pending) {
        await stage.call(this, pending);
        account.set(localAccount);
      }
    );

    await expect(capturePhoto()).rejects.toThrow();

    expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]);
  });

  it("fails an offline capture that resumes after replay may have dropped its staged file, saving no record", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const stage = OPFSStore.prototype.stagePendingUpload;
    vi.spyOn(OPFSStore.prototype, "stagePendingUpload").mockImplementation(
      async function (this: InstanceType<typeof OPFSStore>, pending) {
        await stage.call(this, pending);
        const resumedAt = Date.now() + 25 * 60 * 60_000;
        vi.spyOn(Date, "now").mockReturnValue(resumedAt);
      }
    );

    await expect(capturePhoto()).rejects.toThrow();

    const saved = (await datafn.file.query({})) as { data?: unknown[] };
    expect(saved.data ?? []).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]);
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
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
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

  it("never uploads an offline capture whose record the pull on reconnect shows was deleted on another device", async () => {
    trackReplayPasses();
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    authority.onPull = async () => {
      if (await savedRecord(record.id)) await deleteRecord(record.id);
    };

    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.started).toEqual([]);
    expect(sdk.deletes).toEqual([]);
  });

  it("deletes the uploaded file when the pull after its upload shows its record was deleted on another device", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    authority.onPull = async () => {
      if (sdk.uploads.length) await deleteRecord(record.id);
    };

    goOnline();

    await vi.waitFor(() => expect(sdk.deletes).toEqual([record.fileId]));
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toHaveLength(1);
  });

  it("keeps an offline capture and uploads nothing while DataFn cannot pull the account's records", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    authority.isFailing = true;
    const passes = trackReplayPasses();

    goOnline();
    await vi.waitFor(() => expect(passes).toHaveLength(1));
    await passes[0];

    expect(authority.pulls).toBe(1);
    expect(sdk.started).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toEqual([`queued_${record.fileId}`]);

    authority.isFailing = false;
    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it("keeps an offline capture while DataFn syncs with another authority than the FileFn client's, and uploads it once DataFn rebinds", async () => {
    authority.url = "https://account-euwest-dev.nucleum.app/datafn";
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const passes = trackReplayPasses();

    goOnline();
    await vi.waitFor(() => expect(passes).toHaveLength(1));
    await passes[0];

    expect(sdk.started).toEqual([]);
    expect(opfs.list(ACCOUNT_QUEUE)).toEqual([`queued_${record.fileId}`]);

    authority.url = "https://account-useast-dev.nucleum.app/datafn";
    await openData("user-a");

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it("uploads an offline capture that never started at the account's new authority once its region changes", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const passes = trackReplayPasses();
    const moved = cloudAccount("user-a");
    account.set({
      ...moved,
      userInfo: { ...moved.userInfo!, region: "euwest" }
    });
    authority.url = "https://account-euwest-dev.nucleum.app/datafn";
    await openData("user-a");

    goOnline();
    await vi.waitFor(() => expect(passes.length).toBeGreaterThan(0));
    await Promise.all(passes);

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deletes).toEqual([]);
  });

  it("uploads an offline capture whose record saves while a replay checks it, instead of removing it", async () => {
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const resume = deferred<void>();
    const stage = OPFSStore.prototype.stagePendingUpload;
    vi.spyOn(OPFSStore.prototype, "stagePendingUpload").mockImplementation(
      async function (this: InstanceType<typeof OPFSStore>, pending) {
        await stage.call(this, pending);
        await resume.promise;
      }
    );
    const capture = capturePhoto();
    authority.onFileQuery = async (input) => {
      if (!(input as { filters?: { fileId?: string } }).filters?.fileId) return;
      resume.resolve();
      await capture;
    };
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toHaveLength(1));

    goOnline();
    const record = await capture;

    await vi.waitFor(() =>
      expect(sdk.uploads).toEqual([
        expect.objectContaining({ fileId: record.fileId })
      ])
    );
    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect((await savedRecord(record.id))?.fileId).toBe(record.fileId);
    expect(sdk.deletes).toEqual([]);
  });

  it("uploads at the account's new authority an offline capture whose client was torn down before sending it", async () => {
    trackReplayPasses();
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const hold = deferred<void>();
    sdk.hold = hold.promise;
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));

    const moved = cloudAccount("user-a");
    account.set({
      ...moved,
      userInfo: { ...moved.userInfo!, region: "euwest" }
    });
    authority.url = "https://account-euwest-dev.nucleum.app/datafn";
    await openData("user-a");
    hold.resolve();
    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sdk.started).toEqual([
      expect.objectContaining({ fileId: record.fileId }),
      expect.objectContaining({ fileId: record.fileId })
    ]);
    expect(sdk.deletes).toEqual([]);
  });

  it("uploads at the account's new authority a capture whose torn-down client sent only a pending delete while the upload waited to send", async () => {
    trackReplayPasses();
    const atA = resolveFileFnBaseUrl("useast");
    const atB = resolveFileFnBaseUrl("euwest");
    const sent: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.startsWith(atA) || url.startsWith(atB)) sent.push(url);
      return new Response("{}");
    });
    sdk.isSending = true;
    await bootData(cloudAccount("user-a"));
    isOnline = false;
    const record = await capturePhoto();
    const hold = deferred<void>();
    sdk.hold = hold.promise;
    goOnline();
    await vi.waitFor(() => expect(sdk.started).toHaveLength(1));
    await recordFileFnPendingDelete(
      { userId: "user-a", baseUrl: atA },
      "file_otherPhoto01"
    );
    goOnline();
    await vi.waitFor(() => expect(sent).toEqual([`${atA}/file_otherPhoto01`]));

    const moved = cloudAccount("user-a");
    account.set({
      ...moved,
      userInfo: { ...moved.userInfo!, region: "euwest" }
    });
    authority.url = "https://account-euwest-dev.nucleum.app/datafn";
    await openData("user-a");
    hold.resolve();
    goOnline();

    await vi.waitFor(() => expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]));
    expect(sent.filter((url) => url.endsWith("/upload/init"))).toEqual([
      `${atB}/upload/init`
    ]);
    expect(sdk.uploads).toEqual([
      expect.objectContaining({ fileId: record.fileId })
    ]);
  });

  it.each([
    ["while its thumbnail is made", "thumbnail"],
    ["while its staging fails", "staging"]
  ])(
    "fails an offline capture whose DataFn moved to another account %s, saving no record there",
    async (_when, step) => {
      await bootData(cloudAccount("user-a"));
      isOnline = false;
      const moveData = () => openData("user-b");
      if (step === "thumbnail") {
        codec.compressImageToTargetSize.mockImplementationOnce(async () => {
          await moveData();
          return new Blob(["thumb bytes"], { type: "image/jpeg" });
        });
      } else {
        vi.spyOn(OPFSStore.prototype, "stagePendingUpload").mockImplementation(
          async () => {
            await moveData();
            throw new Error("The device storage is full");
          }
        );
      }

      await expect(
        fileUpload.uploadFileV2(
          "image/png",
          "photo.png",
          new Blob(["photo bytes"], { type: "image/png" }),
          { isGenerateThumbnail: true }
        )
      ).rejects.toThrow();

      const saved = (await datafn.file.query({})) as { data?: unknown[] };
      expect(datafn.currentNamespace()).toBe("user:user-b");
      expect(saved.data ?? []).toEqual([]);
      expect(opfs.list(ACCOUNT_QUEUE)).toEqual([]);
    }
  );
});
