import type { ColorScheme } from "./appConstants.type";
import type { TimerMode } from "./timerMode.enum";
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
        timerMode: TimerMode;
        tempColorScheme: string;
}