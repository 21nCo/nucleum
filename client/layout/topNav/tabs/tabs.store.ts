import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
import { appStore } from "$lib/client/stores/app.store";
import { uiState } from "$lib/client/stores/uiState/uiState.store";
import { UIStateScope } from "$lib/client/stores/uiState/uiState.type";
import type { IRecordId } from "$lib/client/types/data.type";

class TabStore {
  open(id: IRecordId) {
    if (!id) return;
    uiState.addResourceToTabs(id);
    this.activate(id);
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

  activate(id: IRecordId) {
    appStore.closeResource({ isRestrictToModals: true });
    const resource =
      typeof id === "string"
        ? id.split(":")[0]
        : typeof id === "object" && "tb" in id
          ? id.tb
          : undefined;
    appStore.gotoPath(`/${resource}/tab`, {
      queryParams: {
        tab: id,
        back: window.location.pathname
      }
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
