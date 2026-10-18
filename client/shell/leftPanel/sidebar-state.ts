import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";

import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
/** Persisted navigation behavior owned by the corresponding layout. */
export const sidebarState = {
  toggleSidebar() {
    const isCompletelyHideLeftNavBar = uiState.getState(
      UIState.completelyHideLeftNavBar,
      {
        scope: UIStateScope.PRODUCT
      }
    );
    if (isCompletelyHideLeftNavBar) {
      const currentState = uiState.getState(UIState.isHideLeftNavBar);
      uiState.setState(UIState.isHideLeftNavBar, !currentState);
      return;
    }
    const val = uiState.getState(UIState.isInThinMode);
    uiState.setState(UIState.isInThinMode, !val);
    const labelsVal = uiState.getState(UIState.hideLeftNavMenuLabels, {
      scope: UIStateScope.DAP
    });
    uiState.setState(UIState.hideLeftNavMenuLabels, !labelsVal, {
      scope: UIStateScope.DAP
    });
  }
};
