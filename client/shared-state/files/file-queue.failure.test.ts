import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FileFnHttpError,
  type FileFnClient,
  type UploadInput,
  type UploadResult
} from "@filefn/client";
import {
  UserDataMode,
  UserSessionType,
  type UserAccount
} from "@nucleum/client/runtime/account/account.type";
import { createFakeOpfs } from "../../../tests/fixtures/opfs";

type FileQueue = typeof import("./file-queue");

const QUEUE = "nucleum-file-queue-account-user-a";
const FILE_ID = "file_rejectedPhoto01";
const ENTRY = `queued_${FILE_ID}`;
const REPLAY_RETRY_WINDOW_MS = 20 * 60_000;

let opfs: ReturnType<typeof createFakeOpfs>;

async function openTab(): Promise<FileQueue> {
  vi.resetModules();
  return import("./file-queue");
}

function installDevice() {
  opfs = createFakeOpfs();
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    onLine: true,
    storage: { getDirectory: opfs.getDirectory }
  });
}

function rejection(status: number, code = "FILEFN_TEST_REJECTION") {
  return new FileFnHttpError(code, status, { error: { code, message: code } });
}

/**
 * A FileFn client whose uploads end in turn as `outcomes` says (an error
 * rejects, anything else completes), the last outcome repeating.
 */
function createClient(outcomes: (Error | "ok")[]) {
  const uploads: UploadInput[] = [];
  const client = {
    uploadFile: (input: UploadInput) => {
      uploads.push(input);
      const outcome = outcomes[Math.min(uploads.length, outcomes.length) - 1];
      return {
        uploadSessionId: `ses_${uploads.length}`,
        fileId: input.fileId!,
        onProgress: () => undefined,
        abort: () => undefined,
        done: (): Promise<UploadResult> =>
          outcome instanceof Error
            ? Promise.reject(outcome)
            : Promise.resolve({ fileId: input.fileId!, versionId: "ver_1" })
      };
    },
    uploadArtifact: async () => ({}),
    getFile: async (fileId: string) => ({ fileId })
  } as unknown as FileFnClient;
  return { client, uploads };
}

async function enqueuePhoto(queue: FileQueue) {
  await queue.enqueueFile(QUEUE, {
    fileId: FILE_ID,
    fileName: "photo.png",
    contentType: "image/png",
    blob: new Blob(["photo bytes"], { type: "image/png" })
  });
  await queue.markQueuedFileCommitted(QUEUE, FILE_ID);
}

/** An account's records that reference the queued photo. */
function referencingRecords() {
  return {
    owner: { userId: "user-a", baseUrl: "https://a.example.test/files" },
    isCurrent: () => true,
    sync: async () => true,
    isReferenced: async (fileId: string) => fileId === FILE_ID,
    discard: async () => undefined
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("File", NodeFile);
  vi.stubGlobal("BroadcastChannel", undefined);
  URL.createObjectURL ??= () => "";
  URL.revokeObjectURL ??= () => undefined;
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:queued");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.doUnmock("@nucleum/shared-state/files/filefn-client");
  vi.doUnmock("@filefn/client");
});

