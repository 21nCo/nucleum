import type { AppConstants } from "$lib/tidy/types/appConstants.type";
import type { Action } from "$lib/tidy/types/action.type";

export type AppStore = {
  appConstants: AppConstants;
  appData: any;
  isDebugMode: boolean;
  isExperimentalMode: boolean;
  isDebugEmbedMode: boolean;
  launchContext: LaunchContext;
  embedContext?: EmbedContext;
  pageMenu?: string[];
  player?: string;
  //TACO - dynamic actions
  dynamicBlocks?: Action[];
  fullScreenComponentPath?: string;
  debugLogs?: DebugLog[];
  isPipOn?: boolean;
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
  NONE,
  APP,
  SHEET,
}
