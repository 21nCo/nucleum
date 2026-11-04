import { vi } from "vitest";
import { Product } from "@nucleum/client/config/product.type";
import { Resource } from "@nucleum/datafn/resource.enum";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import {
  SpaceNavItemType,
  type ISpaceResourceNavItem
} from "@nucleum/features/spaces/space.type";
import type { ISpaceNavContext } from "@nucleum/features/spaces/space-nav.type";

/**
 * DataFn store stub for SpaceNavItem tests: node signals are empty and the
 * signal factory is a mock, so a test can check whether headings were read.
 */
export function createSpaceNavItemDatafnStub() {
  return {
    datafn: {
      node: {
        signal: vi.fn(() => ({
          get: () => [],
          subscribe: () => () => {},
          loading: false,
          error: null,
          refreshing: false
        }))
      }
    }
  };
}

/** Id of the Markdown page the test nav item links to. */
export const pageId = "node:page";

/** Nav item linking to the Markdown page `pageId`. */
export const item: ISpaceResourceNavItem = {
  id: "item-page",
  label: "Page",
  type: SpaceNavItemType.RESOURCE,
  resourceId: pageId,
  resourceType: Resource.node
};

/** Side nav context of `product` with `item` expanded and every handler a no-op. */
export function navFor(product: Product): ISpaceNavContext {
  const noop = () => {};
  return {
    product,
    activeItemId: null,
    isEditMode: false,
    targetSectionId: null,
    collapsedIds: new Set(),
    expandedIds: new Set([item.id]),
    editingItemId: null,
    draggedItemId: null,
    targets: {
      [pageId]: {
        id: pageId,
        label: "Page",
        contentType: NodeType.NODULAR_MARKDOWN
      }
    },
    isTargetsLoaded: true,
    loopIds: new Set(),
    onOpen: noop,
    onOpenHeading: noop,
    onFocusSpace: noop,
    onSelectSection: noop,
    onToggle: noop,
    onStartEdit: noop,
    onRename: noop,
    onCancelEdit: noop,
    onDelete: noop,
    onAddSection: noop,
    onDragStart: noop,
    onDragEnd: noop,
    onDrop: noop,
    onKeyboardMove: noop
  };
}
