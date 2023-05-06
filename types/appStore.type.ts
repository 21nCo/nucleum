import type { AppConstants } from "$lib/tidy/types/appConstants.type";
import type { PageMenuItem } from "$lib/tidy/types/pagemenuitem.type";
import type { ComponentType } from "$lib/tidy/types/component.type";

export type AppStore = {
  appConstants: AppConstants;
  appName: string;
  isDebugMode: boolean;
  environment: any;
  pages?: PageMenuItem[];
  pageMenu?: ComponentType[];
  players?: ComponentType[];
  dynamicBlocks?: ComponentType[];
  staticBlocks?: ComponentType[];
  tailwindTheme: string;
};
