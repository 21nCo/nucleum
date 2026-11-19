import { get, writable } from "svelte/store";

const isEnabled = writable(true);

/**
 * Whether shortcuts that run on one key press without Cmd, Ctrl or Option
 * (Shift allowed) are on: page letters, Calendar keys, N, ?, [, /, Space,
 * digits 1 to 9 and G chords (WCAG 2.1.4 Character Key Shortcuts). The user
 * preferences store keeps it in step with the user's
 * `isSingleKeyShortcutsEnabled` preference; it is on until they load. It has
 * no other imports, so key listeners can read it without loading the
 * preferences store.
 */
export const singleKeyShortcutsEnabled = { subscribe: isEnabled.subscribe };

/** Whether single-key shortcuts are on now. */
export function readSingleKeyShortcutsEnabled() {
  return get(isEnabled);
}

/** Whether a key press has none of Cmd, Ctrl or Option (Shift allowed). */
export function isSingleKeyPress(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}) {
  return !event.metaKey && !event.ctrlKey && !event.altKey;
}

/**
 * Whether a key press must run no shortcut because it is a single-key press
 * and single-key shortcuts are off.
 */
export function isSingleKeyShortcutBlocked(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}) {
  return isSingleKeyPress(event) && !get(isEnabled);
}

/** Sets the flag from the user's preference. Only the preferences store calls it. */
export function syncSingleKeyShortcutsEnabled(value: boolean) {
  isEnabled.set(value);
}
