export type DropdownItem = {
  label: string;
  value: string | number;
  icon?: string;
  disabled?: boolean;
};

export enum DropDownStyle {
  DEFAULT,
  OUTLINED,
  PANEL_SWITCH,
}
