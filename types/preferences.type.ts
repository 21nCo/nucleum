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
  timeFormat: string;
  timeZoneOffset: number;
  timeScales?: TimeScale[];
  uiState: GlobalUiState;
  id: string;
};

export type GlobalUiState = {
  isOnboardingComplete: boolean;
};
