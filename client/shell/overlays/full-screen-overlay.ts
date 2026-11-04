import { AccessMode } from "@nucleum/datafn/resource.type";
import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";

/**
 * Path of the overlay shown in full screen, if any: the overlay while `max`
 * is on and no resource page covers it. With a resource page open, `max`
 * belongs to that page.
 */
export function resolveFullScreenOverlayPath(searchParams: URLSearchParams) {
  if (searchParams.get(AppSearchParam.MAX) !== "true") return undefined;
  if (searchParams.get(AccessMode.PAGE)) return undefined;
  return searchParams.get(AccessMode.OVERLAY) ?? undefined;
}
