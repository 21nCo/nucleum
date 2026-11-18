import { Blob as NodeBlob, File as NodeFile } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FileFnHttpError,
  type FileFnClient,
  type UploadArtifactInput,
  type UploadInput,
  type UploadResult
} from "@filefn/client";
import { createFakeLocks, createFakeOpfs } from "../../../tests/fixtures/opfs";

type FileQueue = typeof import("./file-queue");

const QUEUE = "nucleum-file-queue-account-user-a";
const FILE_ID = "file_queuedPhoto01";

let opfs: ReturnType<typeof createFakeOpfs>;

/** Loads a fresh copy of the queue module: another tab, or the page after a reload. */
async function openTab(): Promise<FileQueue> {
  vi.resetModules();
  return import("./file-queue");
}

function installDevice(options: { locks?: LockManager } = {}) {
  opfs = createFakeOpfs();
  vi.stubGlobal("navigator", {
    ...globalThis.navigator,
    onLine: true,
    locks: options.locks,
    storage: { getDirectory: opfs.getDirectory }
  });
}

/**
 * A FileFn client whose uploads finish when `finish` is called (or at once
 * with `isImmediate`), recording what each upload sent.
 */
function createClient(
  options: {
    isImmediate?: boolean;
    uploadError?: unknown;
    currentVersionId?: string;
  } = {}
) {
  const uploads: UploadInput[] = [];
  const artifacts: UploadArtifactInput[] = [];
  const pending: ((result: UploadResult) => void)[] = [];
  const client = {
    uploadFile: (input: UploadInput) => {
      uploads.push(input);
      return {
        uploadSessionId: `ses_${uploads.length}`,
        fileId: input.fileId!,
        onProgress: () => undefined,
        abort: () => undefined,
        done: () => {
          if (options.uploadError) return Promise.reject(options.uploadError);
          const result = { fileId: input.fileId!, versionId: "ver_1" };
          if (options.isImmediate) return Promise.resolve(result);
          return new Promise<UploadResult>((resolve) => {
            pending.push(() => resolve(result));
          });
        }
      };
    },
    uploadArtifact: async (input: UploadArtifactInput) => {
      artifacts.push(input);
      return {} as Awaited<ReturnType<FileFnClient["uploadArtifact"]>>;
    },
    getFile: async (fileId: string) => ({
      fileId,
      currentVersionId: options.currentVersionId
    })
  } as unknown as FileFnClient;
  return {
    client,
    uploads,
    artifacts,
    finish: () => pending.splice(0).forEach((resolve) => resolve({} as never))
  };
}

async function enqueuePhoto(queue: FileQueue) {
  await queue.enqueueFile(QUEUE, {
    fileId: FILE_ID,
    fileName: "photo.png",
    contentType: "image/png",
    blob: new Blob(["photo bytes"], { type: "image/png" }),
    thumbnailBlob: new Blob(["thumb bytes"], { type: "image/jpeg" })
  });
  await queue.markQueuedFileCommitted(QUEUE, FILE_ID);
}

function fileFnError(code: string, status: number) {
  return new FileFnHttpError(code, status, { error: { code, message: code } });
}

