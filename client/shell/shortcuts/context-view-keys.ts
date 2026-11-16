/** Key state needed to read a context view number key. */
export type ContextViewKeyEvent = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

/**
 * Returns the zero-based context view index for a plain 1 to 9 key press, or
 * undefined for any other key or when a modifier is held.
 */
export function resolveContextViewIndex(
  event: ContextViewKeyEvent
): number | undefined {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
    return undefined;
  if (!/^[1-9]$/.test(event.key)) return undefined;
  return Number(event.key) - 1;
}
