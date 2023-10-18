import type { AppConstants } from "$lib/tidy/types/appConstants.type";
import type { ComponentType } from "$lib/tidy/types/component.type";

export type AppStore = {
  appConstants: AppConstants;
  appData: any;
  isDebugMode: boolean;
  launchContext: LaunchContext;
  pageMenu?: string[];
  player?: string;
  //TACO - dynamic actions
  dynamicBlocks?: ComponentType[];
  tailwindTheme: string;
  fullScreenComponentPath?: string;
  debugLogs?: DebugLog[];
};

export type DebugLog = {
  message: string;
  type: "error" | "info" | "warn";
  timestamp: string;
};

export enum LaunchContext {
  DEFAULT,
  EMBED,
  PREVIEW,
  DEV,
}
