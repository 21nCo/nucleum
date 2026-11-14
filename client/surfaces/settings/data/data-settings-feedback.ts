import { toasts } from "@nucleum/shared-state/notifications/notification.store";
import { AlertType } from "@nucleum/shared-state/notifications/notification.type";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { escapeMarkdownText } from "@21n/ui/elements/markdown/markdown.utils";

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

const runningOperationIds = new Set<string>();

/**
 * Runs a data settings operation behind a progress toast and replaces it with
 * a success or failure toast. The operation returns false to end silently,
 * for example after it showed its own notice; a thrown error shows the
 * failure toast and is passed to `onError`. Toasts are keyed by `id`, so a
 * second call with the id of a running operation is ignored and returns false
 * instead of ending the first operation's progress toast early.
 */
export async function runWithStatusToast(
  id: string,
  messages: DataOperationMessages,
  operation: () => Promise<boolean | void>,
  onError?: (error: unknown) => void
): Promise<boolean> {
  if (runningOperationIds.has(id)) return false;
  runningOperationIds.add(id);
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
  } finally {
    runningOperationIds.delete(id);
  }
}

/**
 * Builds a toast message that names a file in bold. Toasts render Markdown as
 * HTML, so the file name is escaped to render literally.
 */
export function formatFileToastMessage(
  prefix: string,
  fileName: string,
  suffix = ""
): string {
  return `${prefix} **${escapeMarkdownText(fileName)}**${suffix}`;
}
