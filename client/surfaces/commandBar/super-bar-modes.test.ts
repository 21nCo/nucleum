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
