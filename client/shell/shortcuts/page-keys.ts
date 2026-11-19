import { get } from "svelte/store";
import { isChordEditableTarget } from "@nucleum/shell/shortcuts/chord-keys";
import { isViewKeyLayerOnFront } from "@nucleum/shell/shortcuts/front-layer";
import {
  isSingleKeyPress,
  readSingleKeyShortcutsEnabled
} from "@nucleum/shared-state/preferences/single-key-shortcuts";
import {
  contextZone,
  type ContextZonePane
} from "@nucleum/shell/topNav/contextZone/context-zone";

const chordEndingKeys = new WeakSet<KeyboardEvent>();

/**
 * Whether shortcuts that run on one key press without Cmd, Ctrl or Option
 * (Shift allowed) are on, from the "Single-key shortcuts" switch in Shortcuts
 * settings (WCAG 2.1.4). Every single-key listener reads it: page letters and
 * Calendar keys through `isPlainPageKey`, the shortcut runner for registered
 * shortcuts and view digits, the chord runner before a G chord starts and
 * before its second key runs, and component shortcut listeners through
 * `keyboardShortcuts.checkPageShortcut`. The "." menu key and Space on a
 * highlighted list item (`itemNavigation`, in @21n/ui) read the same setting
 * through the element shortcut host (`isSingleKeyEnabled`).
 */
export function areSingleKeyShortcutsEnabled() {
  return readSingleKeyShortcutsEnabled();
}

export { isSingleKeyPress };

/**
 * Marks the key that ended a pending G chord without matching one. The chord
 * runner passes such a key on to the page, but it was meant as the chord's
 * second key, so it must not also run a page's single-key action.
 */
export function markChordEndingKey(event: KeyboardEvent) {
  chordEndingKeys.add(event);
}

/**
 * Whether a key ended a pending G chord without matching one, so a plain
 * single-key shortcut must not also run for it.
 */
export function isChordEndingKey(event: KeyboardEvent) {
  return chordEndingKeys.has(event);
}

/**
 * Whether a key press may run a page's single-key action: single-key
 * shortcuts are on, the key is not handled yet, not held down, no Cmd, Ctrl
 * or Option (and no Shift unless `allowShift`), not typed into a field or any editable element (including plaintext-only
 * editors and children of an editor), not the key that ended a G chord, and no
 * modal, dialog, popover or modal sheet in front.
 */
export function isPlainPageKey(
  event: KeyboardEvent,
  options: { allowShift?: boolean } = {}
) {
  if (!areSingleKeyShortcutsEnabled()) return false;
  if (event.defaultPrevented || event.repeat) return false;
  if (chordEndingKeys.has(event)) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.shiftKey && !options.allowShift) return false;
  if (isChordEditableTarget(event.target)) return false;
  return !hasLayerInFront();
}

/** Whether a modal, dialog, popover or modal sheet is in front of the page. */
export function hasLayerInFront() {
  return isViewKeyLayerOnFront();
}

/**
 * Whether a pane's page keys should run: its layer is visible, the element is
 * not inside a covered (inert) part of the page, and it is the pane the user
 * works in, or else the pane the top bar describes.
 */
export function isKeyTargetPane(
  pane: ContextZonePane,
  element?: Element | null
) {
  if (element?.closest("[inert]")) return false;
  const visible = get(contextZone.visibleLayers);
  if (visible && !visible.has(pane.layer)) return false;
  const active = get(contextZone.activePaneId) ?? get(contextZone.pane)?.id;
  return active === undefined || active === pane.id;
}
