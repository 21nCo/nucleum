import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { Product } from "@nucleum/client/config/product.type";
import { Resource } from "@nucleum/datafn/resource.enum";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import SpaceNavItem from "@nucleum/features/spaces/SpaceNavItem.svelte";
import {
  SpaceNavItemType,
  type ISpaceResourceNavItem
} from "@nucleum/features/spaces/space.type";
import type { ISpaceNavContext } from "@nucleum/features/spaces/space-nav.type";

const nodeSignal = vi.hoisted(() =>
  vi.fn(() => ({
    get: () => [],
    subscribe: () => () => {},
    loading: false,
    error: null,
    refreshing: false
  }))
);

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { node: { signal: nodeSignal } }
}));

const pageId = "node:page";
const item: ISpaceResourceNavItem = {
  id: "item-page",
  label: "Page",
  type: SpaceNavItemType.RESOURCE,
  resourceId: pageId,
  resourceType: Resource.node
};

function navFor(product: Product): ISpaceNavContext {
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

describe("SpaceNavItem headings", () => {
  it("shows the heading tree of a Markdown page the app can open", () => {
    nodeSignal.mockClear();
    const { getByRole, getByText } = render(SpaceNavItem, {
      props: { item, nav: navFor(Product.MEMOTRON) }
    });

    expect(getByRole("button", { name: "Collapse Page" })).toBeTruthy();
    expect(getByText("No headings")).toBeTruthy();
    expect(nodeSignal).toHaveBeenCalled();
  });

  it("hides the heading tree of a Markdown page another app opens", () => {
    nodeSignal.mockClear();
    const { getByText, queryByRole, queryByText } = render(SpaceNavItem, {
      props: { item, nav: navFor(Product.POINTRON) }
    });

    expect(getByText("Opens in Memotron")).toBeTruthy();
    expect(queryByRole("button", { name: /Collapse Page|Expand Page/ })).toBe(
      null
    );
    expect(queryByText("No headings")).toBe(null);
    expect(nodeSignal).not.toHaveBeenCalled();
  });
});
