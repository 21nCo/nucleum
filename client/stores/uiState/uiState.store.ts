import { KeyValueStore } from "@21n/components/flux/resourceStores/kv.store";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { logger } from "@21n/components/debug/logger.client";
import { get } from "svelte/store";
import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
import { appStore } from "@21n/stores/app.store";
import { ObservableStore } from "@21n/stores/client.store";
import { Action } from "@21n/types/action.enum";
import { InteractionMode } from "@21n/components/settings/interactionMode/interactionMode.type";
import {
  UIState,
  UIStateScope,
  type IUIStateParams,
  type IUIStateStore
} from "@21n/stores/uiState/uiState.type";
import context from "@21n/stores/context.store";
import { Embed } from "@21n/types/context.type";
import type { IRecordId } from "@21n/types/data.type";
import { toasts } from "@21n/stores/notification.store";
import {
  resourceInList,
  isSameResource
} from "@21n/components/flux/resourceStores/resource.utils";
import { parse, stringify } from "@21n/shared-utils/json.utils";
import { migrateLegacyNucleusProductKeys } from "@21n/stores/productKeyMigration.utils";

class UiStateStore extends KeyValueStore<IUIStateStore> {
  constructor() {
    super(Resource.uiState, {
      $local: {}
    });
  }

  loader(data: IUIStateStore) {
    if (!data || typeof data !== "object") return;
    super.loader(migrateLegacyNucleusProductKeys(data));
  }

  private resolveKey(keyParam: string, params?: IUIStateParams) {
    let key: string = keyParam;
    const product = get(appStore).product;
    const ctx = get(context);
    let prefix = "";
    if (params?.scope === UIStateScope.DEVICE) {
      prefix = `${product}-${ctx.embed}`;
    } else if (params?.scope === UIStateScope.PRODUCT) {
      prefix = product;
    }
    if (prefix) {
      key = `${prefix}-${key}`;
    }
    if (params?.subVariables) {
      params.subVariables.forEach((subVariable) => {
        key = `${key}_${subVariable}`;
      });
    }
    return key;
  }

  setState(
    keyParam: Action | UIState | ResourceAccessPoint,
    value: any,
    params?: IUIStateParams
  ) {
    const key = this.resolveKey(keyParam, params);
    if (params?.scope === UIStateScope.DAP) {
      try {
        if (typeof window !== "undefined") {
          const savedState = window.localStorage.getItem("uiState");
          const savedStateObj = savedState ? parse(savedState) : {};
          savedStateObj[key] = value;
          window.localStorage.setItem("uiState", stringify(savedStateObj));
          this.update((x) => {
            return {
              ...x,
              $local: {
                ...x.$local,
                [key]: value
              }
            };
          });
        }
      } catch (error) {
        logger.error({
          context: "uiState.store - setState",
          key,
          value,
          error
        });
      }
    } else {
      this.modify({ [key]: value });
      logger.log({ context: "uiState.store - setState", key, value });
    }
    uiStateDerived.refreshState();
  }

  getState(
    keyParam: Action | UIState | ResourceAccessPoint,
    params?: IUIStateParams
  ) {
    const key = this.resolveKey(keyParam, params);
    if (params?.scope === UIStateScope.DAP) {
      try {
        if (typeof window === "undefined") {
          return undefined;
        }
        const savedState = window.localStorage.getItem("uiState");
        if (!savedState) return undefined;
        const savedStateObj = parse(savedState);
        return savedStateObj[key] ?? undefined;
      } catch (error) {
        logger.error({ context: "uiState.store - getState", key, error });
        return undefined;
      }
    }
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
      scope: UIStateScope.PRODUCT
    });
    if (current?.includes(id.toString())) {
      toasts.error("Resource already present in top bar");
      return;
    }
    this.setState(
      ResourceAccessPoint.TABS,
      [...(current ?? []), id.toString()],
      {
        scope: UIStateScope.PRODUCT
      }
    );
  }

  removeResourceFromTabs(id: IRecordId) {
    const current = this.getState(ResourceAccessPoint.TABS, {
      scope: UIStateScope.PRODUCT
    });
    if (!current?.some(resourceInList(id))) return;
    this.setState(
      ResourceAccessPoint.TABS,
      current.filter((x: IRecordId) => !isSameResource(x, id)),
      {
        scope: UIStateScope.PRODUCT
      }
    );
  }

  toggleSidebar() {
    const isCompletelyHideLeftNavBar = this.getState(
      UIState.completelyHideLeftNavBar,
      {
        scope: UIStateScope.PRODUCT
      }
    );
    if (isCompletelyHideLeftNavBar) {
      const currentState = this.getState(UIState.isHideLeftNavBar);
      this.setState(UIState.isHideLeftNavBar, !currentState);
      return;
    }
    const val = this.getState(UIState.isInThinMode);
    this.setState(UIState.isInThinMode, !val);
    const labelsVal = this.getState(UIState.hideLeftNavMenuLabels, {
      scope: UIStateScope.DAP
    });
    this.setState(UIState.hideLeftNavMenuLabels, !labelsVal, {
      scope: UIStateScope.DAP
    });
  }
}

export const uiState = UiStateStore.resolve(Resource.uiState);

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
    const isShortcutHintsDisabled = uiState.getState(
      UIState.hideShortcutHints,
      {
        scope: UIStateScope.DEVICE
      }
    );
    const embed = get(context).embed;
    this.update((x) => {
      return {
        ...x,
        isShowHotKeyHints: !isShortcutHintsDisabled && embed !== Embed.HANDSET
      };
    });
  }
}

export const uiStateDerived = new UIDerivedState();
