import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModifierKey } from "@21n/ui/elements/keyboard/keyboard.type";
import { OperatingSystem } from "@nucleum/client/runtime/context.type";

const mocks = vi.hoisted(() => ({
  runAction: vi.fn(),
  registered: new Set(["calendar", "search", "sidebar", "palette"])
}));

vi.mock("@nucleum/datafn/datafn.store", () => ({
  datafn: {
    kv: {
      signal: () => ({
        subscribe: (fn: (value: object) => void) => {
          fn({});
          return () => {};
        },
        dispose: vi.fn()
      }),
      merge: vi.fn(),
      set: vi.fn()
    }
  }
}));
vi.mock("@nucleum/client/runtime/context.store", () => ({
  default: writable({ os: OperatingSystem.MACOS })
}));
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({
    resolveAction: (slug: string) =>
      mocks.registered.has(slug) ? { action: slug } : null,
    runAction: mocks.runAction
  })
}));
vi.mock("@nucleum/shell/navigation/top-layer", () => ({
  closeTopLayer: vi.fn()
}));
vi.mock("@nucleum/shared-state/events/app-events.store", () => ({
  appEvents: { publish: vi.fn() }
}));

import { configureShortcutHost } from "@nucleum/shared-state/shortcuts/shortcut-host";
import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
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

function addLayer(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

describe("ShortcutRunner after a G chord ends", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    configureShortcutHost({
      defaults: {
        calendar: { prefix: "g", key: "c" },
        search: { key: "/" },
        sidebar: { key: "[" },
        palette: { key: "k", modifiers: [ModifierKey.META] }
      },
      configurableActions: () => []
    });
    keyboardShortcuts.loader({});
    render(ShortcutRunner);
  });

  it.each([
    ["/", "search"],
    ["[", "sidebar"]
  ])("runs no plain shortcut for %s as the second key of G", (key, action) => {
    press("g");
    press(key);
    expect(mocks.runAction).not.toHaveBeenCalled();

    press(key);
    expect(mocks.runAction).toHaveBeenCalledWith(action);
    expect(mocks.runAction).toHaveBeenCalledTimes(1);
  });

  it("still runs a Cmd shortcut pressed after G", () => {
    press("g");
    press("k", { metaKey: true });
    expect(mocks.runAction).toHaveBeenCalledWith("palette");
  });

  it("ends the chord when a layer opens and closes before the second key", async () => {
    press("g");
    const layer = addLayer(`<div data-blank-modal></div>`);
    await tick();
    layer.remove();
    await tick();
    press("c");
    expect(mocks.runAction).not.toHaveBeenCalledWith("calendar");
  });

  it("ends the chord when a popover shows and hides through its style", async () => {
    const popover = addLayer(
      `<div class="popover" style="display: none"></div>`
    ).firstElementChild as HTMLElement;
    popover.getClientRects = () =>
      (popover.style.display === "none" ? [] : [{}]) as unknown as DOMRectList;
    press("g");
    popover.style.display = "block";
    await tick();
    popover.style.display = "none";
    await tick();
    press("c");
    expect(mocks.runAction).not.toHaveBeenCalledWith("calendar");
  });

  it("still completes a chord when no layer opens", async () => {
    press("g");
    addLayer(`<span>page content</span>`);
    await tick();
    press("c");
    expect(mocks.runAction).toHaveBeenCalledWith("calendar");
  });
});
