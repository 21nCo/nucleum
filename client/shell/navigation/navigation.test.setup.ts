import { vi } from "vitest";
import { writable } from "svelte/store";

/**
 * Stubs of the modules navigation reads, for `vi.mock` factories in the
 * navigation tests and for `loadStubbedNavigation`. Factories import this
 * module asynchronously, so the mocks stay hoisted, and it imports nothing
 * the tests mock.
 */

/** UI state store that keeps nothing. */
export function uiStateStoreStub() {
  return { uiState: { getState: () => [], setState: () => undefined } };
}

/** DataFn store without a client or a runtime. */
export function emptyDatafnStoreStub() {
  return { datafn: {}, datafnRuntime: writable(undefined) };
}

/** Navigator history store that records nothing. */
export function navigatorHistoryStoreStub() {
  return { navigatorHistory: { recordResource: () => undefined } };
}

/** Access trail store that records nothing. */
export function accessTrailStoreStub() {
  return {
    accessTrail: {
      get: () => ({ current: undefined, recent: [] }),
      start: () => undefined,
      extend: () => undefined,
      position: () => undefined,
      sync: () => undefined
    }
  };
}

/** DataFn store whose KV store keeps nothing, without a runtime. */
export function kvDatafnStoreStub() {
  return {
    datafn: {
      kv: {
        get: async () => null,
        set: async () => ({ ok: true }),
        signal: () => ({
          subscribe: () => () => undefined,
          get: () => undefined
        })
      }
    },
    datafnRuntime: writable(undefined)
  };
}

/**
 * Loads navigation with UI state, DataFn, navigator history and the access
 * trail stubbed and returns it.
 */
export async function loadStubbedNavigation() {
  vi.doMock(
    "@nucleum/shared-state/preferences/ui-state/uiState.store",
    uiStateStoreStub
  );
  vi.doMock("@nucleum/datafn/datafn.store", emptyDatafnStoreStub);
  vi.doMock(
    "@nucleum/shell/navigator/navigator-history.store",
    navigatorHistoryStoreStub
  );
  vi.doMock(
    "@nucleum/shell/navigator/access-trail.store",
    accessTrailStoreStub
  );
  return (await import("@nucleum/shell/navigation/navigation")).navigation;
}
