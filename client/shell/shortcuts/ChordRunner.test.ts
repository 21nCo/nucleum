import { render } from "@testing-library/svelte";
import { writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeyboardKey } from "@21n/ui/elements/keyboard/keyboard.type";
import { OperatingSystem } from "@nucleum/client/runtime/context.type";

const mocks = vi.hoisted(() => ({
  runAction: vi.fn(),
  gotoPath: vi.fn(),
  resolvePinnedSpaceAt: vi.fn(async (index: number) =>
    index < 2 ? { id: ["space-a", "space-b"][index] } : undefined
  ),
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
vi.mock("@nucleum/shell/shortcuts/pinned-space-chord", () => ({
  resolvePinnedSpaceAt: mocks.resolvePinnedSpaceAt
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

  it("opens the pinned space in the app menu position for G then a digit", async () => {
    press("g");
    const second = press("2");

    await vi.waitFor(() =>
      expect(mocks.gotoPath).toHaveBeenCalledWith("/spaces/space-b")
    );
    expect(second.defaultPrevented).toBe(true);
    expect(pageKeys).toHaveBeenCalledTimes(1);
  });

  it("consumes G then a digit past the pinned spaces", async () => {
    press("g");
    const second = press("5");

    expect(second.defaultPrevented).toBe(true);
    await vi.waitFor(() =>
      expect(mocks.resolvePinnedSpaceAt).toHaveBeenCalledWith(4)
    );
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

  it("ends the chord without running it when a right drawer opened after G", () => {
    press("g");
    const drawer = document.createElement("div");
    drawer.setAttribute("data-blank-modal", "");
    drawer.innerHTML = `<div data-modal-placement="right"></div>`;
    document.body.append(drawer);
    const letter = press("c");
    press("g");
    const digit = press("1");

    expect(mocks.runAction).not.toHaveBeenCalled();
    expect(mocks.resolvePinnedSpaceAt).not.toHaveBeenCalled();
    expect(letter.defaultPrevented).toBe(false);
    expect(digit.defaultPrevented).toBe(false);
    expect(pageKeys).toHaveBeenCalledTimes(4);
  });
});
