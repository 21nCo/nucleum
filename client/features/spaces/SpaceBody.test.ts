import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SpaceBody from "@nucleum/features/spaces/SpaceBody.svelte";

const mocks = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));

vi.mock("@nucleum/features/spaces/space.store", async () => {
  const { writable } = await import("svelte/store");
  const subject = writable<Record<string, unknown>>({});
  return {
    ActiveSpaceStore: {
      resolve: () => ({
        subscribe: subject.subscribe,
        init: async () => subject.set(mocks.state),
        setEditMode: () => undefined,
        setTitleEditing: () => undefined,
        updateView: () => undefined
      })
    }
  };
});
vi.mock("@datafn/svelte", async () => {
  const { readable } = await import("svelte/store");
  return {
    toSvelteStore: () =>
      readable({ data: [{ id: "space:parent", label: "Parent" }] })
  };
});
vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: { space: { signal: () => undefined } }
}));
vi.mock("@nucleum/shell/navigation/app-menu.store", () => ({
  appMenuStore: {
    subscribe: (run: (value: unknown) => void) => {
      run({});
      return () => undefined;
    },
    isSpacePinned: () => false
  }
}));
vi.mock("@nucleum/features/spaces/SpaceHeader.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/spaces/SpaceSideNav.svelte", () => ({
  default: () => {}
}));
vi.mock("@nucleum/features/spaces/SpaceWall.svelte", () => ({
  default: () => {}
}));

async function renderBody(parentId?: string) {
  const onBack = vi.fn();
  const view = render(SpaceBody, {
    props: {
      spaceId: "space:child",
      parentId,
      ancestors: parentId ? [parentId] : [],
      onBack,
      onFocusSpace: () => undefined
    }
  });
  for (let index = 0; index < 5; index++) await tick();
  return { ...view, onBack };
}

describe("SpaceBody unavailable states", () => {
  beforeEach(() => {
    mocks.state = {};
  });

  it.each([
    ["fails to load", { isLoadFailed: true }],
    ["is missing", { isMissing: true }]
  ])(
    "offers a way back to the parent when a sub space %s",
    async (_, state) => {
      mocks.state = state;
      const { getByRole, onBack } = await renderBody("space:parent");
      await fireEvent.click(getByRole("button", { name: "Back to Parent" }));
      expect(onBack).toHaveBeenCalledTimes(1);
    }
  );

  it("offers no way back from a space without a parent", async () => {
    mocks.state = { isMissing: true };
    const { getByText, queryByRole } = await renderBody();
    expect(getByText("Space not found")).toBeTruthy();
    expect(queryByRole("button", { name: /Back to/ })).toBe(null);
  });
});
