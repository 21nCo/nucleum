import type { Action } from "$lib/tidy/types/action.type";

export type AppStore = {
  product: string;
  env: string;
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
  DEFAULT = "DEFAULT",
  EMBED = "EMBED",
  PREVIEW = "PREVIEW",
  DEV = "DEV"
}

export enum EmbedContext {
  NONE,
  APP,
  SHEET
}
