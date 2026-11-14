import { describe, expect, it } from "vitest";
import {
  ContextMenuOptionLayout,
  isContextMenuOptionEnabled,
  resolveContextMenuOptionKeyTarget,
  resolveContextMenuOptionLayout,
  resolveContextMenuOptionTabStop
} from "./context-menu-option";

const options = (...labels: string[]) =>
  labels.map((label) => ({ label, value: label.toLowerCase() }));

describe("resolveContextMenuOptionLayout", () => {
  it("uses a segmented switcher for two or three short options", () => {
    expect(resolveContextMenuOptionLayout(options("Side nav", "Wall"))).toBe(
      ContextMenuOptionLayout.SEGMENTED
    );
    expect(
      resolveContextMenuOptionLayout(options("Day", "Week", "Month"))
    ).toBe(ContextMenuOptionLayout.SEGMENTED);
  });

  it("uses a radio list when short options do not fit or there are four", () => {
    expect(
      resolveContextMenuOptionLayout(
        options("Columns layout", "Classic layout")
      )
    ).toBe(ContextMenuOptionLayout.RADIO);
    expect(resolveContextMenuOptionLayout(options("A", "B", "C", "D"))).toBe(
      ContextMenuOptionLayout.RADIO
    );
    expect(resolveContextMenuOptionLayout(options("Only"))).toBe(
      ContextMenuOptionLayout.RADIO
    );
  });

  it("uses a submenu for five or more options", () => {
    expect(
      resolveContextMenuOptionLayout(
        options("Day", "Week", "Month", "Year", "Heatmap")
      )
    ).toBe(ContextMenuOptionLayout.SUBMENU);
  });

  it("measures values when labels are missing", () => {
    expect(
      resolveContextMenuOptionLayout([
        { value: "a-very-long-value" },
        { value: "b" }
      ])
    ).toBe(ContextMenuOptionLayout.RADIO);
  });
});

describe("resolveContextMenuOptionLayout thresholds", () => {
  it("keeps exactly 16 label characters segmented and moves 17 to a radio list", () => {
    expect(
      resolveContextMenuOptionLayout(options("Abcdefgh", "Ijklmnop"))
    ).toBe(ContextMenuOptionLayout.SEGMENTED);
    expect(
      resolveContextMenuOptionLayout(options("Abcdefgh", "Ijklmnopq"))
    ).toBe(ContextMenuOptionLayout.RADIO);
    expect(
      resolveContextMenuOptionLayout(options("Columns", "Classic", "Compact"))
    ).toBe(ContextMenuOptionLayout.RADIO);
  });
});

describe("context menu option keyboard and disabled state", () => {
  const items = [
    { value: "a" },
    { value: "b", isDisabled: true },
    { value: "c" },
    { value: "d" }
  ];

  it("reports only existing enabled options as pickable", () => {
    expect(isContextMenuOptionEnabled(items, "a")).toBe(true);
    expect(isContextMenuOptionEnabled(items, "b")).toBe(false);
    expect(isContextMenuOptionEnabled(items, "z")).toBe(false);
  });

  it("puts the tab stop on the checked enabled option, else the first enabled one", () => {
    expect(resolveContextMenuOptionTabStop(items, "c")).toBe(2);
    expect(resolveContextMenuOptionTabStop(items, "b")).toBe(0);
    expect(resolveContextMenuOptionTabStop(items, undefined)).toBe(0);
    expect(
      resolveContextMenuOptionTabStop([{ value: "a", isDisabled: true }], "a")
    ).toBe(-1);
  });

  it("steps over disabled options, wraps and jumps with Home and End", () => {
    expect(resolveContextMenuOptionKeyTarget(items, 0, "ArrowRight")).toBe(2);
    expect(resolveContextMenuOptionKeyTarget(items, 0, "ArrowDown")).toBe(2);
    expect(resolveContextMenuOptionKeyTarget(items, 2, "ArrowLeft")).toBe(0);
    expect(resolveContextMenuOptionKeyTarget(items, 0, "ArrowUp")).toBe(3);
    expect(resolveContextMenuOptionKeyTarget(items, 3, "ArrowRight")).toBe(0);
    expect(resolveContextMenuOptionKeyTarget(items, 2, "Home")).toBe(0);
    expect(resolveContextMenuOptionKeyTarget(items, 0, "End")).toBe(3);
    expect(resolveContextMenuOptionKeyTarget(items, 0, "Enter")).toBe(-1);
    expect(
      resolveContextMenuOptionKeyTarget([{ isDisabled: true }], 0, "Home")
    ).toBe(-1);
  });
});
