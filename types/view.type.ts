import type { Action } from "./action.type";

export type View = {
  height: number;
  width: number;
  landscapiness: number;
  isPortrait: boolean;
  scale: number;
  isMinimalTopBar?: boolean;
  firstLoad: number;
  currentPath: string;
  isMenuHidden: boolean;
  currentComponent?: Action;
};
