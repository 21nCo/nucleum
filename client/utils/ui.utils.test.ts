import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  abg,
  addAnimateClass,
  base64ToBlob,
  bg,
  bounce,
  cn,
  compressImage,
  compressImageToTargetSize,
  convertHeicToPng,
  convertToRGBA,
  emptyTranstition,
  getImageColors,
  getImageColorsFromFile,
  paintQRCode,
  parseImageColorsv2,
  rgbToHex
} from "./ui.utils";

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

describe("client/utils/ui.utils", () => {
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

  it("adds animation class temporarily", async () => {
    vi.useFakeTimers();
    const element = document.createElement("div");
    element.id = "anim";
    document.body.appendChild(element);
    const promise = addAnimateClass("flash", "anim");
    vi.advanceTimersByTime(300);
    await promise;
    expect(element.classList.contains("flash")).toBe(false);
  });

  it("bounces element to direction", async () => {
    vi.useFakeTimers();
    const element = document.createElement("div");
    element.id = "bounce";
    document.body.appendChild(element);
    const promise = bounce("l", "bounce");
    vi.advanceTimersByTime(500);
    await promise;
    expect(element.classList.contains("animate-bounce-l")).toBe(false);
  });

  it("combines class names", () => {
    expect(cn("a", false && "b", ["c"])).toBe("a c");
  });

  it("computes background helpers", () => {
    expect(bg(1, false)).toBe("bg-bgs2");
    expect(abg(true, 0)).toBe("bg-aps1 text-abg");
  });

  it("returns empty transition configuration", () => {
    const transition = emptyTranstition();
    expect(transition.css()).toContain("transition: none");
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

  it("converts colors to rgba", () => {
    expect(convertToRGBA("#ffffff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
    const div = document.createElement("div");
    document.body.appendChild(div);
    const styleSpy = vi
      .spyOn(window, "getComputedStyle")
      .mockReturnValue({ color: "rgb(255, 0, 0)" } as any);
    expect(convertToRGBA("red", 0.2)).toBe("rgba(255, 0, 0, 0.2)");
    styleSpy.mockRestore();
  });

  it("extracts image colors", async () => {
    const img = document.createElement("img");
    img.src = "https://example.com/image.png";
    const colors = await getImageColors(img);
    expect(colors[0]).toBe("rgb(255, 0, 0)");
  });

  it("extracts image colors from file", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "image.png", {
      type: "image/png"
    });
    const colors = await getImageColorsFromFile(file, 2);
    expect(Array.isArray(colors)).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("clusters colors from pixel data", () => {
    const colors = parseImageColorsv2(
      new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255
      ]),
      2
    );
    expect(colors.length).toBe(2);
  });

  it("converts rgb strings to hex", () => {
    expect(rgbToHex("rgb(255, 0, 0)")).toBe("#ff0000");
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
