import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeFormat } from "@21n/shared-utils/datetime/duration.type";
import {
  formatSeconds,
  formatSecondsToTimeInDecimals,
  getTimeLabel
} from "@21n/ui/elements/time/duration-format";

describe("client/ui/compositions/time/duration-format", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats seconds in various styles", () => {
    expect(formatSeconds(3661, TimeFormat.VERBOSE)).toContain("1 h 1 m");
    expect(formatSeconds(125, TimeFormat.CLOCK)).toBe("02:05");
    expect(formatSeconds(45, TimeFormat.DECIMALS)).toBe("45s");
  });

  it("formats non-finite seconds as zero", () => {
    expect(formatSeconds(Number.NaN, TimeFormat.VERBOSE)).toBe("0 s");
    expect(formatSeconds(Number.POSITIVE_INFINITY, TimeFormat.CLOCK)).toBe(
      "00:00"
    );
  });

  it("converts seconds to decimal durations", () => {
    expect(formatSecondsToTimeInDecimals(7200)).toBe("2.00 hr");
    expect(formatSecondsToTimeInDecimals(180, 1, "min")).toBe("3.0 m");
  });

  it("creates readable time labels", () => {
    expect(getTimeLabel(135)).toBe("2 hrs 15 mins");
  });
});
