import { localActions } from "$lib/local/stores/localActionMap";
import { get, writable } from "svelte/store";
import { globalActions } from "./actionMap";
import type { Action } from "../types/action.type";
import { settingsAsModal, settingsAsPages } from "../layout/settingsActionMap";
import { appStore } from "./app.store";
import view from "./view.store";

const actions = initActions();

function initActions() {
  const modifiedGlobalActions = globalActions.filter(
    (x) => !localActions.some((y) => y.action === x.action)
  );
  let actions = [...modifiedGlobalActions, ...localActions];
  const { subscribe, update, set } = writable<Action[]>(actions);
  return {
    subscribe,
    updateSettingsActionMap: () => {
      const isSettingsAsModal = get(appStore).appData?.isSettingsAsModal;
      const isInPortraitMode = get(view).isPortrait;
      update((n) => {
        if (isInPortraitMode || !isSettingsAsModal)
          return [...n, ...settingsAsPages];
        else return [...n, ...settingsAsModal];
      });
    }
  };
}

export default actions;
