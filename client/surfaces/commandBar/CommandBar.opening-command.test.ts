import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const hide = vi.hoisted(() => vi.fn());
const newCommands = vi.hoisted(() => ({
  action: "new-commands",
  type: "SEARCH_CMD",
  label: "New",
  cmdLabel: "New",
  searchActionParams: {
    placeholder: "Create something new",
    searchCallback: async () => []
  }
}));

vi.mock("@nucleum/shared-state/commands/command-host", () => ({
  requireCommandHost: () => ({
    resolveAction: (slug: string) =>
      slug === newCommands.action ? newCommands : null,
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
import { ActionType } from "@nucleum/client/config/action.type";

let release: (() => void) | undefined;

function renderOnNewList() {
  return render(CommandBar, {
    command: newCommands.action,
    commandType: ActionType.SEARCH_CMD
  });
}

describe("CommandBar opened on a search command (G N)", () => {
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
  });

  it("opens on the New list and leaves it for good with Backspace", async () => {
    const { getByTestId } = renderOnNewList();
    await tick();
    const input = getByTestId("command-bar-input") as HTMLInputElement;
    expect(input.placeholder).toBe("Create something new");

    await fireEvent.keyDown(input, { key: "Backspace" });
    await tick();
    await tick();
    expect(input.placeholder).not.toBe("Create something new");
    expect(hide).not.toHaveBeenCalled();
  });

  it("leaves the New list before the resource context pill, then removes the pill", async () => {
    release = contextActions.register(BASE_CONTEXT_ZONE_PANE, {
      id: "node:1",
      resource: "node",
      resolve: () => []
    });
    const { getByTestId, queryByTestId } = renderOnNewList();
    await tick();
    const input = getByTestId("command-bar-input") as HTMLInputElement;
    expect(queryByTestId("super-bar-context-pill")).toBeNull();

    await fireEvent.keyDown(input, { key: "Backspace" });
    await tick();
    await tick();
    expect(input.placeholder).not.toBe("Create something new");
    expect(getByTestId("super-bar-context-pill")).toBeTruthy();

    await fireEvent.keyDown(input, { key: "Backspace" });
    await tick();
    await tick();
    expect(queryByTestId("super-bar-context-pill")).toBeNull();
    expect(input.placeholder).not.toBe("Create something new");
    expect(hide).not.toHaveBeenCalled();
  });
});
