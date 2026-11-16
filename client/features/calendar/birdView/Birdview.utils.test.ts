import { describe, expect, it } from "vitest";
import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
import { resolveBirdviewDateSlot } from "./Birdview.utils";

describe("bird view date slot", () => {
  const date = new Date(2026, 2, 5, 23, 30);

  it("matches the data-date of each mode's columns", () => {
    expect(resolveBirdviewDateSlot(date, TimeScaleUnit.PART)).toBe(
      "2026-03-05-0"
    );
    expect(resolveBirdviewDateSlot(date, TimeScaleUnit.DAY)).toBe("2026-03-05");
    expect(resolveBirdviewDateSlot(date, TimeScaleUnit.MONTH)).toBe("2026-03");
    expect(resolveBirdviewDateSlot(date, TimeScaleUnit.YEAR)).toBe("2026");
  });

  it("uses the local date, not the UTC one", () => {
    const lateNight = new Date(2026, 11, 31, 23, 59);
    expect(resolveBirdviewDateSlot(lateNight, TimeScaleUnit.DAY)).toBe(
      "2026-12-31"
    );
  });

  it("has no slot for modes without columns", () => {
    expect(resolveBirdviewDateSlot(date, TimeScaleUnit.WEEK)).toBeUndefined();
  });
});
