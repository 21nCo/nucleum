/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { debouncer } from "@21n/shared-utils/debounce";

describe("shared/utils/debounce", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("debounces rapid calls", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debouncer(fn, 200);

    debounced(1);
    debounced(2);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
  });
});
