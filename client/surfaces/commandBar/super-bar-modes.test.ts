import { describe, expect, it } from "vitest";
import {
  buildSuperBarEntries,
  resolveCommandsPrefix
} from "@nucleum/surfaces/commandBar/super-bar";

const command = (action: string) =>
  ({ action, cmdLabel: action, label: action }) as never;

describe("resolveCommandsPrefix", () => {
  it("returns the query after a leading >", () => {
    expect(resolveCommandsPrefix(">")).toBe("");
    expect(resolveCommandsPrefix(">  sett")).toBe("sett");
  });

  it("ignores input without the prefix", () => {
    expect(resolveCommandsPrefix("a > b")).toBeUndefined();
    expect(resolveCommandsPrefix("")).toBeUndefined();
  });
});

describe("buildSuperBarEntries in commands mode", () => {
  it("lists every matching command and nothing else", () => {
    const commands = ["a", "b", "c", "d", "e", "f", "g"].map(command);
    const entries = buildSuperBarEntries({
      query: "x",
      scope: "all",
      contextActions: [{ key: "star", label: "Star", value: "star" } as never],
      commands,
      results: [{ id: "node:1" } as never],
      isCommandsOnly: true
    });
    expect(entries.map((entry) => entry.kind)).toEqual(
      Array(7).fill("command")
    );
  });
});

describe("buildSuperBarEntries keys in commands mode", () => {
  it("keeps one row per action and variant and every distinct command", () => {
    const commands = [
      { action: "open", cmdLabel: "Open", label: "Open" },
      { action: "open", cmdLabel: "Open", label: "Open" },
      { action: "open", variant: "pane", cmdLabel: "Open", label: "Open" },
      { action: "star", cmdLabel: "Star", label: "Star" },
      { action: "star", cmdLabel: "Star again", label: "Star again" },
      ...["a", "b", "c", "d", "e", "f"].map((action) => ({
        action,
        cmdLabel: action,
        label: action
      }))
    ] as never[];
    const entries = buildSuperBarEntries({
      query: "o",
      scope: "all",
      contextActions: [],
      commands,
      results: [],
      isCommandsOnly: true
    });
    const keys = entries.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([
      "command:open:",
      "command:open:pane",
      "command:star:",
      ...["a", "b", "c", "d", "e", "f"].map((action) => `command:${action}:`)
    ]);
    expect(entries[2]).toMatchObject({ action: { cmdLabel: "Star" } });
  });
});
