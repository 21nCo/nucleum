import type { ColorScheme } from "$lib/tidy/types/appConstants.type";

export type UserGlobalPreferences = {
        nickName: string;
        theme: string;
        colorScheme: ColorScheme;
        birthday?: Date;
        dayStart: string;
        isOnboardingComplete: boolean;
        tempColorScheme: string;
}