import type { ISelectItem } from "@21n/ui/elements/select/select.type";

/** How a context menu option group lays out its options. */
export enum ContextMenuOptionLayout {
  SEGMENTED = "segmented",
  RADIO = "radio",
  SUBMENU = "submenu"
}

/** Most options a segmented switcher shows in a context menu row. */
export const CONTEXT_MENU_SEGMENTED_MAX_OPTIONS = 3;

/** Most label characters, summed over options, that fit beside the setting label. */
export const CONTEXT_MENU_SEGMENTED_MAX_CHARS = 16;

/** Fewest options that move into a submenu instead of a radio list. */
export const CONTEXT_MENU_SUBMENU_MIN_OPTIONS = 5;

/**
 * Picks the layout of a context menu option group: a segmented switcher for
 * two or three short options, a radio list for up to four, and a submenu for
 * five or more.
 */
export function resolveContextMenuOptionLayout(
  options: Pick<ISelectItem, "label" | "value">[]
): ContextMenuOptionLayout {
  if (options.length >= CONTEXT_MENU_SUBMENU_MIN_OPTIONS)
    return ContextMenuOptionLayout.SUBMENU;
  const chars = options.reduce(
    (total, option) => total + (option.label ?? String(option.value)).length,
    0
  );
  if (
    options.length >= 2 &&
    options.length <= CONTEXT_MENU_SEGMENTED_MAX_OPTIONS &&
    chars <= CONTEXT_MENU_SEGMENTED_MAX_CHARS
  )
    return ContextMenuOptionLayout.SEGMENTED;
  return ContextMenuOptionLayout.RADIO;
}
