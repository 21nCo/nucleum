/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IUserGlobalPreferences } from "@nucleum/shared-state/preferences/user-preferences.type";
import type { UserDate } from "@21n/shared-utils/datetime/user-date.type";
import {
  formatDateRelativeToToday,
  formatDatetime,
  formatTime,
  formatUserDate,
  parseAndFormatDate
} from "@21n/shared-utils/datetime/date-formatting";

vi.mock("moment-timezone", () => {
  const offsets: Record<string, number> = {
    UTC: 0,
    "Asia/Kolkata": 330
  };
  const tz = Object.assign(
    (zone: string) => ({
      utcOffset: () => offsets[zone] ?? 0
    }),
    {
      names: () => Object.keys(offsets)
    }
  );
  const moment = { tz };
  return { ...moment, default: moment };
});

const preferences: IUserGlobalPreferences = {
  name: "Test User",
  appearance: {
    skin: "clean" as any,
    isSyncWithSystem: false,
    lightColorSchemeId: "",
    darkColorSchemeId: "",
    userThemeSetting: "light" as any
  },
  dayStartHour: 0,
  dayStartMinute: 0,
  tempColorScheme: "",
  accessibilitySizingFactor: 1,
  isAnonymousAnalyticsEnabled: true,
  timeFormat: "meridian",
  timeZoneOffset: 0,
  timeZoneLabel: "UTC",
  avatarPicker: {
    skinIndex: 0,
    usedEmojis: [] as any,
    iconColor: "",
    filled: false,
    usedIcons: [] as any
  },
  annotations: [],
  lastUsedTranscriptionModel: "base" as any,
  localAI: {
    semanticSearch: false,
    audioTranscription: false,
    markdownQAChat: false,
    vectorGenerationInProgress: false
  }
};

describe("shared/utils/datetime/date-formatting", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats time according to preferences", () => {
    expect(formatTime(preferences, new Date(2024, 0, 1, 13, 30))).toBe(
      "1:30 PM"
    );
    expect(
      formatTime(
        { ...preferences, timeFormat: "24" },
        new Date(2024, 0, 1, 13, 30)
      )
    ).toBe("13:30");
    expect(
      formatTime(
        { ...preferences, timeFormat: "24" },
        new Date(2024, 0, 1, 13, 30, 45),
        { isIncludeSeconds: true }
      )
    ).toBe("13:30:45");
  });

  it("formats user dates", () => {
    const userDate: UserDate = { day: 5, month: 0, year: 2024 };
    expect(formatUserDate(userDate)).toBe("05 Jan 2024");
    expect(formatUserDate(userDate, "yyyy:mm:dd")).toBe("2024-01-05");
  });

  it("describes dates relative to today", () => {
    const today = new Date();
    expect(formatDateRelativeToToday(today)).toBe("Today");
    const past = new Date();
    past.setDate(past.getDate() - 2);
    expect(formatDateRelativeToToday(past)).toMatch(/Last/);
  });

  it("parses and formats dates in multiple ways", () => {
    const date = new Date(Date.UTC(2024, 1, 3));
    expect(parseAndFormatDate(date, "iso")).toBe("2024-02-03T00:00:00.000Z");
    expect(parseAndFormatDate(date, "mm-dd")).toMatch(/02/);
    expect(parseAndFormatDate("invalid")).toBe("");
  });

  it("formats complete datetime string", () => {
    const result = formatDatetime(
      preferences,
      new Date(Date.UTC(2024, 0, 1, 8, 0, 0))
    );
    expect(result).toMatch(/Jan/);
  });

  it("formats numeric datetime values", () => {
    const result = formatDatetime(preferences, Date.UTC(2024, 0, 1, 8, 0, 0));
    expect(result).toMatch(/Jan/);
  });
});
