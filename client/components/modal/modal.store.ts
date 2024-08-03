import { appStore } from "$lib/client/stores/app.store";
import { logger } from "$lib/client/stores/log.store";
import { confirmationNotification } from "$lib/client/stores/notification.store";
import type { ModalEvent } from "$lib/client/types/popup.type";
import { get, writable } from "svelte/store";

const defaultModal = {
  path: "",
  id: "",
  isShow: false
};
const modalEvent = initModalStore(defaultModal);
export const isPrimaryActionDisabled = writable<boolean>(false);
function initModalStore(seed: ModalEvent) {
  const { subscribe, set, update } = writable<ModalEvent>(seed);
  return {
    subscribe,
    set: (m: ModalEvent) => {
      set(m);
    },
    reset: () => {
      update((n: ModalEvent) => {
        return defaultModal;
      });
    },
    hide: async () => {
      logger.log({ method: "modalEvent.hide" });
      const modal = get(modalEvent);
      if (modal.isDismissable === false) return false;
      update((n: ModalEvent) => {
        // console.log("hiding modal", { n });
        return { ...n, isShow: false };
      });
      confirmationNotification.reset();
      appStore.showAssociatedPlayerIfRequired();
      return true;
    },
    hideSpecific: (action: string, context: string = "") => {
      logger.log({ method: "modalEvent.hideSpecific", action, context });
      update((n: ModalEvent) => {
        return { path: action, isShow: false };
      });
    },
    notify: (event: ModalEvent) => {
      update((n: ModalEvent) => {
        return { ...event };
      });
    }
  };
}

export default modalEvent;
