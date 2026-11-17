import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contextZone,
  ContextZoneLayer
} from "@nucleum/shell/topNav/contextZone/context-zone";

vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({ runAction: vi.fn() })
}));
vi.mock("@nucleum/shared-state/shortcuts/shortcuts.store", () => ({
  keyboardShortcuts: {
    // Option+Left / Option+Right resolve to the context view commands; any
    // other key has no shortcut.
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

import ShortcutRunner from "./ShortcutRunner.svelte";

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

const BASE_LAYERS = [ContextZoneLayer.BASE, ContextZoneLayer.BESIDE_BASE];

describe("ShortcutRunner with a full-screen overlay over a page switcher", () => {
  let release: () => void;
  let select: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML = "";
    render(ShortcutRunner);
    select = vi.fn();
    // A resource beside the base page registers its tabs as page views.
    release = contextZone.registerViews(
      { id: "beside-base", layer: ContextZoneLayer.BESIDE_BASE },
      { views: { values: ["view", "chat"], active: "view", select } }
    );
    // Full-screen overlay: only the overlay layer is visible and it mounts
    // no pane scope.
    contextZone.setVisibleLayers([ContextZoneLayer.OVERLAY]);
  });

  afterEach(() => {
    release();
    contextZone.setVisibleLayers(undefined);
  });

  it("leaves Option arrows and number keys alone", () => {
    const arrow = press("ArrowRight", { altKey: true });
    const digit = press("2");

    expect(select).not.toHaveBeenCalled();
    expect(arrow.defaultPrevented).toBe(false);
    expect(digit.defaultPrevented).toBe(false);
  });

  it("switches the page's views again once the overlay closes", () => {
    contextZone.setVisibleLayers(BASE_LAYERS);

    const arrow = press("ArrowRight", { altKey: true });
    expect(select).toHaveBeenLastCalledWith("chat");
    expect(arrow.defaultPrevented).toBe(true);

    const digit = press("2");
    expect(select).toHaveBeenCalledTimes(2);
    expect(digit.defaultPrevented).toBe(true);
  });
});
