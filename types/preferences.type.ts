import type { AppSkin, Theme } from "$lib/tidy/types/appearance.type";
import type { TimeScale } from "./time.type";
import type { avatarWithCode, avatarWithURL } from "./iconPicker.type";
import type { CacheableStore } from "./data.type";
export type UserGlobalPreferences = CacheableStore & {
  nickName: string;
  // theme: AppSkin;
  // colorScheme: ColorScheme;
  appearance: UserAppearanceSettings;
  birthday?: Date;
  dayStartHour: number;
  dayStartMinute: number;
  tempColorScheme: string;
  accessibilitySizingFactor: number;
  isAnonymousAnalyticsEnabled: boolean;
  timeFormat: string;
  timeZoneOffset: number;
  timeZoneLabel: string;
  timeScales?: TimeScale[];
  id: string;
  recentCommands?: string[];
  shortcuts?: KeyboardShortcut[];
  uiStates: {
    all: UiState;
    desktop: UiState;
    portrait: UiState;
  };
  avatarPicker: {
    skinIndex: number;
    usedEmojis: (avatarWithCode | avatarWithURL)[];
    iconColor: string;
    filled: boolean;
    usedIcons: (avatarWithCode | avatarWithURL)[];
  };
};

export type KeyboardShortcut = {
  action: string;
  key: string;
  modifiers: string[];
};

type UiState = {
  isOnboardingComplete?: boolean;
  isInThinMode: boolean;
};

export type UserAppearanceSettings = {
  skin: AppSkin;
  theme: Theme;
  lightColorSchemeId: string;
  darkColorSchemeId: string;
};

export type TimeZoneRecord = {
  offset: number;
  date: string;
  label: string;
};
