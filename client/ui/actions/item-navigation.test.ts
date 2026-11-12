import { describe, expect, it } from "vitest";
import {
  isItemNavigationKey,
  resolveItemNavigationIndex,
  resolveItemRange,
  resolveItemRows,
  type ItemNavigationRect
} from "./item-navigation";

function grid(columns: number, count: number): ItemNavigationRect[] {
  return Array.from({ length: count }, (_, index) => ({
    top: Math.floor(index / columns) * 110,
    left: (index % columns) * 210,
    width: 200,
    height: 100
  }));
}

describe("item navigation", () => {
  it("recognises only plain arrow keys", () => {
    expect(isItemNavigationKey("ArrowUp")).toBe(true);
    expect(isItemNavigationKey("ArrowRight")).toBe(true);
    expect(isItemNavigationKey("Enter")).toBe(false);
  });

  it("groups items into visual rows", () => {
    expect(resolveItemRows(grid(3, 7))).toEqual([[0, 1, 2], [3, 4, 5], [6]]);
  });

  it("highlights the first item on the first press", () => {
    expect(resolveItemNavigationIndex(grid(3, 7), undefined, "ArrowDown")).toBe(
      0
    );
    expect(resolveItemNavigationIndex(grid(3, 7), undefined, "ArrowLeft")).toBe(
      0
    );
    expect(resolveItemNavigationIndex([], undefined, "ArrowDown")).toBe(
      undefined
    );
  });

  it("moves Up and Down through a single-column list", () => {
    const list = grid(1, 3);
    expect(resolveItemNavigationIndex(list, 0, "ArrowDown")).toBe(1);
    expect(resolveItemNavigationIndex(list, 2, "ArrowDown")).toBe(2);
    expect(resolveItemNavigationIndex(list, 1, "ArrowUp")).toBe(0);
    expect(resolveItemNavigationIndex(list, 1, "ArrowRight")).toBe(1);
  });

  it("moves Left and Right within a grid row and stops at its edges", () => {
    const items = grid(3, 7);
    expect(resolveItemNavigationIndex(items, 1, "ArrowRight")).toBe(2);
    expect(resolveItemNavigationIndex(items, 2, "ArrowRight")).toBe(2);
    expect(resolveItemNavigationIndex(items, 3, "ArrowLeft")).toBe(3);
  });

  it("moves Up and Down across grid rows to the nearest column", () => {
    const items = grid(3, 7);
    expect(resolveItemNavigationIndex(items, 1, "ArrowDown")).toBe(4);
    expect(resolveItemNavigationIndex(items, 5, "ArrowDown")).toBe(6);
    expect(resolveItemNavigationIndex(items, 4, "ArrowUp")).toBe(1);
    expect(resolveItemNavigationIndex(items, 1, "ArrowUp")).toBe(1);
  });

  it("returns an inclusive range in either direction", () => {
    expect(resolveItemRange(2, 4)).toEqual([2, 3, 4]);
    expect(resolveItemRange(4, 2)).toEqual([2, 3, 4]);
  });
});
