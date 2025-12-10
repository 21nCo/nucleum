import type { IContainer } from "@21n/layout/layout.type";
import type { IAction } from "@21n/types/action.type";

export type IViewStore = IContainer & {
  scale: number;
  display: Display;
  isMinimalTopBar?: boolean;
  firstLoad: number;
  /**
   * Used in cases like not rendering resources with cantilever buttons on small screens and other places throughout the app to check if the screen width is constrained. This is a proxy for Display.CW or Display.MO
   */
  isConstrainedWidth: boolean;
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
   * Tablet in landscape, laptops
   */
  LP = "lp",
  /**
   * Desktop and larger laptops
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
