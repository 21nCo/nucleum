import { AccessMode } from "@nucleum/datafn/resource.type";
import { isRecordId } from "@nucleum/datafn/resource.utils";
import {
  decodeSpaceSegment,
  SPACE_PAGE_ACTION
} from "@nucleum/client/config/space-route";
import {
  ContextZoneLayer,
  type ContextZonePane
} from "@nucleum/shell/topNav/contextZone/context-zone";

/** What the page of a context-zone pane shows: a record or a page path. */
export type ContextZoneSubject =
  | { kind: "resource"; id: string; accessMode?: AccessMode }
  | { kind: "path"; path: string };

const layerAccessModes: Record<number, AccessMode> = {
  [ContextZoneLayer.BESIDE_BASE]: AccessMode.BESIDE_BASE,
  [ContextZoneLayer.PAGE]: AccessMode.PAGE,
  [ContextZoneLayer.BESIDE_PAGE]: AccessMode.BESIDE_PAGE
};

/**
 * Resolves what the page of `pane` shows from the URL: the base page path,
 * the overlay path, or the record or page opened as a page or split. A space
 * base page, `/space/<id>`, shows its root space.
 */
export function resolveContextZoneSubject(
  pane: ContextZonePane | undefined,
  url: URL
): ContextZoneSubject | undefined {
  if (!pane) return undefined;
  if (pane.layer === ContextZoneLayer.BASE) {
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    const [page, rootSegment] = path.split("/");
    const spaceId =
      page === SPACE_PAGE_ACTION && rootSegment
        ? decodeSpaceSegment(rootSegment)
        : undefined;
    if (spaceId) {
      return { kind: "resource", id: spaceId };
    }
    return path ? { kind: "path", path } : undefined;
  }
  if (pane.layer === ContextZoneLayer.OVERLAY) {
    const path = url.searchParams.get(AccessMode.OVERLAY);
    return path ? { kind: "path", path } : undefined;
  }
  const accessMode = layerAccessModes[pane.layer];
  const value = accessMode ? url.searchParams.get(accessMode) : null;
  if (!accessMode || !value) return undefined;
  return isRecordId(value)
    ? { kind: "resource", id: value, accessMode }
    : { kind: "path", path: value };
}

/**
 * Small line above a record's title in the context tab: its type, followed
 * by where it is open, such as "Node · Library".
 */
export function resolveIdentityTypeLine(
  resourceType: string,
  location: string | undefined
) {
  const type = resourceType
    ? resourceType.charAt(0).toUpperCase() + resourceType.slice(1)
    : "";
  return [type, location].filter(Boolean).join(" · ");
}

/** Width below which the context tab keeps the identity to one line. */
export const IDENTITY_TWO_LINE_MIN_WIDTH = 1400;

/**
 * Whether the context tab shows the two-line identity: only with room for
 * it, so not in split view or in narrow windows.
 */
export function isTwoLineIdentity(windowWidth: number, isSplit: boolean) {
  return !isSplit && windowWidth >= IDENTITY_TWO_LINE_MIN_WIDTH;
}
