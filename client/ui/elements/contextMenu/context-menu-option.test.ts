import { describe, expect, it } from "vitest";
import {
  ContextMenuOptionLayout,
  resolveContextMenuOptionLayout
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
