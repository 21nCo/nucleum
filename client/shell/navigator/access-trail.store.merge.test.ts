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

function savedTrail(key: string, ids: string[], updatedAt: number) {
  return {
    key,
    nodes: ids.map((id, index) => ({
      id,
      key: `${key}:${index}`,
      parent: index - 1
    })),
    active: 0,
    startedAt: 1,
    updatedAt
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("accessTrail when another window saves trails", () => {
  it("reads the stored trails again and keeps them when saving", async () => {
    vi.useFakeTimers();
    kv.get.mockResolvedValueOnce(null).mockResolvedValueOnce({
      version: 1,
      current: savedTrail("other-current", ["node:x", "node:y"], 5),
      recent: [savedTrail("other-recent", ["node:z", "node:w"], 4)]
    });

    accessTrail.start("node:a");
    accessTrail.extend("node:b");
    await vi.advanceTimersByTimeAsync(1000);

    expect(kv.get).toHaveBeenCalledTimes(2);
    expect(kv.set).toHaveBeenCalledTimes(1);
    const written = kv.set.mock.calls[0][1] as AccessTrails;
    expect(written.current?.nodes.map((node) => node.id)).toEqual([
      "node:a",
      "node:b"
    ]);
    expect(written.recent.map((trail) => trail.key)).toEqual([
      "other-current",
      "other-recent"
    ]);
    expect(accessTrail.get()).toEqual(written);
  });
});
