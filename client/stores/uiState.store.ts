import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { logger } from "$lib/client/stores/log.store";
import { get } from "svelte/store";
import { ResourceAccessPoint } from "../components/resourceStores/resource.type";
import { appStore } from "./app.store";
import { ObservableStore } from "./client.store";
import { Action } from "../types/action.enum";
import { InteractionMode } from "../components/settings/interactionMode/interactionMode.type";

type UIState = {
  [key: string]: any;
};

class UiStateStore extends KeyValueStore<UIState> {
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
  setState(key: string, value: any) {
    this.modify({ [key]: value });
    logger.log({ context: "uiState.store - setState", key, value });
  }
  getState(key: string) {
    return this.get()[key];
  }
  getResourceState(
    resource: Resource,
    location: ResourceAccessPoint,
    state: string
  ) {
    const key = `${resource}-${location}-${state}`;
    return this.get()[key];
  }
  setResourceState(
    resource: Resource,
    location: ResourceAccessPoint,
    state: string,
    value: any
  ) {
    const key = `${resource}-${location}-${state}`;
    this.modify({ [key]: value });
    logger.log({ context: "uiState.store - setResourceState", key, value });
  }
  getTopBarState() {
    const product = get(appStore).product;
    const key = `${product}-${ResourceAccessPoint.TOP_BAR}`;
    return this.get()[key];
  }
  addResourceToTopBar(id: string) {
    const product = get(appStore).product;
    const current = this.getTopBarState();
    if (current?.includes(id)) return;
    const key = `${product}-${ResourceAccessPoint.TOP_BAR}`;
    this.modify({ [key]: [...(this.get()[key] ?? []), id] });
  }
  removeResourceFromTopBar(id: string) {
    const product = get(appStore).product;
    const current = this.getTopBarState();
    if (!current?.includes(id)) return;
    const key = `${product}-${ResourceAccessPoint.TOP_BAR}`;
    this.modify({ [key]: current.filter((x) => x != id) });
  }
  getProductSpecificState(state: string) {
    const product = get(appStore).product;
    const key = `${product}-${state}`;
    return this.get()[key];
  }
  setProductSpecificState(key: string, value: string | number | boolean) {
    const product = get(appStore).product;
    const fullKey = `${product}-${key}`;
    this.modify({ [fullKey]: value });
    uiStateDerived.refreshState();
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
    const modeOfInteraction = uiState.getProductSpecificState(
      Action.MODE_OF_INTERACTION
    );
    const isShortcutHintsEnabled = uiState.getProductSpecificState(
      Action.SHOW_MORE_SHORTCUT_HINTS
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
