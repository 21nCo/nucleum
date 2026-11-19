import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModifierKey } from "@21n/ui/elements/keyboard/keyboard.type";
import type { IKeyboardShortcut } from "@21n/ui/elements/keyboard/shortcut.type";
import { syncSingleKeyShortcutsEnabled } from "@nucleum/shared-state/preferences/single-key-shortcuts";
import { LayoutContext } from "@nucleum/shell/layout-mode.type";
import AppMenuSwitcherItem from "./AppMenuSwitcherItem.svelte";

const mocks = vi.hoisted(() => ({
  shortcuts: {} as Record<string, unknown>
}));

vi.mock("@nucleum/shared-state/shortcuts/shortcuts.store", () => ({
  keyboardShortcuts: {
    resolveShortcutForAction: (action: string) => mocks.shortcuts[action]
  }
}));
vi.mock("@nucleum/shared-state/shortcuts/shortcut-hints.store", async () => {
  const { writable } = await import("svelte/store");
  return { shortcutHints: writable({ isShowHotKeyHints: true }) };
});
vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { getState: () => false, subscribe: () => () => {} }
}));
vi.mock("@nucleum/shared-state/app-context/app.store", () => ({
  appStore: writable({})
}));
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({ runAction: vi.fn() })
}));
vi.mock("@nucleum/client/runtime/embed/embed.utils", () => ({
  postMessageToParent: vi.fn()
}));
vi.mock("@nucleum/shared-state/resources/library.utils", () => ({
  isHideCreateAction: () => true
}));
vi.mock("@nucleum/datafn/resource.utils", () => ({
  resourceAction: (resource: string, type: string) => `${resource}-${type}`
}));

const SHORTCUTS: Record<string, IKeyboardShortcut> = {
  calendar: { prefix: "g", key: "c" },
  notes: { key: "n" },
  search: { key: "k", modifiers: [ModifierKey.META] }
};

function hintOf(action: string) {
  const { container } = render(AppMenuSwitcherItem, {
    props: {
      item: { action, label: "Item" } as never,
      layoutContext: LayoutContext.DEFAULT,
      parentBackgroundIndex: 1
    }
  });
  const label = () =>
    Array.from(container.querySelectorAll("button > span"))
      .map((span) => span.textContent?.trim())
      .join("");
  return label;
}

beforeEach(() => {
  mocks.shortcuts = SHORTCUTS;
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {}
  }));
});

afterEach(() => {
  cleanup();
  syncSingleKeyShortcutsEnabled(true);
  vi.unstubAllGlobals();
});

describe("app menu key hints with the single-key shortcuts setting", () => {
  it("shows G chord and single-key hints while on", () => {
    expect(hintOf("calendar")()).toBe("G C");
    expect(hintOf("notes")()).toBe("N");
  });

  it("hides G chord and single-key hints while off, and follows the setting", async () => {
    const calendar = hintOf("calendar");
    syncSingleKeyShortcutsEnabled(false);
    await tick();
    expect(calendar()).toBe("");
    expect(hintOf("notes")()).toBe("");

    syncSingleKeyShortcutsEnabled(true);
    await tick();
    expect(calendar()).toBe("G C");
  });

  it("keeps a hint with Cmd while off", () => {
    syncSingleKeyShortcutsEnabled(false);
    expect(hintOf("search")()).toBe("K");
  });
});
