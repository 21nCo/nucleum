import { Action } from "@nucleum/client/config/action.enum";
import { resolveOpenLiveActionAccessMode } from "@nucleum/shared-state/commands/live-action-access";

/**
 * Layer the navigator is open in, read from `url`: the right panel, or the
 * overlay it opens in where the panel cannot show. Undefined when closed.
 */
export function resolveNavigatorLayer(url: URL) {
  return resolveOpenLiveActionAccessMode(Action.NAVIGATOR, url);
}
