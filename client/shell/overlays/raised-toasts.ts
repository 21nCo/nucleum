import { writable } from "svelte/store";

/**
 * True while toasts render in the modal layer above an open modal, so the top
 * bar hides its own toast host and announcements are not duplicated.
 */
export const isToastRaisedAboveModal = writable(false);

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
