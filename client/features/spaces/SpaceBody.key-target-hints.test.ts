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
  paneKey: Symbol("test-pane"),
  zoneProps: undefined as { isKeyed?: boolean } | undefined
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
// Keeps the live props, whose getters read SpaceBody's current values.
vi.mock("@nucleum/features/spaces/SpaceContextZone.svelte", () => ({
  default: (_anchor: unknown, props: { isKeyed?: boolean }) => {
    mocks.zoneProps = props;
  },
  SPACE_VIEW_OPTIONS: []
}));

import SpaceBody from "@nucleum/features/spaces/SpaceBody.svelte";
import ContextZonePaneHarness from "../../../tests/fixtures/components/ContextZonePaneHarness.svelte";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";

async function settle() {
  for (let index = 0; index < 5; index++) await tick();
}

describe("space menu letters beside a pane without resource actions", () => {
  let release: (() => void)[] = [];

  beforeEach(async () => {
    document.body.innerHTML = "";
    mocks.zoneProps = undefined;
    release.push(contextZone.host());
    release.push(contextZone.registerPane(BASE_CONTEXT_ZONE_PANE));
    release.push(contextZone.registerPane(SPLIT_PANE));
    const split = render(SpaceBody, {
      context: new Map([[mocks.paneKey, SPLIT_PANE]]),
      props: {
        spaceId: "space:split",
        ancestors: [],
        isEmbedded: true,
        onBack: () => undefined,
        onFocusSpace: () => undefined
      }
    });
    const zone = render(ContextZonePaneHarness, {
      props: { entries: contextZone.entries, paneId: SPLIT_PANE.id }
    });
    release.push(
      () => split.unmount(),
      () => zone.unmount()
    );
    await settle();
  });

  afterEach(() => {
    release.reverse().forEach((unregister) => unregister());
    release = [];
    contextZone.releasePane(SPLIT_PANE.id);
    contextZone.releasePane(BASE_CONTEXT_ZONE_PANE.id);
  });

  it("shows the split space's letters while the user works in the split", async () => {
    contextZone.activatePane(SPLIT_PANE.id);
    await settle();
    expect(mocks.zoneProps?.isKeyed).toBe(true);
  });

  it("hides them while the user works in a page beside it, such as Calendar", async () => {
    contextZone.activatePane(BASE_CONTEXT_ZONE_PANE.id);
    await settle();
    // The super bar still falls back to the split space's actions.
    expect(get(contextActions.active)?.id).toBe("space:split");
    expect(mocks.zoneProps?.isKeyed).toBe(false);

    contextZone.activatePane(SPLIT_PANE.id);
    await settle();
    expect(mocks.zoneProps?.isKeyed).toBe(true);
  });
});
