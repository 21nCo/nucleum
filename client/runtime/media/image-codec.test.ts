import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  base64ToBlob,
  compressImage,
  compressImageToTargetSize,
  convertHeicToPng
} from "@nucleum/client/runtime/media/image-codec";

vi.mock("qrcode", () => ({
  default: {
    toCanvas: vi.fn().mockResolvedValue(undefined)
  },
  toCanvas: vi.fn().mockResolvedValue(undefined)
}));

const heicMock = vi.fn(async () => new Blob([1, 2, 3], { type: "image/png" }));

vi.mock("heic2any", () => ({
  default: heicMock
}));

describe("client/runtime/media/image-codec", () => {
  let originalGetContext: any;

  let originalToBlob: any;

  let originalFetch: any;

  let originalCreateObjectUrl: any;

  let originalRevokeObjectUrl: any;

  let ImageMock: any;

  beforeEach(() => {
    vi.useRealTimers();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalToBlob = HTMLCanvasElement.prototype.toBlob;
    originalFetch = globalThis.fetch;
    originalCreateObjectUrl = URL.createObjectURL;
    originalRevokeObjectUrl = URL.revokeObjectURL;

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: vi
        .fn()
        .mockReturnValue({ data: new Uint8ClampedArray([255, 0, 0, 255]) })
    }));

    HTMLCanvasElement.prototype.toBlob = function (callback, _type, quality) {
      const size = Math.max(1, Math.round((quality ?? 0.6) * 1000));
      const data = new Uint8Array(size).fill(1);
      callback(new Blob([data], { type: "image/jpeg" }));
    };

    globalThis.fetch = vi.fn(async () => ({
      blob: async () => new Blob([1, 2, 3], { type: "image/png" })
    })) as any;

    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();

    ImageMock = class {
      width = 10;
      height = 10;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
      set crossOrigin(_value: string) {}
    };

    (globalThis as any).Image = ImageMock;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("compresses images using canvas", async () => {
    const blob = new Blob([new Uint8Array(1024)], { type: "image/jpeg" });
    const result = await compressImage(blob, 400, 0.5);
    expect(result.size).toBeGreaterThan(0);
  });

  it("compresses images towards target size", async () => {
    const blob = new Blob([new Uint8Array(5000)], { type: "image/jpeg" });
    const result = await compressImageToTargetSize(blob, 1000, 200);
    expect(result.size).toBeGreaterThan(0);
  });

  it("converts base64 to blob", () => {
    const data = btoa("test");
    const blob = base64ToBlob(data, "text/plain");
    expect(blob.type).toBe("text/plain");
  });

  it("converts heic files to png", async () => {
    const blob = new Blob([new Uint8Array([1, 2])], { type: "image/heic" });
    const result = await convertHeicToPng(blob);
    expect(result.convertedBlob.type).toBe("image/png");
    expect(heicMock).toHaveBeenCalled();
  });
});
