import type { FormLabelInfoTooltip } from "./text.type";

export type DropdownItem = {
  label: string;
  value: string | number;
  icon?: string;
  disabled?: boolean;
  groupId?: string;
};

export type DropdownGroup = {
  id: string;
  label: string;
  order: number;
  info?: FormLabelInfoTooltip;
};

export enum DropDownStyle {
  DEFAULT,
  OUTLINED,
  PANEL_SWITCH
}
