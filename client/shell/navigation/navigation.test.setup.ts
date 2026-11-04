import { writable } from "svelte/store";

/**
 * Stubs of the modules navigation reads, for `vi.mock` factories in the
 * navigation tests. Factories import this module asynchronously, so the
 * mocks stay hoisted, and it imports nothing the tests mock.
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
