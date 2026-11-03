import { describe, expect, it, vi } from "vitest";
import {
  ContextMenuType,
  type IContextMenu
} from "@21n/ui/elements/contextMenu/context-menu.type";
import type { ResourceSearchHit } from "@nucleum/shared-state/resources/resource-search";
import type { ICommandAction } from "./cmd.type";
import {
  SUPER_BAR_COMMAND_LIMIT,
  buildSuperBarEntries,
  flattenContextActions,
  runContextAction
} from "./super-bar";

const menu: IContextMenu = [
  {
    group: "open",
    items: [{ value: "maximize", label: "Maximize", callback: vi.fn() }]
  },
  {
    group: "more",
    items: [
      { value: "archive", callback: vi.fn() },
      {
        value: "move",
        label: "Move to",
        secondStepComponent: { component: {} }
      },
      {
        value: "disabled",
        label: "Disabled",
        isDisabled: true,
        callback: vi.fn()
      },
      { value: "panel", label: "Links" }
    ]
  }
];

function command(action: string): ICommandAction {
  return { action, cmdLabel: action, label: action } as ICommandAction;
}

function hit(id: string): ResourceSearchHit {
  return { id, resource: "node", record: { id }, relevance: 1, score: 1 };
}

describe("flattenContextActions", () => {
  it("keeps runnable items and labels them like the menu", () => {
    expect(flattenContextActions(menu).map((action) => action.label)).toEqual([
      "Maximize",
      "Archive"
    ]);
  });

  it("labels a switch with its current state", () => {
    const [action] = flattenContextActions([
      {
        group: "all",
        items: [
          {
            value: "star",
            label: "Star",
            type: ContextMenuType.SWITCH,
            initialValue: true,
            callback: vi.fn()
          }
        ]
      }
    ]);
    expect(action.label).toBe("Star: on");
  });
});

describe("buildSuperBarEntries", () => {
  const contextActions = flattenContextActions(menu);
  const commands = Array.from({ length: 8 }, (_, index) =>
    command(`cmd-${index}`)
  );

  it("shows the resource actions first, then commands, without results before typing", () => {
    const entries = buildSuperBarEntries({
      query: "",
      scope: "all",
      contextActions,
      commands,
      results: [hit("node:a")]
    });
    expect(entries.map((entry) => entry.kind)).toEqual([
      "context",
      "context",
      ...commands.map(() => "command")
    ]);
  });

  it("filters actions, caps commands and lists results last while typing", () => {
    const entries = buildSuperBarEntries({
      query: "arch",
      scope: "all",
      contextActions,
      commands,
      results: [hit("node:a"), hit("node:b")]
    });
    expect(entries.map((entry) => entry.kind)).toEqual([
      "context",
      ...Array(SUPER_BAR_COMMAND_LIMIT).fill("command"),
      "result",
      "result"
    ]);
  });

  it("shows only results in the search scope", () => {
    const entries = buildSuperBarEntries({
      query: "a",
      scope: "search",
      contextActions,
      commands,
      results: [hit("node:a")]
    });
    expect(entries).toEqual([
      { kind: "result", key: "result:node:a", hit: hit("node:a") }
    ]);
  });
});

describe("runContextAction", () => {
  it("runs the callback and reports the value to the page", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const onAction = vi.fn();
    const [action] = flattenContextActions([
      { group: "more", items: [{ value: "archive", callback }] }
    ]);
    await runContextAction(action, { runCommand: vi.fn(), onAction });
    expect(callback).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledWith("archive");
  });

  it("reports the value to the page before the callback settles", async () => {
    const order: string[] = [];
    const callback = vi.fn(async () => {
      order.push("callback started");
      await Promise.resolve();
      order.push("callback settled");
    });
    const onAction = vi.fn(() => order.push("page notified"));
    const [action] = flattenContextActions([
      { group: "more", items: [{ value: "star", label: "Star", callback }] }
    ]);
    await runContextAction(action, { runCommand: vi.fn(), onAction });
    expect(order).toEqual([
      "callback started",
      "page notified",
      "callback settled"
    ]);
  });

  it("toggles a switch without reporting it twice", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    const onAction = vi.fn();
    const [action] = flattenContextActions([
      {
        group: "all",
        items: [
          {
            value: "star",
            type: ContextMenuType.SWITCH,
            initialValue: false,
            callback
          }
        ]
      }
    ]);
    await runContextAction(action, { runCommand: vi.fn(), onAction });
    expect(callback).toHaveBeenCalledWith(true);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("runs the item's command when it has no callback", async () => {
    const runCommand = vi.fn();
    const [action] = flattenContextActions([
      { group: "all", items: [{ value: "x", label: "Do", action: "cmd-x" }] }
    ]);
    await runContextAction(action, { runCommand });
    expect(runCommand).toHaveBeenCalledWith("cmd-x");
  });
});
