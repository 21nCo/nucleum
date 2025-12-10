import {
  ResourceAccessMode,
  ResourceAccessPoint
} from "@21n/components/flux/resourceStores/resource.type";
import {
  isRecordId,
  resourceInList
} from "@21n/components/flux/resourceStores/resource.utils";
import { appStore } from "@21n/stores/app.store";
import { uiState } from "@21n/stores/uiState/uiState.store";
import { UIStateScope } from "@21n/stores/uiState/uiState.type";
import type { HorizontalTrail, VerticalTrail } from "./tabs.type";
import type { IRecordId } from "@21n/types/data.type";
import { Action } from "@21n/types/action.enum";
import { get, writable } from "svelte/store";
import { AppSearchParam } from "@21n/types/appStore.type";

class TabStore {
  open(id: IRecordId, backParam?: string) {
    if (!id) return;
    uiState.addResourceToTabs(id);
    this.activate(id, backParam);
  }

  replace(id: IRecordId, replaceId: IRecordId) {
    if (!id || !replaceId) return;
    const tabs = this.get();
    if (tabs?.some(resourceInList(replaceId))) {
      this.remove(replaceId);
      uiState.addResourceToTabs(id);
    }
    this.activate(id);
  }

  addInBackground(id: IRecordId) {
    if (!id) return;
    uiState.addResourceToTabs(id);
  }

  activate(id: IRecordId, backParam?: string) {
    if (!id) return;
    const currentParams = new URLSearchParams(window.location.search);
    const tabParam = currentParams.get("tab");
    if (tabParam === id) return;

    const existingBack = currentParams.get("back");
    const resolvedBack = tabParam
      ? (existingBack ?? undefined)
      : (backParam ?? window.location.pathname);
    const returnToParam = currentParams.get("returnTo");

    appStore.closeResource({ isRestrictToModals: true });
    const resource =
      typeof id === "string"
        ? id.split(":")[0]
        : typeof id === "object" && "tb" in id
          ? id.tb
          : undefined;
    const queryParams: Record<string, IRecordId | string> = {
      // tab: id
    };
    if (resolvedBack !== undefined && resolvedBack !== null) {
      queryParams.back = resolvedBack;
    }
    if (returnToParam) {
      queryParams.returnTo = returnToParam;
    }
    appStore.openResource(id, ResourceAccessMode.POP, {
      searchParams: { ...queryParams }
    });
    // appStore.gotoPath(`/${resource}/tab`, {
    //   queryParams
    // });
  }

  remove(id: IRecordId) {
    uiState.removeResourceFromTabs(id);
  }

  get() {
    return uiState.getState(ResourceAccessPoint.TABS, {
      scope: UIStateScope.PRODUCT
    });
  }

  rearrange(ids: IRecordId[]) {
    return uiState.setState(ResourceAccessPoint.TABS, ids, {
      scope: UIStateScope.PRODUCT
    });
  }
}

function createHorizontalTrailStore() {
  const { subscribe, update, set } = writable<HorizontalTrail>({
    path: [],
    activated: undefined
  });
  return {
    subscribe,
    update,

    /**
     * Pipe is used for supporting split within a trail item
     * @param base
     * @param id
     */
    add(base: Action, id: IRecordId) {
      update((trail) => {
        if (
          trail.path.length > 0 &&
          (trail.path[0] === base || trail.path[0].startsWith(`${base}|`))
        ) {
          return {
            ...trail,
            path: [...trail.path, id],
            activated: id
          };
        } else {
          const isBaseNonRecord = !isRecordId(base);
          return {
            ...trail,
            path: [base, id],
            activated: id,
            isBaseNonRecord
          };
        }
      });
    },

    remove(id: IRecordId) {
      update((trail) => ({
        path: trail.path.filter((t) => t !== id),
        activated: trail.activated === id ? undefined : trail.activated
      }));
    },

    clear() {
      set({
        path: [],
        activated: undefined
      });
    },

    activate(id: IRecordId | Action) {
      const current = get(hTrail);
      if (current.isBaseNonRecord && id === current.path[0]) {
        appStore.runAction(id);
        return;
      } else {
        appStore.toggleSearchParam([AppSearchParam.SEARCH]);
      }
      update((state) => {
        return {
          ...state,
          activated: id
        };
      });
    }
  };
}

export const hTrail = createHorizontalTrailStore();

function createVTrailStore() {
  const { subscribe, update, set } = writable<VerticalTrail>({
    items: []
  });
  return {
    subscribe,
    update,

    /**
     * Dash (-) is used for maintaining hierarchy, Pipe (|) is used for split
     * @param origin
     * @param id
     * @returns true if navigator needs to be opened
     */
    add(
      origin: Action | IRecordId,
      id: IRecordId,
      params?: {
        isPreventActivation?: boolean;
      }
    ): boolean {
      const state = get(vTrail);
      let newState = { ...state };
      if (state.items.length < 1) {
        console.log("init trail", origin);
        newState = {
          ...state,
          items: [id],
          base: origin,
          activated: params?.isPreventActivation ? undefined : id
        };
        update(() => newState);
        return true;
      }
      const existsInChain = state.items.some((x) => x.includes(id));
      if (existsInChain) {
        const item = state.items.find((x) => x.includes(id));
        newState = {
          ...state,
          activated: params?.isPreventActivation ? state.activated : item
        };
        update(() => newState);
        return false;
      }
      const newId =
        origin === state.base || !state.activated
          ? id
          : `${state.activated}-${id}`;
      const parentIndex = state.items.findIndex((x) => x === state.activated);
      const newItems = [
        ...state.items.slice(0, parentIndex + 1),
        newId,
        ...state.items.slice(parentIndex + 1)
      ];
      newState = {
        ...state,
        items: newItems,
        activated: params?.isPreventActivation ? state.activated : newId
      };
      update(() => newState);
      return false;
    },

    remove(id: IRecordId) {
      update((trail) => ({
        items: trail.items.filter((t) => t !== id),
        activated: trail.activated === id ? undefined : trail.activated
      }));
    },

    clear() {
      set({
        items: [],
        activated: undefined
      });
    },

    activate(id: IRecordId | Action) {
      const current = get(vTrail);
      if (!isRecordId(current.base) && id === current.base) {
        appStore.runAction(id);
        return;
      } else {
        const parts = id.split("-");
        const recordId = parts[parts.length - 1];
        appStore.openResource(recordId, ResourceAccessMode.POP, {
          origin: current.base
        });
      }
      update((state) => {
        return {
          ...state,
          activated: id
        };
      });
    }
  };
}

export const vTrail = createVTrailStore();

export const tabs = new TabStore();
