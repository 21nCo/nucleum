import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccessTrails } from "./access-trail";

const kv = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(async () => ({ ok: true }))
}));

vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    datafn: { kv },
    datafnRuntime: writable({ namespace: "account" })
  };
});
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import { accessTrail } from "./access-trail.store";

afterEach(() => {
  vi.useRealTimers();
});

describe("accessTrail when the page is hidden during a save's read", () => {
  it("still writes the trails and the read does not write them again", async () => {
    vi.useFakeTimers();
    let finishRead: (value: null) => void = () => undefined;
    kv.get.mockResolvedValueOnce(null).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRead = resolve;
        })
    );

    accessTrail.start("node:a");
    accessTrail.extend("node:b");
    await vi.advanceTimersByTimeAsync(1000);
    expect(kv.get).toHaveBeenCalledTimes(2);
    expect(kv.set).not.toHaveBeenCalled();

    window.dispatchEvent(new Event("pagehide"));

    expect(kv.set).toHaveBeenCalledTimes(1);
    const written = kv.set.mock.calls[0][1] as AccessTrails;
    expect(written.current?.nodes.map((node) => node.id)).toEqual([
      "node:a",
      "node:b"
    ]);

    finishRead(null);
    await vi.advanceTimersByTimeAsync(5000);
    expect(kv.set).toHaveBeenCalledTimes(1);
  });
});
