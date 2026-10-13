import type { IKeyboardShortcut } from "@21n/ui/elements/keyboard/shortcut.type";
import { writable } from "svelte/store";

export interface ElementShortcutHost {
  resolve(action: string): IKeyboardShortcut | undefined;
}

let host: ElementShortcutHost | undefined;

/** Reactive shortcut presentation state supplied by the application. */
export const elementShortcutState = writable({
  isShowHints: true,
  revision: 0
});

/** Installs shortcut resolution without exposing persistence to elements. */
export function configureElementShortcutHost(value: ElementShortcutHost) {
  host = value;
}

/** Marks shortcut resolution data as changed. */
export function notifyElementShortcutsChanged() {
  elementShortcutState.update((state) => ({
    ...state,
    revision: state.revision + 1
  }));
}

/** Updates whether portable controls should display shortcut hints. */
export function syncElementShortcutHints(isShowHints: boolean) {
  elementShortcutState.update((state) => ({ ...state, isShowHints }));
}

/** Resolves a configured shortcut for presentation. */
export function resolveElementShortcut(action: string) {
  return host?.resolve(action);
}
