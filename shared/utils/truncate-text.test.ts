/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { textTruncateMapper } from "@21n/shared-utils/truncate-text";

describe("shared/utils/truncate-text", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("truncates text when exceeding length", () => {
    expect(textTruncateMapper("short", 10)).toBe("short");
    expect(textTruncateMapper("abcdefghijklmnop", 5)).toBe("abcde...");
  });
});
