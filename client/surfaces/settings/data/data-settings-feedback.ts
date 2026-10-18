import { toasts } from "@nucleum/shared-state/notifications/notification.store";
import { AlertType } from "@nucleum/shared-state/notifications/notification.type";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";

/** Shows an informational notice for data settings operations. */
export function showInfoToast(message: string) {
  toasts.trigger({
    id: generateSimpleRandomId(),
    message,
    type: AlertType.INFO
  });
}
