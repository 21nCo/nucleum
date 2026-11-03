import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";

/** One URL segment of a page sub-view with its display label. */
export type PageViewSegment = {
  slug: string;
  label: string;
};

const LABEL_SEPARATOR = " › ";

/**
 * Creates openable sub-view actions for a page, such as `calendar.classic.year` with
 * path `calendar/classic/year`. They render through the parent page and stay out of
 * app menus because menus list explicit action ids.
 */
export function createPageViewActions(
  parent: IAction,
  views: PageViewSegment[][],
  options?: { isMeta?: boolean }
): IAction[] {
  const basePath = parent.path ?? parent.action;
  return views.map((segments) => ({
    action: [parent.action, ...segments.map((segment) => segment.slug)].join(
      "."
    ),
    path: [basePath, ...segments.map((segment) => segment.slug)].join("/"),
    label: [
      parent.label ?? basePath,
      ...segments.map((segment) => segment.label)
    ].join(LABEL_SEPARATOR),
    icon: parent.icon,
    type: ActionType.PAGE,
    component: parent.component,
    subViewOf: parent.action,
    ...(options?.isMeta ? { isMeta: true } : {})
  }));
}

/** Combines view segment groups into every ordered combination. */
export function combinePageViewSegments(
  ...groups: PageViewSegment[][]
): PageViewSegment[][] {
  return groups.reduce<PageViewSegment[][]>(
    (combinations, group) =>
      combinations.flatMap((combination) =>
        group.map((segment) => [...combination, segment])
      ),
    [[]]
  );
}

/** Result of resolving a URL path to a page action. */
export type PageRoute = {
  action: IAction;
  /**
   * Segments after the page path when the page has registered sub-views; undefined
   * for pages without sub-views.
   */
  subPath?: string[];
};

/**
 * Resolves a path to its page action. Exact matches win; otherwise the longest path
 * prefix that belongs to a page with registered sub-views is used, and the remaining
 * segments become its sub-path. Sub-view actions never resolve as pages themselves:
 * a sub-view action id, as launched from a command, resolves through its parent
 * page with the sub-view's path segments.
 */
export function resolvePageRoute(
  actions: IAction[],
  path: string
): PageRoute | null {
  const subView = actions.find(
    (action) => action.subViewOf && action.action === path
  );
  if (subView?.path && subView.path !== path) {
    return resolvePageRoute(actions, subView.path);
  }
  const pages = actions.filter((action) => !action.subViewOf);
  const parents = new Set(
    actions.map((action) => action.subViewOf).filter(Boolean)
  );
  const findAction = (candidate: string) =>
    pages.find((action) => action.path === candidate) ??
    pages.find((action) => action.action === candidate);
  const toRoute = (action: IAction, subPath: string[]): PageRoute =>
    parents.has(action.action) ? { action, subPath } : { action };

  const exact = findAction(path);
  if (exact) return toRoute(exact, []);
  const segments = path.split("/").filter(Boolean);
  for (let index = segments.length - 1; index > 0; index--) {
    const action = findAction(segments.slice(0, index).join("/"));
    if (action && parents.has(action.action)) {
      return toRoute(action, segments.slice(index));
    }
  }
  return null;
}

/**
 * Path recorded in navigator history for a rendered page: the registered sub-view
 * matching the page path plus its sub-path, or the page path for a labelled,
 * non-meta page without sub-views. Undefined when the view should not be recorded.
 */
export function resolveRecordedPagePath(
  actions: IAction[],
  pageAction: IAction,
  subPath: string[] | undefined
): string | undefined {
  const pagePath = pageAction.path ?? pageAction.action;
  if (subPath) {
    const canonicalPath = [pagePath, ...subPath].join("/");
    return actions.find(
      (action) =>
        action.subViewOf === pageAction.action && action.path === canonicalPath
    )?.path;
  }
  if (
    pageAction.type !== ActionType.PAGE ||
    pageAction.isMeta ||
    !pageAction.label
  ) {
    return;
  }
  return pagePath;
}
