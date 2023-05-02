import type { AppConstants } from "./appConstants.type"
import type { PageMenuItem } from "./pagemenuitem.type";

export type AppStore = {
    appConstants: AppConstants;
    appName: string;
    isDebug: boolean;
    environment: any;
    pages?: PageMenuItem[];
    pageMenu?: PageMenuItem[];
    tailwindTheme: string;
}