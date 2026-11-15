import { render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import SpaceSideNav from "@nucleum/features/spaces/SpaceSideNav.svelte";
import { clearSpaceSelections } from "@nucleum/features/spaces/space-selection";
import type { ISpaceNavContext } from "@nucleum/features/spaces/space-nav.type";
import type { ISpaceResourceNavItem } from "@nucleum/features/spaces/space.type";

type RendererProps = { resourceId?: string; onClose?: () => void };

/** Props each mounted side nav passed, with the node it rendered at. */
const mocks = vi.hoisted(() => ({
  renderers: [] as { anchor: Node; props: RendererProps }[],
  navs: [] as { anchor: Node; nav: ISpaceNavContext }[]
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
  default: (anchor: Node, props: { nav: ISpaceNavContext }) => {
    mocks.navs.push({ anchor, nav: props.nav });
  }
}));
vi.mock("@nucleum/features/spaces/SpaceAddPanel.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/spaces/SpaceResourceRenderer.svelte", () => ({
  default: (anchor: Node, props: RendererProps) => {
    mocks.renderers.push({ anchor, props });
  }
}));

async function settle() {
  for (let index = 0; index < 5; index++) await tick();
}

async function mountSpace(spaceId = "space:s", isEmbedded = false) {
  const target = document.body.appendChild(document.createElement("div"));
  const view = render(SpaceSideNav, {
    target,
    props: {
      spaceId,
      focusChain: [],
      isEmbedded,
      header: createRawSnippet(() => ({ render: () => "<div></div>" })),
      onFocusSpace: () => undefined
    }
  });
  await settle();
  const within = <T extends { anchor: Node }>(list: T[]) =>
    list.findLast((entry) => target.contains(entry.anchor));
  return {
    unmount: () => {
      view.unmount();
      target.remove();
    },
    /** The resource this side nav shows. */
    shown: () => within(mocks.renderers)?.props.resourceId,
    close: async () => {
      within(mocks.renderers)?.props.onClose?.();
      await settle();
    },
    open: async (item: ISpaceResourceNavItem) => {
      within(mocks.navs)?.nav.onOpen(item);
      await settle();
    }
  };
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
  mocks.renderers = [];
  mocks.navs = [];
});

describe("closing the item open in a space", () => {
  it("shows the empty panel and opens no other item on its own", async () => {
    const space = await mountSpace();
    expect(space.shown()).toBe("node:one");

    await space.close();
    expect(space.shown()).toBeUndefined();
  });
});

describe("the item a space shows across a remount", () => {
  it("returns to the item the user opened, not the first item", async () => {
    const first = await mountSpace();
    await first.open(itemTwo);
    expect(first.shown()).toBe("node:two");
    first.unmount();

    expect((await mountSpace()).shown()).toBe("node:two");
  });

  it("keeps the empty panel after the user closed the item", async () => {
    const first = await mountSpace();
    await first.close();
    expect(first.shown()).toBeUndefined();
    first.unmount();

    expect((await mountSpace()).shown()).toBeUndefined();
  });

  it("keeps the selection of each space apart", async () => {
    const first = await mountSpace("space:s");
    await first.open(itemTwo);
    first.unmount();

    expect((await mountSpace("space:other")).shown()).toBe("node:one");
  });

  it("keeps the page and the embedded side nav of one space apart", async () => {
    const page = await mountSpace("space:s");
    const embedded = await mountSpace("space:s", true);
    await embedded.close();
    await page.open(itemTwo);
    expect(page.shown()).toBe("node:two");
    expect(embedded.shown()).toBeUndefined();
    page.unmount();
    embedded.unmount();

    expect((await mountSpace("space:s")).shown()).toBe("node:two");
    expect((await mountSpace("space:s", true)).shown()).toBeUndefined();
  });
});
