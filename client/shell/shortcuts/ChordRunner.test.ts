import { render } from "@testing-library/svelte";
import { readable, writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeyboardKey } from "@21n/ui/elements/keyboard/keyboard.type";
import { OperatingSystem } from "@nucleum/client/runtime/context.type";

const mocks = vi.hoisted(() => ({
  runAction: vi.fn(),
  gotoPath: vi.fn(),
  registered: new Set<string>()
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
vi.mock("@nucleum/client/runtime/logging/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() }
}));
vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({
    resolveAction: (slug: string) =>
      mocks.registered.has(slug) ? { action: slug } : null,
    runAction: mocks.runAction
  })
}));
vi.mock("@nucleum/shell/navigation/app-menu.store", () => ({
  appMenuStore: {
    subscribe: readable({}).subscribe,
    pinnedSpaces: () => ["space-a", "space-b"]
  }
}));
vi.mock("@nucleum/shell/navigation/pinned-spaces", () => ({
  toPinnedSpacesKey: (ids: string[]) => ids.join(","),
  createPinnedSpacesStore: () => readable({ data: [] }),
  orderPinnedSpaces: (ids: string[]) => ids.map((id) => ({ id }))
}));
vi.mock("@nucleum/shell/navigation/navigation", () => ({
  navigation: { gotoPath: mocks.gotoPath }
}));
vi.mock("@nucleum/client/config/space-route", () => ({
  resolveSpacePath: (id: string) => `/spaces/${id}`
}));

import { configureShortcutHost } from "@nucleum/shared-state/shortcuts/shortcut-host";
import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
import { CHORD_TIMEOUT_MS } from "./chord-keys";
import ChordRunner from "./ChordRunner.svelte";

const pageKeys = vi.fn();

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

describe("ChordRunner", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mocks.registered = new Set(["calendar", "library"]);
    configureShortcutHost({
      defaults: {
        calendar: { prefix: "g", key: "c" },
        library: { prefix: "g", key: "l" },
        focus: { prefix: "g", key: "f" }
      },
      configurableActions: () => []
    });
    keyboardShortcuts.loader({});
    document.body.addEventListener("keydown", pageKeys);
    render(ChordRunner);
  });

  afterEach(() => {
    document.body.removeEventListener("keydown", pageKeys);
    vi.useRealTimers();
  });

  it("runs G then C before page shortcuts see the C", () => {
    expect(press("g").defaultPrevented).toBe(true);
    const second = press("c");

    expect(mocks.runAction).toHaveBeenCalledWith("calendar");
    expect(second.defaultPrevented).toBe(true);
    expect(pageKeys).toHaveBeenCalledTimes(1);
  });

  it("runs nothing for a lone letter", () => {
    press("c");

    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("passes on the second key of a chord the product does not register", () => {
    press("g");
    const second = press("f");

    expect(mocks.runAction).not.toHaveBeenCalled();
    expect(second.defaultPrevented).toBe(false);
    expect(pageKeys).toHaveBeenCalledTimes(2);
  });

  it("cancels the chord on Escape", () => {
    press("g");
    press("Escape");
    press("c");

    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("cancels the chord after its timeout", () => {
    vi.useFakeTimers();
    press("g");
    vi.advanceTimersByTime(CHORD_TIMEOUT_MS);
    press("c");

    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("neither starts nor finishes a chord while typing in a field", () => {
    const input = document.createElement("input");
    document.body.append(input);
    press("g", {}, input);
    press("c");
    expect(mocks.runAction).not.toHaveBeenCalled();

    press("g");
    press("c", {}, input);
    press("c");
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("opens the pinned space in the app menu position for G then a digit", () => {
    press("g");
    const second = press("2");

    expect(mocks.gotoPath).toHaveBeenCalledWith("/spaces/space-b");
    expect(second.defaultPrevented).toBe(true);
    expect(pageKeys).toHaveBeenCalledTimes(1);
  });

  it("consumes G then a digit past the pinned spaces without navigating", () => {
    press("g");
    press("5");

    expect(mocks.gotoPath).not.toHaveBeenCalled();
    expect(pageKeys).toHaveBeenCalledTimes(1);
  });

  it("passes Option arrows and plain digits on to the page", () => {
    press("g");
    const arrow = press(KeyboardKey.ARROW_LEFT, {
      code: KeyboardKey.ARROW_LEFT,
      altKey: true
    });
    const digit = press("1");

    expect(arrow.defaultPrevented).toBe(false);
    expect(digit.defaultPrevented).toBe(false);
    expect(mocks.gotoPath).not.toHaveBeenCalled();
    expect(pageKeys).toHaveBeenCalledTimes(3);
  });
});
