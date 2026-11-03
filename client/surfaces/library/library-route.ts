import { navigation } from "@nucleum/shell/navigation/navigation";
import { Resource } from "@nucleum/datafn/resource.enum";
import { resolveResourceLabel } from "@nucleum/datafn/resource.utils";
import { isValidEnumValue } from "@21n/shared-utils/text.utils";
import type { ISelectItem } from "@21n/ui/elements/select/select.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import {
  createPageViewActions,
  resolvePageRoute,
  type PageViewSegment
} from "@nucleum/shared-state/commands/page-view-actions";
import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
import { Action } from "@nucleum/client/config/action.enum";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import { resolveNodeSubTypesForSwitcher } from "@nucleum/features/memory/node/node.utils";
import { resolveCollectionSubTypesForSwitcher } from "@nucleum/features/collections/collection.utils";
import { resolveObjectiveSubTypesForSwitcher } from "@nucleum/features/focus/goals/goal.utils";
import { resolveTaskSubTypesForSwitcher } from "@nucleum/features/focus/tasks/task.utils";
import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
import {
  UIState,
  UIStateScope
} from "@nucleum/shared-state/preferences/ui-state/uiState.type";

/** Subtype shown when a library path does not name one. */
export const LIBRARY_DEFAULT_SUBTYPE = "all";

/** Resource and subtype encoded in `library/<resource>/<subtype>`. */
export type LibraryRoute = {
  base: string;
  resource?: Resource;
  subType?: string;
};

/** Subtype switcher options for a library resource, excluding "all". */
export function resolveLibrarySubTypeOptions(
  resource: Resource
): ISelectItem[] {
  switch (resource) {
    case Resource.node:
      return resolveNodeSubTypesForSwitcher();
    case Resource.collection:
      return resolveCollectionSubTypesForSwitcher();
    case Resource.objective:
      return resolveObjectiveSubTypesForSwitcher(true);
    case Resource.task:
      return resolveTaskSubTypesForSwitcher();
    default:
      return [];
  }
}

/** Valid subtype path segments of a library resource. */
export function resolveLibrarySubTypes(resource: Resource): string[] {
  return [
    LIBRARY_DEFAULT_SUBTYPE,
    ...resolveLibrarySubTypeOptions(resource).map((option) =>
      String(option.value).toLowerCase()
    )
  ];
}

/** Reads a library resource segment. */
export function parseLibraryResource(
  slug: string | undefined
): Resource | undefined {
  if (!slug || !isValidEnumValue(slug, Resource)) return;
  if (slug === Resource.unknown) return;
  return slug as Resource;
}

/** Reads a library subtype segment when the resource offers it. */
export function parseLibrarySubType(
  resource: Resource,
  slug: string | undefined
): string | undefined {
  if (!slug) return;
  const subType = slug.toLowerCase();
  return resolveLibrarySubTypes(resource).includes(subType)
    ? subType
    : undefined;
}

/**
 * Subtype shown when a library path names a resource without a valid subtype:
 * the saved task library subtype for tasks, otherwise "all".
 */
export function resolveLibraryFallbackSubType(resource: Resource): string {
  if (resource !== Resource.task) return LIBRARY_DEFAULT_SUBTYPE;
  const saved = uiState.getState(UIState.taskLibrarySelectedSubType, {
    scope: UIStateScope.DAP
  });
  return (
    parseLibrarySubType(
      resource,
      typeof saved === "string" ? saved : undefined
    ) ?? LIBRARY_DEFAULT_SUBTYPE
  );
}

/** Path of a library resource view, such as `library/objective/all`. */
export function resolveLibraryViewPath(
  resource: Resource,
  subType: string = LIBRARY_DEFAULT_SUBTYPE
) {
  return [Action.LIBRARY, resource, subType].join("/");
}

/**
 * Library view path and label of a resource type that was pinned to the app menu,
 * as a resource or its browse action, or undefined when it is not a resource.
 */
export function resolveLibraryPinPage(pin: string) {
  const resource = parseLibraryResource(
    pin.replace(new RegExp(`_${ResourceActionType.BROWSE}$`), "")
  );
  if (!resource) return undefined;
  return {
    path: resolveLibraryViewPath(resource),
    label: `Library \u203a ${resolveResourceLabel(resource)}`
  };
}

/** Reads the library page, resource and subtype from a URL path. */
export function parseLibraryPath(pathname: string): LibraryRoute {
  const [base = Action.LIBRARY, resourceSlug, subTypeSlug] = pathname
    .split("/")
    .filter(Boolean);
  const resource = parseLibraryResource(resourceSlug);
  return {
    base,
    resource,
    subType: resource ? parseLibrarySubType(resource, subTypeSlug) : undefined
  };
}

/**
 * Whether a library rendered for the current page follows and rewrites the address
 * bar: true only when the URL path resolves to that page. A library page painted
 * while the address bar shows another page, such as in a command tab, keeps its
 * view locally.
 */
export function isLibraryPathRouted(
  actions: IAction[],
  currentPage: IAction | null | undefined,
  pathname: string
): boolean {
  if (!currentPage) return false;
  const route = resolvePageRoute(actions, pathname.replace(/^\/+|\/+$/g, ""));
  return (
    route?.action.action === currentPage.action && route.subPath !== undefined
  );
}

/**
 * Replaces the library path with `<base>/<resource>/<subtype>` without adding a
 * history entry. `isResetFilters` also clears the starred and archived filters.
 */
export function replaceLibraryPath(
  resource?: Resource,
  subType: string = LIBRARY_DEFAULT_SUBTYPE,
  options?: { isResetFilters?: boolean }
) {
  const { base } = parseLibraryPath(window.location.pathname);
  navigation.replacePagePath(
    resource ? [base, resource, subType] : [base],
    options?.isResetFilters
      ? { [AppSearchParam.STARRED]: null, [AppSearchParam.ARCHIVED]: null }
      : undefined
  );
}

/** Openable library resource and subtype views for a library page action. */
export function createLibraryViewActions(
  parent: IAction,
  resources: Resource[],
  options?: { isMeta?: boolean }
): IAction[] {
  const views: PageViewSegment[][] = [...new Set(resources)].flatMap(
    (resource) => {
      const resourceSegment = {
        slug: resource,
        label: resolveResourceLabel(resource)
      };
      return [
        [resourceSegment, { slug: LIBRARY_DEFAULT_SUBTYPE, label: "All" }],
        ...resolveLibrarySubTypeOptions(resource).map((option) => [
          resourceSegment,
          {
            slug: String(option.value).toLowerCase(),
            label: option.label ?? String(option.value)
          }
        ])
      ];
    }
  );
  return createPageViewActions(parent, views, options);
}
