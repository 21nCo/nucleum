import type { AppSkin, Theme } from "$lib/client/types/appearance.type";
import type { TimeScale } from "./time.type";
import type { IAvatar } from "./avatar.type";
import type { IObservableStoreSubject } from "./data.type";
import type { TranscriptionModel } from "../products/memotron/taco/taco.types";
export type IUserGlobalPreferences = IObservableStoreSubject & {
  name: string;
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
  lastUsedTranscriptionModel: TranscriptionModel;

  localAI: {
    semanticSearch: boolean;
    audioTranscription: boolean;
    markdownQAChat: boolean;
    vectorGenerationInProgress: boolean;
  };

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
  isBlurredBgForPopups?: boolean;
};

export type TimeZoneRecord = {
  offset: number;
  date: string;
  label: string;
};
