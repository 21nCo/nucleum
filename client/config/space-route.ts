/** Page action and base path that renders a space. */
export const SPACE_PAGE_ACTION = "space";

const SPACE_ID_PREFIX = `${SPACE_PAGE_ACTION}:`;

/** Shortens a space id for use in a URL path or search parameter. */
export function encodeSpaceSegment(id: string) {
  return id.startsWith(SPACE_ID_PREFIX) ? id.slice(SPACE_ID_PREFIX.length) : id;
}

/** Restores a space id from a URL path segment or search parameter value. */
export function decodeSpaceSegment(segment: string) {
  let value = segment;
  try {
    value = decodeURIComponent(segment);
  } catch {
    value = segment;
  }
  value = value.trim();
  if (!value) return undefined;
  return value.startsWith(SPACE_ID_PREFIX) ? value : SPACE_ID_PREFIX + value;
}

/** Base page path segments of a space and the sub spaces focused inside it. */
export function resolveSpacePathSegments(
  rootId: string,
  focusPath: string[] = []
) {
  return [SPACE_PAGE_ACTION, ...[rootId, ...focusPath].map(encodeSpaceSegment)];
}

/** Base page URL path of a space, such as `/space/<id>/<sub id>`. */
export function resolveSpacePath(rootId: string, focusPath: string[] = []) {
  return "/" + resolveSpacePathSegments(rootId, focusPath).join("/");
}
