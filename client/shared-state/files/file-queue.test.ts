import {
  Blob as NodeBlob,
  File as NodeFile,
  resolveObjectURL
} from "node:buffer";
import { URL as NodeURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FileFnHttpError,
  type FileFnClient,
  type UploadArtifactInput,
  type UploadInput,
  type UploadResult
} from "@filefn/client";
import { createFakeLocks, createFakeOpfs } from "../../../tests/fixtures/opfs";
import type { QueuedFileReferences } from "./file-queue";

type FileQueue = typeof import("./file-queue");

const QUEUE = "nucleum-file-queue-account-user-a";
const FILE_ID = "file_queuedPhoto01";
const SECOND_FILE_ID = "file_queuedPhoto02";
const AUTHORITY_A = {
  userId: "user-a",
  baseUrl: "https://a.example.test/files"
};
const AUTHORITY_B = {
  userId: "user-a",
  baseUrl: "https://b.example.test/files"
};

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
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
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
  vi.useRealTimers();
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

  it("renders and downloads a queued file again after a view revokes the URL it was given", async () => {
    vi.mocked(URL.createObjectURL).mockImplementation((blob) =>
      NodeURL.createObjectURL(blob as NodeBlob)
    );
    vi.mocked(URL.revokeObjectURL).mockImplementation(NodeURL.revokeObjectURL);
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const read = (url: string | null | undefined) =>
      resolveObjectURL(url ?? "")?.text();

    const shown = await tab.resolveQueuedFileUrl([QUEUE], FILE_ID, "full");
    const download = await tab.resolveQueuedFileUrl(
      [QUEUE],
      FILE_ID,
      "download"
    );
    URL.revokeObjectURL(shown!);
    const reopened = await tab.resolveQueuedFileUrl([QUEUE], FILE_ID, "full");

    expect(read(shown)).toBeUndefined();
    expect(await read(reopened)).toBe("photo bytes");
    expect(await tab.resolveQueuedFileUrl([QUEUE], FILE_ID, "download")).toBe(
      download
    );
    expect(await read(download)).toBe("photo bytes");

    await tab.dequeueFile(QUEUE, FILE_ID);
    await Promise.resolve();
    expect(read(download)).toBeUndefined();
    expect(await read(reopened)).toBe("photo bytes");
  });

  it("shares one download URL per queued file and revokes it when the file is dequeued, released or another queue is read", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const download = (dirs = [QUEUE]) =>
      tab.resolveQueuedFileUrl(dirs, FILE_ID, "download");

    const [first, concurrent] = await Promise.all([download(), download()]);
    expect(first).toMatch(/^blob:/);
    expect([concurrent, await download()]).toEqual([first, first]);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(await download(["nucleum-file-queue-local"])).toBeNull();
    await Promise.resolve();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(first);

    const second = await download();
    expect(second).not.toBe(first);
    tab.releaseQueuedFileUrls((key) => key.startsWith(`${QUEUE}\n`));
    await Promise.resolve();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(second);

    const third = await download();
    await tab.dequeueFile(QUEUE, FILE_ID);
    await Promise.resolve();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(third);
    expect(await download()).toBeNull();
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
   * The account's records at the `owner` authority, as the referenced
   * `fileId`s, or unreadable. Each pull that brings them up to date runs
   * `pulls` in turn (the last one again once they run out) and succeeds
   * unless that returns false.
   */
  function createReferences(
    referenced: Set<string> | "unreadable",
    pulls: (() => boolean | void)[] = [],
    owner = AUTHORITY_A
  ) {
    const discarded: string[] = [];
    let pullCount = 0;
    return {
      discarded,
      references: {
        owner,
        isCurrent: () => true,
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

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });

  /** Queues the photo and uploads it at authority A, stopping before its removal. */
  async function startUploadAtA(queue: FileQueue) {
    await enqueuePhoto(queue);
    const fileFn = createClient({ isImmediate: true });
    await queue.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      createReferences(new Set([FILE_ID]), [() => true, () => false]).references
    );
    expect(fileFn.uploads).toHaveLength(1);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  }

  /**
   * Makes reading a file of any entry fail with a storage error other than a
   * missing file, for the module instances opened afterwards.
   */
  function failReading(name: string) {
    const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
      ({
        ...dir,
        getDirectoryHandle: async (
          child: string,
          options?: FileSystemGetDirectoryOptions
        ) => wrap(await dir.getDirectoryHandle(child, options)),
        getFileHandle: async (
          child: string,
          options?: FileSystemGetFileOptions
        ) => {
          if (child.startsWith(name) && !options?.create) {
            throw new DOMException("Unreadable", "NotReadableError");
          }
          return dir.getFileHandle(child, options);
        }
      }) as FileSystemDirectoryHandle;
    const { getDirectory } = navigator.storage;
    vi.stubGlobal("navigator", {
      ...navigator,
      storage: { getDirectory: async () => wrap(await getDirectory()) }
    });
  }

  it("keeps a file whose upload started at another authority, neither discarding nor removing it", async () => {
    installDevice();
    await startUploadAtA(await openTab());
    const atB = createClient({ isImmediate: true });
    const { references, discarded } = createReferences(
      new Set(),
      [],
      AUTHORITY_B
    );

    await (
      await openTab()
    ).replayFileQueue(
      QUEUE,
      atB.client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(atB.uploads).toEqual([]);
    expect(discarded).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });

  it("uploads a file that never started at the account's current authority, whatever authority it was captured at", async () => {
    installDevice();
    const tab = await openTab();
    await tab.enqueueFile(QUEUE, {
      fileId: FILE_ID,
      fileName: "photo.png",
      contentType: "image/png",
      blob: new Blob(["photo bytes"], { type: "image/png" }),
      claim: AUTHORITY_A
    });
    await tab.markQueuedFileCommitted(QUEUE, FILE_ID);
    const atB = createClient({ isImmediate: true });
    const { references, discarded } = createReferences(
      new Set([FILE_ID]),
      [],
      AUTHORITY_B
    );

    await tab.replayFileQueue(
      QUEUE,
      atB.client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(atB.uploads).toEqual([expect.objectContaining({ fileId: FILE_ID })]);
    expect(discarded).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("starts no upload once the device goes offline after the file's record is checked", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const { references } = createReferences(new Set([FILE_ID]));
    references.isReferenced = async () => {
      (navigator as { onLine: boolean }).onLine = false;
      return true;
    };

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

  it("brings the records up to date again after a failed upload before deciding the next file", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    await tab.enqueueFile(QUEUE, {
      fileId: SECOND_FILE_ID,
      fileName: "second.png",
      contentType: "image/png",
      blob: new Blob(["second bytes"], { type: "image/png" })
    });
    await tab.markQueuedFileCommitted(QUEUE, SECOND_FILE_ID);
    const remote = new Set([FILE_ID, SECOND_FILE_ID]);
    const local = new Set<string>();
    const { references, discarded } = createReferences(local, [
      () => {
        local.clear();
        for (const fileId of remote) local.add(fileId);
      }
    ]);
    const uploads: string[] = [];
    const client = {
      uploadFile: (input: UploadInput) => {
        uploads.push(input.fileId!);
        return {
          uploadSessionId: `ses_${uploads.length}`,
          fileId: input.fileId!,
          onProgress: () => undefined,
          abort: () => undefined,
          done: async () => {
            remote.delete(SECOND_FILE_ID);
            throw new Error("The connection dropped");
          }
        };
      },
      uploadArtifact: async () => ({})
    } as unknown as FileFnClient;

    await tab.replayFileQueue(
      QUEUE,
      client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(uploads).toEqual([FILE_ID]);
    expect(discarded).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });

  it("keeps a started file whose marker cannot be read, without discarding it", async () => {
    installDevice();
    await startUploadAtA(await openTab());
    failReading("started");
    const { references, discarded } = createReferences(new Set());

    await (
      await openTab()
    ).replayFileQueue(
      QUEUE,
      createClient({ isImmediate: true }).client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(discarded).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });

  it("removes an uploaded file whose thumbnail cannot be read once its record is checked again", async () => {
    installDevice();
    await enqueuePhoto(await openTab());
    failReading("thumbnail-jpeg");
    const fileFn = createClient({ isImmediate: true });

    await (
      await openTab()
    ).replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      createReferences(new Set([FILE_ID])).references
    );

    expect(fileFn.uploads).toHaveLength(1);
    expect(fileFn.artifacts).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("neither discards nor removes a file once the records stop being the owner's during the check", async () => {
    installDevice();
    await startUploadAtA(await openTab());
    const { references, discarded } = createReferences(new Set());
    let isCurrent = true;
    references.isCurrent = () => isCurrent;
    references.isReferenced = async () => {
      isCurrent = false;
      return false;
    };

    await (
      await openTab()
    ).replayFileQueue(
      QUEUE,
      createClient({ isImmediate: true }).client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(discarded).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });

  it("removes a file without a record that stayed uncommitted for over a day, without uploading it", async () => {
    installDevice();
    const tab = await openTab();
    await stagePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const { references, discarded } = createReferences(new Set());
    const dayLater = Date.now() + 25 * 60 * 60_000;
    vi.spyOn(Date, "now").mockReturnValue(dayLater);

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

  it("retries a pass whose records could not be brought up to date, without another trigger", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const { references } = createReferences(new Set([FILE_ID]), [
      () => false,
      () => true
    ]);

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      references
    );
    expect(fileFn.uploads).toEqual([]);
    await vi.advanceTimersByTimeAsync(5_000);

    await vi.waitFor(() => expect(opfs.list(QUEUE)).toEqual([]));
    expect(fileFn.uploads).toHaveLength(1);
  });

  it("runs a replay requested while a pass that fails was running", async () => {
    let rejectFirst!: (error: Error) => void;
    let requests = 0;
    installDevice({
      locks: {
        request: (_name: string, _options: unknown, run: () => unknown) =>
          ++requests === 1
            ? new Promise((_resolve, reject) => (rejectFirst = reject))
            : run()
      } as unknown as LockManager
    });
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const { references } = createReferences(new Set([FILE_ID]));
    const signal = new AbortController().signal;

    const replay = tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      signal,
      undefined,
      references
    );
    void tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      signal,
      undefined,
      references
    );
    rejectFirst(new Error("The lock could not be taken"));
    await replay;

    expect(fileFn.uploads).toHaveLength(1);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("replays a request made after one whose client was already torn down", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const { references } = createReferences(new Set([FILE_ID]));
    const tornDown = new AbortController();
    tornDown.abort();

    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      tornDown.signal,
      undefined,
      references
    );
    await tab.replayFileQueue(
      QUEUE,
      fileFn.client,
      new AbortController().signal,
      undefined,
      references
    );

    expect(fileFn.uploads).toHaveLength(1);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  /** Writes the photo's STARTED marker as left by an interrupted write. */
  async function writeStarted(text: string) {
    const root = await navigator.storage.getDirectory();
    const queue = await root.getDirectoryHandle(QUEUE);
    const entry = await queue.getDirectoryHandle(`queued_${FILE_ID}`);
    const handle = await entry.getFileHandle("started", { create: true });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  }

  /** The texts of the photo's STARTED markers, one per attempt. */
  function readMarkers() {
    const entry = `queued_${FILE_ID}`;
    return opfs
      .list(QUEUE, entry)
      .filter((name) => name.startsWith("started"))
      .map((name) => new TextDecoder().decode(opfs.read(QUEUE, entry, name)));
  }

  /** The photo's only STARTED marker, or undefined when it has none. */
  function readStarted() {
    const markers = readMarkers();
    expect(markers.length).toBeLessThan(2);
    return markers[0];
  }

  /**
   * Runs `during` when a STARTED marker write closes, before it lands, then
   * fails the write when `isFailed`, else awaits `landed` once it landed.
   */
  function onMarkerWrite(
    during: () => Promise<void> | void,
    isFailed = false,
    landed?: () => Promise<void> | void
  ) {
    const wrap = (dir: FileSystemDirectoryHandle): FileSystemDirectoryHandle =>
      ({
        ...dir,
        getDirectoryHandle: async (
          child: string,
          options?: FileSystemGetDirectoryOptions
        ) => wrap(await dir.getDirectoryHandle(child, options)),
        getFileHandle: async (
          child: string,
          options?: FileSystemGetFileOptions
        ) => {
          const handle = await dir.getFileHandle(child, options);
          if (!child.startsWith("started")) return handle;
          return {
            ...handle,
            createWritable: async () => {
              const writable = await handle.createWritable();
              return {
                write: (data: string) => writable.write(data),
                close: async () => {
                  await during();
                  if (isFailed)
                    throw new DOMException("Full", "QuotaExceededError");
                  await writable.close();
                  await landed?.();
                }
              };
            }
          };
        }
      }) as FileSystemDirectoryHandle;
    const { getDirectory } = navigator.storage;
    vi.stubGlobal("navigator", {
      ...navigator,
      storage: { getDirectory: async () => wrap(await getDirectory()) }
    });
  }

  function replay(
    queue: FileQueue,
    client: FileFnClient,
    references: QueuedFileReferences,
    signal = new AbortController().signal
  ) {
    return queue.replayFileQueue(QUEUE, client, signal, undefined, references);
  }

  it.each([
    ["empty", ""],
    ["corrupt", '{"userId":']
  ])(
    "uploads a referenced file whose STARTED marker an interrupted write left %s, after a reload",
    async (_, text) => {
      installDevice();
      await enqueuePhoto(await openTab());
      await writeStarted(text);
      const fileFn = createClient({ isImmediate: true });
      const { references, discarded } = createReferences(new Set([FILE_ID]));

      await replay(await openTab(), fileFn.client, references);

      expect(fileFn.uploads).toEqual([
        expect.objectContaining({ fileId: FILE_ID })
      ]);
      expect(discarded).toEqual([]);
      expect(opfs.list(QUEUE)).toEqual([]);
    }
  );

  it("discards and removes an unreferenced file whose STARTED marker is corrupt", async () => {
    installDevice();
    await enqueuePhoto(await openTab());
    await writeStarted('{"userId":');
    const fileFn = createClient({ isImmediate: true });
    const { references, discarded } = createReferences(new Set());

    await replay(await openTab(), fileFn.client, references);

    expect(fileFn.uploads).toEqual([]);
    expect(discarded).toEqual([FILE_ID]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("writes its own marker at the owner's authority beside an empty STARTED marker before uploading", async () => {
    installDevice();
    await enqueuePhoto(await openTab());
    await writeStarted("");
    const fileFn = createClient();
    const tab = await openTab();
    const done = replay(
      tab,
      fileFn.client,
      createReferences(new Set([FILE_ID])).references
    );
    await vi.waitFor(() => expect(fileFn.uploads).toHaveLength(1));

    const [own, ...others] = readMarkers().sort().reverse();
    expect(JSON.parse(own)).toMatchObject(AUTHORITY_A);
    expect(others).toEqual([""]);
    fileFn.finish();
    await done;
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("uploads a file whose STARTED marker could not be read once storage recovers", async () => {
    installDevice();
    await startUploadAtA(await openTab());
    const { getDirectory } = navigator.storage;
    failReading("started");
    const fileFn = createClient({ isImmediate: true });
    const { references } = createReferences(new Set([FILE_ID]));
    await replay(await openTab(), fileFn.client, references);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);

    vi.stubGlobal("navigator", { ...navigator, storage: { getDirectory } });
    await replay(await openTab(), fileFn.client, references);

    expect(fileFn.uploads).toEqual([
      expect.objectContaining({ fileId: FILE_ID })
    ]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("leaves no STARTED marker when its write fails, so another authority uploads the file", async () => {
    installDevice();
    await enqueuePhoto(await openTab());
    const { getDirectory } = navigator.storage;
    onMarkerWrite(() => undefined, true);
    const atA = createClient({ isImmediate: true });
    await replay(
      await openTab(),
      atA.client,
      createReferences(new Set([FILE_ID])).references
    );
    expect(atA.uploads).toEqual([]);
    expect(readStarted()).toBeUndefined();

    vi.stubGlobal("navigator", { ...navigator, storage: { getDirectory } });
    const atB = createClient({ isImmediate: true });
    const b = createReferences(new Set([FILE_ID]), [], AUTHORITY_B);
    await replay(await openTab(), atB.client, b.references);

    expect(atB.uploads).toEqual([expect.objectContaining({ fileId: FILE_ID })]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("binds no authority to an attempt that went offline before its request, so another authority uploads the file", async () => {
    installDevice();
    const tab = await openTab();
    await enqueuePhoto(tab);
    const atA = createClient({ isImmediate: true });
    const a = createReferences(new Set([FILE_ID]));
    a.references.isReferenced = async () => {
      (navigator as { onLine: boolean }).onLine = false;
      return true;
    };
    await replay(tab, atA.client, a.references);
    expect(atA.uploads).toEqual([]);

    (navigator as { onLine: boolean }).onLine = true;
    const atB = createClient({ isImmediate: true });
    const b = createReferences(new Set([FILE_ID]), [], AUTHORITY_B);
    await replay(await openTab(), atB.client, b.references);

    expect(atB.uploads).toEqual([expect.objectContaining({ fileId: FILE_ID })]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it.each([
    ["the device goes offline", "offline"],
    ["the replay is cancelled", "abort"],
    ["the records stop being the owner's", "switch"]
  ] as const)(
    "sends no request and removes the marker when %s while it is written",
    async (_, change) => {
      installDevice();
      await enqueuePhoto(await openTab());
      const controller = new AbortController();
      const { references } = createReferences(new Set([FILE_ID]));
      let isCurrent = true;
      references.isCurrent = () => isCurrent;
      onMarkerWrite(() => {
        if (change === "offline")
          (navigator as { onLine: boolean }).onLine = false;
        if (change === "abort") controller.abort();
        if (change === "switch") isCurrent = false;
      });
      const atA = createClient({ isImmediate: true });

      await replay(await openTab(), atA.client, references, controller.signal);

      expect(atA.uploads).toEqual([]);
      expect(readStarted()).toBeUndefined();
      expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
    }
  );

  it.each([
    ["empty", ""],
    ["corrupt", '{"userId":']
  ])(
    "removes only its own marker beside a %s STARTED marker when the attempt goes offline before its request",
    async (_, text) => {
      installDevice();
      await enqueuePhoto(await openTab());
      await writeStarted(text);
      const { getDirectory } = navigator.storage;
      onMarkerWrite(() => {
        (navigator as { onLine: boolean }).onLine = false;
      });
      const atA = createClient({ isImmediate: true });
      await replay(
        await openTab(),
        atA.client,
        createReferences(new Set([FILE_ID])).references
      );
      expect(atA.uploads).toEqual([]);
      expect(readMarkers()).toEqual([text]);

      vi.stubGlobal("navigator", {
        ...navigator,
        onLine: true,
        storage: { getDirectory }
      });
      const atB = createClient({ isImmediate: true });
      const b = createReferences(new Set([FILE_ID]), [], AUTHORITY_B);
      await replay(await openTab(), atB.client, b.references);

      expect(atB.uploads).toEqual([
        expect.objectContaining({ fileId: FILE_ID })
      ]);
      expect(opfs.list(QUEUE)).toEqual([]);
    }
  );

  it("keeps the marker of another tab's started upload when its own attempt stops before marking, without Web Locks", async () => {
    installDevice();
    await enqueuePhoto(await openTab());
    const first = await openTab();
    const second = await openTab();
    let release: (() => void) | undefined;
    const held = createReferences(new Set([FILE_ID]));
    held.references.isReferenced = () =>
      new Promise((resolve) => {
        release = () => resolve(true);
      });
    const firstDone = replay(
      first,
      createClient({ isImmediate: true }).client,
      held.references
    );
    await vi.waitFor(() => expect(release).toBeDefined());
    const uploading = createClient();
    const secondDone = replay(
      second,
      uploading.client,
      createReferences(new Set([FILE_ID])).references
    );
    await vi.waitFor(() => expect(uploading.uploads).toHaveLength(1));

    (navigator as { onLine: boolean }).onLine = false;
    release!();
    await firstDone;

    expect(JSON.parse(readStarted()!)).toMatchObject(AUTHORITY_A);
    uploading.finish();
    await secondDone;
  });

  it("keeps the marker of another tab's sent upload when its own attempt stops after the check, without Web Locks", async () => {
    installDevice();
    await enqueuePhoto(await openTab());
    const first = await openTab();
    const second = await openTab();
    let release: (() => void) | undefined;
    let isCurrent = true;
    const held = createReferences(new Set([FILE_ID]));
    held.references.isCurrent = () => isCurrent;
    held.references.isReferenced = () =>
      new Promise((resolve) => {
        release = () => resolve(true);
      });
    const firstDone = replay(
      first,
      createClient({ isImmediate: true }).client,
      held.references
    );
    await vi.waitFor(() => expect(release).toBeDefined());
    const uploading = createClient();
    const secondDone = replay(
      second,
      uploading.client,
      createReferences(new Set([FILE_ID])).references
    );
    await vi.waitFor(() => expect(uploading.uploads).toHaveLength(1));
    const marker = readStarted();

    isCurrent = false;
    release!();
    await firstDone;

    expect(readStarted()).toBe(marker);
    expect(JSON.parse(marker!)).toMatchObject(AUTHORITY_A);
    uploading.finish();
    await secondDone;
  });

  it("keeps the marker another tab sent under when its own attempt sent no request, without Web Locks", async () => {
    installDevice();
    await enqueuePhoto(await openTab());
    const first = await openTab();
    const stalled = createClient();
    first.countSentRequests(stalled.client, { count: 0 });
    let tearDown: ((error: unknown) => void) | undefined;
    const upload = stalled.client.uploadFile;
    stalled.client.uploadFile = (input) => ({
      ...upload(input),
      done: () =>
        new Promise<UploadResult>((_, reject) => {
          tearDown = reject;
        })
    });
    const firstDone = replay(
      first,
      stalled.client,
      createReferences(new Set([FILE_ID])).references
    );
    await vi.waitFor(() => expect(tearDown).toBeDefined());
    const stalledMarker = readStarted();
    const uploading = createClient();
    const markersAtSend: string[][] = [];
    const send = uploading.client.uploadFile;
    uploading.client.uploadFile = (input) => {
      markersAtSend.push(readMarkers());
      return send(input);
    };
    const secondDone = replay(
      await openTab(),
      uploading.client,
      createReferences(new Set([FILE_ID])).references
    );
    await vi.waitFor(() => expect(uploading.uploads).toHaveLength(1));
    const [sentMarker] = markersAtSend[0].filter((m) => m !== stalledMarker);
    expect(markersAtSend[0]).toHaveLength(2);
    expect(JSON.parse(sentMarker)).toMatchObject(AUTHORITY_A);

    tearDown!(new DOMException("The client was torn down", "AbortError"));
    await firstDone;

    expect(readMarkers()).toEqual([sentMarker]);
    const atB = createClient({ isImmediate: true });
    const b = createReferences(new Set([FILE_ID]), [], AUTHORITY_B);
    await replay(await openTab(), atB.client, b.references);
    expect(atB.uploads).toEqual([]);
    uploading.finish();
    await secondDone;
  });

  it.each([
    ["authority B then leaves the file", "atB"],
    ["deleting its record then discards it", "deleted"]
  ] as const)(
    "keeps the marker of a tab that sent while another's marker landed and that attempt stopped before its request, without Web Locks: %s",
    async (_, next) => {
      installDevice();
      await enqueuePhoto(await openTab());
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let hasLanded: () => void = () => undefined;
      const landed = new Promise<void>((resolve) => {
        hasLanded = resolve;
      });
      let isHeld = true;
      onMarkerWrite(
        () => undefined,
        false,
        () => {
          if (!isHeld) return;
          isHeld = false;
          hasLanded();
          return held;
        }
      );
      let isCurrent = true;
      const writer = createReferences(new Set([FILE_ID]));
      writer.references.isCurrent = () => isCurrent;
      const writerClient = createClient({ isImmediate: true });
      const writerDone = replay(
        await openTab(),
        writerClient.client,
        writer.references
      );
      await landed;
      const writerMarker = readStarted();
      const sender = createClient();
      const senderDone = replay(
        await openTab(),
        sender.client,
        createReferences(new Set([FILE_ID])).references
      );
      await vi.waitFor(() => expect(sender.uploads).toHaveLength(1));
      const [sentMarker] = readMarkers().filter((m) => m !== writerMarker);

      isCurrent = false;
      release();
      await writerDone;

      expect(writerClient.uploads).toEqual([]);
      expect(readMarkers()).toEqual([sentMarker]);
      expect(JSON.parse(sentMarker)).toMatchObject(AUTHORITY_A);
      const after = createClient({ isImmediate: true });
      const { references, discarded } =
        next === "atB"
          ? createReferences(new Set([FILE_ID]), [], AUTHORITY_B)
          : createReferences(new Set());
      await replay(await openTab(), after.client, references);
      expect(after.uploads).toEqual([]);
      expect(discarded).toEqual(next === "atB" ? [] : [FILE_ID]);
      expect(opfs.list(QUEUE)).toEqual(
        next === "atB" ? [`queued_${FILE_ID}`] : []
      );
      sender.finish();
      await senderDone;
    }
  );

  it("removes the marker of a single tab whose torn-down client sent no request, so authority B uploads the file, without Web Locks", async () => {
    installDevice();
    await enqueuePhoto(await openTab());
    const tab = await openTab();
    const torn = createClient({
      uploadError: new DOMException("The client was torn down", "AbortError")
    });
    tab.countSentRequests(torn.client, { count: 0 });
    await replay(
      tab,
      torn.client,
      createReferences(new Set([FILE_ID])).references
    );
    expect(torn.uploads).toHaveLength(1);
    expect(readMarkers()).toEqual([]);

    const atB = createClient({ isImmediate: true });
    await replay(
      await openTab(),
      atB.client,
      createReferences(new Set([FILE_ID]), [], AUTHORITY_B).references
    );

    expect(atB.uploads).toEqual([expect.objectContaining({ fileId: FILE_ID })]);
  });

  it("sends from neither of two first attempts at authorities A and B whose markers both land before either reads them, without Web Locks", async () => {
    installDevice();
    await enqueuePhoto(await openTab());
    const barrier = () => {
      let count = 0;
      let release: () => void = () => undefined;
      const both = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => {
        if (++count === 2) release();
        return both;
      };
    };
    onMarkerWrite(barrier(), false, barrier());
    const atA = createClient({ isImmediate: true });
    const atB = createClient({ isImmediate: true });
    const a = createReferences(new Set([FILE_ID]));
    const b = createReferences(new Set([FILE_ID]), [], AUTHORITY_B);

    await Promise.all([
      replay(await openTab(), atA.client, a.references),
      replay(await openTab(), atB.client, b.references)
    ]);

    expect([...atA.uploads, ...atB.uploads]).toEqual([]);
    expect(readMarkers()).toEqual([]);
    await replay(await openTab(), atA.client, a.references);
    expect(atA.uploads).toEqual([expect.objectContaining({ fileId: FILE_ID })]);
    expect(atB.uploads).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("sends from another tab under its own marker only after an attempt that sent no request removed its marker, with Web Locks", async () => {
    installDevice({ locks: createFakeLocks() });
    await enqueuePhoto(await openTab());
    const first = await openTab();
    const stalled = createClient();
    first.countSentRequests(stalled.client, { count: 0 });
    let tearDown: ((error: unknown) => void) | undefined;
    const stalledUpload = stalled.client.uploadFile;
    stalled.client.uploadFile = (input) => ({
      ...stalledUpload(input),
      done: () =>
        new Promise<UploadResult>((_, reject) => {
          tearDown = reject;
        })
    });
    const firstDone = replay(
      first,
      stalled.client,
      createReferences(new Set([FILE_ID])).references
    );
    await vi.waitFor(() => expect(tearDown).toBeDefined());
    const marker = readStarted();
    const uploading = createClient({ isImmediate: true });
    const markersAtSend: (string | undefined)[] = [];
    const upload = uploading.client.uploadFile;
    uploading.client.uploadFile = (input) => {
      markersAtSend.push(readStarted());
      return upload(input);
    };
    const secondDone = replay(
      await openTab(),
      uploading.client,
      createReferences(new Set([FILE_ID])).references
    );

    tearDown!(new DOMException("The client was torn down", "AbortError"));
    await firstDone;
    await secondDone;

    expect(markersAtSend).toHaveLength(1);
    expect(markersAtSend[0]).not.toBe(marker);
    expect(JSON.parse(markersAtSend[0]!)).toMatchObject(AUTHORITY_A);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it.each([
    ["sent no request", 0, true],
    ["sent a request", 1, false]
  ])(
    "binds the file to its authority only when the torn-down client %s",
    async (_, requests, isUploadedAtB) => {
      installDevice({ locks: createFakeLocks() });
      await enqueuePhoto(await openTab());
      const tab = await openTab();
      const torn = createClient({
        uploadError: new DOMException("The client was torn down", "AbortError")
      });
      const sent = { count: 0 };
      tab.countSentRequests(torn.client, sent);
      const markers: (string | undefined)[] = [];
      const upload = torn.client.uploadFile;
      torn.client.uploadFile = (input) => {
        markers.push(readStarted());
        sent.count += requests;
        return upload(input);
      };
      await replay(
        tab,
        torn.client,
        createReferences(new Set([FILE_ID])).references
      );
      expect(JSON.parse(markers[0]!)).toMatchObject(AUTHORITY_A);

      const atB = createClient({ isImmediate: true });
      const b = createReferences(new Set([FILE_ID]), [], AUTHORITY_B);
      await replay(await openTab(), atB.client, b.references);

      expect(atB.uploads).toHaveLength(isUploadedAtB ? 1 : 0);
      expect(opfs.list(QUEUE)).toEqual(
        isUploadedAtB ? [] : [`queued_${FILE_ID}`]
      );
    }
  );

  it("keeps a recent capture whose record and committed mark land while its record is checked", async () => {
    installDevice();
    const tab = await openTab();
    await stagePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const { references, discarded } = createReferences(new Set());
    references.isReferenced = async () => {
      await tab.markQueuedFileCommitted(QUEUE, FILE_ID);
      return false;
    };

    await replay(tab, fileFn.client, references);

    expect(fileFn.uploads).toEqual([]);
    expect(discarded).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });

  it("keeps a capture saving while an older file's grace deadline pass checks its record", async () => {
    vi.useRealTimers();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    installDevice();
    const tab = await openTab();
    await stagePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const { references, discarded } = createReferences(new Set());
    await replay(tab, fileFn.client, references);
    await vi.advanceTimersByTimeAsync(tab.UNCOMMITTED_GRACE_MS - 60_000);
    await tab.enqueueFile(QUEUE, {
      fileId: SECOND_FILE_ID,
      fileName: "second.png",
      contentType: "image/png",
      blob: new Blob(["second bytes"], { type: "image/png" })
    });
    references.isReferenced = async (fileId) => {
      if (fileId === SECOND_FILE_ID) {
        await tab.markQueuedFileCommitted(QUEUE, SECOND_FILE_ID);
      }
      return false;
    };

    await vi.advanceTimersByTimeAsync(2 * 60_000);

    expect(fileFn.uploads).toEqual([]);
    expect(discarded).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([`queued_${SECOND_FILE_ID}`]);
  });

  it("removes a recent file without a record at its grace deadline, without another trigger", async () => {
    installDevice();
    const tab = await openTab();
    await stagePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const start = Date.now();
    await replay(tab, fileFn.client, createReferences(new Set()).references);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);

    await vi.advanceTimersByTimeAsync(tab.UNCOMMITTED_GRACE_MS - 60_000);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
    vi.spyOn(Date, "now").mockReturnValue(
      start + tab.UNCOMMITTED_GRACE_MS + 60_000
    );
    await vi.advanceTimersByTimeAsync(2 * 60_000);

    expect(fileFn.uploads).toEqual([]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("uploads at its grace deadline a file whose record saved meanwhile", async () => {
    installDevice();
    const tab = await openTab();
    await stagePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const referenced = new Set<string>();
    await replay(tab, fileFn.client, createReferences(referenced).references);
    referenced.add(FILE_ID);

    await vi.advanceTimersByTimeAsync(tab.UNCOMMITTED_GRACE_MS + 60_000);

    expect(fileFn.uploads).toEqual([
      expect.objectContaining({ fileId: FILE_ID })
    ]);
    expect(opfs.list(QUEUE)).toEqual([]);
  });

  it("runs no pass at the grace deadline of a replay that was cancelled", async () => {
    installDevice();
    const tab = await openTab();
    await stagePhoto(tab);
    const fileFn = createClient({ isImmediate: true });
    const controller = new AbortController();
    const { references } = createReferences(new Set());
    let syncs = 0;
    references.sync = async () => ++syncs > 0;
    await replay(tab, fileFn.client, references, controller.signal);
    expect(syncs).toBe(1);

    controller.abort();
    vi.spyOn(Date, "now").mockReturnValue(
      Date.now() + 2 * tab.UNCOMMITTED_GRACE_MS
    );
    await vi.advanceTimersByTimeAsync(tab.UNCOMMITTED_GRACE_MS + 60_000);

    expect(syncs).toBe(1);
    expect(opfs.list(QUEUE)).toEqual([`queued_${FILE_ID}`]);
  });
});
