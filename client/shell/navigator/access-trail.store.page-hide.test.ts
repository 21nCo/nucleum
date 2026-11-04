import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createKvMock,
  loadAccessTrailStore
} from "./access-trail-store.test.setup";
import type { AccessTrails } from "./access-trail";

const kv = createKvMock();
const accessTrail = await loadAccessTrailStore(kv, "account");

afterEach(() => {
  vi.useRealTimers();
});

describe("accessTrail when the page is hidden", () => {
  it("writes the trails at once, merged with the trails read at load", async () => {
    vi.useFakeTimers();
    kv.get.mockResolvedValueOnce({
      version: 1,
      recent: [
        {
          key: "other",
          nodes: [
            { id: "node:x", key: "x", parent: -1 },
            { id: "node:y", key: "y", parent: 0 }
          ],
          active: 1,
          startedAt: 1,
          updatedAt: 1
        }
      ]
    });

    accessTrail.get();
    await vi.advanceTimersByTimeAsync(0);
    expect(kv.get).toHaveBeenCalledTimes(1);
    accessTrail.start("node:a");
    accessTrail.extend("node:b");

    window.dispatchEvent(new Event("pagehide"));

    expect(kv.get).toHaveBeenCalledTimes(1);
    expect(kv.set).toHaveBeenCalledTimes(1);
    const written = (kv.set.mock.calls[0] as unknown[])[1] as AccessTrails;
    expect(written.current?.nodes.map((node) => node.id)).toEqual([
      "node:a",
      "node:b"
    ]);
    expect(written.recent.map((trail) => trail.key)).toEqual(["other"]);

    await vi.advanceTimersByTimeAsync(5000);
    expect(kv.get).toHaveBeenCalledTimes(1);
    expect(kv.set).toHaveBeenCalledTimes(1);
  });
});
