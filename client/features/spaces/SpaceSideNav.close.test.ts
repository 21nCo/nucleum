import { render } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import SpaceSideNav from "@nucleum/features/spaces/SpaceSideNav.svelte";

const mocks = vi.hoisted(() => ({
  renderer: undefined as
    { resourceId?: string; onClose?: () => void } | undefined
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
  default: () => {}
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

describe("closing the item open in a space", () => {
  it("shows the empty panel and opens no other item on its own", async () => {
    render(SpaceSideNav, {
      props: {
        spaceId: "space:s",
        focusChain: [],
        header: createRawSnippet(() => ({ render: () => "<div></div>" })),
        onFocusSpace: () => undefined
      }
    });
    await settle();
    expect(mocks.renderer?.resourceId).toBe("node:one");

    mocks.renderer?.onClose?.();
    await settle();
    expect(mocks.renderer?.resourceId).toBeUndefined();
  });
});
