import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";

import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
/** Persisted navigation behavior owned by the corresponding layout. */
export const sidebarState = {
  /**
   * Switches between the default app menu and command-only mode, or only
   * toggles the menu labels when the user turned command-only off for the hot key.
   */
  toggleSidebar() {
    const isCommandOnlyToggle =
      uiState.getState(UIState.completelyHideLeftNavBar, {
        scope: UIStateScope.PRODUCT
      }) ?? true;
    if (isCommandOnlyToggle) {
      const currentState = uiState.getState(UIState.isHideLeftNavBar);
      uiState.setState(UIState.isHideLeftNavBar, !currentState);
      return;
    }
    const labelsVal = uiState.getState(UIState.hideLeftNavMenuLabels, {
      scope: UIStateScope.DAP
    });
    uiState.setState(UIState.hideLeftNavMenuLabels, !labelsVal, {
      scope: UIStateScope.DAP
    });
  }
};
