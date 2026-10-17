/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateUID } from "@21n/shared-utils/legacy-id";

describe("shared/utils/legacy-id", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("generates deterministic UID when clock/random mocked", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const randomMock = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0.123456789)
      .mockReturnValueOnce(0.987654321);

    const uid = generateUID();

    expect(uid).toBe("loyw3v284fzzzxjyzk00000y");
    expect(randomMock).toHaveBeenCalledTimes(2);
  });
});
