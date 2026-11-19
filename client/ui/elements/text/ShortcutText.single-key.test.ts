import { cleanup, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ModifierKey } from "@21n/ui/elements/keyboard/keyboard.type";
import type { IKeyboardShortcut } from "@21n/ui/elements/keyboard/shortcut.type";
import { isSingleKeyShortcut } from "@21n/ui/elements/keyboard/shortcut.utils";
import {
  configureElementShortcutHost,
  notifyElementShortcutsChanged
} from "@21n/ui/hosts/shortcut-host";
import ShortcutText from "./ShortcutText.svelte";

const SHORTCUTS: Record<string, IKeyboardShortcut> = {
  search: { key: "Space" },
  create: { key: "n" },
  calendar: { prefix: "g", key: "c" },
  superBar: { key: "k", modifiers: [ModifierKey.META] },
  nextView: { key: "ArrowRight", modifiers: [ModifierKey.ALT] }
};

let isSingleKeyOn = true;

function setSingleKeys(value: boolean) {
  isSingleKeyOn = value;
  notifyElementShortcutsChanged();
}

function shown(props: Record<string, unknown>) {
  return render(ShortcutText, { props }).container.textContent?.trim() ?? "";
}

beforeEach(() => {
  isSingleKeyOn = true;
  configureElementShortcutHost({
    resolve: (action) => SHORTCUTS[action],
    isSingleKeyEnabled: () => isSingleKeyOn
  });
});

afterEach(() => {
  cleanup();
  setSingleKeys(true);
});

describe("isSingleKeyShortcut", () => {
  it.each([
    [{ key: "n" }, true],
    [{ key: "?", modifiers: [ModifierKey.SHIFT] }, true],
    [{ key: "Space" }, true],
    [{ key: "Backspace" }, true],
    [{ prefix: "g", key: "c" }, true],
    [{ key: "k", modifiers: [ModifierKey.META] }, false],
    [{ key: "k", modifiers: [ModifierKey.CTRL] }, false],
    [{ key: "ArrowUp", modifiers: [ModifierKey.ALT] }, false],
    [{ key: "Escape" }, false],
    [{ key: "Enter" }, false],
    [{ key: "Tab" }, false],
    [{ key: "ArrowDown" }, false]
  ] as [IKeyboardShortcut, boolean][])("%o is single-key: %s", (shortcut, expected) => {
    expect(isSingleKeyShortcut(shortcut)).toBe(expected);
  });
});

describe("shortcut hints with the single-key shortcuts setting", () => {
  it("shows single-key, chord and modified hints while on", () => {
    expect(shown({ shortcut: "search" })).not.toBe("");
    expect(shown({ shortcut: "create" })).toBe("N");
    expect(shown({ shortcut: "calendar" })).not.toBe("");
    expect(shown({ shortcut: "superBar" })).not.toBe("");
  });

  it("hides single-key and chord hints while off, and keeps Cmd and Option hints", () => {
    setSingleKeys(false);
    expect(shown({ shortcut: "search" })).toBe("");
    expect(shown({ shortcut: "create" })).toBe("");
    expect(shown({ shortcut: "calendar" })).toBe("");
    expect(shown({ shortcut: { key: "n" } })).toBe("");
    expect(shown({ shortcut: "superBar" })).not.toBe("");
    expect(shown({ shortcut: "nextView" })).not.toBe("");
    expect(shown({ shortcut: { key: "Enter" } })).toBe("Enter");
  });

  it("keeps hints in the hot keys list and for keys typed inside a control while off", () => {
    setSingleKeys(false);
    expect(shown({ shortcut: { key: "n" }, isListing: true })).toBe("N");
    expect(
      shown({ shortcut: { prefix: "g", key: "c" }, isListing: true })
    ).not.toBe("");
    expect(shown({ shortcut: { key: ">" }, isAlwaysShown: true })).toBe(">");
  });

  it("follows the setting as it changes", async () => {
    const { container } = render(ShortcutText, {
      props: { shortcut: "create" }
    });
    expect(container.textContent?.trim()).toBe("N");
    setSingleKeys(false);
    await tick();
    expect(container.textContent?.trim()).toBe("");
    setSingleKeys(true);
    await tick();
    expect(container.textContent?.trim()).toBe("N");
  });
});
