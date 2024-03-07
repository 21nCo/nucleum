import type { ItemType } from "./item.enum";
import type { ConfirmationNotification } from "./notification.type";
import type { ModalParams } from "./popup.type";

export type Action = {
  action: string;
  type?: ActionType;
  path?: string;
  link?: string;
  fn?: (params?: any) => Promise<any>;
  cmdBarPreCondition?: () => void;
  component?: any;
  label?: string;
  alternateLabel?: string;
  icon?: string;
  sections?: string[];
  pagePaint?: PaintType;
  thinModeBehavior?: ThinModeBehavior;
  contentType?: ContentType;
  associatedPlayer?: string;
  context?: string;
  params?: any;
  isMenuHidden?: boolean;
  isInactive?: boolean;
  modalParams?: ModalParams;
  confirmation?: ConfirmationNotification;
  cmdLabel?: string;
  loadingComponent?: any;
  searchActionParams?: {
    searchItemType: ItemType;
    itemLabel: string;
    callback: (id: string, label?: string) => void;
  };
};

export enum ActionType {
  PAGE = "PAGE",
  LINK = "LINK",
  MODAL = "MODAL",
  INLINE = "INLINE",
  FUNCTION = "FUNCTION",
  META = "META",
  META_MODAL = "META_MODAL",
  CONFIRMATION = "CONFIRMATION_MODAL",
  META_PAGE = "META_PAGE",
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
  GATHERYDOC
}
