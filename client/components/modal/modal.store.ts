import type { ModalEvent } from "$lib/client/types/popup.type";
import { writable } from "svelte/store";
import { logger } from "../debug/logger.client";

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
    hide: (action: string, context: string = "") => {
      logger.log({ at: "modalEvent.hide", action, context });
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
