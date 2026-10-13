import { dispatchCustomEvent } from "@21n/shared-utils/dom-events";

/**
 * A sveltekit goto() equivalent
 *
 * Note: using this instead of sveltekit's goto() because extension projects do not have access to sveltekit's goto() function
 * @param path
 * @param isReload
 * @param replaceState - if true, replaces current history entry instead of adding new one
 */
export function goto(
  path: string,
  isReload: boolean = false,
  replaceState: boolean = false
) {
  dispatchCustomEvent("custom:navigation", { path, isReload, replaceState });
}
