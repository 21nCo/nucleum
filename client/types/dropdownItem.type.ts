import type { SelectItem } from "./select.type";
import type { FormLabelInfoTooltip } from "./text.type";

export type DropdownItem = SelectItem & {
  groupId?: string;
};

export type DropdownGroup = {
  id: string;
  label: string;
  order: number;
  info?: FormLabelInfoTooltip;
};

/**
 * @deprecated - Use InputStyle instead
 */
export enum DropDownStyle {
  DEFAULT,
  OUTLINED,
  /**
   * @deprecated - Use PanelSwitcher instead
   */
  PANEL_SWITCH
}
