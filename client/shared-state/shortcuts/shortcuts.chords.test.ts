import { beforeEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";
import { KeyboardKey, ModifierKey } from "@21n/ui/elements/keyboard/keyboard.type";
import { OperatingSystem } from "@nucleum/client/runtime/context.type";
import { configureShortcutHost } from "./shortcut-host";

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
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() }
}));
import { keyboardShortcuts } from "./shortcuts.store";

const defaults = {
  calendar: { prefix: "g", key: "c" },
  focus: { prefix: "g", key: "f" },
  create: { key: "n" },
  newCommands: { prefix: "g", key: "n" },
  previousView: {
    key: KeyboardKey.ARROW_LEFT,
    code: KeyboardKey.ARROW_LEFT,
    modifiers: [ModifierKey.ALT]
  }
};

const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

beforeEach(() => {
  configureShortcutHost({ defaults, configurableActions: () => [] });
  keyboardShortcuts.loader({});
});

describe("shortcut chords", () => {
  it("matches a chord key only after its prefix, and a plain key only without one", () => {
    expect(
      keyboardShortcuts.resolveShortcut(key({ key: "c" })).shortcut
    ).toBeUndefined();
    expect(
      keyboardShortcuts.resolveShortcut(key({ key: "c" }), { prefix: "g" })
        .shortcut?.action
    ).toBe("calendar");
    expect(
      keyboardShortcuts.resolveShortcut(key({ key: "n" })).shortcut?.action
    ).toBe("create");
    expect(
      keyboardShortcuts.resolveShortcut(key({ key: "N" }), { prefix: "G" })
        .shortcut?.action
    ).toBe("newCommands");
  });

  it("skips shortcuts whose command is not registered", () => {
    const isRegistered = (action: string) => action !== "focus";
    expect(
      keyboardShortcuts.resolveShortcut(key({ key: "f" }), {
        prefix: "g",
        isRegistered
      }).shortcut
    ).toBeUndefined();
    expect(
      keyboardShortcuts.resolveShortcut(key({ key: "c" }), {
        prefix: "g",
        isRegistered
      }).shortcut?.action
    ).toBe("calendar");
  });

  it("leaves shortcuts without a prefix such as Option+Left unchanged", () => {
    const event = key({
      key: KeyboardKey.ARROW_LEFT,
      code: KeyboardKey.ARROW_LEFT,
      altKey: true
    });
    expect(keyboardShortcuts.resolveShortcut(event).shortcut?.action).toBe(
      "previousView"
    );
    expect(
      keyboardShortcuts.resolveShortcut(event, { prefix: "g" }).shortcut
    ).toBeUndefined();
  });
});
