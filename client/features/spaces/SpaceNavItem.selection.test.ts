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

describe("SpaceNavItem selection in framed app styles", () => {
  it("marks the open row with a raised background and an accent label", () => {
    const { getByText } = render(SpaceNavItem, {
      props: {
        item,
        nav: { ...navFor(Product.MEMOTRON), activeItemId: item.id }
      }
    });
    const label = getByText("Page");
    const row = label.closest("[data-role='space-item-main']")
      ?.parentElement as HTMLElement;
    expect(row.className).toContain("app-framed:bg-bgs3");
    expect(label.className).toContain("app-framed:text-aps1");
  });

  it("marks the section items are added to the same way", () => {
    const section = {
      id: "section-a",
      label: "Section",
      type: SpaceNavItemType.SECTION,
      children: []
    };
    const { getByText } = render(SpaceNavItem, {
      props: {
        item: section as never,
        nav: {
          ...navFor(Product.MEMOTRON),
          isEditMode: true,
          targetSectionId: section.id
        }
      }
    });
    const label = getByText("Section");
    expect(label.className).toContain("app-framed:text-aps1");
  });

  it("leaves other rows unmarked", () => {
    const { getByText } = render(SpaceNavItem, {
      props: { item, nav: navFor(Product.MEMOTRON) }
    });
    expect(getByText("Page").className).not.toContain("app-framed:text-aps1");
  });
});
