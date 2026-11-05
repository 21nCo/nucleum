import { Action } from "@nucleum/client/config/action.enum";
import { resolveOpenLiveActionAccessMode } from "@nucleum/shared-state/commands/live-action-access";

/**
 * Layer the navigator is open in, read from `url`: the right panel, or the
 * overlay it opens in where the panel cannot show. Undefined when closed.
 */
export function resolveNavigatorLayer(url: URL) {
  return resolveOpenLiveActionAccessMode(Action.NAVIGATOR, url);
}

/**
 * Whether `overlay`, the overlay path in the URL, is drawn above an open
 * resource page instead of beneath it. Only the navigator is: it opens as an
 * overlay where its panel cannot show and must keep the page and its trail.
 */
export function isOverlayAbovePage(overlay: string | null | undefined) {
  return overlay === Action.NAVIGATOR;
}
