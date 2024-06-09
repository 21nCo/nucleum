import type { AppSkin, Theme } from "$lib/client/types/appearance.type";
import type { TimeScale } from "./time.type";
import type { Avatar } from "./avatar.type";
import type { ICacheableStore } from "./data.type";
export type UserGlobalPreferences = ICacheableStore & {
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
    all: IUIState;
    desktop: IUIState;
    portrait: IUIState;
  };
  avatarPicker: {
    skinIndex: number;
    usedEmojis: [Avatar][];
    iconColor: string;
    filled: boolean;
    usedIcons: [Avatar][];
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
