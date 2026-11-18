import { render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import SpaceSideNav from "@nucleum/features/spaces/SpaceSideNav.svelte";
import { clearSpaceSelections } from "@nucleum/features/spaces/space-selection";
import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";
import type { ISpaceNavContext } from "@nucleum/features/spaces/space-nav.type";

type RendererProps = { resourceId?: string };

/** The props the side nav passed to its rows and its content panel. */
const mocks = vi.hoisted(() => ({
  renderers: [] as RendererProps[],
  rows: [] as { nav: ISpaceNavContext }[]
}));

const NAMES = ["zero", "one", "two", "three"];

vi.mock("@datafn/svelte", async () => {
  const { readable } = await import("svelte/store");
  return {
    toSvelteStore: () =>
      readable({
        loading: false,
        data: Object.fromEntries(
          NAMES.map((name) => [
            `node:${name}`,
            { id: `node:${name}`, label: name }
          ])
        )
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
  const resource = (name: string) => ({
    id: `item-${name}`,
    label: name,
    type: SpaceNavItemType.RESOURCE,
    resourceId: `node:${name}`,
    resourceType: Resource.node
  });
  // zero, a section holding one and two, then three.
  const items = [
    resource("zero"),
    {
      id: "section-a",
      label: "Section",
      type: SpaceNavItemType.SECTION,
      children: [resource("one"), resource("two")]
    },
    resource("three")
  ];
  return { ActiveSpaceStore: { resolve: () => readable({ items }) } };
});
vi.mock("@nucleum/features/spaces/space.actions", () => ({
  confirmSpaceItemDelete: () => undefined
}));
vi.mock("@nucleum/features/spaces/space-heading-scroll", () => ({
  scrollToHeading: () => () => undefined
}));
vi.mock("@nucleum/features/spaces/SpaceNavItem.svelte", () => ({
  default: (_anchor: Node, props: { nav: ISpaceNavContext }) => {
    // Keep the props: they read the side nav's current context.
    mocks.rows.push(props);
  }
}));
vi.mock("@nucleum/features/spaces/SpaceAddPanel.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/spaces/SpaceResourceRenderer.svelte", () => ({
  default: (_anchor: Node, props: RendererProps) => {
    mocks.renderers.push(props);
  }
}));

async function settle() {
  for (let index = 0; index < 5; index++) await tick();
}

async function mountSpace() {
  const target = document.body.appendChild(document.createElement("div"));
  const view = render(SpaceSideNav, {
    target,
    props: {
      spaceId: "space:keys",
      focusChain: [],
      header: createRawSnippet(() => ({ render: () => "<div></div>" })),
      onFocusSpace: () => undefined
    }
  });
  await settle();
  const nav = () => mocks.rows.at(-1)!.nav;
  return {
    unmount: () => {
      view.unmount();
      target.remove();
    },
    nav,
    /** The record the content panel shows. */
    shown: () => mocks.renderers.at(-1)?.resourceId,
    /** Whether the selected row is drawn: no collapsed section holds it. */
    isSelectedRowShown: () =>
      !["item-one", "item-two"].includes(nav().activeItemId ?? "") ||
      !nav().collapsedIds.has("section-a"),
    step: async (delta: number) => {
      const isStepped = contextZone.stepSub(delta, {
        axis: "vertical",
        isModalOpen: false
      });
      await settle();
      return isStepped;
    },
    toggleSection: async () => {
      nav().onSelectSection("section-a");
      await settle();
    }
  };
}

afterEach(() => {
  clearSpaceSelections();
  mocks.renderers = [];
  mocks.rows = [];
});

describe("Option+Up/Down in a space's side nav", () => {
  it("steps every item while its section is open", async () => {
    const space = await mountSpace();
    expect(space.shown()).toBe("node:zero");

    expect(await space.step(1)).toBe(true);
    expect(space.shown()).toBe("node:one");
    expect(await space.step(1)).toBe(true);
    expect(space.shown()).toBe("node:two");
    space.unmount();
  });

  it("skips the items of a collapsed section and wraps at both ends", async () => {
    const space = await mountSpace();
    await space.toggleSection();
    expect(space.nav().collapsedIds.has("section-a")).toBe(true);

    expect(await space.step(1)).toBe(true);
    expect(space.nav().activeItemId).toBe("item-three");
    expect(space.shown()).toBe("node:three");
    expect(space.isSelectedRowShown()).toBe(true);

    expect(await space.step(1)).toBe(true);
    expect(space.nav().activeItemId).toBe("item-zero");
    expect(space.shown()).toBe("node:zero");

    expect(await space.step(-1)).toBe(true);
    expect(space.nav().activeItemId).toBe("item-three");
    expect(space.isSelectedRowShown()).toBe(true);
    space.unmount();
  });

  it("steps into a section again once it is expanded", async () => {
    const space = await mountSpace();
    await space.toggleSection();
    await space.toggleSection();

    expect(await space.step(1)).toBe(true);
    expect(space.shown()).toBe("node:one");
    space.unmount();
  });
});
