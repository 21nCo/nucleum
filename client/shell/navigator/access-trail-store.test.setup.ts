import { vi } from "vitest";
import { writable } from "svelte/store";

/**
 * Stubs for the access trail store tests. It imports nothing the tests mock,
 * so the store it loads reads the stubs.
 */

/** KV store mock whose reads return nothing until a test sets them and whose writes succeed. */
export function createKvMock() {
  return {
    get: vi.fn(),
    set: vi.fn(async () => ({ ok: true }))
  };
}

/** A stored-trails read the test settles with `resolve`. */
export function createPendingLoad() {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve: (value: unknown) => resolve(value) };
}

/** DataFn store backed by `kv`, with the runtime of `namespace` when given. */
export function datafnStoreWithKv(kv: unknown, namespace?: string) {
  return {
    datafn: { kv },
    datafnRuntime: writable(namespace === undefined ? undefined : { namespace })
  };
}

/** Logger that records calls without printing them. */
export function loggerStub() {
  return {
    logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
  };
}

/**
 * Loads the access trail store with its DataFn store backed by `kv` and a
 * silent logger, and returns the store.
 */
export async function loadAccessTrailStore(kv: unknown, namespace?: string) {
  vi.doMock("@nucleum/datafn/datafn.store", () =>
    datafnStoreWithKv(kv, namespace)
  );
  vi.doMock("@nucleum/client/runtime/logging/logger", loggerStub);
  return (await import("@nucleum/shell/navigator/access-trail.store"))
    .accessTrail;
}
