import type {
  ISelectItem,
  ISelectValue
} from "@21n/ui/elements/select/select.type";

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

/** Whether an option of a context menu option group can be picked. */
export function isContextMenuOptionEnabled(
  options: Pick<ISelectItem, "value" | "isDisabled">[],
  value: ISelectValue
): boolean {
  const option = options.find((item) => item.value === value);
  return option !== undefined && !option.isDisabled;
}

/**
 * Index of the option that holds the single tab stop of a radio group: the
 * checked option when it is enabled, otherwise the first enabled option, or
 * -1 when every option is disabled.
 */
export function resolveContextMenuOptionTabStop(
  options: Pick<ISelectItem, "value" | "isDisabled">[],
  value: ISelectValue | undefined
): number {
  const checked = options.findIndex(
    (item) => item.value === value && !item.isDisabled
  );
  return checked >= 0 ? checked : options.findIndex((item) => !item.isDisabled);
}

const KEY_STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1
};

/**
 * Index of the option a radio group key moves to. Arrow keys step to the next
 * or previous enabled option and wrap; Home and End jump to the first or last
 * enabled option. Returns -1 for any other key or when no option is enabled.
 */
export function resolveContextMenuOptionKeyTarget(
  options: Pick<ISelectItem, "isDisabled">[],
  fromIndex: number,
  key: string
): number {
  const enabled = options.flatMap((item, index) =>
    item.isDisabled ? [] : [index]
  );
  if (enabled.length === 0) return -1;
  if (key === "Home") return enabled[0];
  if (key === "End") return enabled[enabled.length - 1];
  const step = KEY_STEPS[key];
  if (!step) return -1;
  const position = enabled.indexOf(fromIndex);
  if (position < 0) return step > 0 ? enabled[0] : enabled[enabled.length - 1];
  return enabled[(position + step + enabled.length) % enabled.length];
}

/**
 * Handles a key pressed in a radio group of option buttons: picks the option
 * the key moves to and moves focus onto it, as a native radio group does.
 */
export function handleContextMenuOptionKey(
  event: KeyboardEvent,
  options: Pick<ISelectItem, "value" | "isDisabled">[],
  onPick: (value: ISelectValue) => void
): void {
  const group = event.currentTarget;
  if (!(group instanceof HTMLElement)) return;
  const radios = Array.from(
    group.querySelectorAll<HTMLElement>('[role="radio"]')
  );
  const from = radios.findIndex((radio) =>
    radio.contains(event.target as Node)
  );
  const target = resolveContextMenuOptionKeyTarget(options, from, event.key);
  if (target < 0) return;
  event.preventDefault();
  event.stopPropagation();
  onPick(options[target].value);
  radios[target]?.focus();
}
