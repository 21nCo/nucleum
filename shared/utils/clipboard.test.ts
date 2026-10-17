/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "@21n/shared-utils/clipboard";

describe("shared/utils/clipboard", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("writes to clipboard", () => {
    const writeText = vi.fn();
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });

    copyToClipboard("hello");

    expect(writeText).toHaveBeenCalledWith("hello");

    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", {
        value: originalClipboard,
        configurable: true
      });
    } else {
      delete (navigator as any).clipboard;
    }
  });
});
