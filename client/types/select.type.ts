import type { IAvatar } from "./avatar.type";

export type ISelectItem = {
  value: ISelectValue;
  label?: string;
  icon?: string | IAvatar;
  isDisabled?: boolean;
  badge?: string;
};

export enum OptionSelectorStyle {
  TRAIN,
  OUTLINE,
  CHECK_CIRCLE
}

export type IContextMenu = { group: string; items: IContextMenuItem[] }[];

export type IContextMenuItem = ISelectItem & {
  callback?: (props?: any) => Promise<void>;
  action?: string;
  secondStepComponent?: {
    component: any;
    props?: any;
  };
};

export type ISelectValue = string | number | boolean;

export type IResourceSwitchItem = ISelectItem & {
  isHidePinAction?: boolean;
  isPinned?: boolean;
};
