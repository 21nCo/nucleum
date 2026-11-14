import { describe, expect, it } from "vitest";
import {
  CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS,
  claimCalendarOverflowMenuReopen,
  requestCalendarOverflowMenuReopen,
  takeCalendarOverflowMenuReopen
} from "@nucleum/features/calendar/calendar-overflow-menu";

describe("calendar overflow menu reopen", () => {
  it("reopens once for the layout that mounts right after a pick", () => {
    requestCalendarOverflowMenuReopen(1_000);
    expect(takeCalendarOverflowMenuReopen(1_050)).toBe(true);
    expect(takeCalendarOverflowMenuReopen(1_060)).toBe(false);
  });

  it("ignores a request older than the reopen window", () => {
    requestCalendarOverflowMenuReopen(1_000);
    expect(
      takeCalendarOverflowMenuReopen(
        1_001 + CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS
      )
    ).toBe(false);
  });

  it("does not reopen without a pick", () => {
    expect(takeCalendarOverflowMenuReopen()).toBe(false);
  });
});

describe("calendar overflow menu reopen claim", () => {
  const unmeasured = { isMeasured: false, isCompact: false, hasTrigger: false };
  const inline = { isMeasured: true, isCompact: false, hasTrigger: false };
  const compactWithoutTrigger = {
    isMeasured: true,
    isCompact: true,
    hasTrigger: false
  };
  const compact = { isMeasured: true, isCompact: true, hasTrigger: true };

  it("consumes the request when the layout mounts, before it measures", () => {
    requestCalendarOverflowMenuReopen(1_000);
    claimCalendarOverflowMenuReopen(1_010);
    expect(takeCalendarOverflowMenuReopen(1_020)).toBe(false);
  });

  it("waits for the compact trigger, then reopens exactly once", () => {
    requestCalendarOverflowMenuReopen(1_000);
    const reopen = claimCalendarOverflowMenuReopen(1_010);
    expect(reopen.settle(unmeasured, 1_020)).toBe(false);
    expect(reopen.settle(compactWithoutTrigger, 1_030)).toBe(false);
    expect(reopen.settle(compact, 1_040)).toBe(true);
    expect(reopen.settle(compact, 1_050)).toBe(false);
  });

  it("drops the request for good when the layout settles inline", () => {
    requestCalendarOverflowMenuReopen(1_000);
    const reopen = claimCalendarOverflowMenuReopen(1_010);
    expect(reopen.settle(inline, 1_020)).toBe(false);
    expect(reopen.settle(compact, 1_030)).toBe(false);
  });

  it("drops a request the layout settles on after the reopen window", () => {
    requestCalendarOverflowMenuReopen(1_000);
    const reopen = claimCalendarOverflowMenuReopen(1_010);
    expect(
      reopen.settle(compact, 1_011 + CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS)
    ).toBe(false);
    expect(reopen.settle(compact, 1_020)).toBe(false);
  });

  it("never reopens without a pick", () => {
    const reopen = claimCalendarOverflowMenuReopen(1_000);
    expect(reopen.settle(compact, 1_010)).toBe(false);
  });
});
