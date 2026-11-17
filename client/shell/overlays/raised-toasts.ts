import { derived, writable } from "svelte/store";
import view from "@21n/ui/environment/view.store";
import {
  confirmationNotification,
  toasts
} from "@nucleum/shared-state/notifications/notification.store";

/**
 * Number of modals the modal layer shows. The modal layer updates it together
 * with its own list, so the toast host hand-off never waits for a render.
 */
export const modalLayerOpenCount = writable(0);

/**
 * True while toasts render in the modal layer above an open modal. The modal
 * layer and the top bar both read it, so exactly one toast host is mounted.
 */
export const isToastRaisedAboveModal = derived(
  [toasts, confirmationNotification, view, modalLayerOpenCount],
  ([$toasts, $confirmation, $view, $openModalCount]) =>
    shouldRaiseToasts({
      toastCount: $toasts.length,
      openModalCount: $openModalCount,
      hasConfirmation: Boolean($confirmation),
      isPortrait: $view.isPortrait
    })
);

/**
 * Element id of the raised toast host. A right-side drawer keeps it live when
 * it makes the app behind it inert, so the toasts stay usable over the drawer.
 */
export const RAISED_TOASTS_ID = "raised-toasts";

/**
 * Decides whether toasts must move above the modal overlay: only in landscape
 * layouts, where toasts live in the top bar that an open modal covers.
 */
export function shouldRaiseToasts({
  toastCount,
  openModalCount,
  hasConfirmation,
  isPortrait
}: {
  toastCount: number;
  openModalCount: number;
  hasConfirmation: boolean;
  isPortrait: boolean;
}): boolean {
  if (isPortrait || toastCount === 0) return false;
  return openModalCount > 0 || hasConfirmation;
}