describe("a queued upload FileFn rejects for good", () => {
  it.each([
    ["an account's queue", referencingRecords],
    ["a queue without records", () => undefined]
  ])(
    "in %s is marked failed, keeps its bytes and is not retried automatically",
    async (_, records) => {
      installDevice();
      const tab = await openTab();
      await enqueuePhoto(tab);
      const changes: string[] = [];
      tab.onQueuedFileFailureChange((fileId) => changes.push(fileId));
      const fileFn = createClient([rejection(400)]);
      const replay = () =>
        tab.replayFileQueue(
          QUEUE,
          fileFn.client,
          new AbortController().signal,
          undefined,
          records()
        );

      await replay();

      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID)).toBe(true);
      expect(changes).toEqual([FILE_ID]);
      expect(opfs.list(QUEUE)).toEqual([ENTRY]);
      expect(opfs.list(QUEUE, ENTRY)).toContain("data.bin");
      expect(await tab.resolveQueuedFileUrl([QUEUE], FILE_ID, "full")).toMatch(
        /^blob:/
      );

      await vi.advanceTimersByTimeAsync(REPLAY_RETRY_WINDOW_MS);
      await replay();
      expect(fileFn.uploads).toHaveLength(1);
      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID)).toBe(true);
    }
  );

  it.each([400, 403, 404, 409, 413, 422])(
    "counts FileFn status %i as a permanent rejection",
    async (status) => {
      installDevice();
      const tab = await openTab();
      await enqueuePhoto(tab);
      const fileFn = createClient([rejection(status)]);

      await tab.replayFileQueue(
        QUEUE,
        fileFn.client,
        new AbortController().signal
      );

      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID)).toBe(true);
    }
  );

  it.each([
    ["an authorization failure", rejection(401)],
    ["a timeout", rejection(408)],
    ["a rate limit", rejection(429)],
    ["an expired session", rejection(410, "FILEFN_UPLOAD_EXPIRED")],
    ["a server error", rejection(503)],
    ["a network failure", new TypeError("Failed to fetch")],
    [
      "a storage URL that refused a part (no FileFn error code)",
      new FileFnHttpError("Upload failed: HTTP 403", 403)
    ]
  ])(
    "retries %s and uploads the file once FileFn takes it",
    async (_, error) => {
      installDevice();
      const tab = await openTab();
      await enqueuePhoto(tab);
      const fileFn = createClient([error, "ok"]);

      await tab.replayFileQueue(
        QUEUE,
        fileFn.client,
        new AbortController().signal,
        undefined,
        referencingRecords()
      );
      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID)).toBe(false);
      expect(opfs.list(QUEUE)).toEqual([ENTRY]);

      await vi.advanceTimersByTimeAsync(5_000);
      await vi.waitFor(() => expect(opfs.list(QUEUE)).toEqual([]));
      expect(fileFn.uploads).toHaveLength(2);
    }
  );

  it("uploads a retried file once and clears its failed state when FileFn takes it", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const changes: string[] = [];
    tab.onQueuedFileFailureChange((fileId) => changes.push(fileId));
    const fileFn = createClient([rejection(422), "ok"]);
    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      referencingRecords()
    );

    expect(await tab.retryFailedQueuedFile([QUEUE], FILE_ID)).toBe(true);

    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID)).toBe(false);
    await vi.waitFor(() => expect(opfs.list(QUEUE)).toEqual([]));
    expect(fileFn.uploads).toHaveLength(2);
    // Marked failed, retried, then uploaded and removed from the queue.
    expect(changes).toEqual([FILE_ID, FILE_ID, FILE_ID]);
    expect(await tab.retryFailedQueuedFile([QUEUE], FILE_ID)).toBe(false);
  });

  it("marks a retried file failed again only when FileFn rejects it again", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient([
      rejection(400),
      rejection(503),
      rejection(400)
    ]);
    const signal = new AbortController().signal;
    await tab.replayFileQueue(QUEUE, fileFn.client, signal);

    await tab.retryFailedQueuedFile([QUEUE], FILE_ID);
    await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID)).toBe(false);

    await vi.advanceTimersByTimeAsync(5_000);
    await vi.waitFor(async () =>
      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID)).toBe(true)
    );
    expect(fileFn.uploads).toHaveLength(3);
    expect(opfs.list(QUEUE)).toEqual([ENTRY]);
  });

  it("leaves a retried file for the next replay when no replay of its queue is current", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const page = new AbortController();
    const rejected = createClient([rejection(400)]);
    await tab.replayFileQueue(QUEUE, rejected.client, page.signal);
    page.abort();

    expect(await tab.retryFailedQueuedFile([QUEUE], FILE_ID)).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(rejected.uploads).toHaveLength(1);

    const next = createClient(["ok"]);
    await tab.replayFileQueue(QUEUE, next.client, new AbortController().signal);
    expect(next.uploads).toHaveLength(1);
    expect(opfs.list(QUEUE)).toEqual([]);
  });
});

