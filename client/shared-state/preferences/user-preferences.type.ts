import type { AppSkin, Theme } from "@21n/theme/appearance.type";
import type { AppStyle } from "@21n/theme/app-style";
import type { TimeScale } from "@21n/shared-utils/datetime/period.type";
import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import type { TranscriptionModel } from "@nucleum/client/runtime/inference/worker.type";

export type IUserGlobalPreferences = {
  name: string;
  profilePicture?: IRecordId | undefined;
  // theme: AppSkin;
  // colorScheme: ColorScheme;
  appearance: UserAppearanceSettings;
  /**
   * User appearance profiles keyed by id. A `null` entry is a deleted profile,
   * kept so one-level merges and sync do not bring it back.
   */
  appearanceProfiles?: Record<string, StoredAppearanceProfile | null>;
  /** Id of the profile applied last, user or built-in. */
  appliedAppearanceProfileId?: string | null;
  birthday?: Date;
  dayStartHour: number;
  dayStartMinute: number;
  tempColorScheme: string;
  accessibilitySizingFactor: number;
  isAnonymousAnalyticsEnabled: boolean;
  timeFormat: string;
  timeZoneOffset: number;
  timeZoneLabel: string;
  timeZone?: string;
  timeScales?: TimeScale[];
  recentCommands?: { action: string; variant?: string }[];
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

/** Appearance fields a profile captures and restores. */
export type AppearanceProfileSettings = Pick<
  UserAppearanceSettings,
  | "isSyncWithSystem"
  | "lightColorSchemeId"
  | "darkColorSchemeId"
  | "userThemeSetting"
  | "typeface"
  | "appStyle"
>;

/** A user appearance profile as stored in the synced preferences record. */
export type StoredAppearanceProfile = {
  name: string;
  settings: AppearanceProfileSettings;
  createdAt: number;
};

export type UserAppearanceSettings = {
  skin: AppSkin;
  isSyncWithSystem: boolean;
  lightColorSchemeId: string;
  darkColorSchemeId: string;
  userThemeSetting: Theme;
  isBlurredBgForPopups?: boolean;
  isFixedLeftNav?: boolean;
  typeface?: string;
  appStyle?: AppStyle;
};

export type TimeZoneRecord = {
  offset: number;
  date: string;
  label: string;
};
