import { writable } from "svelte/store";

const focusRequests = writable(0);

/** Counter that increases each time the open navigator should focus its search input. */
export const navigatorFocusRequests = { subscribe: focusRequests.subscribe };

/** Asks an already open navigator to move keyboard focus back to its search input. */
export function requestNavigatorFocus() {
  focusRequests.update((count) => count + 1);
}
