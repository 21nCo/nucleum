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

/** Messages shown while a data settings operation runs and when it ends. */
export type DataOperationMessages = {
  progress: string;
  success: string;
  failure: string;
};

/**
 * Runs a data settings operation behind a progress toast and replaces it with
 * a success or failure toast. The operation returns false to end silently,
 * for example after it showed its own notice; a thrown error shows the
 * failure toast and is passed to `onError`.
 */
export async function runWithStatusToast(
  id: string,
  messages: DataOperationMessages,
  operation: () => Promise<boolean | void>,
  onError?: (error: unknown) => void
): Promise<boolean> {
  toasts.showProgress(id, messages.progress);
  try {
    const result = await operation();
    if (result === false) {
      toasts.closeProgress(id);
      return false;
    }
    toasts.success(messages.success, { closeProgressId: id });
    return true;
  } catch (error) {
    onError?.(error);
    toasts.error(messages.failure, { closeProgressId: id });
    return false;
  }
}
