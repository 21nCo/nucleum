import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
import { subscription } from "@nucleum/surfaces/subscription/subscription";

import { toasts } from "@nucleum/shared-state/notifications/notification.store";

import { Action } from "@nucleum/client/config/action.enum";

import { ErrorMessage } from "@nucleum/shared-state/notifications/error.enum";
import modalEvent from "@nucleum/shell/overlays/modal.store";

/** Handles native purchase outcomes; the application supplies loading presentation callbacks. */
export async function handleNativePurchase(
  parsed: { type?: string; nonce?: any; embedTransaction?: any },
  loading: { verifying: () => void; finished: () => void }
): Promise<boolean> {
  if (parsed.type === "PURCHASE_SUCCESS") {
    loading.verifying();
    const response = await subscription.verifyPayment(
      parsed.nonce,
      parsed.embedTransaction
    );
    loading.finished();
    modalEvent.hide(Action.USER_PLAN);
    if (response?.status === "success")
      requireCommandHost().runAction(Action.PLAN_ONBOARDING);
    else toasts.error(ErrorMessage.DEFAULT);
  } else if (parsed.type === "PURCHASE_ERROR") {
    loading.finished();
    modalEvent.hide(Action.USER_PLAN);
    toasts.error(ErrorMessage.DEFAULT);
  } else if (parsed.type === "RESTORE_PURCHASE_SUCCESS") {
    await subscription.modifySubscription({
      type: "sync",
      embedTransaction: parsed.embedTransaction
    });
  } else return false;
  return true;
}
