import { ActionType, type IAction } from "../types/action.type";
import AccountSettings from "../components/settings/account/AccountSettings.svelte";
import ControlPanel from "../components/settings/ControlPanel.svelte";
import ShortcutSettings from "../components/settings/shortcuts/ShortcutSettings.svelte";
import AboutSettings from "../components/settings/about/AboutSettings.svelte";
import ShareToFriends from "../components/settings/ShareToFriends.svelte";
import DateTimeSettings from "../components/settings/datetime/DateTimeSettings.svelte";
import AppMenuSettings from "../components/settings/AppMenuSettings.svelte";
import AccessibilitySettings from "$lib/client/components/settings/appearance/accessibility/AccessibilitySettings.svelte";
import ThemeSettingView from "$lib/client/components/settings/appearance/AppearanceSettings.svelte";
import SettingsModal from "../components/settings/SettingsModal.svelte";
import { AppEvent } from "../types/event.enum";
import { Size } from "../types/size.enum";
import { Orientation } from "../types/direction.enum";

const settings: IAction[] = [
  {
    action: AppEvent.SETTINGS,
    label: "Settings",
    icon: "settings",
    // component: ControlPanel,
    component: SettingsModal,
    modalParams: {
      layout: {
        size: Size.xl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: AppEvent.ACCOUNT,
    label: "Account Settings",
    path: "cp/account",
    component: AccountSettings
  },
  {
    action: "theme",
    label: "Appearance",
    cmdLabel: ["Appearance Settings", "Switch Theme"],
    path: "cp/theme",
    icon: "palette",
    component: ThemeSettingView,
    modalParams: {
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
    component: ShortcutSettings
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
  }
];

export function getSettingsAsPages() {
  return settings.map((setting) => {
    delete setting.modalParams;
    return {
      ...setting,
      type: ActionType.PAGE
    };
  });
}

export function getSettingsAsModal() {
  return settings.map((setting) => {
    delete setting.path;
    return {
      ...setting,
      type: ActionType.MODAL
    };
  });
}
