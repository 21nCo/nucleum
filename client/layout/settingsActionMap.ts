import { ActionType, type Action } from "../types/action.type";
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

export const settingsAsPages: Action[] = [
  {
    action: AppEvent.SETTINGS,
    label: "Settings",
    icon: "settings",
    type: ActionType.PAGE,
    component: ControlPanel
  },
  {
    action: AppEvent.ACCOUNT,
    label: "Account Settings",
    path: "cp/account",
    type: ActionType.PAGE,
    component: AccountSettings
  },
  {
    action: "theme",
    label: "Appearance",
    cmdLabel: ["Appearance Settings", "Switch Theme"],
    path: "cp/theme",
    icon: "palette",
    type: ActionType.PAGE,
    component: ThemeSettingView
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
    type: ActionType.META_PAGE,
    component: ShortcutSettings
  },
  {
    action: "datetime-settings",
    cmdLabel: "Date & Time Settings",
    label: "Date & Time",
    path: "cp/datetime-settings",
    icon: "sun",
    type: ActionType.PAGE,
    component: DateTimeSettings
  },
  {
    action: "accessibility",
    cmdLabel: "Accessibility Settings",
    label: "Accessibility",
    path: "cp/accessibility",
    icon: "cube",
    type: ActionType.PAGE,
    component: AccessibilitySettings
  },
  {
    action: "share",
    path: "cp/share",
    label: "Refer a friend",
    icon: "share",
    type: ActionType.META_PAGE,
    component: ShareToFriends
  },
  {
    action: "about",
    label: "About us",
    path: "cp/about",
    icon: "info",
    type: ActionType.META_PAGE,
    component: AboutSettings
  }
];

export const settingsAsModal: Action[] = [
  {
    action: AppEvent.SETTINGS,
    label: "Settings",
    icon: "settings",
    type: ActionType.MODAL,
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
    action: "theme",
    label: "Appearance",
    cmdLabel: ["Appearance Settings", "Switch Theme"],
    icon: "palette",
    type: ActionType.MODAL,
    component: ThemeSettingView,
    modalParams: {
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: "datetime-settings",
    cmdLabel: "Date & Time Settings",
    label: "Date & Time",
    icon: "sun",
    type: ActionType.MODAL,
    component: DateTimeSettings
  },
  {
    action: "accessibility",
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Accessibility",
    icon: "cube",
    type: ActionType.MODAL,
    component: AccessibilitySettings,
    modalParams: {
      title: "Accessibility Settings"
    }
  },
  {
    action: AppEvent.ACCOUNT,
    label: "Account Settings",
    type: ActionType.MODAL,
    component: AccountSettings
  }
];
