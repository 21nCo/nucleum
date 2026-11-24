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

function rejection(
  status: number,
  code = "FILEFN_POLICY_CONTENT_TYPE_NOT_ALLOWED",
  details?: Record<string, unknown>
) {
  return new FileFnHttpError(code, status, {
    error: { code, message: code, details }
  });
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

const AUTHORITY_A = "https://a.example.test/files";
const AUTHORITY_B = "https://b.example.test/files";
/** user-a at the authority its records reference the photo under. */
const OWNER_A = { userId: "user-a", baseUrl: AUTHORITY_A };
/** user-b at the authority it claims the local photo at. */
const OWNER_B = { userId: "user-b", baseUrl: AUTHORITY_B };

/** An account's records that reference the queued photo, at `owner`'s authority. */
function referencingRecords(
  owner: { userId: string; baseUrl: string } = OWNER_A
) {
  return {
    owner,
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

/**
 * Replaces the account's FileFn client module with one whose signed-in
 * account is `owner`, live while `isLive`, its session carrying `region`
 * (none by default), the device storing `storedRegion` ("a" by default; null
 * stores none) and its client settled at `baseUrl` (authority A by default;
 * resolveFileFnBaseUrl maps a region to `https://<region>.example.test/files`).
 */
function mockFileFnOwner(owner: {
  userId: string;
  isLive: boolean;
  region?: string | null;
  storedRegion?: string | null;
  baseUrl?: string;
}) {
  if (owner.storedRegion === undefined) owner.storedRegion = "a";
  vi.doMock("@nucleum/persistence/client-storage", async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@nucleum/persistence/client-storage")
      >();
    const clientStorage = Object.create(actual.clientStorage);
    clientStorage.get = async (key: string) =>
      key === "region" ? (owner.storedRegion ?? null) : null;
    return { ...actual, clientStorage };
  });
  vi.doMock("@nucleum/shared-state/files/filefn-client", () => ({
    captureFileFnOwner: () => ({ userId: owner.userId, epoch: 1 }),
    captureFileQueueClaim: async () =>
      owner.isLive
        ? { userId: owner.userId, baseUrl: owner.baseUrl ?? AUTHORITY_A }
        : undefined,
    isFileFnOwnerLive: () => owner.isLive,
    resolveFileFnAccountScope: () =>
      owner.isLive
        ? { userId: owner.userId, region: owner.region ?? null }
        : null,
    resolveFileFnBaseUrl: (region: string) =>
      `https://${region}.example.test/files`
  }));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.doUnmock("@nucleum/shared-state/files/filefn-client");
  vi.doUnmock("@nucleum/persistence/client-storage");
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

      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(
        true
      );
      expect(changes).toEqual([FILE_ID]);
      expect(opfs.list(QUEUE)).toEqual([ENTRY]);
      expect(opfs.list(QUEUE, ENTRY)).toContain("data.bin");
      expect(await tab.resolveQueuedFileUrl([QUEUE], FILE_ID, "full")).toMatch(
        /^blob:/
      );

      await vi.advanceTimersByTimeAsync(REPLAY_RETRY_WINDOW_MS);
      await replay();
      expect(fileFn.uploads).toHaveLength(1);
      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(
        true
      );
    }
  );

  it.each([
    ["FILEFN_POLICY_CONTENT_TYPE_NOT_ALLOWED", 400, undefined],
    ["FILEFN_POLICY_MAX_SIZE_EXCEEDED", 400, undefined],
    ["FILEFN_POLICY_NOT_FOUND", 400, undefined],
    ["FILEFN_QUOTA_EXCEEDED", 402, undefined],
    ["FILEFN_INVALID_FILE_ID", 400, undefined],
    ["FILEFN_INVALID_REQUEST", 400, undefined],
    ["FILEFN_UPLOAD_SIZE_MISMATCH", 409, undefined],
    ["FILEFN_IDEMPOTENCY_CONFLICT", 409, undefined],
    ["FILEFN_FORBIDDEN", 403, undefined],
    ["FILEFN_FORBIDDEN", 403, { fileId: FILE_ID, operation: "replace" }]
  ] as const)(
    "counts FileFn's %s %i (details %o) as a permanent rejection",
    async (code, status, details) => {
      installDevice();
      const tab = await openTab();
      await enqueuePhoto(tab);
      const fileFn = createClient([rejection(status, code, details)]);

      await tab.replayFileQueue(
        QUEUE,
        fileFn.client,
        new AbortController().signal
      );

      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(
        true
      );
    }
  );

  it.each([
    ["an authorization failure", rejection(401, "FILEFN_AUTH_REQUIRED")],
    ["a timeout", rejection(408)],
    ["a rate limit", rejection(429, "FILEFN_RATE_LIMITED")],
    ["an expired session", rejection(410, "FILEFN_UPLOAD_EXPIRED")],
    ["a server error", rejection(503)],
    [
      "a request refused for its scope (FILEFN_FORBIDDEN reason scope)",
      rejection(403, "FILEFN_FORBIDDEN", { reason: "scope" })
    ],
    [
      "a request refused for its CSRF header (FILEFN_FORBIDDEN reason csrf)",
      rejection(403, "FILEFN_FORBIDDEN", { reason: "csrf" })
    ],
    [
      "a route the account service does not know (FILEFN_ROUTE_NOT_FOUND)",
      rejection(404, "FILEFN_ROUTE_NOT_FOUND")
    ],
    [
      "a completion still running (retryable)",
      rejection(409, "FILEFN_UPLOAD_COMPLETION_IN_PROGRESS", {
        retryable: true
      })
    ],
    [
      "a retryable answer with a file rejection code",
      rejection(409, "FILEFN_UPLOAD_SIZE_MISMATCH", { retryable: true })
    ],
    ["a session not found", rejection(404, "FILEFN_SESSION_NOT_FOUND")],
    [
      "an invalid session token",
      rejection(403, "FILEFN_SESSION_TOKEN_INVALID")
    ],
    ["an incomplete session", rejection(409, "FILEFN_UPLOAD_INCOMPLETE")],
    ["a part conflict", rejection(409, "FILEFN_PART_CONFLICT")],
    ["a network failure", new TypeError("Failed to fetch")],
    [
      "a storage URL that refused a part (no FileFn error code)",
      new FileFnHttpError("Upload failed: HTTP 403", 403)
    ],
    [
      "a region routing answer (AUTHFN_REGION_MISMATCH 409)",
      rejection(409, "AUTHFN_REGION_MISMATCH")
    ],
    [
      "an unknown region (AUTHFN_REGION_NOT_FOUND 404)",
      rejection(404, "AUTHFN_REGION_NOT_FOUND")
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
      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(
        false
      );
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
    const fileFn = createClient([rejection(400), "ok"]);
    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      referencingRecords()
    );

    expect(await tab.retryFailedQueuedFile([QUEUE], FILE_ID, OWNER_A)).toBe(
      true
    );

    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(false);
    await vi.waitFor(() => expect(opfs.list(QUEUE)).toEqual([]));
    expect(fileFn.uploads).toHaveLength(2);
    const markedRetriedThenUploaded = [FILE_ID, FILE_ID, FILE_ID];
    expect(changes).toEqual(markedRetriedThenUploaded);
    expect(await tab.retryFailedQueuedFile([QUEUE], FILE_ID, OWNER_A)).toBe(
      false
    );
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

    await tab.retryFailedQueuedFile([QUEUE], FILE_ID, OWNER_A);
    await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(false);

    await vi.advanceTimersByTimeAsync(5_000);
    await vi.waitFor(async () =>
      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(true)
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

    expect(await tab.retryFailedQueuedFile([QUEUE], FILE_ID, OWNER_A)).toBe(
      true
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(rejected.uploads).toHaveLength(1);

    const next = createClient(["ok"]);
    await tab.replayFileQueue(QUEUE, next.client, new AbortController().signal);
    expect(next.uploads).toHaveLength(1);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it.each([
    ["FILEFN_UPLOAD_SIZE_MISMATCH", 409],
    ["FILEFN_IDEMPOTENCY_CONFLICT", 409]
  ] as const)(
    "retries a file FileFn rejected with %s %i under a new upload session",
    async (code, status) => {
      installDevice();
      const tab = await openTab();
      await enqueuePhoto(tab);
      // FileFn answers every request with a rejected key as it did the first.
      const rejectedKeys = new Set<string>();
      const fileFn = createClient([]);
      const uploadFile = fileFn.client.uploadFile.bind(fileFn.client);
      fileFn.client.uploadFile = (input: UploadInput) => {
        const upload = uploadFile(input);
        const key = input.idempotencyKey!;
        const isFirst = fileFn.uploads.length === 1;
        if (isFirst) rejectedKeys.add(key);
        const isRejected = rejectedKeys.has(key);
        return {
          ...upload,
          done: () =>
            isRejected ? Promise.reject(rejection(status, code)) : upload.done()
        };
      };
      await tab.replayFileQueue(
        QUEUE,
        fileFn.client,
        new AbortController().signal,
        undefined,
        referencingRecords()
      );
      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(
        true
      );

      expect(await tab.retryFailedQueuedFile([QUEUE], FILE_ID, OWNER_A)).toBe(
        true
      );

      await vi.waitFor(() => expect(opfs.list(QUEUE)).toEqual([]));
      const keys = fileFn.uploads.map((upload) => upload.idempotencyKey);
      expect(keys).toHaveLength(2);
      expect(keys[1]).not.toBe(keys[0]);
      expect(fileFn.uploads[1].fileId).toBe(FILE_ID);
      expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(
        false
      );
    }
  );
});

describe("a failed file of the local queue another account claimed", () => {
  /**
   * Stages the photo in the device's local queue, claimed by user-b, and
   * has FileFn reject it for good on a replay that stays current, whose
   * client uploads it on its next attempt.
   */
  async function rejectClaimedPhoto(queue: FileQueue) {
    await queue.enqueueFile(queue.LOCAL_FILE_QUEUE_DIR, {
      fileId: FILE_ID,
      fileName: "photo.png",
      contentType: "image/png",
      blob: new Blob(["photo bytes"], { type: "image/png" }),
      claim: OWNER_B
    });
    await queue.markQueuedFileCommitted(queue.LOCAL_FILE_QUEUE_DIR, FILE_ID);
    const fileFn = createClient([rejection(400), "ok"]);
    await queue.replayFileQueue(
      queue.LOCAL_FILE_QUEUE_DIR,
      fileFn.client,
      new AbortController().signal
    );
    expect(fileFn.uploads).toHaveLength(1);
    return fileFn;
  }

  it("is failed and retried only for the account that claimed it", async () => {
    installDevice();
    const tab = await openTab();
    const fileFn = await rejectClaimedPhoto(tab);
    const changes: string[] = [];
    tab.onQueuedFileFailureChange((fileId) => changes.push(fileId));
    const userADirs = tab.resolveFileQueueDirsOf("user-a");
    const userBDirs = tab.resolveFileQueueDirsOf("user-b");

    expect(await tab.isQueuedFileFailed(userADirs, FILE_ID, OWNER_A)).toBe(
      false
    );
    expect(
      await tab.isQueuedFileFailed([tab.LOCAL_FILE_QUEUE_DIR], FILE_ID)
    ).toBe(true);
    expect(await tab.retryFailedQueuedFile(userADirs, FILE_ID, OWNER_A)).toBe(
      false
    );
    await vi.advanceTimersByTimeAsync(REPLAY_RETRY_WINDOW_MS);
    expect(fileFn.uploads).toHaveLength(1);
    expect(changes).toEqual([]);
    expect(await tab.isQueuedFileFailed(userBDirs, FILE_ID, OWNER_B)).toBe(
      true
    );

    expect(await tab.retryFailedQueuedFile(userBDirs, FILE_ID, OWNER_B)).toBe(
      true
    );
    await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
    expect(await tab.isQueuedFileFailed(userBDirs, FILE_ID, OWNER_B)).toBe(
      false
    );
  });

  it("shows a claimed local file whose first upload was rejected for good to the guest, whose retry uploads it again", async () => {
    installDevice();
    const tab = await openTab();
    const fileFn = await rejectClaimedPhoto(tab);
    const guestDirs = tab.resolveFileQueueDirsOf(null);

    expect(await tab.isQueuedFileFailed(guestDirs, FILE_ID, null)).toBe(true);
    expect(await tab.retryFailedQueuedFile(guestDirs, FILE_ID, null)).toBe(
      true
    );
    await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
    expect(await tab.isQueuedFileFailed(guestDirs, FILE_ID, null)).toBe(false);
  });

  it("keeps a claimed local file the guest retried failed, after its claimant's replay ended, until the claimant's next replay uploads it", async () => {
    installDevice();
    const tab = await openTab();
    const dir = tab.LOCAL_FILE_QUEUE_DIR;
    await tab.enqueueFile(dir, {
      fileId: FILE_ID,
      fileName: "photo.png",
      contentType: "image/png",
      blob: new Blob(["photo bytes"], { type: "image/png" }),
      claim: OWNER_B
    });
    await tab.markQueuedFileCommitted(dir, FILE_ID);
    const rejected = createClient([rejection(400)]);
    const claimant = new AbortController();
    await tab.replayFileQueue(dir, rejected.client, claimant.signal);
    claimant.abort();
    const guestDirs = tab.resolveFileQueueDirsOf(null);

    expect(await tab.retryFailedQueuedFile(guestDirs, FILE_ID, null)).toBe(
      true
    );
    await vi.advanceTimersByTimeAsync(REPLAY_RETRY_WINDOW_MS);
    expect(rejected.uploads).toHaveLength(1);
    expect(await tab.isQueuedFileFailed(guestDirs, FILE_ID, null)).toBe(true);

    const next = createClient(["ok"]);
    await tab.replayFileQueue(dir, next.client, new AbortController().signal);
    expect(next.uploads).toHaveLength(1);
    expect(await tab.isQueuedFileFailed(guestDirs, FILE_ID, null)).toBe(false);
  });

  it("keeps an unclaimed failed file failed and retryable for any account", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient([rejection(400), "ok"]);
    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal
    );

    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_B)).toBe(true);
    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, null)).toBe(true);
    expect(await tab.retryFailedQueuedFile([QUEUE], FILE_ID, OWNER_B)).toBe(
      true
    );
    await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
  });

  it("is shown and retried by a file display only for the claiming account", async () => {
    installDevice();
    const owner = {
      userId: "user-a",
      isLive: true,
      storedRegion: "a",
      baseUrl: AUTHORITY_A
    };
    vi.resetModules();
    mockFileFnOwner(owner);
    const queue = await import("./file-queue");
    const fileUrl = await import("./file-url");
    const fileFn = await rejectClaimedPhoto(queue);
    const read = () =>
      new Promise<boolean>((resolve) => {
        const stop = fileUrl.watchFileUploadFailure(FILE_ID, (isFailed) => {
          stop();
          resolve(isFailed);
        });
      });

    expect(await read()).toBe(false);
    expect(await fileUrl.retryFileUpload(FILE_ID)).toBe(false);
    await vi.advanceTimersByTimeAsync(REPLAY_RETRY_WINDOW_MS);
    expect(fileFn.uploads).toHaveLength(1);

    owner.userId = "user-b";
    owner.storedRegion = "b";
    owner.baseUrl = AUTHORITY_B;
    expect(await read()).toBe(true);
    expect(await fileUrl.retryFileUpload(FILE_ID)).toBe(true);
    await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
    expect(await read()).toBe(false);
  });
});

