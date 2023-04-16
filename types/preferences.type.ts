import type { ColorScheme } from "./appConstants.type";
import type { AppMode } from "./appMode.enum";
import type { Preset } from "./preset.type";

export type UserPreferences = {
        nickName: string;
        theme: string;
        colorScheme: ColorScheme;
        isEnableAgeCounter: boolean;
        isEnableDailyTarget: boolean;
        birthday?: Date;
        dailyFocusTarget?: number;
        breakEndSound?: string;
        focusEndSound?: string;
        sessionFinishSound?: string;
        extendDuration: number;
        dayStart: string;
        presets: Preset[];
        isOnboardingComplete: boolean;
        isEnableAutoStartInterval: boolean;
        appMode: AppMode;
        tempColorScheme: string;
}