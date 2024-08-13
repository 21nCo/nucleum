import type { AppSkin, Theme } from "$lib/client/types/appearance.type";
import type { TimeScale } from "./time.type";
import type { IAvatar } from "./avatar.type";
import type { IObservableStoreSubject } from "./data.type";
export type IUserGlobalPreferences = IObservableStoreSubject & {
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
  /**
   * @deprecated - use keyboardShortcuts store instead
   */
  recentCommands?: string[];
  avatarPicker: {
    skinIndex: number;
    usedEmojis: [IAvatar][];
    iconColor: string;
    filled: boolean;
    usedIcons: [IAvatar][];
  };
  annotations: any[];
  /**
   * @deprecated
   * Temporary
   */
  mediaGridTestitems: any[];
  /**
   * @deprecated
   * Temporary for testing
   */
  infiniteGrid: {
    isGridCreated: boolean;
    grid: any[];
  };
};

export type UserAppearanceSettings = {
  skin: AppSkin;
  theme: Theme;
  isSyncWithSystem: boolean;
  lightColorSchemeId: string;
  darkColorSchemeId: string;
};

export type TimeZoneRecord = {
  offset: number;
  date: string;
  label: string;
};
