import type { ButtonParams } from "./button.type";
import type { Orientation } from "./direction.enum";
import type { Size } from "./size.enum";

export type ModalEvent = ModalParams & {
  isShow: boolean;
  isShowAsSheet?: boolean;
  layoutParams?: ModalLayoutParams;
};
/**
 * @description
 * id: unique id for the resource to be shown in the modal
 * that can be used for any mutations on the resource
 *
 * path: path to the resource to be shown in the modal which is used by componentResolver
 */
export type ModalParams = {
  path: string;
  id?: string;
  isDismissable?: boolean;
  title?: string;
  isHideTitleIfEmpty?: boolean;
  componentParams?: any;
};

export type ModalLayoutParams = {
  size?: Size;
  orientation?: Orientation;
  primaryAction?: ButtonParams;
  secondaryAction?: ButtonParams;
  ignoreSafeArea?: boolean;
};
