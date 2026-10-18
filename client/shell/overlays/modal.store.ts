import type { IPlayer, ModalEvent } from "@21n/ui/elements/modal/popup.type";
import { writable } from "svelte/store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { ObservableStore } from "@nucleum/datafn/observable-store";
import { AccessMode } from "@nucleum/datafn/resource.type";

/** Shell operations required by reusable overlay state. */
export interface OverlayHost {
  onDismiss(action: string): void;
  openFullscreen(path: string): void;
  closeFullscreen(): void;
  resolvePlayer(path: string): string | undefined;
}

let overlayHost: OverlayHost | undefined;

/** Supplies shell navigation for overlays; overlay state still updates before a shell is configured. */
export function configureOverlayHost(host: OverlayHost) {
  overlayHost = host;
}

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
      overlayHost?.onDismiss(action);
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
    overlayHost?.openFullscreen(path);
  }

  /**
   * Hides the full screen modal and shows the mini player if required
   * @param isShowMiniIfNoPip - if true, the mini player will be shown
   */
  hide(isShowMiniIfNoPip: boolean = true) {
    let fullScreenAction = this.get().path;
    if (!fullScreenAction) return;
    if (fullScreenAction && isShowMiniIfNoPip) {
      let miniAction = overlayHost?.resolvePlayer(fullScreenAction);
      if (miniAction) {
        player.showMini(miniAction, true);
      }
    }
    this.set({ path: undefined });
    overlayHost?.closeFullscreen();
  }

  restore() {
    const fullSearchParam = new URLSearchParams(window.location.search).get(
      AccessMode.FULL
    );
    if (fullSearchParam) {
      this.show(fullSearchParam);
      return true;
    }
  }
}

export const fullScreen = new FullScreenStore();
