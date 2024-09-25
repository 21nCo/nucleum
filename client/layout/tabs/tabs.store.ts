import { appStore } from "$lib/client/stores/app.store";
import { uiState } from "$lib/client/stores/uiState/uiState.store";
import type { IRecordId } from "$lib/client/types/data.type";

class TabStore {
  open(id: IRecordId) {
    if (!id) return;
    uiState.addResourceToTabs(id);
    this.activate(id);
  }

  activate(id: IRecordId) {
    appStore.closeResource({ isRestrictToModals: true });
    const resource = typeof id === "string" ? id.split(":")[0] : id.tb;
    appStore.gotoPath(`/${resource}/tab`, {
      queryParams: {
        tab: id
      }
    });
  }

  remove(id: IRecordId) {
    uiState.removeResourceFromTabs(id);
  }
}

export const tabs = new TabStore();
