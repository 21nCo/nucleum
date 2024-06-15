import type { IAvatar } from "./avatar.type";

export type ISelectItem = {
  value: ISelectValue;
  label?: string;
  icon?: string | IAvatar;
  isDisabled?: boolean;
};

export enum OptionSelectorStyle {
  TRAIN,
  OUTLINE,
  CHECK_CIRCLE
}

export type IContextMenuItem = ISelectItem & {
  callback: () => void;
};

export type ISelectValue = string | number | boolean;
