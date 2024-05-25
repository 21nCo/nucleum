import type { Action } from "./action.type";

export type View = {
  height: number;
  width: number;
  landscapiness: number;
  isPortrait: boolean;
  scale: number;
  isMinimalTopBar?: boolean;
  firstLoad: number;
  /**
   * @deprecated - use appStore.currentPath
   */
  currentPath: string;
  /**
   * @deprecated - use appStore.isMenuHidden
   */
  isMenuHidden: boolean;
  /**
   * @deprecated - use appStore.currentComponent
   */
  currentComponent?: Action;
  /**
   * @deprecated - use appStore.sheetPath
   */
  sheetPath?: string;
};
