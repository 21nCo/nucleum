import { describe, expect, it } from "vitest";
import { resolveContextViewIndex } from "./context-view-keys";

const press = (
  key: string,
  modifiers: Partial<
    Record<"metaKey" | "ctrlKey" | "altKey" | "shiftKey", boolean>
  > = {}
) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers
});

describe("resolveContextViewIndex", () => {
  it("maps 1 to 9 to zero-based indexes", () => {
    expect(resolveContextViewIndex(press("1"))).toBe(0);
    expect(resolveContextViewIndex(press("9"))).toBe(8);
  });

  it("ignores 0 and other keys", () => {
    expect(resolveContextViewIndex(press("0"))).toBeUndefined();
    expect(resolveContextViewIndex(press("a"))).toBeUndefined();
    expect(resolveContextViewIndex(press("10"))).toBeUndefined();
  });

  it("ignores number keys with a modifier", () => {
    for (const modifier of [
      "metaKey",
      "ctrlKey",
      "altKey",
      "shiftKey"
    ] as const) {
      expect(
        resolveContextViewIndex(press("2", { [modifier]: true }))
      ).toBeUndefined();
    }
  });
});
