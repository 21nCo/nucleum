import type { PointronAction } from "@21n/types/pointron/pointronAction.enum";

/**
 * @deprecated - use IEvent instead
 */
export type IPointronEvent = {
  event: PointronAction;
  value?: boolean | string | PointerEvent | PopupEvent;
};

export type PopupEvent = {
  isShow: boolean;
  id: string;
};
