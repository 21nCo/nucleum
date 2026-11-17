import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import type { UploadArtifactInput, UploadInput } from "@filefn/client";
import account from "@nucleum/client/runtime/account/account.store";
import {
  UserDataMode,
  UserSessionType
} from "@nucleum/client/runtime/account/account.type";
import { fileTransport } from "@nucleum/client/runtime/files/file-transport";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { Product } from "@nucleum/client/config/product.type";
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

const fileFn = vi.hoisted(() => ({
  uploads: [] as UploadInput[],
  artifacts: [] as UploadArtifactInput[],
  deleted: [] as string[],
  done: vi.fn(),
  uploadArtifact: vi.fn(),
  client: null as unknown
}));
vi.mock(
  "@nucleum/shared-state/files/filefn-client",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@nucleum/shared-state/files/filefn-client")
    >()),
    getFileFnClient: async () => fileFn.client
  })
);

const recordInserts = vi.hoisted(() => ({
  inserts: 0,
  rejectWith: undefined as { ok: false; error: Error } | undefined
}));
/** Counts file record inserts and can make the next one fail. */
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
        const rejection = recordInserts.rejectWith;
        recordInserts.rejectWith = undefined;
        return rejection ?? target.mutate(...args);
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
const { resolveFileProcessingMode } = await import("./file-processing");

const initialAccount = account.get();
const cloudAccount = {
  dataMode: UserDataMode.CLOUD,
  sessionType: UserSessionType.RETURNING,
  userId: "upload-user",
  userInfo: {
    id: "user:upload-user",
    email: "upload-user@example.test",
    nickName: "upload-user",
    joinDate: new Date(0),
    lastLogin: new Date(0),
    region: "insouth"
  }
};

beforeEach(async () => {
  await initializeNucleumDatafn({
    product: Product.MEMOTRON,
    account: { dataMode: UserDataMode.LOCAL, userId: "file-upload-filefn" },
    dapId: "fixture",
    env: `test-${crypto.randomUUID()}`
  });
  account.set(cloudAccount);
  recordInserts.inserts = 0;
  fileFn.uploads = [];
  fileFn.artifacts = [];
  fileFn.deleted = [];
  fileFn.done.mockImplementation(async () => ({
    fileId: fileFn.uploads.at(-1)?.fileId,
    versionId: "ver_1"
  }));
  fileFn.uploadArtifact.mockImplementation(
    async (input: UploadArtifactInput) => {
      fileFn.artifacts.push(input);
      return { artifactId: `art_${input.kind}` };
    }
  );
  fileFn.client = {
    uploadFile: (input: UploadInput) => {
      fileFn.uploads.push(input);
      return {
        uploadSessionId: "ses_1",
        fileId: input.fileId,
        done: fileFn.done
      };
    },
    uploadArtifact: fileFn.uploadArtifact,
    deleteFile: async (fileId: string) => {
      fileFn.deleted.push(fileId);
    }
  };
  codec.compressImageToTargetSize.mockResolvedValue(
    new Blob(["thumb"], { type: "image/jpeg" })
  );
  codec.convertHeicToPng.mockResolvedValue({
    convertedBlob: new Blob(["png"], { type: "image/png" }),
    convertedFileName: "converted"
  });
});

