import type { AppTheme, ColorScheme } from "$lib/tidy/types/theme.type";
import type { TimeScale } from "./time.type";

export type UserGlobalPreferences = {
  nickName: string;
  theme: AppTheme;
  colorScheme: ColorScheme;
  birthday?: Date;
  dayStartHour: number;
  dayStartMinute: number;
  tempColorScheme: string;
  accessibilitySizingFactor: number;
  isAnonymousAnalyticsEnabled: boolean;
  timeFormat: string;
  timeZoneOffset: number;
  timeScales?: TimeScale[];
  id: string;
  recentCommands?: string[];
  shortcuts?: KeyboardShortcut[];
  lastRunChangeId?: number;
  uiStates: {
    all: UiState;
    desktop: UiState;
    portrait: UiState;
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
