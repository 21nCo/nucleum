import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { readable } from "svelte/store";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const hide = vi.hoisted(() => vi.fn());
const records = vi.hoisted(
  () => new Map<string, { label?: string; text?: string }>()
);

vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({
    resolveAction: () => null,
    runAction: vi.fn()
  })
}));
vi.mock("@nucleum/shell/topNav/tabs/live-resource", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    liveResource: (id: string) =>
      readable({
        resource: records.get(id),
        action: undefined,
        resourceType: "node",
        isResolved: records.has(id)
      })
  };
});
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
vi.mock("@nucleum/shell/overlays/modal.store", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    default: { ...(actual.default as object), hide }
  };
});

import CommandBar from "@nucleum/surfaces/commandBar/CommandBar.svelte";
import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
import { BASE_CONTEXT_ZONE_PANE } from "@nucleum/shell/topNav/contextZone/context-zone";
import { ActionType } from "@nucleum/client/config/action.type";
import { appStore } from "@nucleum/shared-state/app-context/app.store";

let release: (() => void) | undefined;

function registerNodeContext() {
  release = contextActions.register(BASE_CONTEXT_ZONE_PANE, {
    id: "node:1",
    resource: "node",
    resolve: () => [
      {
        group: "all",
        items: [{ value: "star", label: "Star", callback: async () => {} }]
      }
    ]
  });
}

describe("CommandBar context and modes", () => {
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
    release?.();
    release = undefined;
    hide.mockClear();
    records.clear();
  });

  it("shows the resource context as a pill with its icon and name", async () => {
    records.set("node:1", { label: "Launch plan" });
    registerNodeContext();
    const { getByTestId, queryByTestId } = render(CommandBar);
    await tick();
    const pill = getByTestId("super-bar-context-pill");
    expect(getByTestId("super-bar-context-name").textContent).toBe(
      "Launch plan"
    );
    expect(pill.title).toBe("Node: Launch plan");
    // The resource icon before the name, then the remove cross.
    expect(pill.querySelectorAll("svg")).toHaveLength(2);
    expect(queryByTestId("super-bar-group-context")).toBeTruthy();
  });

  it("names a text-only record by its first text line, as its tab does", async () => {
    records.set("node:1", { label: "", text: "# Launch plan\nsecond line" });
    registerNodeContext();
    const { getByTestId } = render(CommandBar);
    await tick();
    expect(getByTestId("super-bar-context-name").textContent).toBe(
      "Launch plan"
    );
    expect(getByTestId("super-bar-context-pill").title).toBe(
      "Node: Launch plan"
    );
  });

  it("names a resolved record with no label or text Untitled", async () => {
    records.set("node:1", {});
    registerNodeContext();
    const { getByTestId } = render(CommandBar);
    await tick();
    expect(getByTestId("super-bar-context-name").textContent).toBe("Untitled");
  });

  it("names the pill by its resource type until the record resolves", async () => {
    registerNodeContext();
    const { getByTestId } = render(CommandBar);
    await tick();
    expect(getByTestId("super-bar-context-name").textContent).toBe("This node");
  });

  it("removes the pill with Backspace on an empty input", async () => {
    registerNodeContext();
    const { getByTestId, queryByTestId } = render(CommandBar);
    await tick();
    await fireEvent.keyDown(getByTestId("command-bar-input"), {
      key: "Backspace"
    });
    await tick();
    expect(queryByTestId("super-bar-context-pill")).toBeNull();
    expect(queryByTestId("super-bar-group-context")).toBeNull();
    expect(hide).not.toHaveBeenCalled();
  });

  it("switches to commands mode on a leading > and leaves it with Backspace", async () => {
    registerNodeContext();
    const { getByTestId, queryByTestId } = render(CommandBar);
    await tick();
    const input = getByTestId("command-bar-input") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: ">" } });
    await tick();
    expect(getByTestId("super-bar-mode-chip")).toBeTruthy();
    expect(input.value).toBe("");
    expect(queryByTestId("super-bar-context-pill")).toBeNull();

    await fireEvent.keyDown(input, { key: "Backspace" });
    await tick();
    expect(queryByTestId("super-bar-mode-chip")).toBeNull();
  });

  it("leaves commands mode when a command starts a search action", async () => {
    appStore.initActions(
      [
        {
          action: "pickTag",
          label: "Pick a tag",
          type: ActionType.SEARCH_CMD,
          searchActionParams: { placeholder: "Search tags" }
        } as never
      ],
      []
    );
    registerNodeContext();
    const { getByTestId, queryByTestId } = render(CommandBar);
    await tick();
    const input = getByTestId("command-bar-input") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: ">pick a tag" } });
    await tick();
    expect(getByTestId("super-bar-mode-chip")).toBeTruthy();

    await fireEvent.keyDown(input, { key: "Enter" });
    await tick();
    expect(queryByTestId("super-bar-mode-chip")).toBeNull();
    expect(queryByTestId("super-bar-context-pill")).toBeNull();
    expect(input.placeholder).toBe("Search tags");

    await fireEvent.keyDown(input, { key: "Backspace" });
    await tick();
    expect(queryByTestId("super-bar-mode-chip")).toBeNull();
    expect(input.placeholder).not.toBe("Search tags");
    expect(getByTestId("super-bar-context-pill")).toBeTruthy();
    expect(hide).not.toHaveBeenCalled();
  });
});
