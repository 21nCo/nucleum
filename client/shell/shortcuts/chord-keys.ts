/** How long a chord prefix such as G waits for its second key. */
export const CHORD_TIMEOUT_MS = 1500;

/** Prefix whose digits 1 to 9 open the pinned space in that position. */
export const SPACE_CHORD_PREFIX = "g";

/** Key state needed to read the second key of a chord. */
export type ChordKeyEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

/**
 * Returns the zero-based pinned space position for G followed by a plain 1 to
 * 9, or undefined for any other prefix, key or modifier.
 */
export function resolveChordSpaceIndex(
  prefix: string | undefined,
  event: ChordKeyEvent
): number | undefined {
  if (prefix?.toLowerCase() !== SPACE_CHORD_PREFIX) return undefined;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
    return undefined;
  if (!/^[1-9]$/.test(event.key)) return undefined;
  return Number(event.key) - 1;
}
