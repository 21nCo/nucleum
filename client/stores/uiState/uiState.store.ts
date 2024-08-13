import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { logger } from "$lib/client/stores/log.store";
import { get } from "svelte/store";
import { ResourceAccessPoint } from "../../components/resourceStores/resource.type";
import { appStore } from "../app.store";
import { ObservableStore } from "../client.store";
import { Action } from "../../types/action.enum";
import { InteractionMode } from "../../components/settings/interactionMode/interactionMode.type";
import { UIState, type IUIStateStore } from "./uiState.type";
import context from "../context.store";

class UiStateStore extends KeyValueStore<IUIStateStore> {
  constructor() {
    super(
      Resource.uiState,
      {},
      {
        refreshOnAppear: true,
        isSynchronousCache: true
      }
    );
  }
  private resolveKey(
    keyParam: string,
    params?: {
      isProductScoped?: boolean;
      isDeviceScoped?: boolean;
    }
  ) {
    let key: string = keyParam;
    const product = get(appStore).product;
    const device = get(context).embed;
    if (params?.isProductScoped) {
      key = `${product}-${key}`;
    } else if (params?.isDeviceScoped) {
      key = `${device}-${key}`;
    } else if (params?.isProductScoped && params?.isDeviceScoped) {
      key = `${product}-${device}-${key}`;
    }
    return key;
  }

  setState(
    keyParam: Action | UIState | ResourceAccessPoint,
    value: any,
    params?: {
      isProductScoped?: boolean;
      isDeviceScoped?: boolean;
    }
  ) {
    const key = this.resolveKey(keyParam, params);
    this.modify({ [key]: value });
    logger.log({ context: "uiState.store - setState", key, value });
    uiStateDerived.refreshState();
  }

  getState(
    keyParam: Action | UIState | ResourceAccessPoint,
    params?: {
      isProductScoped?: boolean;
      isDeviceScoped?: boolean;
    }
  ) {
    const key = this.resolveKey(keyParam, params);
    return this.get()[key];
  }

  getResourceState(
    resource: Resource,
    location: ResourceAccessPoint,
    keyParam: UIState
  ) {
    const key = `${resource}-${location}-${keyParam}`;
    return this.get()[key];
  }

  setResourceState(
    resource: Resource,
    location: ResourceAccessPoint,
    keyParam: UIState,
    value: any
  ) {
    const key = `${resource}-${location}-${keyParam}`;
    this.modify({ [key]: value });
    logger.log({ context: "uiState.store - setResourceState", key, value });
  }

  addResourceToTopBar(id: string) {
    const current = this.getState(ResourceAccessPoint.TOP_BAR, {
      isProductScoped: true
    });
    if (current?.includes(id)) return;
    this.setState(ResourceAccessPoint.TOP_BAR, [...(current ?? []), id], {
      isProductScoped: true
    });
  }

  removeResourceFromTopBar(id: string) {
    const current = this.getState(ResourceAccessPoint.TOP_BAR, {
      isProductScoped: true
    });
    if (!current?.includes(id)) return;
    this.setState(
      ResourceAccessPoint.TOP_BAR,
      current.filter((x) => x != id),
      {
        isProductScoped: true
      }
    );
  }

  toggleSidebar() {
    const val = this.getState(UIState.isInThinMode);
    this.setState(UIState.isInThinMode, !val);
  }
}

export const uiState = new UiStateStore();

class UIDerivedState extends ObservableStore<{ isShowHotKeyHints: boolean }> {
  constructor() {
    super("derived-ui-state");
    this.set({ isShowHotKeyHints: false });
  }

  refreshState() {
    this.refreshShortcutHintsState();
  }

  refreshShortcutHintsState() {
    const modeOfInteraction = uiState.getState(Action.MODE_OF_INTERACTION, {
      isProductScoped: true
    });
    const isShortcutHintsEnabled = uiState.getState(
      UIState.SHOW_MORE_SHORTCUT_HINTS,
      {
        isProductScoped: true
      }
    );
    this.update((x) => {
      return {
        ...x,
        isShowHotKeyHints:
          modeOfInteraction === InteractionMode.KEYBOARD_CENTRIC &&
          isShortcutHintsEnabled
      };
    });
  }
}

export const uiStateDerived = new UIDerivedState();
