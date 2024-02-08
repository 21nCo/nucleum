import AppearanceSettings from "$lib/tidy/components/settings/appearance/AppearanceSettings.svelte";
import {
  ThinModeBehavior,
  PaintType,
  type Action,
  ActionType
} from "$lib/tidy/types/action.type";
import NotFound from "../components/error/PageError.svelte";
import AccessibilitySettings from "$lib/tidy/components/settings/appearance/accessibility/AccessibilitySettings.svelte";
import ThemeSettingView from "$lib/tidy/components/settings/appearance/ThemeSettingView.svelte";
import OpenPreviewMode from "../components/settings/appearance/OpenPreviewMode.svelte";
import AccountSettings from "../components/settings/account/AccountSettings.svelte";
import ControlPanel from "../components/settings/ControlPanel.svelte";
import AppMenuSettings from "../components/settings/AppMenuSettings.svelte";
import DebugLogs from "../components/error/DebugLogs.svelte";
import Offline from "../components/error/Offline.svelte";
import AboutSettings from "../components/settings/about/AboutSettings.svelte";
import ShareToFriends from "../components/settings/ShareToFriends.svelte";
import DateTimeSettings from "../components/settings/datetime/DateTimeSettings.svelte";
import Signup from "../components/settings/account/Signup.svelte";
import ComingSoonView from "../elements/ComingSoonView.svelte";
import ToastModalPortrait from "../elements/ToastModalPortrait.svelte";
import CommandBar from "../components/commandBar/CommandBar.svelte";
import { Size } from "../types/size.enum";
import { Orientation } from "../types/direction.enum";
import { AppEvent } from "../types/event.enum";
import { isInEditMode } from "../stores/app.store";
import ShortcutSettings from "../components/settings/shortcuts/ShortcutSettings.svelte";
import Help from "../components/help/Help.svelte";
export const actions: Action[] = [
  {
    action: "404",
    type: ActionType.META_PAGE,
    component: NotFound
  },
  {
    action: "offline",
    type: ActionType.META_PAGE,
    component: Offline
  },
  {
    action: "signup",
    component: Signup,
    type: ActionType.META_PAGE,
    isMenuHidden: true
  },
  {
    action: "debuglogs",
    icon: "code",
    type: ActionType.META_PAGE,
    component: DebugLogs
  },
  {
    action: "cp",
    label: "Settings",
    icon: "settings",
    type: ActionType.PAGE,
    component: ControlPanel
  },
  {
    action: "account",
    label: "Account Settings",
    path: "cp/account",
    type: ActionType.PAGE,
    component: AccountSettings
  },
  {
    label: "Appearance",
    action: "settings/appearance",
    component: AppearanceSettings,
    sections: ["openPreviewMode", "basics", "theme", "accessibility"],
    pagePaint: PaintType.YSTACK,
    isInactive: true,
    thinModeBehavior: ThinModeBehavior.JUMP_TO_PARENT
  },
  {
    action: "openPreviewMode",
    label: "Open Preview Mode",
    path: "settings/appearance/openPreviewMode",
    pagePaint: PaintType.JUMP_TO_PARENT,
    component: OpenPreviewMode,
    type: ActionType.META,
    thinModeBehavior: ThinModeBehavior.HIDE
  },
  {
    action: "accessibility",
    label: "Accessibility Settings",
    alternateLabel: "Accessibility",
    path: "cp/accessibility",
    icon: "cube",
    type: ActionType.PAGE,
    component: AccessibilitySettings
  },
  {
    action: "theme",
    label: "Theme Settings",
    alternateLabel: "Theme",
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
    label: "Date & Time Settings",
    alternateLabel: "Date & Time",
    path: "cp/datetime-settings",
    icon: "sun",
    type: ActionType.PAGE,
    component: DateTimeSettings
  },
  {
    action: "productguide",
    label: "Product guide",
    icon: "academic-cap",
    link: "productguide"
  },
  {
    action: "tutorial",
    label: "Start tutorial",
    icon: "play",
    link: "productguide"
  },
  {
    action: "downloads",
    label: "Downloads",
    icon: "download",
    link: "productguide"
  },
  {
    action: "chat",
    label: "Chat with us",
    icon: "chatleftright",
    type: ActionType.META,
    link: "discord"
  },
  {
    action: "call",
    label: "Book a call",
    icon: "video-camera",
    type: ActionType.META,
    link: "discord"
  },
  {
    action: "faqs",
    label: "FAQs",
    icon: "help",
    type: ActionType.META,
    link: "discord"
  },
  {
    action: "discord",
    label: "Join us on discord",
    icon: "users",
    type: ActionType.META,
    link: "discord"
  },
  {
    action: "twitter",
    label: "Share on socials",
    icon: "megaphone",
    type: ActionType.META,
    link: "discord"
  },
  {
    action: "credits",
    label: "Credits",
    icon: "face-smile",
    type: ActionType.META,
    link: "credits"
  },
  {
    action: "git",
    label: "Star us on git",
    icon: "star",
    type: ActionType.META,
    link: "git"
  },
  {
    action: "privacy",
    label: "Privacy policy",
    icon: "lock-closed",
    type: ActionType.META,
    link: "privacy"
  },
  {
    action: "changelog",
    label: "What's new",
    icon: "sparkles",
    type: ActionType.META,
    link: "changelog"
  },
  {
    action: "roadmap",
    label: "Roadmap",
    icon: "map",
    type: ActionType.META,
    link: "roadmap"
  },
  {
    action: "feedback",
    label: "Give feedback",
    icon: "chat-bubble-bottom-center",
    link: "tallyFeedback"
  },
  {
    action: "requestfeature",
    label: "Request a feature",
    icon: "light-bulb",
    link: "tallyFeedback"
  },
  {
    action: "report",
    label: "Report an issue",
    icon: "flag",
    link: "tallyFeedback"
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
  },
  {
    action: "STATUS_UPDATE",
    component: ToastModalPortrait,
    type: ActionType.META_MODAL
  },
  {
    action: AppEvent.EDIT_MODE,
    fn: () => isInEditMode.toggle(),
    type: ActionType.META,
    label: "Edit mode"
  },
  {
    action: AppEvent.HELP,
    label: "Help",
    type: ActionType.MODAL,
    component: Help,
    modalParams: {
      layoutParams: {
        size: Size.xl,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  },
  {
    action: AppEvent.CMD,
    label: "Command bar",
    component: CommandBar,
    type: ActionType.META_MODAL,
    modalParams: {
      isHideTitleIfEmpty: true,
      layoutParams: {
        size: Size.lg,
        orientation: Orientation.Horizontal,
        ignoreSafeArea: true
      }
    }
  }
];
