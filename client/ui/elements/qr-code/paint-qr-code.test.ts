import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paintQRCode } from "@21n/ui/elements/qr-code/paint-qr-code";

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

describe("client/ui/elements/qr-code/paint-qr-code", () => {
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

  it("paints QR codes to canvas", async () => {
    const canvas = document.createElement("canvas");
    await paintQRCode(canvas, "https://example.com", 128);
    const qrcode = await import("qrcode");
    expect((qrcode as any).default.toCanvas).toHaveBeenCalledWith(
      canvas,
      "https://example.com",
      expect.objectContaining({ width: 128 })
    );
  });
});