afterEach(async () => {
  await destroyNucleumDatafn();
  account.set(initialAccount);
  toasts.reset();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function savedRecord(id: string) {
  const saved = await datafn.file.query({ filters: { id } });
  return saved.data?.[0] as Record<string, unknown> | undefined;
}

function image(type = "image/jpeg") {
  return new Blob(["original image bytes"], { type });
}

describe("uploadFileV2 through FileFn", () => {
  it("uploads with a client-chosen fileId and stores it without a URL or bytes", async () => {
    const signedUrl = vi.spyOn(fileTransport, "getSignedUrl");
    const legacyPut = vi.spyOn(fileTransport, "uploadFile");
    const [file] = await fileUpload.uploadFileV2(
      "image/jpeg",
      "my photo.jpg",
      image(),
      { isGenerateThumbnail: true }
    );

    expect(fileFn.uploads).toHaveLength(1);
    const upload = fileFn.uploads[0];
    expect(upload.fileId).toMatch(/^file_[A-Za-z0-9_-]{8,64}$/);
    expect(upload.policy).toBe("nucleus-durable-default");
    expect(upload.fileName).toBe("my_photo.jpg");
    expect(upload.file.type).toBe("image/jpeg");
    expect(signedUrl).not.toHaveBeenCalled();
    expect(legacyPut).not.toHaveBeenCalled();

    const record = await savedRecord(file.id);
    expect(record).toMatchObject({
      id: file.id,
      fileId: upload.fileId,
      label: "my_photo.jpg",
      name: "my_photo.jpg",
      type: "image/jpeg",
      size: image().size
    });
    expect(record?.url ?? null).toBeNull();
    expect(record?.thumbnailUrl ?? null).toBeNull();
    expect(record?.data ?? null).toBeNull();
    expect(record?.thumbnailData ?? null).toBeNull();
  });

  it("makes the thumbnail on the device and uploads it as an artifact in local mode", async () => {
    const info = vi.spyOn(logger, "info");
    const [file] = await fileUpload.uploadFileV2(
      "image/jpeg",
      "a.jpg",
      image(),
      { isGenerateThumbnail: true }
    );

    expect(codec.compressImageToTargetSize).toHaveBeenCalledTimes(1);
    expect(fileFn.artifacts).toHaveLength(1);
    const [thumbnail] = fileFn.artifacts;
    expect(thumbnail).toMatchObject({
      fileId: fileFn.uploads[0].fileId,
      versionId: "ver_1",
      kind: "thumbnail-medium",
      mimeType: "image/jpeg"
    });
    expect(Number.isInteger(thumbnail.durationMs)).toBe(true);

    const record = await savedRecord(file.id);
    expect(record?.processing).toEqual({
      mode: "local",
      artifacts: { "thumbnail-medium": { durationMs: thumbnail.durationMs } }
    });
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        at: "file.processing",
        mode: "local",
        fileId: fileFn.uploads[0].fileId,
        deviceDurationMs: thumbnail.durationMs
      })
    );
  });

  it("uploads the original HEIC and its converted PNG and thumbnail in both mode", async () => {
    vi.stubEnv("VITE_FILE_PROCESSING_MODE", "both");
    const heic = new Blob(["heic bytes"], { type: "image/heic" });
    const [file] = await fileUpload.uploadFileV2(
      "image/heic",
      "IMG_1.HEIC",
      heic,
      {
        isGenerateThumbnail: true
      }
    );

    expect(fileFn.uploads[0].file.type).toBe("image/heic");
    expect(codec.convertHeicToPng).toHaveBeenCalledWith(heic);
    const converted = (await codec.convertHeicToPng.mock.results[0].value)
      .convertedBlob;
    expect(codec.compressImageToTargetSize).toHaveBeenCalledWith(converted);
    expect(fileFn.artifacts.map((artifact) => artifact.kind).sort()).toEqual([
      "converted",
      "thumbnail-medium"
    ]);
    expect(
      fileFn.artifacts.find((artifact) => artifact.kind === "converted")
        ?.mimeType
    ).toBe("image/png");

    const record = await savedRecord(file.id);
    expect(record).toMatchObject({ type: "image/heic", name: "IMG_1.HEIC" });
    expect(record?.processing).toMatchObject({
      mode: "both",
      artifacts: {
        converted: { durationMs: expect.any(Number) },
        "thumbnail-medium": { durationMs: expect.any(Number) }
      }
    });
  });

  it("skips device processing in remote mode and still records the mode", async () => {
    vi.stubEnv("VITE_FILE_PROCESSING_MODE", "remote");
    const info = vi.spyOn(logger, "info");
    const [file] = await fileUpload.uploadFileV2(
      "image/heic",
      "IMG_2.heic",
      new Blob(["heic"], { type: "image/heic" }),
      { isGenerateThumbnail: true }
    );

    expect(codec.convertHeicToPng).not.toHaveBeenCalled();
    expect(codec.compressImageToTargetSize).not.toHaveBeenCalled();
    expect(fileFn.uploadArtifact).not.toHaveBeenCalled();
    const record = await savedRecord(file.id);
    expect(record?.processing).toEqual({ mode: "remote", artifacts: {} });
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        at: "file.processing",
        mode: "remote",
        deviceDurationMs: 0
      })
    );
  });

  it("uploads a thumbnail the caller supplies even in remote mode", async () => {
    vi.stubEnv("VITE_FILE_PROCESSING_MODE", "remote");
    const thumbnailBlob = new Blob(["wave"], { type: "image/png" });
    const [file] = await fileUpload.uploadFileV2(
      "audio/wav",
      "rec.wav",
      new Blob(["wav"], { type: "audio/wav" }),
      { thumbnailBlob }
    );

    expect(fileFn.artifacts).toEqual([
      expect.objectContaining({
        kind: "thumbnail-medium",
        data: thumbnailBlob,
        mimeType: "image/png",
        durationMs: undefined
      })
    ]);
    const record = await savedRecord(file.id);
    expect(record?.processing).toEqual({
      mode: "remote",
      artifacts: { "thumbnail-medium": {} }
    });
  });

  it("uses the temporary policy for a temporary upload", async () => {
    await fileUpload.uploadFileV2("image/png", "tmp.png", image("image/png"), {
      isTemp: true
    });
    expect(fileFn.uploads[0].policy).toBe("nucleus-temporary-default");
  });

  it("keeps the HEIC upload without a converted artifact when conversion fails in both mode", async () => {
    vi.stubEnv("VITE_FILE_PROCESSING_MODE", "both");
    codec.convertHeicToPng.mockRejectedValueOnce(new Error("decoder failed"));
    const heic = new Blob(["heic bytes"], { type: "image/heic" });
    const [file] = await fileUpload.uploadFileV2(
      "image/heic",
      "IMG_3.heic",
      heic,
      {
        isGenerateThumbnail: true
      }
    );

    expect(fileFn.deleted).toEqual([]);
    expect(fileFn.artifacts.map((artifact) => artifact.kind)).not.toContain(
      "converted"
    );
    const record = await savedRecord(file.id);
    expect(record?.fileId).toBe(fileFn.uploads[0].fileId);
    expect(
      (record?.processing as { artifacts: object }).artifacts
    ).not.toHaveProperty("converted");
    expect(get(toasts)).toEqual([]);
  });

  it("keeps the HEIC upload without a converted artifact when its upload fails in both mode", async () => {
    vi.stubEnv("VITE_FILE_PROCESSING_MODE", "both");
    fileFn.uploadArtifact.mockImplementation(
      async (input: UploadArtifactInput) => {
        if (input.kind === "converted") throw new Error("404");
        fileFn.artifacts.push(input);
        return { artifactId: `art_${input.kind}` };
      }
    );
    const [file] = await fileUpload.uploadFileV2(
      "image/heic",
      "IMG_5.heic",
      new Blob(["heic bytes"], { type: "image/heic" }),
      { isGenerateThumbnail: true }
    );

    expect(fileFn.deleted).toEqual([]);
    const record = await savedRecord(file.id);
    expect(record?.fileId).toBe(fileFn.uploads[0].fileId);
    expect(
      Object.keys((record?.processing as { artifacts: object }).artifacts)
    ).toEqual(["thumbnail-medium"]);
    expect(get(toasts)).toEqual([]);
  });

  it("keeps the record when an artifact upload fails, without that kind", async () => {
    fileFn.uploadArtifact.mockRejectedValueOnce(new Error("404"));
    const [file] = await fileUpload.uploadFileV2(
      "image/jpeg",
      "b.jpg",
      image(),
      {
        isGenerateThumbnail: true
      }
    );
    const record = await savedRecord(file.id);
    expect(record?.fileId).toBe(fileFn.uploads[0].fileId);
    expect(record?.processing).toEqual({ mode: "local", artifacts: {} });
  });
});

