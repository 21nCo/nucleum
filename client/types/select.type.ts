import type { Avatar } from "./avatar.type";

export type ISelectItem = {
  value: string;
  label?: string;
  icon?: string | Avatar;
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
