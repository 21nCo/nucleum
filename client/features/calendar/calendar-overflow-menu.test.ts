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
  it("consumes the request when the layout mounts and holds it pending", () => {
    requestCalendarOverflowMenuReopen(1_000);
    const reopen = claimCalendarOverflowMenuReopen(1_010);
    expect(reopen.isPending).toBe(true);
    expect(takeCalendarOverflowMenuReopen(1_020)).toBe(false);
  });

  it("waits for the trigger, then reopens exactly once", () => {
    requestCalendarOverflowMenuReopen(1_000);
    const reopen = claimCalendarOverflowMenuReopen(1_010);
    expect(reopen.settle(false, 1_020)).toBe(false);
    expect(reopen.isPending).toBe(true);
    expect(reopen.settle(true, 1_030)).toBe(true);
    expect(reopen.isPending).toBe(false);
    expect(reopen.settle(true, 1_040)).toBe(false);
  });

  it("drops a request whose trigger appears only after the reopen window", () => {
    requestCalendarOverflowMenuReopen(1_000);
    const reopen = claimCalendarOverflowMenuReopen(1_010);
    const late = 1_011 + CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS;
    expect(reopen.settle(false, late)).toBe(false);
    expect(reopen.isPending).toBe(false);
    expect(reopen.settle(true, late)).toBe(false);
  });

  it("never reopens or holds without a pick", () => {
    const reopen = claimCalendarOverflowMenuReopen(1_000);
    expect(reopen.isPending).toBe(false);
    expect(reopen.settle(true, 1_010)).toBe(false);
  });
});
