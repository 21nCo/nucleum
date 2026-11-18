import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BASE_CONTEXT_ZONE_PANE,
  contextZone
} from "@nucleum/shell/topNav/contextZone/context-zone";

const mocks = vi.hoisted(() => ({
  states: {} as Record<string, object>
}));

vi.mock("@nucleum/features/spaces/space.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    ActiveSpaceStore: {
      resolve: (id: string) => {
        const subject = writable(mocks.states[id]);
        return {
          subscribe: subject.subscribe,
          init: async () => undefined,
          setEditMode: () => undefined,
          setTitleEditing: () => undefined,
          updateView: () => undefined
        };
      }
    }
  };
});
vi.mock("@datafn/svelte", async () => {
  const { readable } = await import("svelte/store");
  return { toSvelteStore: () => readable({ data: [] }) };
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
vi.mock("@nucleum/features/spaces/SpaceContextZone.svelte", () => ({
  default: () => {},
  SPACE_VIEW_OPTIONS: []
}));

import SpaceBody from "@nucleum/features/spaces/SpaceBody.svelte";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";

async function settle() {
  for (let index = 0; index < 5; index++) await tick();
}

async function renderSpace(spaceId: string, ancestors: string[] = []) {
  const view = render(SpaceBody, {
    props: {
      spaceId,
      ancestors,
      onBack: () => undefined,
      onFocusSpace: () => undefined
    }
  });
  await settle();
  return view;
}

describe("space letters after a failed load", () => {
  let release: (() => void)[] = [];

  beforeEach(() => {
    document.body.innerHTML = "";
    mocks.states = {};
    release.push(contextZone.host());
    release.push(contextZone.registerPane(BASE_CONTEXT_ZONE_PANE));
  });

  afterEach(() => {
    release.reverse().forEach((unregister) => unregister());
    release = [];
    contextZone.releasePane(BASE_CONTEXT_ZONE_PANE.id);
  });

  it("registers the actions of a space that loaded", async () => {
    mocks.states["space:1"] = { id: "space:1", view: "sidenav" };
    const view = await renderSpace("space:1");
    release.push(() => view.unmount());
    expect(get(contextActions.active)?.id).toBe("space:1");
  });

  it.each([
    ["the first load failed", { isLoadFailed: true }],
    [
      "a reload failed after an earlier snapshot",
      { id: "space:1", view: "sidenav", isLoadFailed: true }
    ]
  ])("registers no actions when %s", async (_name, state) => {
    mocks.states["space:1"] = state;
    const view = await renderSpace("space:1");
    release.push(() => view.unmount());
    expect(get(contextActions.active)).toBeUndefined();
  });

  it("registers no actions for a nested space whose root did not load", async () => {
    mocks.states["space:root"] = { isLoadFailed: true };
    mocks.states["space:child"] = { id: "space:child", view: "sidenav" };
    const view = await renderSpace("space:child", ["space:root"]);
    release.push(() => view.unmount());
    expect(get(contextActions.active)).toBeUndefined();
  });
});
