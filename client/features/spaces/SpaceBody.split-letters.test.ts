import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BASE_CONTEXT_ZONE_PANE,
  ContextZoneLayer,
  contextZone,
  type ContextZonePane
} from "@nucleum/shell/topNav/contextZone/context-zone";

const SPLIT_PANE: ContextZonePane = {
  id: "beside-base",
  layer: ContextZoneLayer.BESIDE_BASE
};

const mocks = vi.hoisted(() => ({
  /** Context key of the pane, as a pane scope provides it to its children. */
  paneKey: Symbol("test-pane"),
  starred: [] as string[]
}));

vi.mock(
  "@nucleum/shell/topNav/contextZone/context-zone",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@nucleum/shell/topNav/contextZone/context-zone")
      >();
    const { getContext } = await import("svelte");
    return {
      ...actual,
      getContextZonePane: () =>
        getContext<ContextZonePane | undefined>(mocks.paneKey) ??
        actual.BASE_CONTEXT_ZONE_PANE
    };
  }
);
vi.mock("@nucleum/features/spaces/space.store", async () => {
  const { writable } = await import("svelte/store");
  return {
    ActiveSpaceStore: {
      resolve: (id: string) => {
        const subject = writable({ id, view: "sidenav" });
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
// The space menu's star item records which space it ran for.
vi.mock("@nucleum/features/spaces/space-page-menu", () => ({
  resolveSpacePageMenu: (space: { id: string }) => [
    {
      group: "space",
      items: [
        {
          value: "star",
          label: "Star",
          icon: "star",
          callback: async () => void mocks.starred.push(space.id)
        }
      ]
    }
  ]
}));
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

import SpaceBody from "@nucleum/features/spaces/SpaceBody.svelte";
import ContextActionKeys from "@nucleum/surfaces/commandBar/ContextActionKeys.svelte";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";

async function settle() {
  for (let index = 0; index < 5; index++) await tick();
}

async function pressS() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "s", cancelable: true })
  );
  await settle();
}

function renderSpace(spaceId: string, pane: ContextZonePane) {
  return render(SpaceBody, {
    context: new Map([[mocks.paneKey, pane]]),
    props: {
      spaceId,
      ancestors: [],
      isEmbedded: pane !== BASE_CONTEXT_ZONE_PANE,
      onBack: () => undefined,
      onFocusSpace: () => undefined
    }
  });
}

describe("page letters on a space open in a split", () => {
  let release: (() => void)[] = [];

  beforeEach(async () => {
    document.body.innerHTML = "";
    mocks.starred = [];
    release.push(contextZone.host());
    release.push(contextZone.registerPane(BASE_CONTEXT_ZONE_PANE));
    release.push(contextZone.registerPane(SPLIT_PANE));
    const base = renderSpace("space:page", BASE_CONTEXT_ZONE_PANE);
    const split = renderSpace("space:split", SPLIT_PANE);
    const keys = render(ContextActionKeys);
    release.push(
      () => base.unmount(),
      () => split.unmount(),
      () => keys.unmount()
    );
    await settle();
  });

  afterEach(() => {
    release.reverse().forEach((unregister) => unregister());
    release = [];
    contextZone.releasePane(SPLIT_PANE.id);
    contextZone.releasePane(BASE_CONTEXT_ZONE_PANE.id);
  });

  it("S stars the split space while the user works in the split", async () => {
    contextZone.activatePane(SPLIT_PANE.id);
    const active = get(contextActions.active);
    expect(active?.id).toBe("space:split");
    expect(active?.pane.id).toBe(SPLIT_PANE.id);
    // The super bar's "This space" rows show the letter of the split space.
    expect(active?.resolve()[0].items[0].hotKey).toBe("s");

    await pressS();
    expect(mocks.starred).toEqual(["space:split"]);

    contextZone.activatePane(BASE_CONTEXT_ZONE_PANE.id);
    await pressS();
    expect(mocks.starred).toEqual(["space:split", "space:page"]);
  });

  it("an item opened inside the split space takes S from the space", async () => {
    contextZone.activatePane(SPLIT_PANE.id);
    const items: string[] = [];
    const unregister = contextActions.register(SPLIT_PANE, {
      id: "node:1",
      resource: "node",
      resolve: () => [
        {
          group: "all",
          items: [
            {
              value: "star",
              label: "Star",
              hotKey: "s",
              callback: async () => void items.push("node:1")
            }
          ]
        }
      ]
    });
    try {
      await pressS();
      expect(items).toEqual(["node:1"]);
      expect(mocks.starred).toEqual([]);
    } finally {
      unregister();
    }
    await pressS();
    expect(mocks.starred).toEqual(["space:split"]);
  });
});
