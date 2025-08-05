import { ActionType, type IAction } from "../types/action.type";
import AccountSettings from "../components/settings/account/AccountSettings.svelte";
import SettingsAsPage from "../components/settings/asPage/SettingsAsPage.svelte";
import ShortcutSettings from "../components/shortcuts/settings/ShortcutSettings.svelte";
import AboutSettings from "../components/settings/about/AboutSettings.svelte";
import ShareToFriends from "../components/settings/ShareToFriends.svelte";
import DateTimeSettings from "../components/settings/datetime/DateTimeSettings.svelte";
import AppMenuSettings from "../components/settings/AppMenuSettings.svelte";
import AccessibilitySettings from "$lib/client/components/settings/appearance/accessibility/AccessibilitySettings.svelte";
import AppearanceSettings from "$lib/client/components/settings/appearance/AppearanceSettings.svelte";
import SettingsAsModal from "../components/settings/SettingsAsModal.svelte";
import { Size } from "../types/size.enum";
import { Orientation } from "../types/direction.enum";
import { Action } from "../types/action.enum";
import InteractionModeSettings from "../components/settings/interactionMode/InteractionModeSettings.svelte";
import { Embed, OperatingSystem } from "../types/context.type";
import SyncSettings from "../components/settings/sync/SyncSettings.svelte";
import TacoSettings from "../components/settings/taco/TacoSettings.svelte";
import { UserDataMode } from "../types/account.type";
import AnalyticsSettings from "../products/pointron/settings/AnalyticsSettings.svelte";
import { PointronAction } from "../types/pointron/pointronAction.enum";
import SessionSettings from "../products/pointron/settings/SessionSettings.svelte";
import ModSettings from "../components/settings/mod/ModSettings.svelte";
import DeveloperSettings from "../components/settings/developer/DeveloperSettings.svelte";

const settings: (Required<Pick<IAction, "action">> & Partial<IAction>)[] = [
  {
    action: Action.ACCOUNT,
    label: "Account Settings",
    component: AccountSettings
  },
  {
    action: Action.PYOD,
    label: "Plug Your Own Database",
    icon: "database",
    component: ModSettings
  },
  {
    action: Action.DEVELOPER,
    label: "Developer",
    icon: "code",
    component: DeveloperSettings
  },
  {
    action: Action.ARTIFICIAL_INTELLIGENCE,
    cmdLabel: [{ variant: "aiSettings", label: "AI Settings" }],
    label: "Artificial Intelligence",
    icon: "cpu",
    component: TacoSettings,
    modalParams: {
      title: "Artificial Intelligence",
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: Action.MODE_OF_INTERACTION,
    label: "Mode of interaction",
    icon: "cursor-click",
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
    action: Action.APPEARANCE_SETTINGS,
    label: "Appearance",
    cmdLabel: [
      { variant: "appearanceSettings", label: "Appearance Settings" },
      { variant: "switchTheme", label: "Switch Theme" },
      { variant: "toggleDarkMode", label: "Toggle Dark Mode" },
      { variant: "toggleLightMode", label: "Toggle Light Mode" }
    ],
    icon: "palette",
    component: AppearanceSettings,
    modalParams: {
      title: "Appearance Settings",
      layout: {
        size: Size.lg
      }
    }
  },
  {
    action: PointronAction.SESSION_SETTINGS_MODAL,
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Focus",
    path: "cp/session",
    icon: "circle",
    type: ActionType.MODAL,
    component: SessionSettings,
    modalParams: {
      title: "Focus Settings",
      layout: {
        size: Size.lg,
        primaryAction: {
          label: "Done"
        }
      }
    }
  },
  {
    action: "analytics-settings",
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Analytics",
    path: "cp/analytic-settings",
    icon: "chart-line-up",
    type: ActionType.MODAL,
    component: AnalyticsSettings,
    modalParams: {
      title: "Analytics Settings"
    }
  },
  {
    action: "appMenu",
    label: "App Menu",
    icon: "list",
    isInactive: true,
    component: AppMenuSettings
  },
  {
    action: Action.SHORTCUTS,
    label: "Keyboard shortcuts",
    icon: "keyboard",
    component: ShortcutSettings,
    hideContext: [Embed.HANDSET]
  },
  {
    action: Action.DATETIME_SETTINGS,
    cmdLabel: "Date & Time Settings",
    label: "Date & Time",
    icon: "calendar-blank",
    component: DateTimeSettings
  },
  {
    action: Action.ACCESSIBILITY,
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Accessibility",
    icon: "person-simple",
    component: AccessibilitySettings,
    modalParams: {
      title: "Accessibility Settings"
    }
  },
  {
    action: "share",
    label: "Refer a friend",
    icon: "share",
    component: ShareToFriends
  },
  {
    action: "about",
    label: "About us",
    icon: "info",
    component: AboutSettings
  },
  {
    action: "sync",
    label: "Sync",
    icon: "sync",
    component: SyncSettings,
    modalParams: {
      title: "Sync Settings"
    },
    hideContext: [UserDataMode.LOCAL]
  }
];

/**
 * @deprecated - directly rendering as Modal vs as Page in SettingsAsPage.svelte
 * @returns
 */
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
      icon: "gear",
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
