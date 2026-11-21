import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { writable } from "svelte/store";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import type { LiveResource } from "@nucleum/shell/topNav/tabs/live-resource";

const runAction = vi.hoisted(() => vi.fn());
const record = writable<Partial<LiveResource>>({});

vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({ resolveAction: () => null, runAction })
}));
vi.mock("@nucleum/shell/topNav/tabs/live-resource", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  liveResource: () => record
}));
vi.mock("@nucleum/shared-state/shortcuts/shortcuts.store", async () => ({
  keyboardShortcuts: {
    ...(await import("svelte/store")).readable({}),
    resolveShortcut: () => ({ shortcut: undefined, modifiers: [] })
  }
}));
vi.mock("@nucleum/shared-state/resources/resource-search", () => ({
  searchResources: vi.fn(async () => [])
}));

import CommandBar from "./CommandBar.svelte";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import { BASE_CONTEXT_ZONE_PANE } from "@nucleum/shell/topNav/contextZone/context-zone";
import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { ActionType } from "@nucleum/client/config/action.type";
import { Resource } from "@nucleum/datafn/resource.enum";

let release: (() => void) | undefined;

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

beforeEach(() => {
  record.set({ isResolved: false });
  appStore.initActions(
    [
      {
        action: "event_share",
        label: "Share",
        type: ActionType.MODAL,
        resourceContext: Resource.event,
        componentParams: { resource: Resource.event }
      }
    ],
    []
  );
  release = contextActions.register(BASE_CONTEXT_ZONE_PANE, {
    id: "event:1",
    resource: Resource.event,
    resolve: () => [],
    isFallback: true
  });
});

afterEach(() => {
  release?.();
  appStore.initActions([], []);
  runAction.mockClear();
});

describe("Share requires a live selected record", () => {
  it.each([false, true])(
    "hides Share without a record (resolved: %s)",
    async (isResolved) => {
      record.set({ isResolved });
      const view = render(CommandBar);
      await fireEvent.input(view.getByTestId("command-bar-input"), {
        target: { value: "share" }
      });
      await tick();
      expect(view.queryAllByText("Share", { exact: true })).toHaveLength(0);
    }
  );

  it("shares a resolved event and removes Share if the record disappears", async () => {
    record.set({
      resource: { id: "event:1", label: "Planning" },
      isResolved: true
    });
    const view = render(CommandBar);
    await fireEvent.input(view.getByTestId("command-bar-input"), {
      target: { value: "share" }
    });
    await tick();
    expect(view.getAllByText("Share", { exact: true })).toHaveLength(1);
    await fireEvent.click(view.getByText("Share", { exact: true }));
    expect(runAction).toHaveBeenCalledWith("event_share", {
      componentParams: {
        resource: Resource.event,
        id: "event:1",
        isCmdBarLaunch: true
      }
    });
    record.set({ isResolved: true });
    await tick();
    expect(view.queryAllByText("Share", { exact: true })).toHaveLength(0);
  });
});
