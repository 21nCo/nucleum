import type { IAction } from "./action.type";

export type View = {
  height: number;
  width: number;
  landscapiness: number;
  isPortrait: boolean;
  scale: number;
  display: Display;
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
  currentComponent?: IAction;
  /**
   * @deprecated - use appStore.sheetPath
   */
  sheetPath?: string;
};

/**
 * Programmatically set the screen size - Refer tidigit.tailwind.cjs for more details
 */
export enum Display {
  /**
   * Mobile devices
   */
  MO = "mo",
  /**
   * Tablet in portrait, or vertical splits on laptop/desktop/tablet in landscape
   */
  TP = "tp",
  /**
   * Tablet in landscape, desktop and laptop
   */
  DP = "dp",
  /**
   * 2k : 2K monitors and above, TVs etc
   */
  TK = "2k",
  /**
   * Constrained width: handheld devices like phones, vertical narrow splits on desktop/laptop/tablet
   */
  CW = "cw",
  /**
   * Ultra wide
   */
  UW = "uw",
  CH = "ch",
  VM = "vm"
}
