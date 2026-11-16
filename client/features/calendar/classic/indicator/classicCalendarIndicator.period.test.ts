import { describe, expect, it } from "vitest";
import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
import {
  resolveIndicatorPeriodKey,
  resolveIndicatorSessionSelect
} from "./classicCalendarIndicator.signal";

describe("calendar indicator period key", () => {
  it("stays the same for dates inside one year, month or quarter", () => {
    const march = new Date(2026, 2, 3);
    const may = new Date(2026, 4, 20);
    expect(resolveIndicatorPeriodKey(march, TimeScaleUnit.YEAR)).toBe(
      resolveIndicatorPeriodKey(may, TimeScaleUnit.YEAR)
    );
    expect(resolveIndicatorPeriodKey(march, TimeScaleUnit.MONTH)).toBe(
      resolveIndicatorPeriodKey(new Date(2026, 2, 28), TimeScaleUnit.MONTH)
    );
    expect(
      resolveIndicatorPeriodKey(new Date(2026, 3, 1), TimeScaleUnit.QUARTER)
    ).toBe(
      resolveIndicatorPeriodKey(new Date(2026, 5, 30), TimeScaleUnit.QUARTER)
    );
  });

  it("changes when the period changes", () => {
    expect(
      resolveIndicatorPeriodKey(new Date(2025, 11, 31), TimeScaleUnit.YEAR)
    ).not.toBe(
      resolveIndicatorPeriodKey(new Date(2026, 0, 1), TimeScaleUnit.YEAR)
    );
    expect(
      resolveIndicatorPeriodKey(new Date(2026, 2, 31), TimeScaleUnit.QUARTER)
    ).not.toBe(
      resolveIndicatorPeriodKey(new Date(2026, 3, 1), TimeScaleUnit.QUARTER)
    );
    expect(
      resolveIndicatorPeriodKey(new Date(2026, 2, 3), TimeScaleUnit.WEEK)
    ).not.toBe(
      resolveIndicatorPeriodKey(new Date(2026, 2, 4), TimeScaleUnit.WEEK)
    );
  });
});

describe("calendar indicator session fields", () => {
  it("leaves out blocks and start for the year view", () => {
    const fields = resolveIndicatorSessionSelect(TimeScaleUnit.YEAR);
    expect(fields).toContain("startUnix");
    expect(fields).not.toContain("blocks");
    expect(fields).not.toContain("start");
  });

  it("keeps blocks and start for the month view's focus split", () => {
    const fields = resolveIndicatorSessionSelect(TimeScaleUnit.MONTH);
    expect(fields).toEqual(expect.arrayContaining(["blocks", "start"]));
  });
});
