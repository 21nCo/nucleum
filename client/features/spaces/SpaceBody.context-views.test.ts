import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { get, type Writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BASE_CONTEXT_ZONE_PANE,
  contextZone
} from "@nucleum/shell/topNav/contextZone/context-zone";

const mocks = vi.hoisted(() => ({
  updateView: undefined as unknown as ReturnType<typeof vi.fn>,
  state: undefined as unknown as Writable<{ view?: string }>
}));

vi.mock("@nucleum/features/spaces/space.store", async () => {
  const { writable } = await import("svelte/store");
  const subject = writable<{ view?: string }>({});
  mocks.state = subject;
  mocks.updateView = vi.fn((view: string) =>
    subject.update((prev) => ({ ...prev, view }))
  );
  return {
    ActiveSpaceStore: {
      resolve: () => ({
        subscribe: subject.subscribe,
        init: async () => undefined,
        setEditMode: () => undefined,
        setTitleEditing: () => undefined,
        updateView: (view: string) => mocks.updateView(view)
      })
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
// ShortcutRunner: Option+Left / Option+Right resolve to the context view
// commands; any other key has no shortcut.
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({ runAction: vi.fn() })
}));
vi.mock("@nucleum/shared-state/shortcuts/shortcuts.store", () => ({
  keyboardShortcuts: {
    resolveShortcut: (event: KeyboardEvent) => ({
      shortcut:
        event.altKey && event.key === "ArrowLeft"
          ? { action: "previous-context-view" }
          : event.altKey && event.key === "ArrowRight"
            ? { action: "next-context-view" }
            : undefined,
      modifiers: []
    })
  }
}));
vi.mock("@nucleum/shell/navigation/top-layer", () => ({
  closeTopLayer: vi.fn()
}));

import SpaceBody from "@nucleum/features/spaces/SpaceBody.svelte";
import { SPACE_VIEW_OPTIONS } from "@nucleum/features/spaces/SpaceContextZone.svelte";
import { SpaceView } from "@nucleum/features/spaces/space.type";
import ShortcutRunner from "@nucleum/shell/shortcuts/ShortcutRunner.svelte";
import { stepContextView } from "@nucleum/shell/shortcuts/context-view-step";

// V (cycle_context_view in global-commands.ts) runs stepContextView(1).
const pressV = () => stepContextView(1);

function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init
  });
  document.body.dispatchEvent(event);
  return event;
}

async function settle() {
  for (let index = 0; index < 5; index++) await tick();
}

/** Space layout the menu shows: the `view` the space store holds. */
const shownView = () => get(mocks.state).view;

describe("SpaceBody layout on the view keys", () => {
  let release: (() => void)[] = [];

  beforeEach(async () => {
    document.body.innerHTML = "";
    mocks.state.set({ view: SpaceView.WALL });
    mocks.updateView.mockClear();
    release.push(contextZone.host());
    render(ShortcutRunner);
    render(SpaceBody, {
      props: {
        spaceId: "space:bare",
        ancestors: [],
        onBack: () => undefined,
        onFocusSpace: () => undefined
      }
    });
    await settle();
  });

  afterEach(() => {
    release.forEach((unregister) => unregister());
    release = [];
  });

  it("follows the menu order of the space layouts", () => {
    expect(SPACE_VIEW_OPTIONS.map((option) => option.value)).toEqual([
      SpaceView.SIDENAV,
      SpaceView.WALL
    ]);
  });

  it("V cycles the layout of a bare space", async () => {
    pressV();
    expect(mocks.updateView).toHaveBeenLastCalledWith(SpaceView.SIDENAV);
    await settle();
    pressV();
    expect(mocks.updateView).toHaveBeenLastCalledWith(SpaceView.WALL);
    expect(shownView()).toBe(SpaceView.WALL);
  });

  it("Option arrows step the layout with wrapping", async () => {
    const right = press("ArrowRight", { altKey: true });
    expect(right.defaultPrevented).toBe(true);
    expect(mocks.updateView).toHaveBeenLastCalledWith(SpaceView.SIDENAV);
    await settle();
    press("ArrowLeft", { altKey: true });
    expect(mocks.updateView).toHaveBeenLastCalledWith(SpaceView.WALL);
    await settle();
    press("ArrowLeft", { altKey: true });
    expect(mocks.updateView).toHaveBeenLastCalledWith(SpaceView.SIDENAV);
    expect(shownView()).toBe(SpaceView.SIDENAV);
  });

  it("1 and 2 pick the layout by its menu position", async () => {
    const one = press("1");
    expect(one.defaultPrevented).toBe(true);
    expect(mocks.updateView).toHaveBeenLastCalledWith(
      SPACE_VIEW_OPTIONS[0].value
    );
    await settle();
    press("2");
    expect(mocks.updateView).toHaveBeenLastCalledWith(
      SPACE_VIEW_OPTIONS[1].value
    );
    expect(shownView()).toBe(SpaceView.WALL);
    const three = press("3");
    expect(three.defaultPrevented).toBe(false);
    expect(mocks.updateView).toHaveBeenCalledTimes(2);
  });

  it("moves the tabs of a resource shown inside the space, not the layout", async () => {
    const select = vi.fn();
    // A resource shown in place registers its tabs on the space's pane.
    release.push(
      contextZone.registerViews(BASE_CONTEXT_ZONE_PANE, {
        views: { values: ["view", "chat"], active: "view", select }
      })
    );

    press("ArrowRight", { altKey: true });
    press("2");
    pressV();

    expect(select).toHaveBeenCalledTimes(3);
    expect(select).toHaveBeenLastCalledWith("chat");
    expect(mocks.updateView).not.toHaveBeenCalled();
  });
});
