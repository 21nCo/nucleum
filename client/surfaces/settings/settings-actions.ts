import { Size } from "@21n/ui/elements/size.enum";
import { Action } from "@nucleum/client/config/action.enum";
import type { IAction } from "@nucleum/shared-state/commands/action.type";
import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
import { Embed } from "@nucleum/client/runtime/context.type";
import AppMenuSettings from "@nucleum/surfaces/settings/AppMenuSettings.svelte";
import ShareToFriends from "@nucleum/surfaces/sharing/ShareToFriends.svelte";
import AboutSettings from "@nucleum/surfaces/settings/about/AboutSettings.svelte";
import AccountSettings from "@nucleum/surfaces/settings/account/AccountSettings.svelte";
import AppearanceSettings from "@nucleum/surfaces/settings/appearance/AppearanceSettings.svelte";
import AccessibilitySettings from "@nucleum/surfaces/settings/appearance/accessibility/AccessibilitySettings.svelte";
import DateTimeSettings from "@nucleum/surfaces/settings/datetime/DateTimeSettings.svelte";
import DeveloperSettings from "@nucleum/surfaces/settings/developer/DeveloperSettings.svelte";
import InteractionModeSettings from "@nucleum/surfaces/settings/interactionMode/InteractionModeSettings.svelte";
import ModSettings from "@nucleum/surfaces/settings/mod/ModSettings.svelte";
import ShortcutSettings from "@nucleum/surfaces/settings/shortcuts/ShortcutSettings.svelte";
import SyncSettings from "@nucleum/surfaces/settings/sync/SyncSettings.svelte";

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

/** Owner-defined settings actions consumed by application registry assembly. */
export const settingsActions = Object.fromEntries(
  settings.map((setting) => [setting.action, setting])
) as Record<string, IAction>;
