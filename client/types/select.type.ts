import type { IAvatar } from "@21n/types/avatar.type";

export type ISelectItem = {
  value: ISelectValue;
  label?: string;
  icon?: string | IAvatar;
  activeIcon?: string | IAvatar;
  activeLabel?: string;
  isDisabled?: boolean;
  badge?: string | number;
  tooltip?: string;
};

export enum OptionSelectorStyle {
  TRAIN,
  OUTLINE,
  CHECK_CIRCLE,
  ICON
}

export type IContextMenu = IContextMenuGroup[];

export type IContextMenuGroup = {
  group: string;
  items: IContextMenuItem[];
  isToggleGroup?: boolean;
};

export type IContextMenuItem = ISelectItem & {
  callback?: (props?: any) => Promise<void>;
  action?: string;
  type?: ContextMenuType;
  initialValue?: boolean;
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

export enum ContextMenuType {
  DEFAULT,
  SWITCH
}
