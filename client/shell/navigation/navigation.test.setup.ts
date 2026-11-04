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

/**
 * Loads navigation with UI state, DataFn and navigator history stubbed and
 * returns it.
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
  return (await import("@nucleum/shell/navigation/navigation")).navigation;
}
