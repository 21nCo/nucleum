import type { AppConstants } from "$lib/tidy/types/appConstants.type";
import type { Action } from "$lib/tidy/types/action.type";

export type AppStore = {
  appConstants: AppConstants;
  appData: any;
  isDebugMode: boolean;
  launchContext: LaunchContext;
  embedContext?: EmbedContext;
  pageMenu?: string[];
  player?: string;
  //TACO - dynamic actions
  dynamicBlocks?: Action[];
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

export enum EmbedContext {
  DEFAULT,
  APP,
  SHEET,
}
