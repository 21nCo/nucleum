import { render } from "@testing-library/svelte";
import { get, writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OperatingSystem } from "@nucleum/client/runtime/context.type";

const mocks = vi.hoisted(() => ({
  runAction: vi.fn(),
  closeTopLayer: vi.fn(),
  publish: vi.fn(),
  stepContextView: vi.fn(() => true),
  selectContextViewAt: vi.fn(() => true),
  stepListItem: vi.fn(() => true),
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
vi.mock("@nucleum/shell/shortcuts/context-view-step", () => ({
  stepContextView: mocks.stepContextView,
  selectContextViewAt: mocks.selectContextViewAt
}));
vi.mock("@nucleum/shell/shortcuts/list-item-step", () => ({
  stepListItem: mocks.stepListItem
}));
vi.mock("@nucleum/shared-state/app-context/app.store", () => ({
  appStore: writable({ product: "nucleum" })
}));
vi.mock("@nucleum/shared-state/preferences/ui-state/uiState.store", () => ({
  uiState: { setState: vi.fn() }
}));

import { Action } from "@nucleum/client/config/action.enum";
import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
import { configureShortcutHost } from "@nucleum/shared-state/shortcuts/shortcut-host";
import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
import {
  readSingleKeyShortcutsEnabled,
  syncSingleKeyShortcutsEnabled
} from "@nucleum/shared-state/preferences/single-key-shortcuts";
import { shortcutsConfig } from "@nucleum/composition/shortcuts.config";
import type { IContextMenu } from "@21n/ui/elements/contextMenu/context-menu.type";
import {
  keyedContextActions,
  withResourceActionKeys
} from "@nucleum/features/records/resource-action-keys";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import ClassicCalendarHeaderLeftOptions from "@nucleum/features/calendar/classic/ClassicCalendarHeaderLeftOptions.svelte";
import { areSingleKeyShortcutsEnabled, isPlainPageKey } from "./page-keys";
import ShortcutRunner from "./ShortcutRunner.svelte";
import ChordRunner from "./ChordRunner.svelte";
import ComponentShortcutListener from "@21n/ui/compositions/keyboard/ComponentShortcutListener.svelte";
import { ModifierKey } from "@21n/ui/elements/keyboard/keyboard.type";

function keydown(key: string, init: KeyboardEventInit = {}) {
  return new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...init
  });
}

function press(key: string, init: KeyboardEventInit = {}) {
  const event = keydown(key, init);
  document.body.dispatchEvent(event);
  return event;
}

/** Every single-key shortcut the shell registers, as a key press. */
const SINGLE_KEY_SHORTCUTS: [string, string, KeyboardEventInit][] = [
  ["N creates", Action.CREATE, {}],
  ["Shift+? opens the hot keys", Action.HOT_KEYS, { shiftKey: true }],
  ["[ toggles the sidebar", Action.TOGGLE_SIDEBAR, { code: "BracketLeft" }],
  ["/ opens the navigator", Action.NAVIGATOR, {}],
  [
    "Space activates the search box",
    GlobalEvent.ACTIVATE_SEARCH_BOX,
    { code: "Space" }
  ]
];
const KEY_OF: Record<string, string> = {
  [Action.CREATE]: "n",
  [Action.HOT_KEYS]: "?",
  [Action.TOGGLE_SIDEBAR]: "[",
  [Action.NAVIGATOR]: "/",
  [GlobalEvent.ACTIVATE_SEARCH_BOX]: " "
};

const RESOURCE_MENU: IContextMenu = [
  {
    group: "resource",
    items: [
      { value: "star", label: "Star" },
      { value: "delete", label: "Move to trash" },
      { value: "copyExternalLink", label: "Copy link" }
    ]
  }
];

function hintsOf(menu: IContextMenu) {
  return menu.flatMap((group) => group.items.map((item) => item.hotKey));
}

afterEach(() => {
  syncSingleKeyShortcutsEnabled(true);
});

describe("the single-key shortcuts setting", () => {
  it("is on until the user's preference says otherwise", () => {
    expect(readSingleKeyShortcutsEnabled()).toBe(true);
    expect(areSingleKeyShortcutsEnabled()).toBe(true);
    syncSingleKeyShortcutsEnabled(false);
    expect(areSingleKeyShortcutsEnabled()).toBe(false);
  });
});

describe("page keys with single-key shortcuts", () => {
  const keys: [string, KeyboardEventInit, { allowShift?: boolean }][] = [
    ["s", {}, {}],
    ["e", {}, {}],
    ["Backspace", {}, {}],
    ["M", {}, {}],
    ["T", { shiftKey: true }, { allowShift: true }],
    ["1", {}, {}]
  ];

  it.each(keys)("runs %s as before while on", (key, init, options) => {
    expect(isPlainPageKey(keydown(key, init), options)).toBe(true);
  });

  it.each(keys)("runs no page key %s while off", (key, init, options) => {
    syncSingleKeyShortcutsEnabled(false);
    expect(isPlainPageKey(keydown(key, init), options)).toBe(false);
  });
});

describe("the shortcut runner with single-key shortcuts", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mocks.registered = new Set(Object.keys(shortcutsConfig));
    configureShortcutHost({
      defaults: shortcutsConfig,
      configurableActions: () => []
    });
    keyboardShortcuts.loader({});
    render(ShortcutRunner);
  });

  it.each(SINGLE_KEY_SHORTCUTS)("%s while on", (_name, action, init) => {
    const event = press(KEY_OF[action], init);

    expect(mocks.runAction).toHaveBeenCalledWith(action);
    expect(event.defaultPrevented).toBe(true);
  });

  it.each(SINGLE_KEY_SHORTCUTS)(
    "does not run while off: %s",
    (_name, action, init) => {
      syncSingleKeyShortcutsEnabled(false);
      const event = press(KEY_OF[action], init);

      expect(mocks.runAction).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    }
  );

  it("selects a view by digit while on, and not while off", () => {
    press("2");
    expect(mocks.selectContextViewAt).toHaveBeenCalledWith(1);

    mocks.selectContextViewAt.mockClear();
    syncSingleKeyShortcutsEnabled(false);
    const event = press("2");
    expect(mocks.selectContextViewAt).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("still runs Cmd+K and Cmd+Shift+K while off", () => {
    syncSingleKeyShortcutsEnabled(false);
    press("k", { metaKey: true });
    press("k", { metaKey: true, shiftKey: true });

    expect(mocks.runAction).toHaveBeenNthCalledWith(1, Action.CMD);
    expect(mocks.runAction).toHaveBeenNthCalledWith(2, Action.SEARCH);
  });

  it("still steps views, sub views and list items with Option arrows while off", () => {
    syncSingleKeyShortcutsEnabled(false);
    press("ArrowRight", { altKey: true, code: "ArrowRight" });
    press("ArrowLeft", { altKey: true, shiftKey: true, code: "ArrowLeft" });
    press("ArrowDown", { altKey: true, code: "ArrowDown" });

    expect(mocks.stepContextView).toHaveBeenCalledWith(1);
    expect(mocks.stepListItem).toHaveBeenCalledWith(1);
  });

  it("does not start a G chord while off, so G then C does nothing", () => {
    syncSingleKeyShortcutsEnabled(false);
    const start = press("g");
    const second = press("c");

    expect(start.defaultPrevented).toBe(false);
    expect(second.defaultPrevented).toBe(false);
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("runs G then C while on", () => {
    press("g");
    press("c");

    expect(mocks.runAction).toHaveBeenCalledWith(Action.CALENDAR);
  });
});

describe("the chord runner with single-key shortcuts", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mocks.registered = new Set([Action.CALENDAR]);
    configureShortcutHost({
      defaults: { [Action.CALENDAR]: { prefix: "g", key: "c" } },
      configurableActions: () => []
    });
    keyboardShortcuts.loader({});
    render(ChordRunner);
  });

  it("starts a G chord while on", () => {
    expect(press("g").defaultPrevented).toBe(true);
    press("c");
    expect(mocks.runAction).toHaveBeenCalledWith(Action.CALENDAR);
  });

  it("does not start a G chord while off", () => {
    syncSingleKeyShortcutsEnabled(false);
    expect(press("g").defaultPrevented).toBe(false);
    expect(press("c").defaultPrevented).toBe(false);
    expect(mocks.runAction).not.toHaveBeenCalled();
  });

  it("ends a pending G chord without running it once turned off", () => {
    expect(press("g").defaultPrevented).toBe(true);
    syncSingleKeyShortcutsEnabled(false);

    expect(press("c").defaultPrevented).toBe(false);
    expect(mocks.runAction).not.toHaveBeenCalled();
  });
});

