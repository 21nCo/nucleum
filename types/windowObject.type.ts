import type { Action } from "./action.type";

export type WindowObject = {
  documentHeight: number;
  documentWidth: number;
  landscapiness: number;
  scale: number;
  isMinimalTopBar?: boolean;
  isInPortraitMode: boolean;
  firstLoad: number;
  currentPath: string;
  isHideMenu: boolean;
  currentComponent?: Action;
};
