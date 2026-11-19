import { render } from "@testing-library/svelte";
import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OperatingSystem } from "@nucleum/client/runtime/context.type";

const mocks = vi.hoisted(() => ({
  runAction: vi.fn(),
  closeTopLayer: vi.fn(),
  publish: vi.fn(),
  registered: new Set(["calendar", "page-f"])
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
  closeTopLayer: mocks.closeTopLayer
}));
vi.mock("@nucleum/shared-state/events/app-events.store", () => ({
  appEvents: { publish: mocks.publish }
}));

import { configureShortcutHost } from "@nucleum/shared-state/shortcuts/shortcut-host";
import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
import ShortcutRunner from "./ShortcutRunner.svelte";

function press(key: string, init: KeyboardEventInit = {}, target?: Element) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init
  });
  (target ?? document.body).dispatchEvent(event);
  return event;
}

/** The shell's own key handling with the chord runner it renders. */
describe("ShortcutRunner with G chords", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    configureShortcutHost({
      defaults: {
        calendar: { prefix: "g", key: "c" },
        focus: { prefix: "g", key: "f" },
        "page-f": { key: "f" }
      },
      configurableActions: () => []
    });
    keyboardShortcuts.loader({});
    render(ShortcutRunner);
  });

  it("cancels G with Escape without closing the top layer", () => {
    press("g");
    press("Escape");
    expect(mocks.closeTopLayer).not.toHaveBeenCalled();

    press("Escape");
    expect(mocks.closeTopLayer).toHaveBeenCalledTimes(1);
  });

  it("still passes Cmd+Escape on to close a resource or modal after G", () => {
    press("g");
    const escape = press("Escape", { metaKey: true });

    expect(escape.defaultPrevented).toBe(false);
    expect(mocks.publish.mock.calls.map(([name]) => name)).toEqual(["Escape"]);
  });

  it("leaves Escape to an open dialog after G", () => {
    const dialog = document.createElement("dialog");
    dialog.setAttribute("open", "");
    dialog.innerHTML = `<button>OK</button>`;
    document.body.append(dialog);
    const layerKeys = vi.fn();
    dialog.addEventListener("keydown", layerKeys);
    const button = dialog.querySelector("button")!;

    press("g", {}, button);
    const escape = press("Escape", {}, button);

    expect(escape.defaultPrevented).toBe(false);
    expect(layerKeys.mock.calls.map(([event]) => event.key)).toEqual([
      "g",
      "Escape"
    ]);
    expect(mocks.closeTopLayer).not.toHaveBeenCalled();
  });

  it("runs no page shortcut for a chord the product does not register", () => {
    press("g");
    press("f");
    expect(mocks.runAction).not.toHaveBeenCalled();

    press("f");
    expect(mocks.runAction).toHaveBeenCalledWith("page-f");
  });

  it("runs a registered chord once", () => {
    press("g");
    press("c");

    expect(mocks.runAction).toHaveBeenCalledTimes(1);
    expect(mocks.runAction).toHaveBeenCalledWith("calendar");
  });
});
