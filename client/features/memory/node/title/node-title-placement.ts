import type { AccessMode } from "@nucleum/datafn/resource.type";
import { isContextZoneAccessMode } from "@nucleum/shell/topNav/contextZone/context-zone";

/**
 * Whether a node's title shows in the top bar context zone instead of the
 * page body: a top bar hosts the zone at full width, and the node is open as
 * a page or split.
 */
export function isNodeTitleInContextZone(
  isHosted: boolean,
  layout: { isPortrait: boolean; isConstrainedWidth: boolean },
  accessMode: AccessMode | string | undefined
) {
  return (
    isHosted &&
    !layout.isPortrait &&
    !layout.isConstrainedWidth &&
    isContextZoneAccessMode(accessMode)
  );
}