beforeEach(() => {
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("File", NodeFile);
  let next = 0;
  URL.createObjectURL ??= () => "";
  URL.revokeObjectURL ??= () => undefined;
  vi.spyOn(URL, "createObjectURL").mockImplementation(
    () => `blob:queued-${++next}`
  );
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FileFn OPFS queue", () => {
  it("keeps a file and its thumbnail on the device and renders them until the file uploads", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);

    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
    const shown = await tab.resolveQueuedFileUrl([QUEUE], FILE_ID, "full");
    expect(shown).toMatch(/^blob:/);
    expect(await tab.resolveQueuedFileUrl([QUEUE], FILE_ID, "full")).not.toBe(
      shown
    );
    expect(
      await tab.resolveQueuedFileUrl([QUEUE], FILE_ID, "thumbnail")
    ).toMatch(/^blob:/);
    expect(
      await tab.resolveQueuedFileUrl([QUEUE], "file_notQueued01", "full")
    ).toBeNull();

    const fileFn = createClient({ isImmediate: true });
    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal
    );

    expect(fileFn.uploads).toHaveLength(1);
    expect(fileFn.uploads[0]).toMatchObject({
      fileId: FILE_ID,
      policy: "nucleus-durable-default",
      fileName: "photo.png"
    });
    expect(await (fileFn.uploads[0].file as Blob).text()).toBe("photo bytes");
    expect(fileFn.artifacts).toEqual([
      expect.objectContaining({
        fileId: FILE_ID,
        versionId: "ver_1",
        kind: "thumbnail-medium",
        mimeType: "image/jpeg"
      })
    ]);
    expect(opfs.list(QUEUE)).toEqual([]);
    expect(await tab.resolveQueuedFileUrl([QUEUE], FILE_ID, "full")).toBeNull();
  });

  it("continues the same upload session after a reload interrupts the upload", async () => {
    installDevice();
    const beforeReload = await openTab();
    await enqueuePhoto(beforeReload);
    const page = new AbortController();
    const interrupted = createClient();
    void beforeReload.replayFileQueue(QUEUE, interrupted.client, page.signal);
    await vi.waitFor(() => expect(interrupted.uploads).toHaveLength(1));
    page.abort();

    const afterReload = await openTab();
    const resumed = createClient({ isImmediate: true });
    await afterReload.replayFileQueue(
      QUEUE,
      resumed.client,
      new AbortController().signal
    );

    expect(resumed.uploads).toHaveLength(1);
    expect(resumed.uploads[0].fileId).toBe(interrupted.uploads[0].fileId);
    expect(resumed.uploads[0].idempotencyKey).toBe(
      interrupted.uploads[0].idempotencyKey
    );
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("uploads a file once when two tabs replay the same queue", async () => {
    installDevice({ locks: createFakeLocks() });
    const first = await openTab();
    await enqueuePhoto(first);
    const second = await openTab();
    const firstFileFn = createClient();
    const secondFileFn = createClient({ isImmediate: true });

    const firstReplay = first.replayFileQueue(
      QUEUE,
      firstFileFn.client,
      new AbortController().signal
    );
    const secondReplay = second.replayFileQueue(
      QUEUE,
      secondFileFn.client,
      new AbortController().signal
    );
    await vi.waitFor(() => expect(firstFileFn.uploads).toHaveLength(1));
    firstFileFn.finish();
    await Promise.all([firstReplay, secondReplay]);

    expect(firstFileFn.uploads).toHaveLength(1);
    expect(secondFileFn.uploads).toHaveLength(0);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("sends the same file and idempotency key from two tabs without Web Locks", async () => {
    installDevice();
    const first = await openTab();
    await enqueuePhoto(first);
    const second = await openTab();
    const firstFileFn = createClient();
    const secondFileFn = createClient();

    void first.replayFileQueue(
      QUEUE,
      firstFileFn.client,
      new AbortController().signal
    );
    void second.replayFileQueue(
      QUEUE,
      secondFileFn.client,
      new AbortController().signal
    );
    await vi.waitFor(() => {
      expect(firstFileFn.uploads).toHaveLength(1);
      expect(secondFileFn.uploads).toHaveLength(1);
    });

    expect(secondFileFn.uploads[0]).toMatchObject({
      fileId: firstFileFn.uploads[0].fileId,
      idempotencyKey: firstFileFn.uploads[0].idempotencyKey
    });
  });

  it("counts a session another replay completed as uploaded once FileFn has the file", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient({
      uploadError: fileFnError("FILEFN_UPLOAD_ALREADY_COMPLETED", 409),
      currentVersionId: "ver_done"
    });

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal
    );

    expect(opfs.list(QUEUE)).toEqual([]);
    expect(fileFn.artifacts).toEqual([
      expect.objectContaining({ fileId: FILE_ID, versionId: "ver_done" })
    ]);
  });

  it("keeps a file whose session expired and replays it with a new session", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const expired = createClient({
      uploadError: fileFnError("FILEFN_UPLOAD_EXPIRED", 410)
    });

    await tab.replayFileQueue(
      QUEUE,
      expired.client,
      new AbortController().signal
    );
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);

    const retried = createClient({ isImmediate: true });
    await tab.replayFileQueue(
      QUEUE,
      retried.client,
      new AbortController().signal
    );

    expect(retried.uploads[0].fileId).toBe(FILE_ID);
    expect(retried.uploads[0].idempotencyKey).not.toBe(
      expired.uploads[0].idempotencyKey
    );
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("keeps the file queued while the device is offline", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    vi.stubGlobal("navigator", { ...globalThis.navigator, onLine: false });
    const fileFn = createClient({ isImmediate: true });

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal
    );

    expect(fileFn.uploads).toHaveLength(0);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });
});

