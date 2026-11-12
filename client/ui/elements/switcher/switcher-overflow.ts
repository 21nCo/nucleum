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
};

/**
 * Returns the indexes of the options that stay in the row, in option order.
 * When every option fits all stay. Otherwise the selected option stays, the
 * others are kept in order while they fit beside a "More" button, and the
 * rest move into that menu.
 */
export function resolveSwitcherVisibleOptions({
  widths,
  activeIndex,
  available,
  moreWidth,
  gap = 0,
  padding = 0
}: SwitcherOverflowInput): number[] {
  const all = widths.map((_, index) => index);
  const rowWidth = (indexes: number[], extra: number[]) => {
    const items = [...indexes.map((index) => widths[index]), ...extra];
    const total = items.reduce((sum, width) => sum + width, 0);
    return padding + total + gap * Math.max(0, items.length - 1);
  };
  if (rowWidth(all, []) <= available) return all;
  const kept = new Set<number>();
  if (activeIndex >= 0 && activeIndex < widths.length) kept.add(activeIndex);
  for (const index of all) {
    if (kept.has(index)) continue;
    const next = [...kept, index].sort((a, b) => a - b);
    if (rowWidth(next, [moreWidth]) > available) break;
    kept.add(index);
  }
  return [...kept].sort((a, b) => a - b);
}
