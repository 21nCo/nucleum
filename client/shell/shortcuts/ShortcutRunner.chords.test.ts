import { render } from "@testing-library/svelte";
import { writable } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OperatingSystem } from "@nucleum/client/runtime/context.type";

const mocks = vi.hoisted(() => ({
  runAction: vi.fn(),
  closeTopLayer: vi.fn(),
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

import { configureShortcutHost } from "@nucleum/shared-state/shortcuts/shortcut-host";
import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
import ShortcutRunner from "./ShortcutRunner.svelte";

function press(key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true
  });
  document.body.dispatchEvent(event);
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
