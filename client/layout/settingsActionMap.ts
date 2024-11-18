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
import TacoSettings from "../components/settings/taco/TacoSettings.svelte";
import { UserDataMode } from "../types/account.type";

const settings: (Required<Pick<IAction, "action">> & Partial<IAction>)[] = [
  {
    action: Action.ACCOUNT,
    label: "Account Settings",
    component: AccountSettings
  },
  {
    action: Action.LOCAL_AI_SETTINGS,
    cmdLabel: [
      "Local AI Settings",
      "Enable Local AI",
      "Enable Semantic Search",
      "Enable Audio Transcription",
      "Enable Markdown QA Chat"
    ],
    label: "AI Settings",
    icon: "ph:brain-light",
    component: TacoSettings,
    hideContext: [Embed.HANDSET],
    modalParams: {
      title: "AI Settings",
      layout: {
        size: Size.lg
      },
      isDismissable: false
    }
  },
  {
    action: Action.MODE_OF_INTERACTION,
    label: "Mode of interaction",
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
    icon: "ph:palette-light",
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
    icon: "list",
    isInactive: true,
    component: AppMenuSettings
  },
  {
    action: "shortcuts",
    label: "Keyboard shortcuts",
    icon: "ph:keyboard-light",
    component: ShortcutSettings,
    hideContext: [Embed.HANDSET]
  },
  {
    action: "datetime-settings",
    cmdLabel: "Date & Time Settings",
    label: "Date & Time",
    icon: "ph:calendar-light",
    component: DateTimeSettings
  },
  {
    action: "accessibility",
    get cmdLabel() {
      return this.modalParams?.title;
    },
    label: "Accessibility",
    icon: "ph:person-simple-light",
    component: AccessibilitySettings,
    modalParams: {
      title: "Accessibility Settings"
    }
  },
  {
    action: "share",
    label: "Refer a friend",
    icon: "ph:share-light",
    component: ShareToFriends
  },
  {
    action: "about",
    label: "About us",
    icon: "ph:info-light",
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
