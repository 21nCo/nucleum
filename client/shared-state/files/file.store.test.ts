import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IFile } from "@nucleum/shared-state/files/file.type";

const mocks = vi.hoisted(() => ({
  resolveFileUrl: vi.fn(),
  query: vi.fn(),
  toastError: vi.fn()
}));

vi.mock("@nucleum/shared-state/files/file-url", () => ({
  resolveFileUrl: mocks.resolveFileUrl
}));
vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { file: { query: mocks.query } }
}));
vi.mock("@nucleum/shared-state/notifications/notification.store", () => ({
  toasts: { error: mocks.toastError, success: vi.fn() }
}));

const { fileStore } = await import("@nucleum/shared-state/files/file.store");

const legacySignedUrl =
  "https://s3.test/bucket/user/files/photo.png?X-Amz-Date=20200101T000000Z&X-Amz-Expires=60";

function fileFnRecord(overrides: Partial<IFile> = {}): IFile {
  return {
    id: "file:image_1",
    label: "photo.png",
    name: "photo.png",
    type: "image/png",
    size: 10,
    fileId: "ff-1",
    ...overrides
  } as IFile;
}

describe("fileStore with FileFn records", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    mocks.resolveFileUrl.mockReset();
    mocks.resolveFileUrl.mockImplementation(
      async (fileId: string, variant: string) =>
        `https://r2.test/${fileId}/${variant}`
    );
    mocks.query.mockReset();
    mocks.toastError.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves the thumbnail variant for a thumbnail and never reads a legacy URL", async () => {
    const result = await fileStore.refresh(
      fileFnRecord({ url: legacySignedUrl, thumbnailUrl: legacySignedUrl }),
      { isUseThumbnailIfAvailable: true }
    );

    expect(result?.thumbnailUrl).toBe("https://r2.test/ff-1/thumbnail");
    expect(result?.url).toBeUndefined();
    expect(mocks.resolveFileUrl.mock.calls).toEqual([["ff-1", "thumbnail"]]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves the full variant when no thumbnail is asked for", async () => {
    const result = await fileStore.refresh(
      fileFnRecord({ url: legacySignedUrl })
    );

    expect(result?.url).toBe("https://r2.test/ff-1/full");
    expect(result?.thumbnailUrl).toBeUndefined();
    expect(mocks.resolveFileUrl.mock.calls).toEqual([["ff-1", "full"]]);
  });

  it("falls back to the full variant when the thumbnail has nothing to render", async () => {
    mocks.resolveFileUrl.mockImplementation(
      async (fileId: string, variant: string) =>
        variant === "full" ? `https://r2.test/${fileId}/full` : undefined
    );

    const result = await fileStore.refresh(fileFnRecord(), {
      isUseThumbnailIfAvailable: true
    });

    expect(result?.thumbnailUrl).toBeUndefined();
    expect(result?.url).toBe("https://r2.test/ff-1/full");
  });

  it("selects a FileFn record by its record ID and resolves it", async () => {
    mocks.query.mockResolvedValue({ data: [fileFnRecord()] });

    const result = await fileStore.refresh("file:image_1" as IFile["id"]);

    expect(result?.url).toBe("https://r2.test/ff-1/full");
  });

  it("returns a legacy record with its stored URL and does not re-sign it", async () => {
    const legacy = fileFnRecord({ fileId: undefined, url: legacySignedUrl });

    const result = await fileStore.refresh(legacy);

    expect(result?.url).toBe(legacySignedUrl);
    expect(mocks.resolveFileUrl).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("downloads a FileFn record's original from its download variant URL", async () => {
    fetchMock.mockResolvedValue(new Response("bytes"));
    const downloadFromBlob = vi
      .spyOn(fileStore, "downloadFromBlob")
      .mockResolvedValue(true);

    await fileStore.download(fileFnRecord({ url: legacySignedUrl }));

    expect(mocks.resolveFileUrl.mock.calls).toEqual([["ff-1", "download"]]);
    expect(fetchMock).toHaveBeenCalledWith("https://r2.test/ff-1/download");
    expect(downloadFromBlob).toHaveBeenCalledTimes(1);
    const [blob, params] = downloadFromBlob.mock.calls[0];
    expect(await blob.text()).toBe("bytes");
    expect(params).toEqual({ fileName: "photo.png", contentType: "image/png" });
    downloadFromBlob.mockRestore();
  });

  it("shows an error when a FileFn record's URL cannot be resolved", async () => {
    mocks.resolveFileUrl.mockResolvedValue(undefined);

    await fileStore.download(fileFnRecord());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Error downloading file. Please try again."
    );
  });
});
