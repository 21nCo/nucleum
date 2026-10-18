import { get } from "svelte/store";

import context from "@nucleum/client/runtime/context.store";

import { logger } from "@nucleum/client/runtime/logging/logger";

/** Registers the browser service worker outside native embeds. */
export function initializeServiceWorker() {
  if (typeof window === "undefined" || get(context).isEmbed) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    logger.debug({
      at: "BaseLayer.sw.register",
      message: "Service workers not supported"
    });
    return;
  }

  navigator.serviceWorker
    .register("/worker.js")
    .then((registration) => {
      logger.debug({
        at: "BaseLayer.sw.register",
        message: "Service worker registered",
        registration
      });
    })
    .catch((error) => {
      logger.error({
        at: "BaseLayer.sw.register",
        error,
        message: "Service worker registration failed"
      });
      if (error.name === "NetworkError") {
        logger.error({
          at: "BaseLayer.sw.register",
          message:
            "Network error during SW registration - offline features may be limited"
        });
      }
    });
}
