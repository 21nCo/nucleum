import { dispatchCustomEvent } from "@21n/shared-utils/dom-events";

/**
 * A sveltekit goto() equivalent
 *
 * Note: using this instead of sveltekit's goto() because extension projects do not have access to sveltekit's goto() function
 * @param path
 * @param isReload
 * @param replaceState - if true, replaces current history entry instead of adding new one
 * @param state - state stored in the history entry; a replace without it keeps the current entry's state
 */
export function goto(
  path: string,
  isReload: boolean = false,
  replaceState: boolean = false,
  state?: Record<string, unknown>
) {
  dispatchCustomEvent("custom:navigation", {
    path,
    isReload,
    replaceState,
    state
  });
}
