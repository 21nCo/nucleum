import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateImagePreviewFromPdf } from "./pdf.utils";

const pdfMocks = vi.hoisted(() => {
  const cleanup = vi.fn();
  const render = vi.fn(() => ({ promise: Promise.resolve() }));
  const getViewport = vi.fn(() => ({ width: 200, height: 100 }));
  const destroyDoc = vi.fn();
  const destroyTask = vi.fn();
  const getPage = vi.fn(async () => ({ getViewport, render, cleanup }));
  const getDocument = vi.fn(() => ({
    promise: Promise.resolve({ getPage, destroy: destroyDoc }),
    destroy: destroyTask
  }));
  return {
    cleanup,
    render,
    getViewport,
    destroyDoc,
    destroyTask,
    getPage,
    getDocument
  };
});

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: pdfMocks.getDocument
}));

describe("client/utils/pdf.utils", () => {
  let originalGetContext: any;
  let originalToBlob: any;

  beforeEach(() => {
    vi.clearAllMocks();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn()
    }));
    HTMLCanvasElement.prototype.toBlob = function (callback) {
      callback(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    };
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  });

  it("generates image preview from pdf blob", async () => {
    const blob = {
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer
    } as unknown as Blob;

    const preview = await generateImagePreviewFromPdf(blob);

    expect(preview.type).toBe("image/png");
    expect(pdfMocks.getDocument).toHaveBeenCalled();
    expect(pdfMocks.getPage).toHaveBeenCalledWith(1);
    expect(pdfMocks.render).toHaveBeenCalled();
    expect(pdfMocks.cleanup).toHaveBeenCalled();
    expect(pdfMocks.destroyDoc).toHaveBeenCalled();
    expect(pdfMocks.destroyTask).toHaveBeenCalled();
  });
});
