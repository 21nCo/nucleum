import { describe, expect, it } from "vitest";
import {
  formatNavigatorAge,
  limitSectionItems,
  resolveFrequentContext
} from "./navigator-sections";

describe("resolveFrequentContext", () => {
  it("uses the open record when it has from-here history", () => {
    expect(resolveFrequentContext("node:a", 3, undefined)).toBe("node:a");
  });

  it("shows the generic list without a page or from-here history", () => {
    expect(resolveFrequentContext(undefined, 3, undefined)).toBeUndefined();
    expect(resolveFrequentContext("node:a", 0, undefined)).toBeUndefined();
  });

  it("shows the generic list after the user clears the context", () => {
    expect(resolveFrequentContext("node:a", 3, "node:a")).toBeUndefined();
    expect(resolveFrequentContext("node:b", 3, "node:a")).toBe("node:b");
  });
});

describe("limitSectionItems", () => {
  const items = [1, 2, 3, 4, 5, 6, 7];

  it("shows the first five and counts the rest", () => {
    expect(limitSectionItems(items, false)).toEqual({
      visible: [1, 2, 3, 4, 5],
      hiddenCount: 2
    });
  });

  it("shows every item when expanded", () => {
    expect(limitSectionItems(items, true)).toEqual({
      visible: items,
      hiddenCount: 0
    });
  });

  it("hides nothing when the section is short", () => {
    expect(limitSectionItems([1, 2], false, 5)).toEqual({
      visible: [1, 2],
      hiddenCount: 0
    });
  });
});

describe("formatNavigatorAge", () => {
  const now = 10 * 24 * 60 * 60 * 1000;
  const minutes = (value: number) => now - value * 60 * 1000;

  it("formats recent visits in minutes and hours", () => {
    expect(formatNavigatorAge(now - 5000, now)).toBe("now");
    expect(formatNavigatorAge(minutes(2), now)).toBe("2m");
    expect(formatNavigatorAge(minutes(18), now)).toBe("18m");
    expect(formatNavigatorAge(minutes(65), now)).toBe("1h");
  });

  it("formats older visits in days and weeks", () => {
    expect(formatNavigatorAge(minutes(30 * 60), now)).toBe("Yesterday");
    expect(formatNavigatorAge(minutes(3 * 24 * 60), now)).toBe("3d");
    expect(formatNavigatorAge(minutes(9 * 24 * 60), now)).toBe("1w");
  });

  it("treats future times as now", () => {
    expect(formatNavigatorAge(now + 1000, now)).toBe("now");
  });
});
