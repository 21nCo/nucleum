/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IUserGlobalPreferences } from "@nucleum/shared-state/preferences/user-preferences.type";
import {
  parseFullDateTimeString,
  parseRelativeTimeToISO
} from "@21n/shared-utils/datetime/date-parsing";

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

describe("shared/utils/datetime/date-parsing", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses relative durations into ISO timestamps", () => {
    const now = new Date(Date.UTC(2024, 0, 10, 0, 0, 0));
    const iso = parseRelativeTimeToISO("5d", now);
    expect(iso).toMatch(/2024-01-05/);
  });

  it("parses verbose date time strings", () => {
    const parsed = parseFullDateTimeString("January 5, 2024 at 10:30 AM");
    expect(parsed?.getHours()).toBe(10);
  });
});
