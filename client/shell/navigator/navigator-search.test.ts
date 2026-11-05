import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import {
  navigatorSearch,
  resolveNavigatorSearchTarget
} from "./navigator-search";

describe("navigatorSearch", () => {
  it("counts the inline hosts", () => {
    const release = navigatorSearch.hostInline();
    expect(get(navigatorSearch.isInline)).toBe(true);
    release();
    expect(get(navigatorSearch.isInline)).toBe(false);
  });

  it("stays inline until every inline host is released", () => {
    const releaseFirst = navigatorSearch.hostInline();
    const releaseSecond = navigatorSearch.hostInline();
    releaseFirst();
    expect(get(navigatorSearch.isInline)).toBe(true);
    releaseSecond();
    expect(get(navigatorSearch.isInline)).toBe(false);
  });

  it("passes keys to the registered handler until it is released", () => {
    const handler = vi.fn(() => true);
    const release = navigatorSearch.handleKeys(handler);
    const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
    navigatorSearch.keydown(event);
    expect(handler).toHaveBeenCalledWith(event);
    release();
    navigatorSearch.keydown(event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("reports whether the navigator handled a key", () => {
    const release = navigatorSearch.handleKeys(
      (event) => event.key === "ArrowDown"
    );
    expect(
      navigatorSearch.keydown(
        new KeyboardEvent("keydown", { key: "ArrowDown" })
      )
    ).toBe(true);
    expect(
      navigatorSearch.keydown(
        new KeyboardEvent("keydown", { key: "k", metaKey: true })
      )
    ).toBe(false);
    release();
    expect(
      navigatorSearch.keydown(
        new KeyboardEvent("keydown", { key: "ArrowDown" })
      )
    ).toBe(false);
  });

  it("clears the query", () => {
    navigatorSearch.query.set("alpha");
    navigatorSearch.reset();
    expect(get(navigatorSearch.query)).toBe("");
  });
});

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
