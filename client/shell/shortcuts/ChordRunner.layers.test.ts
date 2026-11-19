import { render } from "@testing-library/svelte";
import { writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { isPlainPageKey } from "./page-keys";
import ChordRunner from "./ChordRunner.svelte";

const plainPageKeys: string[] = [];
const pageKeys = vi.fn((event: KeyboardEvent) => {
  if (isPlainPageKey(event)) plainPageKeys.push(event.key);
});

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

function addLayer(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

describe("ChordRunner with a layer in front or an unmatched key", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    plainPageKeys.length = 0;
    vi.clearAllMocks();
    mocks.registered = new Set(["calendar"]);
    configureShortcutHost({
      defaults: { calendar: { prefix: "g", key: "c" } },
      configurableActions: () => []
    });
    keyboardShortcuts.loader({});
    document.body.addEventListener("keydown", pageKeys);
    render(ChordRunner);
  });

  afterEach(() => {
    document.body.removeEventListener("keydown", pageKeys);
  });

  it.each([
    ["a dialog", `<dialog open></dialog>`],
    ["a centered modal", `<div data-blank-modal></div>`],
    ["a modal sheet", `<div aria-modal="true"></div>`]
  ])("does not start a chord while %s is in front", (_name, html) => {
    const layer = addLayer(html);
    const start = press("g");
    layer.remove();
    const second = press("c");

    expect(start.defaultPrevented).toBe(false);
    expect(mocks.runAction).not.toHaveBeenCalled();
    expect(second.defaultPrevented).toBe(false);
  });

  it("ends the chord when a centered modal opens before the second key", () => {
    press("g");
    addLayer(`<div data-blank-modal></div>`);
    const second = press("c");

    expect(mocks.runAction).not.toHaveBeenCalled();
    expect(second.defaultPrevented).toBe(false);
  });

  it("keeps an unmatched second key from running a page letter", () => {
    press("g");
    press("s");
    press("s");

    expect(mocks.runAction).not.toHaveBeenCalled();
    expect(plainPageKeys.filter((key) => key === "s")).toEqual(["s"]);
  });
});
