import { Orientation } from "@21n/ui/elements/direction.enum";
import { Size } from "@21n/ui/elements/size.enum";
import { Action } from "@nucleum/client/config/action.enum";
import { ActionType } from "@nucleum/client/config/action.type";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { pointronSettingsActions } from "@nucleum/products/pointron/settings/settings-actions";
import { aiSettingsAction } from "@nucleum/products/memotron/taco/ai-settings-action";
import { settingsActions } from "@nucleum/surfaces/settings/settings-actions";
import SettingsAsPage from "@nucleum/surfaces/settings/asPage/SettingsAsPage.svelte";

const settings: IAction[] = [
  settingsActions[Action.ACCOUNT],
  settingsActions[Action.PYOD],
  settingsActions[Action.DEVELOPER],
  aiSettingsAction as IAction,
  settingsActions[Action.MODE_OF_INTERACTION],
  settingsActions[Action.APPEARANCE_SETTINGS],
  pointronSettingsActions.session,
  pointronSettingsActions.analytics,
  settingsActions.appMenu,
  settingsActions[Action.SHORTCUTS],
  settingsActions[Action.DATETIME_SETTINGS],
  settingsActions[Action.ACCESSIBILITY],
  settingsActions.share,
  settingsActions.about,
  settingsActions.sync
];

/** Assembles owner-defined settings actions as modals in their established order. */
export function getSettingsAsModal(): IAction[] {
  return settings
    .map((setting) => {
      const settingCopy = { ...setting };
      delete settingCopy.path;
      return {
        ...settingCopy,
        type: ActionType.MODAL
      };
    })
    .concat({
      action: Action.SETTINGS,
      type: ActionType.MODAL,
      label: "Settings",
      icon: "gear",
      isRenderAsPageInPortrait: true,
      component: SettingsAsPage,
      modalParams: {
        layout: {
          size: Size.xl,
          orientation: Orientation.Horizontal,
          ignoreSafeArea: true,
          isShowCantileverClose: true
        }
      }
    });
}
