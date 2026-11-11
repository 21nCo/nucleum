import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadAccessTrailStore } from "./access-trail-store.test.setup";
import type { AccessTrails } from "./access-trail";

const storage = (() => {
  const state: { value: unknown } = { value: null };
  const pause = () => new Promise((resolve) => setTimeout(resolve, 10));
  return {
    state,
    kv: {
      get: async () => {
        await pause();
        return state.value === null ? null : structuredClone(state.value);
      },
      set: async (_key: string, value: unknown) => {
        await pause();
        state.value = structuredClone(value);
        return { ok: true };
      }
    }
  };
})();

const held = new Map<string, Promise<unknown>>();
const locks = {
  request: vi.fn((name: string, task: () => Promise<unknown>) => {
    const run = (held.get(name) ?? Promise.resolve()).then(task);
    held.set(
      name,
      run.catch(() => undefined)
    );
    return run;
  })
};

/**
 * Loads a fresh copy of the access trail store, standing in for another
 * window of the account that shares the storage and the locks.
 */
async function openWindow() {
  vi.resetModules();
  return loadAccessTrailStore(storage.kv, "account");
}

const first = await openWindow();
const second = await openWindow();

beforeEach(() => {
  Object.defineProperty(navigator, "locks", {
    value: locks,
    configurable: true
  });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "locks");
});

describe("accessTrail in two windows of one account", () => {
  it("keeps both windows' trails when they save at the same time", async () => {
    expect(second).not.toBe(first);
    vi.useFakeTimers();
    first.get();
    second.get();
    await vi.advanceTimersByTimeAsync(20);

    first.start("node:a");
    first.extend("node:b");
    second.start("node:c");
    second.extend("node:d");
    await vi.advanceTimersByTimeAsync(2000);

    expect(locks.request).toHaveBeenCalledTimes(2);
    expect(locks.request.mock.calls[0][0]).toBe("access-trails:account");
    const saved = storage.state.value as AccessTrails;
    const ids = [saved.current, ...saved.recent].map((trail) =>
      trail?.nodes.map((node) => node.id)
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        ["node:a", "node:b"],
        ["node:c", "node:d"]
      ])
    );
  });
});
