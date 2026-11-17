import { isTextElement } from "@21n/ui/actions/interaction-dom";

/** How long a chord prefix such as G waits for its second key. */
export const CHORD_TIMEOUT_MS = 1500;

/**
 * The chord prefix key: a plain G starts a chord, and G then 1 to 9 opens the
 * pinned space in that position.
 */
export const CHORD_PREFIX = "g";

/** Key state needed to read the second key of a chord. */
export type ChordKeyEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

/** Whether Cmd, Ctrl, Option or Shift is held. */
export const hasModifier = (event: ChordKeyEvent) =>
  event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;

/** Whether a key press is a plain G, which starts a chord. */
export function isChordStart(event: ChordKeyEvent): boolean {
  return !hasModifier(event) && event.key?.toLowerCase() === CHORD_PREFIX;
}

/**
 * Returns the zero-based pinned space position for G followed by a plain 1 to
 * 9, or undefined for any other prefix, key or modifier.
 */
export function resolveChordSpaceIndex(
  prefix: string | undefined,
  event: ChordKeyEvent
): number | undefined {
  if (prefix?.toLowerCase() !== CHORD_PREFIX) return undefined;
  if (hasModifier(event)) return undefined;
  if (!/^[1-9]$/.test(event.key)) return undefined;
  return Number(event.key) - 1;
}

/**
 * Whether a key goes to something the user types in, so G neither starts nor
 * completes a chord there: inputs and text areas, and any element that is
 * editable, including plaintext-only editors and children of an editor.
 */
export function isChordEditableTarget(target: EventTarget | null): boolean {
  if (isTextElement(target)) return true;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const editor = target.closest("[contenteditable]");
  return !!editor && editor.getAttribute("contenteditable") !== "false";
}
