/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IUserGlobalPreferences } from "@nucleum/shared-state/preferences/user-preferences.type";
import {
  TimePeriodType,
  TimeScale
} from "@21n/shared-utils/datetime/period.type";
import type { TimePeriod } from "@21n/shared-utils/datetime/period.type";
import {
  getCorrespoingHorizonFrequencyLabel,
  resolveUpperRelativeTimePeriodTitle,
  timePeriodLabel,
  determinePreviousTimePeriod,
  determineTimePeriod,
  determineTimePeriodv2
} from "@21n/shared-utils/datetime/period";

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

describe("shared/utils/datetime/period", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels time periods", () => {
    const period: TimePeriod = {
      scale: TimeScale.DAYS,
      value: { type: TimePeriodType.RELATIVE, param: 0 }
    };
    expect(timePeriodLabel(period)).toBe("Today");
    expect(resolveUpperRelativeTimePeriodTitle(TimeScale.DAYS, 0)).toMatch(
      /\d{4}/
    );
  });

  it("determines previous time period", () => {
    const period: TimePeriod = {
      scale: TimeScale.DAYS,
      value: { type: TimePeriodType.RELATIVE, param: 0 }
    };
    const prev = determinePreviousTimePeriod(period);
    expect(prev.getDate()).toBeLessThanOrEqual(new Date().getDate());
  });

  it("computes time periods", () => {
    const period: TimePeriod = {
      scale: TimeScale.MONTHS,
      value: { type: TimePeriodType.RELATIVE, param: -1 }
    };
    const legacy = determineTimePeriod(period);
    const modern = determineTimePeriodv2(period);
    expect(legacy.begin <= legacy.end).toBe(true);
    expect(modern.begin <= modern.end).toBe(true);
  });

  it("provides horizon labels", () => {
    expect(getCorrespoingHorizonFrequencyLabel(TimeScale.WEEKS)).toBe("Weekly");
  });
});
