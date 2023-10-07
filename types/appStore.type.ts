import type { AppConstants } from "$lib/tidy/types/appConstants.type";
import type { ComponentType } from "$lib/tidy/types/component.type";

export type AppStore = {
  appConstants: AppConstants;
  appData: any;
  isDebugMode: boolean;
  environment: any;
  pageMenu?: string[];
  player?: string;
  //TACO - dynamic actions
  dynamicBlocks?: ComponentType[];
  tailwindTheme: string;
  fullScreenComponentPath?: string;
};
