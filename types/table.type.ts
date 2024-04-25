import type {
  DropDownStyle,
  DropdownGroup,
  DropdownItem
} from "./dropdownItem.type";

export type TableColumn = {
  /**
   * Key using which cell value will be resolved.
   * For ActionColumm: icon to be used for the action - passed as key.
   */
  key: string;
  disabledCriteria?: (row: any) => boolean;
} & (
  | IconActionColumn
  | DropdownActionColumn
  | CustomColumn
  | (BaseColumn & {
      align?: "left" | "center" | "right";
      sortable?: boolean;
      filterable?: boolean;
      formatter?: (value: any) => any;
      type?: TableCellType;
    })
);

type BaseColumn = {
  label: string;
  width?: number;
};

export type DropdownActionColumn = BaseColumn & {
  type: TableCellType.DROPDOWN;
  options: DropdownItem[];
  groups?: DropdownGroup[];
  style?: DropDownStyle;
};

export type CustomColumn = BaseColumn & {
  type: TableCellType.CUSTOM;
  /**
   * The component to be rendered in the cell. Uses ComponentResolver to resolve the component. List the component in actionMap to resolve it.
   */
  component: string;
};

export type IconActionColumn = {
  type: TableCellType.ACTION;
  action: (row: any) => void;
};

export enum TableCellType {
  TEXT_INPUT = "TEXT_INPUT",
  DROPDOWN = "DROPDOWN",
  CHECKBOX = "CHECKBOX",
  DATE_PICKER = "DATE_PICKER",
  TOGGLE = "TOGGLE",
  ACTION = "ACTION",
  CUSTOM = "CUSTOM"
}
