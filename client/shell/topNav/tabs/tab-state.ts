import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";

import { UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";

import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { resourceInList, isSameResource } from "@nucleum/datafn/resource.utils";

import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
/** Persisted ids of the retired app tabs. */
export const tabState = {
  removeResourceFromTabs(id: IRecordId) {
    const current = uiState.getState(ResourceAccessPoint.TABS, {
      scope: UIStateScope.PRODUCT
    });
    if (!current?.some(resourceInList(id))) return;
    uiState.setState(
      ResourceAccessPoint.TABS,
      current.filter((x: IRecordId) => !isSameResource(x, id)),
      {
        scope: UIStateScope.PRODUCT
      }
    );
  }
};
