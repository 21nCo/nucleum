import { describe, expect, it, vi } from "vitest";

const load = vi.hoisted(() => {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve: (value: unknown) => resolve(value) };
});

vi.mock("@nucleum/datafn/datafn.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    datafn: {
      kv: {
        get: () => load.promise,
        set: async () => ({ ok: true })
      }
    },
    datafnRuntime: writable(undefined)
  };
});
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

import { accessTrail } from "./access-trail.store";

describe("accessTrail while stored trails load", () => {
  it("keeps the trail key recorded before the load finishes", async () => {
    accessTrail.start("node:a");
    accessTrail.extend("node:b");
    accessTrail.extend("node:a");
    const before = accessTrail.position();
    load.resolve(null);
    await load.promise;
    await Promise.resolve();
    expect(accessTrail.position()).toEqual(before);
  });
});
