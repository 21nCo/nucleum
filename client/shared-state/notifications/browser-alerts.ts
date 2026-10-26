import { get } from "svelte/store";

import context from "@nucleum/client/runtime/context.store";
import { toasts } from "@nucleum/shared-state/notifications/notification.store";

import { logger } from "@nucleum/client/runtime/logging/logger";
import { AlertType } from "@nucleum/shared-state/notifications/notification.type";

/** Presents browser transport alerts while retaining native network-error suppression. */
export function handleCustomAlert(event: any) {
  try {
    if (event.detail) {
      logger.info({ at: "handleCustomAlert", detail: event.detail });
    }
    if (event.detail?.error === "networkerror") {
      if (
        get(context).isEmbed &&
        event.detail.message?.toLowerCase()?.includes("load failed")
      ) {
        return;
      }
      toasts.trigger({
        title: "Network Error",
        message: event.detail.message ?? "Something went wrong.",
        type: AlertType.ERROR,
        id: "networkerror",
        isNonDismissable: true
      });
    }
  } catch (e) {
    logger.error({ at: "handleCustomAlert", error: e });
  }
}
