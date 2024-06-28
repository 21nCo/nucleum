import type { AppSkin, Theme } from "$lib/client/types/appearance.type";
import type { TimeScale } from "./time.type";
import type { IAvatar } from "./avatar.type";
export type UserGlobalPreferences = {
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
  recentCommands?: string[];
  shortcuts?: KeyboardShortcut[];
  uiStates: {
    all: IUIState;
    desktop: IUIState;
    portrait: IUIState;
  };
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

export type KeyboardShortcut = {
  action: string;
  key: string;
  modifiers: string[];
};

type IUIState = {
  isOnboardingComplete?: boolean;
  isInThinMode: boolean;
};

export type UIStateProps = {
  property: string;
  value: any;
  isGlobal?: boolean;
};

export enum UIState {
  isOnboardingComplete = "isOnboardingComplete",
  isInThinMode = "isInThinMode",

  //Pointron
  quickFocusLayout = "quickFocusLayout",
  advancedComposeType = "advancedComposeType",
  advancedMode = "advancedMode"
}

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
