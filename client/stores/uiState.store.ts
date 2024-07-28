import { KeyValueStore } from "$lib/client/components/resourceStores/kv.store";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { logger } from "$lib/client/stores/log.store";
import { get } from "svelte/store";
import {
  ResourceAccessPoint,
  ResourceActionType
} from "../components/resourceStores/resource.type";
import { appStore } from "./app.store";

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
}

export const uiState = new UiStateStore();
