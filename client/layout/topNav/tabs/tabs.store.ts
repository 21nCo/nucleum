import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
import { appStore } from "@21n/stores/app.store";
import { uiState } from "@21n/stores/uiState/uiState.store";
import { UIStateScope } from "@21n/stores/uiState/uiState.type";
import type { IRecordId } from "@21n/types/data.type";

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

    appStore.closeResource({ isRestrictToModals: true });
    const resource =
      typeof id === "string"
        ? id.split(":")[0]
        : typeof id === "object" && "tb" in id
          ? id.tb
          : undefined;
    const queryParams: Record<string, IRecordId | string> = {
      tab: id
    };
    if (resolvedBack !== undefined && resolvedBack !== null) {
      queryParams.back = resolvedBack;
    }
    appStore.gotoPath(`/${resource}/tab`, {
      queryParams
    });
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

export const tabs = new TabStore();
