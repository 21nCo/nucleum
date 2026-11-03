/** Whether a computed CSS color paints nothing. */
export function isTransparentColor(value: string | undefined | null) {
  if (!value) return true;
  const color = value.trim().toLowerCase();
  if (color === "transparent") return true;
  const parts = color
    .match(/^rgba?\((.*)\)$/)?.[1]
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (!parts || parts.length < 4) return false;
  return parseFloat(parts[3]) === 0;
}

/**
 * Background the user sees at `element`: the first painted background color
 * of the element or its ancestors. Undefined when nothing paints one.
 */
export function resolveSurfaceBackground(
  element: Element | null,
  readBackground: (element: Element) => string = (target) =>
    getComputedStyle(target).backgroundColor
) {
  for (let node = element; node; node = node.parentElement) {
    const color = readBackground(node);
    if (!isTransparentColor(color)) return color;
  }
  return undefined;
}

/**
 * Background painted at a point of the page, so a tab joined to the page can
 * take the page's background. Elements inside `ignore` are skipped.
 */
export function samplePageBackground(
  point: { x: number; y: number },
  ignore: Element
) {
  const below = document
    .elementsFromPoint(point.x, point.y)
    .find((element) => !ignore.contains(element));
  return resolveSurfaceBackground(below ?? null);
}
