import type { Item } from "./item.enum";
import type { ConfirmationNotification } from "./notification.type";
import type { ModalParams } from "./popup.type";

export type IAction = {
  action: string;
  type: ActionType;
  isMeta?: boolean;
  path?: string;
  fn?: (params?: any) => Promise<any>;
  cmdBarPreCondition?: () => void;
  component?: any;
  label?: string;
  cmdLabel?: string | string[];
  icon?: string;
  /**
   * @deprecated
   */
  sections?: string[];
  /**
   * @deprecated
   */
  pagePaint?: PaintType;
  /**
   * @deprecated
   */
  thinModeBehavior?: ThinModeBehavior;
  contentType?: ContentType;
  associatedPlayer?: string;
  context?: string;
  params?: any;
  isMenuHidden?: boolean;
  isInactive?: boolean;
  modalParams?: ModalParams;
  confirmation?: ConfirmationNotification;
  loadingComponent?: any;
  searchActionParams?: {
    searchItemType: Item;
    itemLabel: string;
    callback: (id: string, label?: string) => void;
  };
};

export enum ActionType {
  PAGE = "PAGE",
  /**
   * Link action will open a link in a new tab if the context is web or
   * will open in app browser if the context is embed.
   */
  LINK = "LINK",
  /**
   * Modal action will open a modal.
   */
  MODAL = "MODAL",
  INLINE = "INLINE",
  /**
   * Function action will execute a function.
   */
  FUNCTION = "FUNCTION",
  CONFIRMATION = "CONFIRMATION_MODAL",
  SEARCH_CMD = "SEARCH_CMD"
}

export enum PaintType {
  YSTACK,
  XSTACK,
  YMENU,
  XMENU,
  PANEL_ON_LEFT,
  JUMP_TO_PARENT
}

export enum ThinModeBehavior {
  JUMP_TO_PARENT,
  GRAND_CHILDREN_ON_MENU,
  RIGHT_PANEL_AS_PLAYER,
  YSTACK,
  HIDE
}

export enum ContentType {
  BLOCK,
  SECTION,
  INLINE,
  BUTTON,
  TOGGLE,
  SPACE_DOC
}

export enum ResourceAccessMode {
  INLINE = "inline",
  SPLIT = "split",
  /**
   * Split in focus mode
   */
  FSPLIT = "fsplit",
  POP = "pop",
  FOCUS = "focus"
}
