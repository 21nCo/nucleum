import type { Avatar } from "./avatar.type";

export type SelectItem = {
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