describe("the failed state a file display reads", () => {
  async function openFileUrl(owner: { userId: string; isLive: boolean }) {
    vi.resetModules();
    vi.doMock("@nucleum/shared-state/files/filefn-client", () => ({
      captureFileFnOwner: () => ({ userId: owner.userId, epoch: 1 }),
      isFileFnOwnerLive: () => owner.isLive,
      resolveFileFnAccountScope: () =>
        owner.isLive ? { userId: owner.userId, region: null } : null
    }));
    const queue = await import("./file-queue");
    const fileUrl = await import("./file-url");
    const { default: account } =
      await import("@nucleum/client/runtime/account/account.store");
    return { queue, fileUrl, account };
  }

  /** Watches the photo's failed state once FileFn rejected it for good. */
  async function watchRejectedPhoto(owner: {
    userId: string;
    isLive: boolean;
  }) {
    const opened = await openFileUrl(owner);
    await enqueuePhoto(opened.queue);
    await opened.queue.replayFileQueue(
      QUEUE,
      createClient([rejection(400)]).client,
      new AbortController().signal
    );
    const seen: boolean[] = [];
    const stop = opened.fileUrl.watchFileUploadFailure(FILE_ID, (isFailed) =>
      seen.push(isFailed)
    );
    await vi.waitFor(() => expect(seen).toEqual([true]));
    return { ...opened, seen, stop };
  }

  function photoCopy() {
    return {
      fileId: FILE_ID,
      fileName: "photo.png",
      contentType: "image/png",
      policy: "nucleus-durable-default",
      createdAt: new Date().toISOString(),
      retryCount: 0,
      data: new TextEncoder().encode("restored photo bytes"),
      isCommitted: true,
      started: []
    };
  }

  it("stops showing a failed upload once its file leaves the queue", async () => {
    installDevice();
    const { queue, seen, stop } = await watchRejectedPhoto({
      userId: "user-a",
      isLive: true
    });

    expect(await queue.dequeueFile(QUEUE, FILE_ID)).toBe(true);

    await vi.waitFor(() => expect(seen).toEqual([true, false]));
    stop();
  });

  it("shows a file a restore wrote again as not failed", async () => {
    installDevice();
    const { queue, seen, stop } = await watchRejectedPhoto({
      userId: "user-a",
      isLive: true
    });
    await queue.dequeueFile(QUEUE, FILE_ID);
    await vi.waitFor(() => expect(seen).toEqual([true, false]));
    const changes: string[] = [];
    queue.onQueuedFileFailureChange((fileId) => changes.push(fileId));

    await queue.stageRestoredFiles(QUEUE, [photoCopy()], {
      isOwnAccount: true
    });

    expect(changes).toContain(FILE_ID);
    expect(opfs.list(QUEUE)).toEqual([ENTRY]);
    expect(await queue.isQueuedFileFailed([QUEUE], FILE_ID)).toBe(false);
    await vi.waitFor(() => expect(seen.at(-1)).toBe(false));
    stop();
  });

  it("stops showing a failed upload once another account is signed in", async () => {
    installDevice();
    const owner = { userId: "user-a", isLive: true };
    const { account, seen, stop } = await watchRejectedPhoto(owner);

    owner.userId = "user-b";
    account.set({ id: "user-b" } as never);

    await vi.waitFor(() => expect(seen).toEqual([true, false]));
    stop();
  });

  it("clears a failed state a retry finds already gone", async () => {
    installDevice();
    const { fileUrl, seen, stop } = await watchRejectedPhoto({
      userId: "user-a",
      isLive: true
    });
    const root = await opfs.getDirectory();
    const dir = await root.getDirectoryHandle(QUEUE);
    await dir.removeEntry(ENTRY, { recursive: true });

    expect(await fileUrl.retryFileUpload(FILE_ID)).toBe(false);

    await vi.waitFor(() => expect(seen).toEqual([true, false]));
    stop();
  });

  it("shows a failed upload on the device that holds it until a retry uploads it", async () => {
    installDevice();
    const owner = { userId: "user-a", isLive: true };
    const { queue, fileUrl } = await openFileUrl(owner);
    await enqueuePhoto(queue);
    const seen: boolean[] = [];
    const stop = fileUrl.watchFileUploadFailure(FILE_ID, (isFailed) =>
      seen.push(isFailed)
    );
    await vi.waitFor(() => expect(seen).toEqual([false]));
    const fileFn = createClient([rejection(400), "ok"]);

    await queue.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      referencingRecords()
    );
    await vi.waitFor(() => expect(seen).toEqual([false, true]));

    expect(await fileUrl.retryFileUpload(FILE_ID)).toBe(true);
    await vi.waitFor(() => expect(opfs.list(QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(seen.length).toBeGreaterThan(2));
    expect(seen.slice(0, 2)).toEqual([false, true]);
    expect(seen.slice(2)).not.toContain(true);
    stop();
  });

  it("reports no failed upload for another account or once the reading account signed out", async () => {
    installDevice();
    const owner = { userId: "user-a", isLive: true };
    const { queue, fileUrl } = await openFileUrl(owner);
    await enqueuePhoto(queue);
    await queue.replayFileQueue(
      QUEUE,
      createClient([rejection(400)]).client,
      new AbortController().signal
    );
    const read = () =>
      new Promise<boolean>((resolve) => {
        const stop = fileUrl.watchFileUploadFailure(FILE_ID, (isFailed) => {
          stop();
          resolve(isFailed);
        });
      });

    expect(await read()).toBe(true);
    owner.isLive = false;
    expect(await read()).toBe(false);
    expect(await fileUrl.retryFileUpload(FILE_ID)).toBe(false);
    owner.isLive = true;
    owner.userId = "user-b";
    expect(await read()).toBe(false);
    expect(await queue.isQueuedFileFailed([QUEUE], FILE_ID)).toBe(true);
  });
});

describe("the failed state a file display reads, with the account's FileFn client", () => {
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

  /**
   * Opens a page whose real FileFn client module binds the account's client
   * at session restore before any live session confirmed it, recording each
   * client it creates and each client whose replay starts.
   */
  async function openRestoredPage() {
    vi.resetModules();
    const sdk = { created: [] as string[], replayed: [] as string[] };
    vi.doMock("@filefn/client", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@filefn/client")>();
      return {
        ...actual,
        createFileFnClient: (config: { baseUrl: string }) => {
          sdk.created.push(config.baseUrl);
          return {
            ...createClient(["ok"]).client,
            getPendingLocalDescriptor: async () => {
              sdk.replayed.push(config.baseUrl);
              return null;
            }
          };
        }
      };
    });
    const queue = await import("./file-queue");
    const fileUrl = await import("./file-url");
    const files = await import("./filefn-client");
    const { default: account } =
      await import("@nucleum/client/runtime/account/account.store");
    account.set(cloudAccount("user-a"));
    files.startAccountUploadReplay();
    await vi.waitFor(() => expect(sdk.created).toHaveLength(1));
    return { queue, fileUrl, account, sdk };
  }

  it("never authorizes the account's replay by reading it, while Retry does", async () => {
    installDevice();
    const { queue, fileUrl, account, sdk } = await openRestoredPage();
    await enqueuePhoto(queue);
    await queue.replayFileQueue(
      QUEUE,
      createClient([rejection(400), "ok"]).client,
      new AbortController().signal
    );
    const seen: boolean[] = [];
    const stop = fileUrl.watchFileUploadFailure(FILE_ID, (isFailed) =>
      seen.push(isFailed)
    );
    await vi.waitFor(() => expect(seen).toEqual([true]));
    account.set(cloudAccount("user-b"));
    await vi.waitFor(() => expect(seen).toEqual([true, false]));
    account.set(cloudAccount("user-a"));
    await vi.waitFor(() => expect(seen).toEqual([true, false, true]));
    await vi.dynamicImportSettled();
    await vi.waitFor(() => expect(sdk.created).toHaveLength(3));

    expect(sdk.replayed).toEqual([]);

    expect(await fileUrl.retryFileUpload(FILE_ID)).toBe(true);
    await vi.waitFor(() => expect(sdk.replayed).toHaveLength(1));
    await vi.waitFor(() => expect(opfs.list(QUEUE)).toEqual([]));
    await vi.waitFor(() => expect(seen.at(-1)).toBe(false));
    stop();
  });
});
