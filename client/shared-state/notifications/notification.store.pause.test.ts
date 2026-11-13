import { afterEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";

vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import { toastDefaultDuration, toasts } from "./notification.store";

const ids = () => get(toasts).map((toast) => toast.id);

afterEach(() => {
  toasts.reset();
  vi.useRealTimers();
});

describe("toast pause and resume", () => {
  it("keeps a paused toast past its duration", () => {
    vi.useFakeTimers();
    const id = toasts.success("hold");
    vi.advanceTimersByTime(1000);
    toasts.pause([id]);
    vi.advanceTimersByTime(toastDefaultDuration * 3);
    expect(ids()).toEqual([id]);
  });

  it("resumes with the time that was left", () => {
    vi.useFakeTimers();
    const id = toasts.success("hold");
    vi.advanceTimersByTime(1000);
    toasts.pause([id]);
    vi.advanceTimersByTime(10_000);
    toasts.resume([id]);
    vi.advanceTimersByTime(toastDefaultDuration - 1000 - 10);
    expect(ids()).toEqual([id]);
    vi.advanceTimersByTime(10);
    expect(ids()).toEqual([]);
  });

  it("leaves other toasts counting down", () => {
    vi.useFakeTimers();
    const held = toasts.success("held");
    const other = toasts.error("other");
    toasts.pause([held]);
    vi.advanceTimersByTime(toastDefaultDuration);
    expect(ids()).toEqual([held]);
    expect(ids()).not.toContain(other);
  });

  it("ignores pause and resume for unknown or dismissed toasts", () => {
    vi.useFakeTimers();
    const id = toasts.success("gone");
    toasts.dismiss(id);
    toasts.pause([id, "missing"]);
    toasts.resume([id, "missing"]);
    vi.advanceTimersByTime(toastDefaultDuration);
    expect(ids()).toEqual([]);
  });
});
