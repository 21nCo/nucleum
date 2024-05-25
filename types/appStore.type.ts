import type { Action } from "$lib/tidy/types/action.type";

export type AppStore = {
  product: string;
  env: string;
  appData: any;
  isDebugMode: boolean;
  isExperimentalMode: boolean;
  /**
   * @deprecated
   * Use context.store instead
   */
  launchContext: LaunchContext;
  /**
   * @deprecated
   * Use context.store instead
   */
  embedContext?: EmbedContext;
  pageMenu?: string[];
  player?: string;
  //TACO - dynamic actions
  dynamicBlocks?: Action[];
  fullScreenComponentPath?: string;
  isPipOn?: boolean;
  currentPath: string;
  isMenuHidden?: boolean;
  currentComponent?: Action;
  sheetPath?: string;
  actions: Action[];
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
