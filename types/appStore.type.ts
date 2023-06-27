import type { AppConstants } from "$lib/tidy/types/appConstants.type";
import type { PageMenuItem } from "$lib/tidy/types/pagemenuitem.type";
import type { ComponentType } from "$lib/tidy/types/component.type";
import type { Player } from "./player.type";

export type AppStore = {
  appConstants: AppConstants;
  appName: string;
  appData: any;
  isDebugMode: boolean;
  environment: any;
  pages?: string[];
  pageMenu?: ComponentType[];
  players?: Player[];
  dynamicBlocks?: ComponentType[];
  staticBlocks?: ComponentType[];
  tailwindTheme: string;
  fullScreenComponentPath?: string;
};
