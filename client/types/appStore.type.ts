import type { IAction } from "$lib/client/types/action.type";

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
  dynamicBlocks?: IAction[];
  fullScreenComponentPath?: string;
  isPipOn?: boolean;
  currentPath: string;
  isMenuHidden?: boolean;
  currentComponent?: IAction;
  sheetPath?: string;
  actions: IAction[];
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
