import { afterEach, describe, expect, it, vi } from "vitest";

const kv = vi.hoisted(() => ({
  get: vi.fn(async () => null),
  set: vi.fn()
}));

vi.mock("@nucleum/datafn/datafn.store", async () =>
  (await import("./access-trail-store.test.setup")).datafnStoreWithKv(
    kv,
    "account"
  )
);

vi.mock("@nucleum/client/runtime/logging/logger", async () =>
  (await import("./access-trail-store.test.setup")).loggerStub()
);

import { accessTrail } from "./access-trail.store";

afterEach(() => {
  vi.useRealTimers();
});

describe("accessTrail when a write fails", () => {
  it("keeps the trails dirty and writes them again", async () => {
    vi.useFakeTimers();
    kv.set
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ ok: false, error: "rejected" })
      .mockResolvedValue({ ok: true });

    accessTrail.start("node:a");
    await vi.advanceTimersByTimeAsync(1000);
    expect(kv.set).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(kv.set).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(4000);
    expect(kv.set).toHaveBeenCalledTimes(3);
    const written = kv.set.mock.calls[2][1] as {
      current: { nodes: { id: string }[] };
    };
    expect(written.current.nodes.map((node) => node.id)).toEqual(["node:a"]);

    await vi.advanceTimersByTimeAsync(60000);
    expect(kv.set).toHaveBeenCalledTimes(3);
  });
});
