/** Box of a navigable item, in viewport coordinates. */
export type ItemNavigationRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/** Arrow key that moves the item highlight. */
export type ItemNavigationKey =
  "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

const itemNavigationKeys: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight"
]);

/** Pixels two boxes may share at an edge and still count as side by side. */
const edgeTolerance = 1;

/** Whether a key moves the item highlight. */
export function isItemNavigationKey(key: string): key is ItemNavigationKey {
  return itemNavigationKeys.has(key);
}

function overlap(startA: number, endA: number, startB: number, endB: number) {
  return Math.min(endA, endB) - Math.max(startA, startB);
}

function verticalOverlap(a: ItemNavigationRect, b: ItemNavigationRect) {
  return overlap(a.top, a.top + a.height, b.top, b.top + b.height);
}

function horizontalOverlap(a: ItemNavigationRect, b: ItemNavigationRect) {
  return overlap(a.left, a.left + a.width, b.left, b.left + b.width);
}

function centerX(rect: ItemNavigationRect) {
  return rect.left + rect.width / 2;
}

function centerY(rect: ItemNavigationRect) {
  return rect.top + rect.height / 2;
}

/**
 * Indexes of the items in the same visual row as an item: the items whose
 * boxes share part of its height, including the item itself, left to right.
 * In a masonry layout a row is what lines up beside the item, so it differs
 * from item to item.
 */
export function resolveItemRow(
  rects: ItemNavigationRect[],
  current: number
): number[] {
  const rect = rects[current];
  return rects
    .map((candidate, index) => ({ candidate, index }))
    .filter(
      ({ candidate, index }) =>
        index === current || verticalOverlap(candidate, rect) > edgeTolerance
    )
    .sort(
      (a, b) =>
        centerX(a.candidate) - centerX(b.candidate) ||
        Math.abs(centerY(a.candidate) - centerY(rect)) -
          Math.abs(centerY(b.candidate) - centerY(rect))
    )
    .map(({ index }) => index);
}

function resolveSideIndex(
  rects: ItemNavigationRect[],
  current: number,
  direction: -1 | 1
) {
  const rect = rects[current];
  const candidates = resolveItemRow(rects, current).filter(
    (index) =>
      index !== current &&
      (centerX(rects[index]) - centerX(rect)) * direction > 0 &&
      horizontalOverlap(rects[index], rect) <= edgeTolerance
  );
  if (candidates.length === 0) return current;
  return candidates.reduce((best, index) => {
    const distance = Math.abs(centerX(rects[index]) - centerX(rect));
    const bestDistance = Math.abs(centerX(rects[best]) - centerX(rect));
    if (distance !== bestDistance) return distance < bestDistance ? index : best;
    return Math.abs(centerY(rects[index]) - centerY(rect)) <
      Math.abs(centerY(rects[best]) - centerY(rect))
      ? index
      : best;
  }, candidates[0]);
}

function resolveVerticalIndex(
  rects: ItemNavigationRect[],
  current: number,
  direction: -1 | 1
) {
  const rect = rects[current];
  const gap = (candidate: ItemNavigationRect) =>
    direction === 1
      ? candidate.top - (rect.top + rect.height)
      : rect.top - (candidate.top + candidate.height);
  const candidates = rects
    .map((_, index) => index)
    .filter(
      (index) => index !== current && gap(rects[index]) >= -edgeTolerance
    );
  if (candidates.length === 0) return current;
  const centerDistance = (index: number) =>
    Math.abs(centerX(rects[index]) - centerX(rect));
  const inColumn = candidates.filter(
    (index) => horizontalOverlap(rects[index], rect) > edgeTolerance
  );
  if (inColumn.length > 0) {
    return inColumn.reduce((best, index) => {
      const difference = gap(rects[index]) - gap(rects[best]);
      if (Math.abs(difference) > edgeTolerance)
        return difference < 0 ? index : best;
      return centerDistance(index) < centerDistance(best) ? index : best;
    }, inColumn[0]);
  }
  const nearest = candidates.reduce(
    (best, index) => (gap(rects[index]) < gap(rects[best]) ? index : best),
    candidates[0]
  );
  const row = resolveItemRow(rects, nearest).filter((index) =>
    candidates.includes(index)
  );
  return row.reduce(
    (best, index) =>
      centerDistance(index) < centerDistance(best) ? index : best,
    row[0]
  );
}

/**
 * Returns the index an arrow key moves the highlight to. With nothing
 * highlighted any arrow highlights the first item. Left and Right move to the
 * nearest item beside the current one in its visual row. Up and Down move to
 * the nearest item above or below in the same column, so masonry columns of
 * mixed heights are followed, and otherwise to the item in the nearest row
 * above or below whose center is closest. At an edge the highlight stays
 * where it is.
 */
export function resolveItemNavigationIndex(
  rects: ItemNavigationRect[],
  current: number | undefined,
  key: ItemNavigationKey
): number | undefined {
  if (rects.length === 0) return undefined;
  if (current === undefined || current < 0 || current >= rects.length) return 0;
  if (key === "ArrowLeft") return resolveSideIndex(rects, current, -1);
  if (key === "ArrowRight") return resolveSideIndex(rects, current, 1);
  return resolveVerticalIndex(rects, current, key === "ArrowUp" ? -1 : 1);
}

/** Inclusive index range between two items, in ascending order. */
export function resolveItemRange(anchor: number, current: number): number[] {
  const start = Math.min(anchor, current);
  const end = Math.max(anchor, current);
  return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
}
