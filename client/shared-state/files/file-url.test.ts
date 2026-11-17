import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtifactDescriptor, RenderDescriptor } from "@filefn/client";

type Owner = { userId: string; epoch: number };

const fileFn = vi.hoisted(() => ({
  owner: { userId: "user-a", epoch: 1 } as Owner | null,
  afterCapture: undefined as (() => void) | undefined,
  afterConfirm: undefined as (() => void) | undefined,
  resolveRenderable: vi.fn(),
  listArtifacts: vi.fn(),
  downloadArtifact: vi.fn()
}));

vi.mock("@nucleum/shared-state/files/filefn-client", () => ({
  captureSettledFileFnOwner: async () => {
    const owner = fileFn.owner;
    const afterCapture = fileFn.afterCapture;
    fileFn.afterCapture = undefined;
    afterCapture?.();
    return owner;
  },
  confirmFileFnOwner: async (owner: Owner) => {
    if (owner.epoch !== fileFn.owner?.epoch) {
      throw new DOMException("The FileFn client was torn down", "AbortError");
    }
    const afterConfirm = fileFn.afterConfirm;
    fileFn.afterConfirm = undefined;
    if (afterConfirm) queueMicrotask(afterConfirm);
  },
  settleFileFnOwner: async (owner: Owner) => {
    if (owner.epoch !== fileFn.owner?.epoch) {
      throw new DOMException("The FileFn client was torn down", "AbortError");
    }
  },
  isFileFnOwnerCurrent: (owner: Owner) =>
    owner.userId === fileFn.owner?.userId &&
    owner.epoch === fileFn.owner?.epoch,
  getOwnedFileFnClient: async () => ({
    client: {
      resolveRenderable: fileFn.resolveRenderable,
      listArtifacts: fileFn.listArtifacts,
      downloadArtifact: fileFn.downloadArtifact
    },
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
    fileFn.afterCapture = undefined;
    fileFn.afterConfirm = undefined;
    fileFn.listArtifacts.mockReset();
    fileFn.downloadArtifact.mockReset();
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

  describe("when the owner's generation ends before a lookup returns", () => {
    const accountSwitch = () => {
      fileFn.owner = { userId: "user-b", epoch: 2 };
    };
    const signOut = () => {
      fileFn.owner = null;
    };

    it.each([
      ["an account switch", accountSwitch],
      ["a sign-out", signOut]
    ])("returns no cached URL after %s", async (_, endGeneration) => {
      expect(await resolveFileUrl("file-1", "full")).toBe(
        signedUrl("file-1/original", 1)
      );

      fileFn.afterCapture = endGeneration;

      expect(await resolveFileUrl("file-1", "full")).toBeUndefined();
      expect(fileFn.resolveRenderable).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["an account switch", accountSwitch],
      ["a sign-out", signOut]
    ])("returns no freshly resolved URL after %s", async (_, endGeneration) => {
      let respond: (descriptor: RenderDescriptor) => void = () => {};
      fileFn.resolveRenderable.mockImplementationOnce(
        () =>
          new Promise<RenderDescriptor>((resolve) => {
            respond = resolve;
          })
      );

      const lookup = resolveFileUrl("file-1", "full");
      await vi.waitFor(() =>
        expect(fileFn.resolveRenderable).toHaveBeenCalledTimes(1)
      );
      endGeneration();
      respond(readyDescriptor({ fileId: "file-1", intent: "full" }));

      expect(await lookup).toBeUndefined();
    });

    it.each([
      ["an account switch", accountSwitch],
      ["a sign-out", signOut]
    ])(
      "returns no cached URL after %s that follows the final confirmation",
      async (_, endGeneration) => {
        expect(await resolveFileUrl("file-1", "full")).toBe(
          signedUrl("file-1/original", 1)
        );

        fileFn.afterConfirm = endGeneration;

        expect(await resolveFileUrl("file-1", "full")).toBeUndefined();
        expect(fileFn.resolveRenderable).toHaveBeenCalledTimes(1);
      }
    );

    it.each([
      ["an account switch", accountSwitch],
      ["a sign-out", signOut]
    ])(
      "returns no freshly resolved URL after %s that follows the final confirmation",
      async (_, endGeneration) => {
        fileFn.afterConfirm = endGeneration;

        expect(await resolveFileUrl("file-1", "full")).toBeUndefined();
        expect(fileFn.resolveRenderable).toHaveBeenCalledTimes(1);
      }
    );
  });

  describe("a HEIC original", () => {
    const heicUrl = signedUrl("file-1/original.heic", 0);
    const pngUrl = signedUrl("file-1/converted.png", 0);
    const jpegThumbnailUrl = signedUrl("file-1/thumbnail.jpg", 0);

    function artifact(
      kind: string,
      mimeType: string,
      versionId = "v1"
    ): ArtifactDescriptor {
      return {
        artifactId: `${kind}-${versionId}`,
        fileId: "file-1",
        versionId,
        kind,
        mimeType,
        size: 10,
        createdAt: "2026-11-17T12:00:00Z"
      };
    }

    beforeEach(() => {
      fileFn.resolveRenderable.mockImplementation(
        async (input: { fileId: string; intent: RenderDescriptor["intent"] }) =>
          ({
            fileId: input.fileId,
            versionId: "v1",
            intent: input.intent,
            state: "ready",
            mimeType:
              input.intent === "thumbnail" ? "image/jpeg" : "image/heic",
            name: "photo.heic",
            size: 10,
            source:
              input.intent === "thumbnail"
                ? {
                    mode: "artifact",
                    artifactId: "thumbnail-small-v1",
                    artifactKind: "thumbnail-small",
                    url: jpegThumbnailUrl
                  }
                : { mode: "original", url: heicUrl }
          }) satisfies RenderDescriptor
      );
      fileFn.downloadArtifact.mockImplementation(
        async (_fileId: string, artifactId: string) =>
          artifactId === "converted-v1" ? pngUrl : undefined
      );
    });

    it("views its converted PNG in full, its JPEG thumbnail as thumbnail and downloads the original", async () => {
      fileFn.listArtifacts.mockResolvedValue([
        artifact("converted", "image/png", "v0"),
        artifact("thumbnail-small", "image/jpeg"),
        artifact("converted", "image/png")
      ]);

      expect(await resolveFileUrl("file-1", "full")).toBe(pngUrl);
      expect(await resolveFileUrl("file-1", "thumbnail")).toBe(
        jpegThumbnailUrl
      );
      expect(await resolveFileUrl("file-1", "download")).toBe(heicUrl);
      expect(fileFn.downloadArtifact.mock.calls).toEqual([
        ["file-1", "converted-v1"]
      ]);
      expect(fileFn.listArtifacts).toHaveBeenCalledTimes(1);
    });

    it("views the original in full until a converted image exists, then the conversion", async () => {
      fileFn.listArtifacts.mockResolvedValue([
        artifact("thumbnail-small", "image/jpeg")
      ]);

      expect(await resolveFileUrl("file-1", "full")).toBe(heicUrl);
      expect(fileFn.downloadArtifact).not.toHaveBeenCalled();

      fileFn.listArtifacts.mockResolvedValue([
        artifact("thumbnail-small", "image/jpeg"),
        artifact("converted", "image/png")
      ]);
      vi.advanceTimersByTime(FILE_URL_RETRY_MS - 1);
      expect(await resolveFileUrl("file-1", "full")).toBe(heicUrl);
      vi.advanceTimersByTime(1);
      expect(await resolveFileUrl("file-1", "full")).toBe(pngUrl);
    });

    it("does not list artifacts for a browser-decodable original", async () => {
      fileFn.resolveRenderable.mockImplementation(async (input) =>
        readyDescriptor(input)
      );

      expect(await resolveFileUrl("file-1", "full")).toBe(
        signedUrl("file-1/original", 1)
      );
      expect(fileFn.listArtifacts).not.toHaveBeenCalled();
    });
  });
});
