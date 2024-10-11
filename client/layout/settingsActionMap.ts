import { ActionType, type IAction } from "../types/action.type";
import AccountSettings from "../components/settings/account/AccountSettings.svelte";
import SettingsAsPage from "../components/settings/asPage/SettingsAsPage.svelte";
import ShortcutSettings from "../components/shortcuts/settings/ShortcutSettings.svelte";
import AboutSettings from "../components/settings/about/AboutSettings.svelte";
import ShareToFriends from "../components/settings/ShareToFriends.svelte";
import DateTimeSettings from "../components/settings/datetime/DateTimeSettings.svelte";
import AppMenuSettings from "../components/settings/AppMenuSettings.svelte";
import AccessibilitySettings from "$lib/client/components/settings/appearance/accessibility/AccessibilitySettings.svelte";
import ThemeSettingView from "$lib/client/components/settings/appearance/AppearanceSettings.svelte";
import SettingsAsModal from "../components/settings/SettingsAsModal.svelte";
import { Size } from "../types/size.enum";
import { Orientation } from "../types/direction.enum";
import { Action } from "../types/action.enum";
import InteractionModeSettings from "../components/settings/interactionMode/InteractionModeSettings.svelte";
import { Embed } from "../types/context.type";
import SyncSettings from "../components/settings/sync/SyncSettings.svelte";

const settings: (Required<Pick<IAction, "action">> & Partial<IAction>)[] = [
  {
    action: Action.ACCOUNT,
    label: "Account Settings",
    path: "cp/account",
    component: AccountSettings
  },
  {
    action: Action.MODE_OF_INTERACTION,
    label: "Mode of interaction",
    path: "cp/interaction-mode",
    icon: "cursor-arrow-rays",
    component: InteractionModeSettings,
    modalParams: {
      title: "Mode of interaction",
      layout: {
        size: Size.lg
      }
    },
    hideContext: [Embed.HANDSET]
  },
  {
    action: "theme",
    label: "Appearance",
    cmdLabel: ["Appearance Settings", "Switch Theme", "Toggle Dark Mode"],
    path: "cp/theme",
    icon: "palette",
    component: ThemeSettingView,
    modalParams: {
      title: "Appearance Settings",
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: "appMenu",
    label: "App Menu",
    path: "cp/appMenu",
    icon: "list",
    isInactive: true,
    component: AppMenuSettings
  },
  {
    action: "shortcuts",
    label: "Shortcuts",
    path: "cp/shortcuts",
    icon: "command",
    component: ShortcutSettings,
    hideContext: [Embed.HANDSET]
  },
  {
    action: "datetime-settings",
    cmdLabel: "Date & Time Settings",
    label: "Date & Time",
    path: "cp/datetime-settings",
    icon: "sun",
    component: DateTimeSettings
  },
  {
    action: "accessibility",
    get cmdLabel() {
      return this.modalParams?.title;
    },
    path: "cp/accessibility",
    label: "Accessibility",
    icon: "cube",
    component: AccessibilitySettings,
    modalParams: {
      title: "Accessibility Settings"
    }
  },
  {
    action: "share",
    path: "cp/share",
    label: "Refer a friend",
    icon: "share",
    component: ShareToFriends
  },
  {
    action: "about",
    label: "About us",
    path: "cp/about",
    icon: "info",
    component: AboutSettings
  },
  {
    action: "sync",
    label: "Sync",
    path: "cp/sync",
    icon: "sync",
    component: SyncSettings,
    modalParams: {
      title: "Sync Settings"
    }
  }
];

export function getSettingsAsPages(): IAction[] {
  return settings
    .map((setting) => {
      const settingCopy = { ...setting };
      delete settingCopy.modalParams;
      return {
        ...settingCopy,
        type: ActionType.PAGE
      };
    })
    .concat({
      action: Action.SETTINGS,
      type: ActionType.PAGE,
      label: "Settings",
      icon: "settings",
      component: SettingsAsPage
    });
}

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
      icon: "settings",
      component: SettingsAsModal,
      modalParams: {
        layout: {
          size: Size.xl,
          orientation: Orientation.Horizontal,
          ignoreSafeArea: true
        }
      }
    });
}