describe("component shortcut listeners with single-key shortcuts", () => {
  const create = vi.fn();
  const linkBox = vi.fn();

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    configureShortcutHost({
      defaults: shortcutsConfig,
      configurableActions: () => []
    });
    keyboardShortcuts.loader({});
    render(ComponentShortcutListener, {
      props: {
        checkShortcut: keyboardShortcuts.checkPageShortcut.bind(
          keyboardShortcuts
        ),
        shortcuts: [
          { shortcut: Action.CREATE, callback: create },
          {
            shortcut: { key: "l", modifiers: [ModifierKey.META] },
            callback: linkBox
          }
        ]
      }
    });
  });

  it("runs a page's N while on", () => {
    expect(press("n").defaultPrevented).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("does not run a page's N while off, and still runs Cmd+L", () => {
    syncSingleKeyShortcutsEnabled(false);

    expect(press("n").defaultPrevented).toBe(false);
    expect(create).not.toHaveBeenCalled();
    expect(press("l", { metaKey: true }).defaultPrevented).toBe(true);
    expect(linkBox).toHaveBeenCalledTimes(1);
  });
});

describe("single-key hints", () => {
  it("adds the resource letters as hints while on", () => {
    expect(hintsOf(withResourceActionKeys(RESOURCE_MENU))).toEqual([
      "s",
      "Backspace",
      undefined
    ]);
  });

  it("adds no hints while off", () => {
    syncSingleKeyShortcutsEnabled(false);
    expect(hintsOf(withResourceActionKeys(RESOURCE_MENU))).toEqual([
      undefined,
      undefined,
      undefined
    ]);
  });

  it("keys no super bar resource rows while off", () => {
    const unregister = contextActions.register(
      { id: "pane-1", layer: 0 },
      { id: "note-1", resource: "node", resolve: () => RESOURCE_MENU }
    );
    try {
      expect(get(keyedContextActions)?.id).toBe("note-1");
      syncSingleKeyShortcutsEnabled(false);
      expect(get(keyedContextActions)).toBeUndefined();
      syncSingleKeyShortcutsEnabled(true);
      expect(get(keyedContextActions)?.id).toBe("note-1");
    } finally {
      unregister();
    }
  });

  it("shows the scale letters in the Calendar menu only while on", () => {
    const { component } = render(ClassicCalendarHeaderLeftOptions, {
      props: { isScaleInMenu: true, isScopeHidden: true }
    });
    const icons = () =>
      (
        component as unknown as {
          resolveScaleMenuGroup: () => {
            option?: { options: { icon?: unknown }[] };
          }[];
        }
      )
        .resolveScaleMenuGroup()[0]
        .option?.options.map((option) => option.icon);

    expect(icons()).toContain("text:M");
    syncSingleKeyShortcutsEnabled(false);
    expect(icons()?.every((icon) => icon === undefined)).toBe(true);
  });
});
