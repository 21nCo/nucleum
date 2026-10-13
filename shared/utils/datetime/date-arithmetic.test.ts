/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IUserGlobalPreferences } from "@nucleum/shared-state/preferences/user-preferences.type";
import {
  attachTimeToDate,
  compareDates,
  incrementTime,
  isSameDateTime,
  isSameDay,
  offsetDate,
  toLocalISOString
} from "@21n/shared-utils/datetime/date-arithmetic";

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

describe("shared/utils/datetime/date-arithmetic", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("produces local ISO strings", () => {
    const iso = toLocalISOString(new Date(Date.UTC(2024, 0, 1, 0, 0, 0)));
    expect(iso).toMatch(/^2024-01-01T/);
  });

  it("increments time with optional rounding", () => {
    const base = new Date(Date.UTC(2024, 0, 1, 10, 15, 0));
    const rounded = incrementTime(new Date(base), 2, true);
    expect(rounded.getUTCHours()).toBe(12);
  });

  it("compares date equality", () => {
    const a = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
    const b = new Date(Date.UTC(2024, 0, 1, 10, 0, 0));
    expect(isSameDay(a, b)).toBe(true);
    expect(isSameDateTime(a, b, { isIgnoreSeconds: true })).toBe(false);
  });

  it("shifts dates and attaches time", () => {
    const base = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
    const shifted = offsetDate(base, 2);
    expect(shifted.getUTCDate()).toBe(3);
    const attached = attachTimeToDate(new Date(base), "15:45");
    expect(attached.getHours()).toBe(15);
  });

  it("compares dates using operators", () => {
    const a = new Date("2024-01-01");
    const b = new Date("2024-01-02");
    expect(compareDates(a, b, "<")).toBe(true);
  });
});
