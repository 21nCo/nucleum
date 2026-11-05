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
    const written = (kv.set.mock.calls[0] as unknown[])[1] as AccessTrails;
    expect(written.current?.nodes.map((node) => node.id)).toEqual([
      "node:a",
      "node:b"
    ]);

    finishRead(null);
    await vi.advanceTimersByTimeAsync(5000);
    expect(kv.set).toHaveBeenCalledTimes(1);
  });
});
