import type { ComponentType } from "./component.type";

export type WindowObject = {
  documentHeight: number;
  documentWidth: number;
  landscapiness: number;
  scale: number;
  isMinimalTopBar?: boolean;
  isInPortraitMode: boolean;
  isHideMenu: boolean;
  firstLoad: number;
  currentPath: string;
  currentComponent?: ComponentType;
};
