/** Measured sizes a switcher needs to decide which options fit. */
export type SwitcherOverflowInput = {
  /** Rendered width of each option, in option order. */
  widths: number[];
  /** Index of the selected option, which always stays visible. */
  activeIndex: number;
  /** Width the switcher may use, including its padding. */
  available: number;
  /** Width of the "More" button. */
  moreWidth: number;
  /** Gap between neighbouring options. */
  gap?: number;
  /** Horizontal padding around the options. */
  padding?: number;
  /**
   * Width of the selected option without its label. Only an option that can
   * show without its label (one with a rendered icon) has one.
   */
  activeCompactWidth?: number;
};

/** Options that stay in the row, and whether the selected one drops its label. */
export type SwitcherOverflow = {
  /** Indexes of the options that stay in the row, in option order. */
  visible: number[];
  /** Whether the selected option shows without its label. */
  isActiveCompact: boolean;
};

/**
 * Decides which options stay in the row. When every option fits all stay.
 * Otherwise the selected option stays, and every other option that still fits
 * beside a "More" button stays too, in option order; the rest move into that
 * menu. When even the selected option and More do not fit, the selected
 * option drops its label (if it has a compact width) and the rest are fitted
 * beside its compact width.
 */
export function resolveSwitcherOverflow({
  widths,
  activeIndex,
  available,
  moreWidth,
  gap = 0,
  padding = 0,
  activeCompactWidth = undefined
}: SwitcherOverflowInput): SwitcherOverflow {
  const all = widths.map((_, index) => index);
  const hasActive = activeIndex >= 0 && activeIndex < widths.length;
  const rowWidth = (sizes: number[], indexes: number[], extra: number[]) => {
    const items = [...indexes.map((index) => sizes[index]), ...extra];
    const total = items.reduce((sum, width) => sum + width, 0);
    return padding + total + gap * Math.max(0, items.length - 1);
  };
  if (rowWidth(widths, all, []) <= available)
    return { visible: all, isActiveCompact: false };
  const isActiveCompact =
    hasActive &&
    activeCompactWidth !== undefined &&
    rowWidth(widths, [activeIndex], [moreWidth]) > available;
  const sizes = isActiveCompact
    ? widths.map((width, index) =>
        index === activeIndex ? activeCompactWidth : width
      )
    : widths;
  if (isActiveCompact && rowWidth(sizes, all, []) <= available)
    return { visible: all, isActiveCompact };
  const kept = new Set<number>(hasActive ? [activeIndex] : []);
  for (const index of all) {
    if (kept.has(index)) continue;
    const next = [...kept, index].sort((a, b) => a - b);
    if (rowWidth(sizes, next, [moreWidth]) <= available) kept.add(index);
  }
  return { visible: [...kept].sort((a, b) => a - b), isActiveCompact };
}

/** Indexes of the options that stay in the row, in option order. */
export function resolveSwitcherVisibleOptions(
  input: SwitcherOverflowInput
): number[] {
  return resolveSwitcherOverflow(input).visible;
}

/** Measured sizes, plus the controls after the switcher that can move into More. */
export type SwitcherRowInput = SwitcherOverflowInput & {
  /**
   * Width of the controls shown after the switcher, with the gap before
   * them, that move into the "More" menu as the last step. `available` then
   * includes the room they take while they show.
   */
  trailingWidth?: number;
};

/** The switcher's row, and whether the trailing controls are in More. */
export type SwitcherRow = SwitcherOverflow & {
  /** Whether the trailing controls show as an entry of the More menu. */
  isTrailingInMenu: boolean;
};

/**
 * Decides the switcher's row beside its trailing controls. The options are
 * fitted, as in resolveSwitcherOverflow, in the room the trailing controls
 * leave. Only when even the smallest form (the selected option, without its
 * label when it can drop it, and More) does not fit beside them do they move
 * into the More menu; the row then keeps that smallest form, so as room
 * returns the trailing controls come back before any hidden option.
 */
export function resolveSwitcherRow({
  trailingWidth = 0,
  ...input
}: SwitcherRowInput): SwitcherRow {
  const trailing = Math.max(0, trailingWidth);
  const budget = input.available - trailing;
  const overflow = resolveSwitcherOverflow({ ...input, available: budget });
  if (trailing === 0) return { ...overflow, isTrailingInMenu: false };
  const { widths, activeIndex, moreWidth, gap = 0, padding = 0 } = input;
  const hasActive = activeIndex >= 0 && activeIndex < widths.length;
  const activeWidth = overflow.isActiveCompact
    ? (input.activeCompactWidth ?? 0)
    : (widths[activeIndex] ?? 0);
  const hasHidden = overflow.visible.length < widths.length;
  if (!hasHidden) {
    const shown = overflow.visible.map((index) =>
      overflow.isActiveCompact && index === activeIndex
        ? activeWidth
        : widths[index]
    );
    const rowWidth =
      padding +
      shown.reduce((sum, width) => sum + width, 0) +
      gap * Math.max(0, shown.length - 1);
    if (rowWidth <= budget) return { ...overflow, isTrailingInMenu: false };
  }
  const smallest = padding + moreWidth + (hasActive ? activeWidth + gap : 0);
  if (hasHidden && smallest <= budget)
    return { ...overflow, isTrailingInMenu: false };
  return {
    visible: hasActive ? [activeIndex] : [],
    isActiveCompact: overflow.isActiveCompact,
    isTrailingInMenu: true
  };
}