describe("FileFn OPFS queue of an account's records", () => {
  /**
   * The account's records, as the referenced `fileId`s, or unreadable. Each
   * pull that brings them up to date runs `pulls` in turn (the last one again
   * once they run out) and succeeds unless that returns false.
   */
  function createReferences(
    referenced: Set<string> | "unreadable",
    pulls: (() => boolean | void)[] = []
  ) {
    const discarded: string[] = [];
    let pullCount = 0;
    return {
      discarded,
      references: {
        sync: async () =>
          (pulls[Math.min(pullCount++, pulls.length - 1)]?.() ?? true) !==
          false,
        isReferenced: async (fileId: string) =>
          referenced === "unreadable" ? undefined : referenced.has(fileId),
        discard: async (fileId: string) => {
          discarded.push(fileId);
        }
      }
    };
  }

  async function stagePhoto(queue: FileQueue) {
    await queue.enqueueFile(QUEUE, {
      fileId: FILE_ID,
      fileName: "photo.png",
      contentType: "image/png",
      blob: new Blob(["photo bytes"], { type: "image/png" })
    });
  }

  it("uploads a file whose record saved but whose committed mark was lost", async () => {
    installDevice();
    const tab = await openTab();
    await stagePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const { references, discarded } = createReferences(new Set([FILE_ID]));

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(fileFn.uploads).toEqual([
      expect.objectContaining({ fileId: FILE_ID })
    ]);
    expect(discarded).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("keeps a recently staged file without a record, whose record may still be saving", async () => {
    installDevice();
    const tab = await openTab();
    await stagePhoto(tab);
    const fileFn = createClient({ isImmediate: true });

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      createReferences(new Set()).references
    );

    expect(fileFn.uploads).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });

  it("keeps every file while the account's records cannot be read", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient({ isImmediate: true });

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      createReferences("unreadable").references
    );

    expect(fileFn.uploads).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });

  it("removes a committed file without uploading it when the pull before the upload brings its record's deletion", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const referenced = new Set([FILE_ID]);
    const { references, discarded } = createReferences(referenced, [
      () => void referenced.delete(FILE_ID)
    ]);

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(fileFn.uploads).toEqual([]);
    expect(discarded).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("uploads and removes nothing while the account's records cannot be brought up to date", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const { references } = createReferences(new Set(), [() => false]);

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(fileFn.uploads).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });

  it("discards an uploaded file when the pull after its upload brings its record's deletion", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const referenced = new Set([FILE_ID]);
    const { references, discarded } = createReferences(referenced, [
      () => true,
      () => void referenced.delete(FILE_ID)
    ]);

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(fileFn.uploads).toEqual([
      expect.objectContaining({ fileId: FILE_ID })
    ]);
    expect(discarded).toEqual([FILE_ID]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("discards a file whose upload ended before its removal was decided once its record is gone after a reload", async () => {
    installDevice();
    const first = await openTab();
    await enqueuePhoto(first);
    const fileFn = createClient({ isImmediate: true });
    await first.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      createReferences(new Set([FILE_ID]), [() => true, () => false]).references
    );
    expect(fileFn.uploads).toHaveLength(1);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);

    const reloaded = await openTab();
    const { references, discarded } = createReferences(new Set());
    await reloaded.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(fileFn.uploads).toHaveLength(1);
    expect(discarded).toEqual([FILE_ID]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("keeps a file whose discard fails, to discard it on the next replay", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const referenced = new Set([FILE_ID]);
    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      createReferences(referenced, [() => true, () => false]).references
    );
    const { references } = createReferences(new Set());
    references.discard = async () => {
      throw new Error("offline");
    };

    await expect(
      tab.replayFileQueue(
        QUEUE,
        fileFn.client,
        new AbortController().signal,
        undefined,
        references
      )
    ).rejects.toThrow("offline");

    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });
});
