import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const runAction = vi.hoisted(() => vi.fn());

vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({ resolveAction: () => null, runAction })
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

import CmdResults from "./CmdResults.svelte";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { ActionType } from "@nucleum/client/config/action.type";
import { Resource } from "@nucleum/datafn/resource.enum";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import { BASE_CONTEXT_ZONE_PANE } from "@nucleum/shell/topNav/contextZone/context-zone";
import type { IAction } from "@nucleum/shared-state/commands/action.type";

let release: (() => void) | undefined;

function registerResource(resource: Resource, id = `${resource}:1`) {
  release = contextActions.register(BASE_CONTEXT_ZONE_PANE, {
    resource,
    id,
    resolve: () => []
  });
}

function loadShareCommands() {
  appStore.initActions(
    [Resource.node, Resource.collection, Resource.task].map((resource) => ({
      action: `${resource}_share`,
      type: ActionType.MODAL,
      label: "Share",
      resourceContext: resource,
      componentParams: { resource }
    })) as IAction[],
    []
  );
}

describe("resource-scoped palette commands", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    release?.();
    release = undefined;
    appStore.initActions([], []);
    runAction.mockClear();
  });

  it("hides Share without a selected resource", async () => {
    loadShareCommands();
    const view = render(CmdResults, { search: "share" });
    await tick();
    expect(view.queryAllByText("Share", { exact: true })).toHaveLength(0);
  });

  it.each([Resource.node, Resource.collection, Resource.task])(
    "offers only the selected %s's Share and passes its record id",
    async (resource) => {
      loadShareCommands();
      registerResource(resource);
      const view = render(CmdResults, { search: "share" });
      await tick();
      expect(view.getAllByText("Share", { exact: true })).toHaveLength(1);
      await fireEvent.click(view.getByText("Share", { exact: true }));
      expect(runAction).toHaveBeenCalledWith(`${resource}_share`, {
        componentParams: { resource, id: `${resource}:1`, isCmdBarLaunch: true }
      });
    }
  );

  it("drops Share when the context pill is removed", async () => {
    loadShareCommands();
    registerResource(Resource.node);
    const view = render(CmdResults, { search: "share" });
    await tick();
    await view.rerender({ search: "share", isContextShown: false });
    expect(view.queryAllByText("Share", { exact: true })).toHaveLength(0);
  });

  it("reacts to resource changes and closing the selected resource", async () => {
    loadShareCommands();
    registerResource(Resource.node);
    const view = render(CmdResults, { search: "share" });
    await tick();
    release?.();
    registerResource(Resource.collection);
    await tick();
    expect(view.getAllByText("Share", { exact: true })).toHaveLength(1);
    await fireEvent.click(view.getByText("Share", { exact: true }));
    expect(runAction).toHaveBeenCalledWith("collection_share", {
      componentParams: {
        resource: Resource.collection,
        id: "collection:1",
        isCmdBarLaunch: true
      }
    });
    release?.();
    await tick();
    expect(view.queryAllByText("Share", { exact: true })).toHaveLength(0);
  });

  it("keeps ordinary commands available without resource context", async () => {
    appStore.initActions(
      [{ action: "settings", label: "Settings", type: ActionType.MODAL }],
      []
    );
    const view = render(CmdResults, { search: "settings" });
    await tick();
    expect(view.getByText("Settings", { exact: true })).toBeTruthy();
  });
});
