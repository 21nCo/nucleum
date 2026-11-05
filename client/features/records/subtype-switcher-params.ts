import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";

/** Search parameter change emitted by the resource subtype switcher. */
export type SubTypeSwitcherParams =
  | string[]
  | Record<string, string | boolean | null>;

/**
 * Routes a subtype switcher change: a selected `type` goes to `onSubType`, and every
 * other search parameter is passed to `toggleSearchParams`. A change without a
 * `type` parameter is passed to `toggleSearchParams` unchanged.
 */
export function routeSubTypeSwitcherParams(
  params: SubTypeSwitcherParams,
  onSubType: (subType: string) => void,
  toggleSearchParams: (params: SubTypeSwitcherParams) => void
) {
  if (Array.isArray(params) || !(AppSearchParam.TYPE in params)) {
    toggleSearchParams(params);
    return;
  }
  const { [AppSearchParam.TYPE]: subType, ...rest } = params;
  if (Object.keys(rest).length > 0) toggleSearchParams(rest);
  if (typeof subType === "string") onSubType(subType);
}
