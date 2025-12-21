import { appStore } from "@21n/stores/app.store";
import { AppSearchParam } from "@21n/types/appStore.type";
import { GlobalEvent } from "@21n/types/event.enum";
import { dispatchCustomEvent } from "@21n/utils/browser.utils";
import { ResourcePanelType } from "@21n/components/resource/resourcePanel.type";

export const PanelSwitcherMixin = {
  switchPanel(this: unknown, panelValue?: string) {
    const state = this.get();
    let panel: string | undefined = state?.panel;
    let isInFocusMode: boolean = false;
    if (panelValue === "focus") {
      panel = ResourcePanelType.NONE;
      isInFocusMode = true;
    } else if (panelValue === panel) {
      panel = state.defaultPanel ?? ResourcePanelType.DEFAULT;
    } else {
      panel = panelValue ?? state.defaultPanel;
    }

    if (panel) {
      appStore.toggleSearchParamRecordSpecific(state.id, {
        [AppSearchParam.PANEL]: panel
      });
    }

    this.update((x: any) => ({
      ...x,
      panel,
      isInFocusMode
    }));

    if (
      !panel ||
      panel === ResourcePanelType.NONE ||
      panel === ResourcePanelType.DEFAULT
    ) {
      dispatchCustomEvent(GlobalEvent.EXPAND_PANEL, {});
    } else {
      dispatchCustomEvent(GlobalEvent.COLLAPSE_PANEL, {});
    }
  }
};
