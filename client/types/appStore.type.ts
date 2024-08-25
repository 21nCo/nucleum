import type { IAction } from "$lib/client/types/action.type";

export type AppStore = {
  product: string;
  env: string;
  appData: any;
  isDebugMode: boolean;
  isExperimentalMode: boolean;
  pageMenu?: string[];
  /**
   * @deprecated - use player store instead
   */
  player?: string;
  //TACO - dynamic actions
  dynamicBlocks?: IAction[];
  /**
   * @deprecated - use player store instead
   */
  fullScreenComponentPath?: string;
  /**
   * @deprecated - use player store instead
   */
  isPipOn?: boolean;
  currentPath: string;
  isMenuHidden?: boolean;
  currentComponent?: IAction;
  sheetPath?: string;
  actions: IAction[];
};
