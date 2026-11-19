import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({
    resolveAction: () => null,
    runAction: vi.fn()
  })
}));
vi.mock("@nucleum/shared-state/shortcuts/shortcuts.store", () => ({
  keyboardShortcuts: {
    resolveShortcut: () => ({ shortcut: undefined, modifiers: [] }),
    subscribe: (run: (value: unknown) => void) => {
      run({});
      return () => undefined;
    }
  }
}));
vi.mock("@nucleum/shared-state/resources/resource-search", () => ({
  searchResources: vi.fn(async () => [])
}));

import CommandBar from "@nucleum/surfaces/commandBar/CommandBar.svelte";
import { syncElementShortcutHints } from "@21n/ui/hosts/shortcut-host";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import {
  BASE_CONTEXT_ZONE_PANE,
  ContextZoneLayer,
  contextZone,
  type ContextZonePane
} from "@nucleum/shell/topNav/contextZone/context-zone";

const SPLIT_PANE: ContextZonePane = {
  id: "beside-base",
  layer: ContextZoneLayer.BESIDE_BASE
};

async function settle() {
  for (let index = 0; index < 5; index++) await tick();
}

/**
 * Runs every release in reverse order even when one throws, empties the list,
 * and rethrows the first error once all have run.
 */
function releaseAll(releases: (() => void)[]) {
  const pending = [...releases].reverse();
  releases.length = 0;
  const errors: unknown[] = [];
  for (const release of pending) {
    try {
      release();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) throw errors[0];
}

describe("super bar letter hints of the open resource", () => {
  let release: (() => void)[] = [];

  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.animate = vi.fn(() => ({
      cancel: () => undefined,
      finished: Promise.resolve()
    })) as never;
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined
    }));
  });

  afterEach(() => {
    releaseAll([
      () => contextZone.releasePane(BASE_CONTEXT_ZONE_PANE.id),
      () => contextZone.releasePane(SPLIT_PANE.id),
      ...release,
      () => syncElementShortcutHints(true)
    ]);
    release = [];
  });

  /** A note open in a split beside a base page without resource actions. */
  async function renderBesideSplitNote() {
    release.push(contextZone.registerPane(BASE_CONTEXT_ZONE_PANE));
    release.push(contextZone.registerPane(SPLIT_PANE));
    release.push(
      contextActions.register(SPLIT_PANE, {
        id: "node:1",
        resource: "node",
        resolve: () => [
          {
            group: "all",
            items: [
              {
                value: "star",
                label: "Star",
                hotKey: "s",
                callback: async () => {}
              }
            ]
          }
        ]
      })
    );
    const view = render(CommandBar);
    release.push(() => view.unmount());
    await settle();
    return view;
  }

  it("shows the split note's letter as a page key while the user works in the split", async () => {
    contextZone.activatePane(SPLIT_PANE.id);
    const { getByTestId, getByRole } = await renderBesideSplitNote();
    const hint = getByTestId("super-bar-context-hotkey");
    expect(hint.textContent?.trim()).toBe("S");
    const pageKey = getByRole("img", { name: "Press S on the page" });
    expect(hint.contains(pageKey)).toBe(true);
    expect(pageKey.title).toBe("Press S on the page");
  });

  it("lists the split note's actions without letters while the user works in Calendar beside it", async () => {
    contextZone.activatePane(BASE_CONTEXT_ZONE_PANE.id);
    const { getByTestId, queryByTestId } = await renderBesideSplitNote();
    expect(get(contextActions.active)?.id).toBe("node:1");
    expect(getByTestId("super-bar-group-context")).toBeTruthy();
    expect(queryByTestId("super-bar-context-hotkey")).toBeNull();

    contextZone.activatePane(SPLIT_PANE.id);
    await settle();
    expect(getByTestId("super-bar-context-hotkey").textContent?.trim()).toBe(
      "S"
    );
  });

  it("drops the page key label while letter hints are hidden", async () => {
    contextZone.activatePane(SPLIT_PANE.id);
    syncElementShortcutHints(false);
    const { queryByRole } = await renderBesideSplitNote();
    expect(queryByRole("img", { name: "Press S on the page" })).toBeNull();
  });
});
