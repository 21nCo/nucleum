import type {
  ISelectItem,
  ISelectValue
} from "@21n/ui/elements/select/select.type";

export type IContextMenu = IContextMenuGroup[];

export type IContextMenuGroup = {
  group: string;
  items: IContextMenuItem[];
  isToggleGroup?: boolean;
  /** Renders the group as one setting with mutually exclusive options. */
  option?: IContextMenuOptionGroup;
};

/**
 * A setting in a context menu with one active option, such as a view. It
 * shows as a segmented switcher, a radio list or a submenu depending on how
 * many options it has and how long their labels are.
 */
export type IContextMenuOptionGroup = {
  label: string;
  options: ISelectItem[];
  value: ISelectValue | undefined;
  onChange: (value: ISelectValue) => void;
};

export type IContextMenuItem = ISelectItem & {
  callback?: (props?: any) => Promise<void>;
  /** Single key that runs this item from the page, shown as a hint. */
  hotKey?: string;
  action?: string;
  type?: ContextMenuType;
  initialValue?: boolean;
  secondStepComponent?: {
    component: any;
    props?: any;
    /**
     * Whether opening the submenu from the keyboard (Enter, Space or Right
     * arrow) moves focus into it, so its items take Up, Down and Escape;
     * Escape then returns focus to the item.
     */
    isFocusedOnKeyboardOpen?: boolean;
  };
};

export enum ContextMenuType {
  DEFAULT,
  SWITCH
}
