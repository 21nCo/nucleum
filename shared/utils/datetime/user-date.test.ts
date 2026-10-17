/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserDate } from "@21n/shared-utils/datetime/user-date.type";
import {
  checkDay,
  checkIsToday,
  checkIsTodayUsingTimestamp,
  compareUserDay,
  convertDateStringToArray,
  generateSessionId as generatSessionId,
  getCurrentUserDate,
  getDateDifferenceFromToday,
  getDayStartTime,
  getJustDate,
  getOneDayEarlier,
  getOneDayLater,
  getUserDate,
  padToTwo
} from "@21n/shared-utils/datetime/user-date";

describe("shared/utils/datetime/user-date", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("pads numbers to two digits", () => {
    expect(padToTwo(3)).toBe("03");
    expect(padToTwo(12)).toBe("12");
  });

  it("converts ISO date strings to tuple", () => {
    expect(convertDateStringToArray("2023-09-15")).toEqual([
      15,
      "September",
      2023
    ]);
  });

  describe("user date helpers", () => {
    const baseDate = new Date(2023, 8, 15, 1, 30).getTime();

    it("calculates user date relative to custom day start", () => {
      expect(getUserDate(baseDate, "00:00")).toEqual({
        day: 15,
        month: 8,
        year: 2023
      });
      expect(getUserDate(baseDate, "02:00")).toEqual({
        day: 14,
        month: 8,
        year: 2023
      });
    });

    it("compares two user days", () => {
      const day: UserDate = { day: 15, month: 8, year: 2023 };
      const later: UserDate = { day: 16, month: 8, year: 2023 };
      const earlier: UserDate = { day: 14, month: 8, year: 2023 };

      expect(compareUserDay(day, { ...day })).toBe(0);
      expect(compareUserDay(earlier, day)).toBe(-1);
      expect(compareUserDay(later, day)).toBe(1);
    });

    it("checks if a user day represents today", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2023, 8, 20, 10));
      const today: UserDate = { day: 20, month: 8, year: 2023 };
      expect(checkIsToday(today)).toBe(true);
      expect(checkIsToday({ ...today, day: 19 })).toBe(false);
    });

    it("checks if timestamp belongs to today's user day", () => {
      vi.useFakeTimers();
      const now = new Date(2023, 0, 5, 3, 0);
      vi.setSystemTime(now);
      const timestamp = now.getTime();
      expect(checkIsTodayUsingTimestamp(timestamp)).toBe(true);
      expect(checkIsTodayUsingTimestamp(timestamp - 24 * 60 * 60 * 1000)).toBe(
        false
      );
    });

    it("validates day against session start", () => {
      const day = { day: 10, month: 1, year: 2024 };
      const sessionTs = new Date(2024, 1, 10, 6).getTime();
      expect(checkDay(day, sessionTs)).toBe(true);
      expect(checkDay(day, sessionTs + 24 * 60 * 60 * 1000)).toBe(false);
    });

    it("produces day start timestamps", () => {
      const day = { day: 10, month: 1, year: 2024 };
      const ts = getDayStartTime(day, "07:30");
      const expected = new Date(2024, 1, 10, 7, 30).getTime();
      expect(ts).toBe(expected);
    });

    it("shifts dates forward and backward by one day", () => {
      const date = { day: 1, month: 0, year: 2024 };
      expect(getOneDayLater(date)).toEqual({ day: 2, month: 0, year: 2024 });
      expect(getOneDayEarlier(date)).toEqual({
        day: 31,
        month: 11,
        year: 2023
      });
    });

    it("computes difference from today", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2023, 0, 10));
      expect(
        getDateDifferenceFromToday({ day: 12, month: 0, year: 2023 })
      ).toBe(2);
      expect(getDateDifferenceFromToday({ day: 8, month: 0, year: 2023 })).toBe(
        -2
      );
    });

    it("returns current user date", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2022, 5, 2, 10));
      expect(getCurrentUserDate()).toEqual({ day: 2, month: 5, year: 2022 });
    });

    it("strips time from dates", () => {
      const now = new Date(2022, 10, 5, 15, 30, 45, 500);
      const justDate = getJustDate(now);
      expect(justDate.getHours()).toBe(0);
      expect(justDate.getMinutes()).toBe(0);
      expect(justDate.getSeconds()).toBe(0);
      expect(justDate.getFullYear()).toBe(2022);
      expect(justDate.getMonth()).toBe(10);
      expect(justDate.getDate()).toBe(5);
    });
  });

  it("generates session id from timestamp", () => {
    expect(generatSessionId(1234.567)).toBe("1234");
  });
});
