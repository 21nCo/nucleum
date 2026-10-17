import { requireResourcePanelHost } from "./resource-panel-host";
import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
import { dispatchCustomEvent } from "@21n/shared-utils/dom-events";
import { ResourcePanelType } from "@nucleum/shared-state/resources/resource-panel.type";

/** Updates panel state and matching shell navigation before layout events. */
export const PanelSwitcherMixin = {
  switchPanel(
    this: {
      get: () => {
        id: string;
        panel?: string;
        defaultPanel?: string;
      };
      update: (updater: (value: any) => any) => void;
    },
    panelValue?: string
  ) {
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
      requireResourcePanelHost().writePanel(state.id, panel);
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
