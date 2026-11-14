import { AccessMode } from "@nucleum/datafn/resource.type";
import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";

/**
 * Whether the open page was opened straight into full screen, so minimizing
 * it closes the page and returns to where it was opened from.
 */
export function isPageOpenedInFullScreen(searchParams: URLSearchParams) {
  return (
    !!searchParams.get(AppSearchParam.MAX_OPENED) &&
    !!searchParams.get(AccessMode.PAGE)
  );
}
