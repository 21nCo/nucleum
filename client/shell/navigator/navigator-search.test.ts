import { describe, expect, it } from "vitest";
import { resolveNavigatorSearchTarget } from "./navigator-search";

describe("resolveNavigatorSearchTarget", () => {
  it("opens only results of the current non-empty query", () => {
    const results = { query: "note", ids: ["node:a", "node:b"] };
    expect(resolveNavigatorSearchTarget(" note ", results)).toBe("node:a");
    expect(resolveNavigatorSearchTarget("", results)).toBeUndefined();
    expect(resolveNavigatorSearchTarget("notes", results)).toBeUndefined();
    expect(
      resolveNavigatorSearchTarget("note", { query: "note", ids: [] })
    ).toBeUndefined();
  });
});
