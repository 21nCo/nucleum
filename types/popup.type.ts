export type ModalEvent = {
  path: string;
  isShow: boolean;
  isNonSheetModal?: boolean;
  id?: string;
  isDismissable?: boolean;
  // here we can write down the use of id field
};
