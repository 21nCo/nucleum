import type { IButtonParams } from "@21n/ui/elements/button/button.type";
import type { Size } from "@21n/ui/elements/size.enum";

/** Describes the confirmation prompt attached to a configured action. */
export type ConfirmationNotification<TType = string> = {
  title: string;
  message: string;
  type?: TType;
  confirmAction?: IButtonParams;
  cancelAction?: IButtonParams;
  askInputConfirmation?: string;
  size?: Size;
};
