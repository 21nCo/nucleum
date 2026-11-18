import { derived, get } from "svelte/store";
import { isTextElement } from "@21n/ui/actions/interaction-dom";
import { isViewKeyLayerOnFront } from "@nucleum/shell/shortcuts/front-layer";
import {
  contextZone,
  type ContextZonePane
} from "@nucleum/shell/topNav/contextZone/context-zone";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";

const chordEndingKeys = new WeakSet<KeyboardEvent>();

/**
 * Marks the key that ended a pending G chord without matching one. The chord
 * runner passes such a key on to the page, but it was meant as the chord's
 * second key, so it must not also run a page's single-key action.
 */
export function markChordEndingKey(event: KeyboardEvent) {
  chordEndingKeys.add(event);
}

/**
 * Whether a key press may run a page's single-key action: not handled yet,
 * not held down, no Cmd, Ctrl or Option (and no Shift unless `allowShift`),
 * not typed into a field or editor, not the key that ended a G chord, and no
 * modal, dialog, popover or modal sheet in front.
 */
export function isPlainPageKey(
  event: KeyboardEvent,
  options: { allowShift?: boolean } = {}
) {
  if (event.defaultPrevented || event.repeat) return false;
  if (chordEndingKeys.has(event)) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (event.shiftKey && !options.allowShift) return false;
  if (isTextElement(event.target)) return false;
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

/**
 * Id of the resource whose menu items page letters run: the newest actions
 * registered for the pane the user works in, such as an item opened inside a
 * space rather than the space. Other resources' menus do not show the letters.
 */
export const pageLetterTargetId = derived(
  contextActions.active,
  (entry) => entry?.id
);
