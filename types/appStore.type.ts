import type { AppConstants } from "./appConstants.type"

export type AppStore = {
    appConstants: AppConstants;
    appName: string;
    isDebug: boolean;
}