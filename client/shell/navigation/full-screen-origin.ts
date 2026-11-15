import { AccessMode } from "@nucleum/datafn/resource.type";
import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
import { fullScreen } from "@nucleum/shell/overlays/modal.store";

/**
 * Whether the open page owns full screen: `max` is on with a page open, and
 * it is not the full screen of an overlay the page was opened over. A page
 * over a full screen overlay closes back to that overlay, still in full
 * screen, rather than being minimized.
 */
export function isPageFullScreenOwner(
  searchParams: URLSearchParams,
  fullScreenPath: string | undefined = fullScreen.get().path
) {
  const overlay = searchParams.get(AccessMode.OVERLAY);
  return (
    !!searchParams.get(AccessMode.PAGE) &&
    !!searchParams.get(AppSearchParam.MAX) &&
    !(!!overlay && overlay === fullScreenPath)
  );
}

/**
 * Whether the open page was opened straight into full screen, so minimizing
 * it closes the page and returns to where it was opened from. A page over a
 * full screen overlay never is, because that overlay owns full screen.
 */
export function isPageOpenedInFullScreen(
  searchParams: URLSearchParams,
  fullScreenPath: string | undefined = fullScreen.get().path
) {
  const overlay = searchParams.get(AccessMode.OVERLAY);
  return (
    !!searchParams.get(AppSearchParam.MAX_OPENED) &&
    !!searchParams.get(AccessMode.PAGE) &&
    !(!!overlay && overlay === fullScreenPath)
  );
}
