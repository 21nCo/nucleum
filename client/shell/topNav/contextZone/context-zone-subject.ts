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
