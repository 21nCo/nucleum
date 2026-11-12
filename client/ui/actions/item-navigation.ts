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

const itemNavigationKeys: readonly string[] = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight"
];

/** Whether a key moves the item highlight. */
export function isItemNavigationKey(key: string): key is ItemNavigationKey {
  return itemNavigationKeys.includes(key);
}

/**
 * Groups item indexes into visual rows, top to bottom. Items whose top edges
 * sit within half the shorter item's height share a row.
 */
export function resolveItemRows(rects: ItemNavigationRect[]): number[][] {
  const rows: number[][] = [];
  const order = rects
    .map((rect, index) => ({ rect, index }))
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
  for (const entry of order) {
    const row = rows.find((candidate) => {
      const first = rects[candidate[0]];
      const tolerance = Math.min(first.height, entry.rect.height) / 2;
      return Math.abs(first.top - entry.rect.top) < tolerance;
    });
    if (row) row.push(entry.index);
    else rows.push([entry.index]);
  }
  for (const row of rows) row.sort((a, b) => rects[a].left - rects[b].left);
  return rows;
}

/**
 * Returns the index an arrow key moves the highlight to. With nothing
 * highlighted any arrow highlights the first item. Left and Right move within
 * the current row; Up and Down move to the nearest item in the row above or
 * below. At an edge the highlight stays where it is.
 */
export function resolveItemNavigationIndex(
  rects: ItemNavigationRect[],
  current: number | undefined,
  key: ItemNavigationKey
): number | undefined {
  if (rects.length === 0) return undefined;
  if (current === undefined || current < 0 || current >= rects.length) return 0;
  const rows = resolveItemRows(rects);
  const rowIndex = rows.findIndex((row) => row.includes(current));
  const row = rows[rowIndex];
  const column = row.indexOf(current);
  if (key === "ArrowLeft") return row[Math.max(0, column - 1)];
  if (key === "ArrowRight") return row[Math.min(row.length - 1, column + 1)];
  const targetRow = rows[rowIndex + (key === "ArrowUp" ? -1 : 1)];
  if (!targetRow) return current;
  const center = rects[current].left + rects[current].width / 2;
  return targetRow.reduce((best, index) =>
    Math.abs(rects[index].left + rects[index].width / 2 - center) <
    Math.abs(rects[best].left + rects[best].width / 2 - center)
      ? index
      : best
  );
}

/** Inclusive index range between two items, in ascending order. */
export function resolveItemRange(anchor: number, current: number): number[] {
  const start = Math.min(anchor, current);
  const end = Math.max(anchor, current);
  return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
}
