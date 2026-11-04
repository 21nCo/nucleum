import { afterEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import { toastDefaultDuration, toasts } from "./notification.store";

afterEach(() => {
  toasts.reset();
  vi.useRealTimers();
});

describe("toasts", () => {
  it("expires only the toast that scheduled the expiry", () => {
    vi.useFakeTimers();
    const first = toasts.success("first");
    vi.advanceTimersByTime(toastDefaultDuration - 10);
    toasts.dismiss(first);
    const second = toasts.error("second");
    vi.advanceTimersByTime(10);
    expect(get(toasts).map((toast) => toast.id)).toEqual([second]);
    vi.advanceTimersByTime(toastDefaultDuration);
    expect(get(toasts)).toEqual([]);
  });

  it("keeps a progress toast when an older toast expires", () => {
    vi.useFakeTimers();
    toasts.showProgress("work", "Working");
    toasts.success("done");
    vi.advanceTimersByTime(toastDefaultDuration);
    expect(get(toasts).map((toast) => toast.id)).toEqual(["work"]);
  });
});
