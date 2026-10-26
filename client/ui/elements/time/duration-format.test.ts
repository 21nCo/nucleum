import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IUserGlobalPreferences } from "@nucleum/shared-state/preferences/user-preferences.type";
import { TimeFormat } from "@21n/shared-utils/datetime/duration.type";
import {
  formatSeconds,
  formatSecondsToTimeInDecimals,
  getTimeLabel
} from "@21n/ui/elements/time/duration-format";

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
