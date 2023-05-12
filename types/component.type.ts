export type ComponentType = {
  path: string;
  component?: any;
  heading?: string;
  icon?: string;
  sections?: string[];
  pagePaint?: PaintType;
  thinModeBehavior?: ThinModeBehavior;
  type?: BlockType;
  associatedPlayer?: string;
  context?: string;
  action?: () => void;
  params?: any;
};

export enum PaintType {
  YSTACK,
  XSTACK,
  YMENU,
  XMENU,
  PANEL_ON_LEFT,
  JUMP_TO_PARENT,
}

export enum ThinModeBehavior {
  JUMP_TO_PARENT,
  GRAND_CHILDREN_ON_MENU,
  RIGHT_PANEL_AS_PLAYER,
  HIDE,
}

export enum BlockType {
  BLOCK,
  SECTION,
  INLINE,
  BUTTON,
  TOGGLE,
}
