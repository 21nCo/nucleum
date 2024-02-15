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
 *
 * path: path to the resource to be shown in the modal which is used by componentResolver
 * isDismissable: if true, the modal can be dismissed by clicking outside of the modal
 * title: title of the modal
 * isHideTitleIfEmpty: if true, the title will be hidden if it is empty
 * componentParams: parameters to be passed to the component
 */
export type ModalParams = {
  path: string;
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