describe("a failed file of an account whose FileFn authority moved", () => {
  const OWNER_A_AT_B = { userId: "user-a", baseUrl: AUTHORITY_B };

  /** Has FileFn reject the photo of user-a's queue at authority A for good. */
  async function rejectStartedPhoto(queue: FileQueue) {
    await enqueuePhoto(queue);
    const fileFn = createClient([rejection(400), "ok"]);
    await queue.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      referencingRecords()
    );
    expect(fileFn.uploads).toHaveLength(1);
    return fileFn;
  }

  it("keeps a local file claimed at the old authority failed until a retry there", async () => {
    installDevice();
    const tab = await openTab();
    await tab.enqueueFile(tab.LOCAL_FILE_QUEUE_DIR, {
      fileId: FILE_ID,
      fileName: "photo.png",
      contentType: "image/png",
      blob: new Blob(["photo bytes"], { type: "image/png" }),
      claim: OWNER_A
    });
    await tab.markQueuedFileCommitted(tab.LOCAL_FILE_QUEUE_DIR, FILE_ID);
    const fileFn = createClient([rejection(400), "ok"]);
    await tab.replayFileQueue(
      tab.LOCAL_FILE_QUEUE_DIR,
      fileFn.client,
      new AbortController().signal
    );
    const dirs = tab.resolveFileQueueDirsOf("user-a");

    expect(await tab.isQueuedFileFailed(dirs, FILE_ID, OWNER_A_AT_B)).toBe(
      false
    );
    expect(await tab.retryFailedQueuedFile(dirs, FILE_ID, OWNER_A_AT_B)).toBe(
      false
    );
    await vi.advanceTimersByTimeAsync(REPLAY_RETRY_WINDOW_MS);
    expect(fileFn.uploads).toHaveLength(1);
    expect(await tab.isQueuedFileFailed(dirs, FILE_ID, OWNER_A)).toBe(true);

    expect(await tab.retryFailedQueuedFile(dirs, FILE_ID, OWNER_A)).toBe(true);
    await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
    expect(await tab.isQueuedFileFailed(dirs, FILE_ID, OWNER_A)).toBe(false);
  });

  it("keeps an account file started at the old authority failed until a retry there", async () => {
    installDevice();
    const tab = await openTab();
    const fileFn = await rejectStartedPhoto(tab);

    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A_AT_B)).toBe(
      false
    );
    expect(
      await tab.retryFailedQueuedFile([QUEUE], FILE_ID, OWNER_A_AT_B)
    ).toBe(false);
    expect(
      await tab.retryFailedQueuedFile([QUEUE], FILE_ID, OWNER_A, () => false)
    ).toBe(false);
    await vi.advanceTimersByTimeAsync(REPLAY_RETRY_WINDOW_MS);
    expect(fileFn.uploads).toHaveLength(1);
    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(true);

    expect(await tab.retryFailedQueuedFile([QUEUE], FILE_ID, OWNER_A)).toBe(
      true
    );
    await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
    await vi.waitFor(() => expect(opfs.list(QUEUE)).toEqual([]));
  });

  it("is failed for the authority that started an account file, not the one that staged it", async () => {
    installDevice();
    const tab = await openTab();
    await tab.enqueueFile(QUEUE, {
      fileId: FILE_ID,
      fileName: "photo.png",
      contentType: "image/png",
      blob: new Blob(["photo bytes"], { type: "image/png" }),
      claim: OWNER_A
    });
    await tab.markQueuedFileCommitted(QUEUE, FILE_ID);
    const fileFn = createClient([rejection(400), "ok"]);
    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      referencingRecords(OWNER_A_AT_B)
    );
    expect(fileFn.uploads).toHaveLength(1);

    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A_AT_B)).toBe(
      true
    );
    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A)).toBe(false);
    expect(
      await tab.retryFailedQueuedFile([QUEUE], FILE_ID, OWNER_A_AT_B)
    ).toBe(true);
    await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
    await vi.waitFor(() => expect(opfs.list(QUEUE)).toEqual([]));
    expect(await tab.isQueuedFileFailed([QUEUE], FILE_ID, OWNER_A_AT_B)).toBe(
      false
    );
  });

  describe("read by a file display whose session carries no region", () => {
    /**
     * Opens a page whose user-a session carries no region, the device
     * storing `storedRegion`, and has FileFn reject the photo for good on a
     * replay at `startedAt`, whose client uploads it on its next attempt.
     */
    async function openRejectedAt(
      storedRegion: string | null,
      startedAt: string
    ) {
      installDevice();
      const settled = `https://${storedRegion ?? "insouth"}.example.test/files`;
      vi.resetModules();
      mockFileFnOwner({
        userId: "user-a",
        isLive: true,
        region: null,
        storedRegion,
        baseUrl: settled
      });
      const queue = await import("./file-queue");
      const fileUrl = await import("./file-url");
      await enqueuePhoto(queue);
      const fileFn = createClient([rejection(400), "ok"]);
      await queue.replayFileQueue(
        QUEUE,
        fileFn.client,
        new AbortController().signal,
        undefined,
        referencingRecords({ userId: "user-a", baseUrl: startedAt })
      );
      expect(fileFn.uploads).toHaveLength(1);
      const read = () =>
        new Promise<boolean>((resolve) => {
          const stop = fileUrl.watchFileUploadFailure(FILE_ID, (isFailed) => {
            stop();
            resolve(isFailed);
          });
        });
      return { fileUrl, fileFn, read };
    }

    it("shows no failed upload started at another authority than the stored region's", async () => {
      const { fileUrl, fileFn, read } = await openRejectedAt("b", AUTHORITY_A);

      expect(await read()).toBe(false);
      expect(await fileUrl.retryFileUpload(FILE_ID)).toBe(false);
      await vi.advanceTimersByTimeAsync(REPLAY_RETRY_WINDOW_MS);
      expect(fileFn.uploads).toHaveLength(1);
    });

    it("shows a failed upload started at the stored region's authority, which Retry uploads", async () => {
      const { fileUrl, fileFn, read } = await openRejectedAt("b", AUTHORITY_B);

      expect(await read()).toBe(true);
      expect(await fileUrl.retryFileUpload(FILE_ID)).toBe(true);
      await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
      await vi.waitFor(async () => expect(await read()).toBe(false));
    });

    it("reads at insouth's authority when the device stores no region", async () => {
      const insouth = "https://insouth.example.test/files";
      const elsewhere = await openRejectedAt(null, AUTHORITY_A);
      expect(await elsewhere.read()).toBe(false);
      expect(await elsewhere.fileUrl.retryFileUpload(FILE_ID)).toBe(false);

      const { fileUrl, fileFn, read } = await openRejectedAt(null, insouth);
      expect(await read()).toBe(true);
      expect(await fileUrl.retryFileUpload(FILE_ID)).toBe(true);
      await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(2));
    });
  });
});

describe("the failed state a file display reads", () => {
  async function openFileUrl(owner: { userId: string; isLive: boolean }) {
    vi.resetModules();
    mockFileFnOwner(owner);
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
