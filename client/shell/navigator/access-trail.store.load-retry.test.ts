import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createKvMock,
  loadAccessTrailStore
} from "./access-trail-store.test.setup";

const kv = createKvMock();
const accessTrail = await loadAccessTrailStore(kv, "account");

const stored = {
  version: 1,
  current: {
    key: "stored",
    nodes: [{ id: "node:c", key: "c", parent: -1 }],
    active: 0
  },
  recent: [
    {
      key: "kept",
      nodes: [
        { id: "node:d", key: "d", parent: -1 },
        { id: "node:e", key: "e", parent: 0 }
      ],
      active: 1,
      startedAt: 1,
      updatedAt: 1
    }
  ]
};

afterEach(() => {
  vi.useRealTimers();
});

describe("accessTrail when the stored trails cannot be read", () => {
  it("retries the read and never writes over the stored trails", async () => {
    vi.useFakeTimers();
    kv.get
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(stored);

    accessTrail.start("node:a");
    await vi.advanceTimersByTimeAsync(900);
    expect(kv.get).toHaveBeenCalledTimes(1);
    expect(kv.set).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);
    expect(kv.get).toHaveBeenCalledTimes(3);
    expect(kv.set).toHaveBeenCalledTimes(1);
    const written = kv.set.mock.calls[0][1] as typeof stored;
    expect(written.current.nodes.map((node) => node.id)).toEqual(["node:a"]);
    expect(written.recent.map((trail) => trail.key)).toContain("kept");
  });
});
