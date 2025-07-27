import type { IButtonParams } from "./button.type";
import type { Orientation } from "./direction.enum";
import type { Size } from "./size.enum";

export type ModalEvent = ModalParams & {
  path: string;
  isShow: boolean;
};
/**
 * @description
 *
 * ModalParams is a type that defines the parameters for a modal
 * isDismissable: if true, the modal can be dismissed by clicking outside of the modal
 * title: title of the modal
 *
 */
export type ModalParams = {
  isShowAsSheet?: boolean;
  isDismissable?: boolean;
  isShowOverlay?: boolean;
  title?: string;
  componentParams?: any;
  layout?: ModalLayoutParams;
  isOnRight?: boolean;
};

export type ModalLayoutParams = {
  size?: Size;
  isDynamicSize?: boolean;
  orientation?: Orientation;
  primaryAction?: IButtonParams;
  secondaryAction?: IButtonParams;
  ignoreSafeArea?: boolean;
  isShowClose?: boolean;
  isShowCantileverClose?: boolean;
  isShowBackButton?: boolean;
};

export type IPlayer = {
  action?: string;
  isMiniOn: boolean;
  isPipOn: boolean;
};
