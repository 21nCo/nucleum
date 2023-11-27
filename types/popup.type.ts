export type ModalEvent = ModalParams & {
  isShow: boolean;
  isNonSheetModal?: boolean;
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
};
