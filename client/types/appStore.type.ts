import type { IAction } from "$lib/client/types/action.type";

export type AppStore = {
  product: string;
  env: string;
  appData: any;
  isDebugMode: boolean;
  isExperimentalMode: boolean;
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