describe("uploadFileV2 failures", () => {
  it("shows a failed upload and saves nothing on the device", async () => {
    fileFn.done.mockRejectedValueOnce(new Error("upload failed"));

    await expect(
      fileUpload.uploadFileV2("image/jpeg", "lost photo.jpg", image())
    ).rejects.toThrow("upload failed");

    expect(recordInserts.inserts).toBe(0);
    expect((await datafn.file.query({})).data ?? []).toHaveLength(0);
    expect(get(toasts)).toEqual([
      expect.objectContaining({
        message: "Couldn't upload lost photo.jpg. Please try again."
      })
    ]);
  });

  it("shows the failure when the signed-in account has no FileFn client", async () => {
    fileFn.client = null;
    await expect(
      fileUpload.uploadFileV2("image/jpeg", "c.jpg", image())
    ).rejects.toThrow();
    expect((await datafn.file.query({})).data ?? []).toHaveLength(0);
    expect(get(toasts)).toHaveLength(1);
  });

  it("fails visibly and deletes the upload when HEIC conversion fails in local mode", async () => {
    codec.convertHeicToPng.mockRejectedValueOnce(new Error("decoder failed"));

    await expect(
      fileUpload.uploadFileV2(
        "image/heic",
        "IMG_4.heic",
        new Blob(["heic"], { type: "image/heic" }),
        { isGenerateThumbnail: true }
      )
    ).rejects.toThrow("Failed to convert HEIC file");

    expect(fileFn.uploads).toHaveLength(1);
    expect(fileFn.deleted).toEqual([fileFn.uploads[0].fileId]);
    expect(fileFn.uploadArtifact).not.toHaveBeenCalled();
    expect(recordInserts.inserts).toBe(0);
    expect((await datafn.file.query({})).data ?? []).toHaveLength(0);
    expect(get(toasts)).toEqual([
      expect.objectContaining({
        message: "Couldn't upload IMG_4.heic. Please try again."
      })
    ]);
  });

  it("fails visibly and deletes the upload when the converted artifact does not upload in local mode", async () => {
    fileFn.uploadArtifact.mockImplementation(
      async (input: UploadArtifactInput) => {
        if (input.kind === "converted") throw new Error("404");
        fileFn.artifacts.push(input);
        return { artifactId: `art_${input.kind}` };
      }
    );

    await expect(
      fileUpload.uploadFileV2(
        "image/heic",
        "IMG_6.heic",
        new Blob(["heic"], { type: "image/heic" }),
        { isGenerateThumbnail: true }
      )
    ).rejects.toThrow("The converted artifact did not upload");

    expect(fileFn.deleted).toEqual([fileFn.uploads[0].fileId]);
    expect(recordInserts.inserts).toBe(0);
    expect((await datafn.file.query({})).data ?? []).toHaveLength(0);
    expect(get(toasts)).toEqual([
      expect.objectContaining({
        message: "Couldn't upload IMG_6.heic. Please try again."
      })
    ]);
  });

  it("rethrows without a toast when the caller shows its own error", async () => {
    fileFn.done.mockRejectedValueOnce(new Error("upload failed"));

    await expect(
      fileUpload.uploadFileV2("image/jpeg", "cover.jpg", image(), {
        isErrorToastSuppressed: true
      })
    ).rejects.toThrow("upload failed");

    expect(get(toasts)).toEqual([]);
  });

  it("deletes the uploaded file and shows the failure when the record cannot be saved", async () => {
    recordInserts.rejectWith = {
      ok: false,
      error: new Error("record rejected")
    };

    await expect(
      fileUpload.uploadFileV2("image/jpeg", "d.jpg", image())
    ).rejects.toThrow("record rejected");

    expect(fileFn.deleted).toEqual([fileFn.uploads[0].fileId]);
    expect(get(toasts)).toHaveLength(1);
  });
});

describe("resolveFileProcessingMode", () => {
  it.each([
    [undefined, "local"],
    ["", "local"],
    ["local", "local"],
    [" Remote ", "remote"],
    ["both", "both"],
    ["server", "local"]
  ])("resolves %j to %s", (value, mode) => {
    expect(resolveFileProcessingMode(value)).toBe(mode);
  });

  it("reads the environment's mode", () => {
    vi.stubEnv("VITE_FILE_PROCESSING_MODE", "remote");
    expect(resolveFileProcessingMode()).toBe("remote");
  });
});
