import type { IPlayer, ModalEvent } from "$lib/client/types/popup.type";
import { writable } from "svelte/store";
import { logger } from "../debug/logger.client";
import { ObservableStore } from "$lib/client/stores/client.store";
import { appStore } from "$lib/client/stores/app.store";
import { ResourceAccessMode } from "../flux/resourceStores/resource.type";
import { appEvents } from "$lib/client/stores/notification.store";
import { GlobalEvent } from "$lib/client/types/event.enum";

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
      appEvents.publish(GlobalEvent.NAV, { action, context });
    },
    notify: (event: ModalEvent) => {
      update((n: ModalEvent) => {
        return { ...event };
      });
    }
  };
}

export default modalEvent;

class PlayerStore extends ObservableStore<IPlayer> {
  constructor() {
    super("player");
    this.set({
      action: "",
      isMiniOn: false,
      isPipOn: false
    });
  }

  showMini(action: string, isOnlyIfNoPip: boolean = false) {
    const isPipOn = this.get().isPipOn;
    logger.log({ isPipOn, action, isOnlyIfNoPip });
    if (isOnlyIfNoPip && isPipOn) return;
    this.update((n: IPlayer) => {
      n.isMiniOn = true;
      n.action = action;
      return n;
    });
  }

  togglePip(path: string) {
    this.update((n: IPlayer) => {
      if (!n.isMiniOn) {
        n.isMiniOn = true;
        n.action = path;
      }
      n.isPipOn = !n.isPipOn;
      return n;
    });
  }

  reset() {
    this.set({
      action: "",
      isMiniOn: false,
      isPipOn: false
    });
  }
}

export const player = new PlayerStore();

class FullScreenStore extends ObservableStore<{ path?: string }> {
  constructor() {
    super("fullScreen");
    this.set({ path: undefined });
  }

  show(path: string) {
    logger.log({ at: "fullscreen.show", path });
    this.set({ path });
    // appStore.runAction(path);
    appStore.toggleSearchParam({
      [ResourceAccessMode.FULL]: path,
      [ResourceAccessMode.POP]: null
    });
  }

  /**
   * Hides the full screen modal and shows the mini player if required
   * @param isShowMiniIfNoPip - if true, the mini player will be shown
   */
  hide(isShowMiniIfNoPip: boolean = true) {
    let fullScreenAction = this.get().path;
    if (!fullScreenAction) return;
    if (fullScreenAction && isShowMiniIfNoPip) {
      let miniAction =
        appStore.resolveComponentFromPath(fullScreenAction)?.associatedPlayer;
      if (miniAction) {
        player.showMini(miniAction, true);
      }
    }
    this.set({ path: undefined });
    // modalEvent.hide(fullScreenAction ?? "", "app.store");
    appStore.toggleSearchParam([ResourceAccessMode.FULL]);
  }

  restore() {
    const fullSearchParam = new URLSearchParams(window.location.search).get(
      ResourceAccessMode.FULL
    );
    if (fullSearchParam) {
      this.show(fullSearchParam);
      return true;
    }
  }
}

export const fullScreen = new FullScreenStore();
