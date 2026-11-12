import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const hide = vi.hoisted(() => vi.fn());

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
  });

  it("shows the resource context as a pill", async () => {
    registerNodeContext();
    const { getByTestId, queryByTestId } = render(CommandBar);
    await tick();
    expect(getByTestId("super-bar-context-pill").textContent).toContain(
      "This node"
    );
    expect(queryByTestId("super-bar-group-context")).toBeTruthy();
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
});
