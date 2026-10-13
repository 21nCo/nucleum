/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadJson } from "@21n/shared-utils/download-json";

describe("shared/utils/download-json", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("downloads JSON content", () => {
    const blobUrl = "blob://test";
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue(blobUrl);
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const anchor = {
      href: "",
      download: "",
      click: vi.fn()
    } as unknown as HTMLAnchorElement;
    const createElementSpy = vi.fn().mockReturnValue(anchor);
    const originalDocument = globalThis.document;
    (globalThis as any).document = { createElement: createElementSpy };

    downloadJson('{"foo":1}', "sample");

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(anchor.download).toBe("sample.json");
    expect(anchor.href).toBe(blobUrl);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith(blobUrl);

    if (originalDocument) {
      (globalThis as any).document = originalDocument;
    } else {
      delete (globalThis as any).document;
    }
  });
});
