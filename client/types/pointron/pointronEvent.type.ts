import type { PointronEventEnum } from "./pointronEvent.enum";

export type PointronEvent = {
  event: PointronEventEnum;
  value?: boolean | string | PointerEvent | PopupEvent;
};

export type PopupEvent = {
  isShow: boolean;
  id: string;
};
