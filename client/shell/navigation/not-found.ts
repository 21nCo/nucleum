/** Route of the not-found page. */
export const NOT_FOUND_PATH = "404";

/** Search param holding the path that could not be found. */
export const NOT_FOUND_PATH_PARAM = "path";

/**
 * How the shell shows a path that matches no page: either one redirect to the
 * not-found route, or the not-found page rendered in place without navigating.
 */
export type NotFoundResolution =
  { kind: "redirect"; url: string } | { kind: "inline" };

function normalizePath(path: string | null | undefined) {
  return (path ?? "").replace(/^\/+|\/+$/g, "");
}

/** Whether `path` is the not-found route itself. */
export function isNotFoundPath(path: string | null | undefined) {
  const normalized = normalizePath(path);
  return (
    normalized === NOT_FOUND_PATH || normalized.startsWith(`${NOT_FOUND_PATH}/`)
  );
}

/**
 * Decides how to show an unresolved page path. Only a path that came from the
 * URL is redirected, once, to `/404?path=<path>`. The not-found route itself,
 * an empty path, a path that does not come from the URL (command and sheet
 * pages), and a redirect that would land on the current URL render the
 * not-found page in place, so showing it can never trigger another redirect.
 */
export function resolveNotFound(
  path: string | null | undefined,
  params: { isUrlPath: boolean; currentUrl: URL }
): NotFoundResolution {
  const normalized = normalizePath(path);
  if (!params.isUrlPath || !normalized || isNotFoundPath(normalized)) {
    return { kind: "inline" };
  }
  const target = new URL(`/${NOT_FOUND_PATH}`, params.currentUrl.origin);
  target.searchParams.set(NOT_FOUND_PATH_PARAM, normalized);
  if (
    target.pathname === params.currentUrl.pathname &&
    target.search === params.currentUrl.search
  ) {
    return { kind: "inline" };
  }
  return { kind: "redirect", url: target.pathname + target.search };
}
