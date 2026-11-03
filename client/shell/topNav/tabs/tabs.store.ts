import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
import { tabState } from "@nucleum/shell/topNav/tabs/tab-state";
import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
import { UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";

/** Stored ids of the retired app tabs, read by the Pinned space migration. */
class TabStore {
  remove(id: IRecordId) {
    tabState.removeResourceFromTabs(id);
  }

  get() {
    return uiState.getState(ResourceAccessPoint.TABS, {
      scope: UIStateScope.PRODUCT
    });
  }

  /** Reads the stored tab ids, without waiting for the live UI state to load. */
  async read(): Promise<IRecordId[]> {
    const ids = await uiState.readState(ResourceAccessPoint.TABS, {
      scope: UIStateScope.PRODUCT
    });
    return Array.isArray(ids) ? ids : [];
  }

  rearrange(ids: IRecordId[]) {
    return uiState.setState(ResourceAccessPoint.TABS, ids, {
      scope: UIStateScope.PRODUCT
    });
  }
}

export const tabs = new TabStore();
