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
