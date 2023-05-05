export type ComponentType = {
  path: string;
  component?: any;
  label?: string;
  icon?: string;
  sections?: string[];
  pagePaint?: PaintType;
  minPaintType?: PaintType;
  thingPagePaint?: ThinPaintType;
  type?: string;
};

export enum PaintType {
  YSTACK,
  XSTACK,
  YMENU,
  XMENU,
  PANEL_ON_LEFT,
  JUMP_TO_PARENT,
}

export enum ThinPaintType {
  JUMP_TO_PARENT,
  GRAND_CHILDREN_ON_MENU,
}
