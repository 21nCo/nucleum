import { KeyValueStore } from "$lib/client/components/flux/resourceStores/kv.store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { logger } from "$lib/client/components/debug/logger.client";
import { get } from "svelte/store";
import { ResourceAccessPoint } from "../../components/flux/resourceStores/resource.type";
import { appStore } from "../app.store";
import { ObservableStore } from "../client.store";
import { Action } from "../../types/action.enum";
import { InteractionMode } from "../../components/settings/interactionMode/interactionMode.type";
import { UIState, type IUIStateStore } from "./uiState.type";
import context from "../context.store";
import { Embed } from "$lib/client/types/context.type";
import type { IRecordId } from "$lib/client/types/data.type";
import { toasts } from "../notification.store";

class UiStateStore extends KeyValueStore<IUIStateStore> {
  constructor() {
    super(Resource.uiState, {});
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

  addResourceToTabs(id: IRecordId) {
    const current = this.getState(ResourceAccessPoint.TABS, {
      isProductScoped: true
    });
    if (current?.includes(id.toString())) {
      toasts.error("Resource already present in top bar");
      return;
    }
    this.setState(
      ResourceAccessPoint.TABS,
      [...(current ?? []), id.toString()],
      {
        isProductScoped: true
      }
    );
  }

  removeResourceFromTabs(id: IRecordId) {
    const current = this.getState(ResourceAccessPoint.TABS, {
      isProductScoped: true
    });
    console.log({ at: "removeResourceFromTopBar", current, id });
    if (!current?.map((x) => x.toString()).includes(id.toString())) return;
    this.setState(
      ResourceAccessPoint.TABS,
      current.filter((x) => x.toString() != id.toString()),
      {
        isProductScoped: true
      }
    );
  }

  toggleSidebar() {
    const interactionMode = this.getState(Action.MODE_OF_INTERACTION, {
      isProductScoped: true
    });
    if (interactionMode === InteractionMode.KEYBOARD_CENTRIC) {
      const isCompletelyHideLeftNavBar = this.getState(
        UIState.COMPLETELY_HIDE_LEFT_NAV_BAR,
        {
          isProductScoped: true
        }
      );
      if (isCompletelyHideLeftNavBar) {
        const currentState = this.getState(UIState.isHideLeftNavBar);
        this.setState(UIState.isHideLeftNavBar, !currentState);
        return;
      }
    }
    const val = this.getState(UIState.isInThinMode);
    this.setState(UIState.isInThinMode, !val);
  }
}

export const uiState = new UiStateStore();

/**
 *
 * TODO - populate app store derived value for interaction mode on uiState restore from cloud
 */
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
    const embed = get(context).embed;
    this.update((x) => {
      return {
        ...x,
        isShowHotKeyHints:
          modeOfInteraction === InteractionMode.KEYBOARD_CENTRIC &&
          isShortcutHintsEnabled &&
          embed !== Embed.HANDSET
      };
    });
  }
}

export const uiStateDerived = new UIDerivedState();
