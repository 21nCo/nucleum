import type { AppTheme, ColorScheme } from "$lib/tidy/types/appConstants.type";

export type UserGlobalPreferences = {
  nickName: string;
  theme: AppTheme;
  colorScheme: ColorScheme;
  birthday?: Date;
  dayStart: string;
  isOnboardingComplete: boolean;
  tempColorScheme: string;
  accessibilitySizingFactor: number;
  timeFormat: string;
};
