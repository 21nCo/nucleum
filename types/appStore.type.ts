import type { Action } from "$lib/tidy/types/action.type";

export type AppStore = {
  product: string;
  env: string;
  appData: any;
  isDebugMode: boolean;
  isExperimentalMode: boolean;
  /**
   * !Deprecated
   * Use context.store instead
   */
  launchContext: LaunchContext;
  /**
   * !Deprecated
   * Use context.store instead
   */
  embedContext?: EmbedContext;
  pageMenu?: string[];
  player?: string;
  //TACO - dynamic actions
  dynamicBlocks?: Action[];
  fullScreenComponentPath?: string;
  isPipOn?: boolean;
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
