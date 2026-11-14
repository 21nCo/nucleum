import { describe, expect, it } from "vitest";
import {
  CALENDAR_OVERFLOW_MENU_REOPEN_WINDOW_MS,
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
