import type { AppConstants } from "$lib/tidy/types/appConstants.type"
import type { PageMenuItem } from "$lib/tidy/types/pagemenuitem.type";

export type AppStore = {
    appConstants: AppConstants;
    appName: string;
    isDebug: boolean;
    environment: any;
    pages?: PageMenuItem[];
    pageMenu?: PageMenuItem[];
    tailwindTheme: string;
}