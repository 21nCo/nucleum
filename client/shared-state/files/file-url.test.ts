import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RenderDescriptor } from "@filefn/client";

const fileFn = vi.hoisted(() => ({
  owner: { userId: "user-a", epoch: 1 } as {
    userId: string;
    epoch: number;
  } | null,
  resolveRenderable: vi.fn()
}));

vi.mock("@nucleum/shared-state/files/filefn-client", () => ({
  captureFileFnOwner: () => fileFn.owner,
  getOwnedFileFnClient: async () => ({
    client: { resolveRenderable: fileFn.resolveRenderable },
    baseUrl: "https://account.test/files"
  })
}));

const {
  FILE_URL_REFRESH_MARGIN_MS,
  FILE_URL_RETRY_MS,
  clearFileUrlCache,
  resolveFileUrl
} = await import("@nucleum/shared-state/files/file-url");

/** A presigned R2 URL that expires 900 seconds after it was signed. */
function signedUrl(path: string, sequence: number) {
  return `https://bucket.r2.test/${path}?X-Amz-Date=20261117T120000Z&X-Amz-Expires=900&X-Amz-Signature=${sequence}`;
}

let signed = 0;
function readyDescriptor(input: {
  fileId: string;
  intent: RenderDescriptor["intent"];
}): RenderDescriptor {
  signed += 1;
  return {
    fileId: input.fileId,
    versionId: "v1",
    intent: input.intent,
    state: "ready",
    mimeType: "image/png",
    name: "photo.png",
    size: 10,
    source:
      input.intent === "thumbnail"
        ? {
            mode: "artifact",
            artifactId: "a1",
            artifactKind: "thumbnail-small",
            url: signedUrl(`${input.fileId}/thumbnail`, signed)
          }
        : {
            mode: "original",
            url: signedUrl(`${input.fileId}/original`, signed)
          }
  };
}

describe("resolveFileUrl", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-17T12:00:00Z"));
    signed = 0;
    fileFn.owner = { userId: "user-a", epoch: 1 };
    fileFn.resolveRenderable.mockReset();
    fileFn.resolveRenderable.mockImplementation(async (input) =>
      readyDescriptor(input)
    );
    clearFileUrlCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("serves a repeated lookup of a file variant from the cache", async () => {
    const first = await resolveFileUrl("file-1", "full");
    vi.advanceTimersByTime(60_000);
    const second = await resolveFileUrl("file-1", "full");

    expect(first).toBe(signedUrl("file-1/original", 1));
    expect(second).toBe(first);
    expect(fileFn.resolveRenderable).toHaveBeenCalledTimes(1);
  });

  it("shares one FileFn request between concurrent lookups", async () => {
    const [first, second] = await Promise.all([
      resolveFileUrl("file-1", "thumbnail"),
      resolveFileUrl("file-1", "thumbnail")
    ]);

    expect(first).toBe(second);
    expect(fileFn.resolveRenderable).toHaveBeenCalledTimes(1);
  });

  it("resolves the URL again before it expires", async () => {
    const first = await resolveFileUrl("file-1", "full");

    vi.advanceTimersByTime(900_000 - FILE_URL_REFRESH_MARGIN_MS - 1);
    expect(await resolveFileUrl("file-1", "full")).toBe(first);

    vi.advanceTimersByTime(1);
    const refreshed = await resolveFileUrl("file-1", "full");

    expect(refreshed).toBe(signedUrl("file-1/original", 2));
    expect(fileFn.resolveRenderable).toHaveBeenCalledTimes(2);
  });

  it("resolves and caches the thumbnail and full variants separately", async () => {
    const thumbnail = await resolveFileUrl("file-1", "thumbnail");
    const full = await resolveFileUrl("file-1", "full");
    await resolveFileUrl("file-1", "thumbnail");
    await resolveFileUrl("file-1", "full");

    expect(thumbnail).toBe(signedUrl("file-1/thumbnail", 1));
    expect(full).toBe(signedUrl("file-1/original", 2));
    expect(fileFn.resolveRenderable.mock.calls.map(([input]) => input)).toEqual(
      [
        { fileId: "file-1", intent: "thumbnail" },
        { fileId: "file-1", intent: "full" }
      ]
    );
  });

  it("keys the cache by file", async () => {
    expect(await resolveFileUrl("file-1", "full")).not.toBe(
      await resolveFileUrl("file-2", "full")
    );
    expect(fileFn.resolveRenderable).toHaveBeenCalledTimes(2);
  });

  it("clears the cache when the FileFn owner changes", async () => {
    await resolveFileUrl("file-1", "full");
    fileFn.owner = { userId: "user-a", epoch: 2 };
    const afterRebind = await resolveFileUrl("file-1", "full");
    fileFn.owner = null;
    const signedOut = await resolveFileUrl("file-1", "full");

    expect(afterRebind).toBe(signedUrl("file-1/original", 2));
    expect(signedOut).toBeUndefined();
    expect(fileFn.resolveRenderable).toHaveBeenCalledTimes(2);
  });

  it("retries a failed lookup only after the retry interval", async () => {
    fileFn.resolveRenderable.mockRejectedValueOnce(new Error("offline"));

    expect(await resolveFileUrl("file-1", "full")).toBeUndefined();
    vi.advanceTimersByTime(FILE_URL_RETRY_MS - 1);
    expect(await resolveFileUrl("file-1", "full")).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(await resolveFileUrl("file-1", "full")).toBe(
      signedUrl("file-1/original", 1)
    );
    expect(fileFn.resolveRenderable).toHaveBeenCalledTimes(2);
  });

  it("returns no URL for a placeholder and asks again after the retry interval", async () => {
    fileFn.resolveRenderable.mockResolvedValueOnce({
      fileId: "file-1",
      versionId: "v1",
      intent: "thumbnail",
      state: "processing",
      mimeType: "application/pdf",
      name: "doc.pdf",
      size: 10,
      source: { mode: "placeholder", placeholderKind: "pdf-processing" }
    } satisfies RenderDescriptor);

    expect(await resolveFileUrl("file-1", "thumbnail")).toBeUndefined();
    vi.advanceTimersByTime(FILE_URL_RETRY_MS);
    expect(await resolveFileUrl("file-1", "thumbnail")).toBe(
      signedUrl("file-1/thumbnail", 1)
    );
  });

  it("resolves a proxy URL under the FileFn authority", async () => {
    fileFn.resolveRenderable.mockResolvedValueOnce({
      ...readyDescriptor({ fileId: "file-1", intent: "full" }),
      source: { mode: "original", url: "/proxy/files/file-1/download" }
    });

    expect(await resolveFileUrl("file-1", "full")).toBe(
      "https://account.test/files/proxy/files/file-1/download"
    );
  });
});
