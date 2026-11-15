import { render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import SpaceSideNav from "@nucleum/features/spaces/SpaceSideNav.svelte";
import { clearSpaceSelections } from "@nucleum/features/spaces/space-selection";
import type { ISpaceNavContext } from "@nucleum/features/spaces/space-nav.type";
import type { ISpaceResourceNavItem } from "@nucleum/features/spaces/space.type";

const mocks = vi.hoisted(() => ({
  renderer: undefined as
    { resourceId?: string; onClose?: () => void } | undefined,
  nav: undefined as ISpaceNavContext | undefined
}));

vi.mock("@datafn/svelte", async () => {
  const { readable } = await import("svelte/store");
  return {
    toSvelteStore: () =>
      readable({
        loading: false,
        data: {
          "node:one": { id: "node:one", label: "One" },
          "node:two": { id: "node:two", label: "Two" }
        }
      })
  };
});
vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { recordsByIdsSignal: () => undefined }
}));
vi.mock("@nucleum/shared-state/app-context/app.store", async () => {
  const { readable } = await import("svelte/store");
  const { Product } = await import("@nucleum/client/config/product.type");
  return {
    appStore: readable({ product: Product.MEMOTRON }),
    acquireDnDPage: () => () => undefined
  };
});
vi.mock("@nucleum/features/spaces/space.store", async () => {
  const { readable } = await import("svelte/store");
  const { SpaceNavItemType } =
    await import("@nucleum/features/spaces/space.type");
  const { Resource } = await import("@nucleum/datafn/resource.enum");
  const items = ["one", "two"].map((name) => ({
    id: `item-${name}`,
    label: name,
    type: SpaceNavItemType.RESOURCE,
    resourceId: `node:${name}`,
    resourceType: Resource.node
  }));
  return { ActiveSpaceStore: { resolve: () => readable({ items }) } };
});
vi.mock("@nucleum/features/spaces/space.actions", () => ({
  confirmSpaceItemDelete: () => undefined
}));
vi.mock("@nucleum/features/spaces/space-heading-scroll", () => ({
  scrollToHeading: () => () => undefined
}));
vi.mock("@nucleum/features/spaces/SpaceNavItem.svelte", () => ({
  default: (_anchor: unknown, props: { nav: ISpaceNavContext }) => {
    mocks.nav = props.nav;
  }
}));
vi.mock("@nucleum/features/spaces/SpaceAddPanel.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/spaces/SpaceResourceRenderer.svelte", () => ({
  default: (_anchor: unknown, props: typeof mocks.renderer) => {
    mocks.renderer = props;
  }
}));

async function settle() {
  for (let index = 0; index < 5; index++) await tick();
}

async function mountSpace(spaceId = "space:s") {
  const view = render(SpaceSideNav, {
    props: {
      spaceId,
      focusChain: [],
      header: createRawSnippet(() => ({ render: () => "<div></div>" })),
      onFocusSpace: () => undefined
    }
  });
  await settle();
  return view;
}

const itemTwo = {
  id: "item-two",
  label: "two",
  type: "resource",
  resourceId: "node:two",
  resourceType: "node"
} as unknown as ISpaceResourceNavItem;

afterEach(() => {
  clearSpaceSelections();
});

describe("the item a space shows across a remount", () => {
  it("returns to the item the user opened, not the first item", async () => {
    const first = await mountSpace();
    mocks.nav?.onOpen(itemTwo);
    await settle();
    expect(mocks.renderer?.resourceId).toBe("node:two");
    first.unmount();

    await mountSpace();
    expect(mocks.renderer?.resourceId).toBe("node:two");
  });

  it("keeps the empty panel after the user closed the item", async () => {
    const first = await mountSpace();
    mocks.renderer?.onClose?.();
    await settle();
    expect(mocks.renderer?.resourceId).toBeUndefined();
    first.unmount();

    await mountSpace();
    expect(mocks.renderer?.resourceId).toBeUndefined();
  });

  it("keeps the selection of each space apart", async () => {
    const first = await mountSpace("space:s");
    mocks.nav?.onOpen(itemTwo);
    await settle();
    first.unmount();

    await mountSpace("space:other");
    expect(mocks.renderer?.resourceId).toBe("node:one");
  });
});
