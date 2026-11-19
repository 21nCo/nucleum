import { AccessMode } from "@nucleum/datafn/resource.type";
import { determineResourceAccessMode } from "@nucleum/datafn/resource.utils";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import type { IContextMenuItem } from "@21n/ui/elements/contextMenu/context-menu.type";

/**
 * Builds the "Open in split screen" menu item of a resource, which reads
 * "Close split screen" and closes the split while the resource is in one:
 * beside the base page, or beside a page, where a split opened from a page
 * goes. Every menu of a resource builds this item here, so they agree on
 * what a split is.
 */
export function buildOpenAsSplitItem(
  id: IRecordId,
  actions: {
    open: (id: IRecordId, accessMode: AccessMode) => void;
    close: (props: { id: IRecordId; accessMode: AccessMode }) => void;
  }
): IContextMenuItem {
  const currentMode = determineResourceAccessMode(id);
  const splitMode =
    currentMode === AccessMode.BESIDE_BASE ||
    currentMode === AccessMode.BESIDE_PAGE
      ? currentMode
      : undefined;
  return {
    value: "open-as-split",
    label: splitMode ? "Close split screen" : "Open in split screen",
    icon: splitMode ? "minus-circle" : "split-screen",
    callback: async () => {
      if (splitMode) actions.close({ id, accessMode: splitMode });
      else actions.open(id, AccessMode.BESIDE_BASE);
    }
  };
}
