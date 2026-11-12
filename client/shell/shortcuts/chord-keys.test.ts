import { describe, expect, it } from "vitest";
import { resolveChordSpaceIndex } from "./chord-keys";

const press = (
  key: string,
  modifiers: Partial<Record<string, boolean>> = {}
) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers
});

describe("chord keys", () => {
  it("maps G then 1 to 9 to pinned space positions", () => {
    expect(resolveChordSpaceIndex("g", press("1"))).toBe(0);
    expect(resolveChordSpaceIndex("G", press("9"))).toBe(8);
  });

  it("ignores other prefixes, keys and modified presses", () => {
    expect(resolveChordSpaceIndex(undefined, press("1"))).toBeUndefined();
    expect(resolveChordSpaceIndex("h", press("1"))).toBeUndefined();
    expect(resolveChordSpaceIndex("g", press("0"))).toBeUndefined();
    expect(resolveChordSpaceIndex("g", press("c"))).toBeUndefined();
    expect(
      resolveChordSpaceIndex("g", press("1", { metaKey: true }))
    ).toBeUndefined();
  });
});
