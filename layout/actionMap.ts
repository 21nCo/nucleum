import AppearanceSettings from "$lib/tidy/components/settings/appearance/AppearanceSettings.svelte";
import {
  ThinModeBehavior,
  PaintType,
  type Action
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
export const actions: Action[] = [
  {
    action: "404",
    component: NotFound,
    isHideInCmdBar: true
  },
  {
    action: "offline",
    component: Offline,
    isHideInCmdBar: true
  },
  {
    action: "signup",
    component: Signup,
    isMenuHidden: true,
    isHideInCmdBar: true
  },
  {
    action: "debuglogs",
    icon: "code",
    component: DebugLogs,
    isHideInCmdBar: true
  },
  {
    action: "cp",
    label: "Control",
    icon: "settings",
    component: ControlPanel,
    isHideInCmdBar: true
  },
  {
    action: "account",
    label: "Account",
    path: "cp/account",
    component: AccountSettings
  },
  {
    label: "Appearance",
    action: "settings/appearance",
    component: AppearanceSettings,
    sections: ["openPreviewMode", "basics", "theme", "accessibility"],
    pagePaint: PaintType.YSTACK,
    thinModeBehavior: ThinModeBehavior.JUMP_TO_PARENT
  },
  {
    action: "openPreviewMode",
    label: "Open Preview Mode",
    path: "settings/appearance/openPreviewMode",
    pagePaint: PaintType.JUMP_TO_PARENT,
    component: OpenPreviewMode,
    thinModeBehavior: ThinModeBehavior.HIDE
  },
  {
    action: "accessibility",
    label: "Accessibility",
    path: "cp/accessibility",
    icon: "cube",
    component: AccessibilitySettings
  },
  {
    action: "theme",
    label: "Theme",
    path: "cp/theme",
    icon: "palette",
    component: ThemeSettingView
  },
  {
    action: "appMenu",
    label: "App Menu",
    path: "cp/appMenu",
    icon: "list",
    component: AppMenuSettings
  },
  {
    action: "shortcuts",
    label: "Shortcuts",
    path: "cp/shortcuts",
    icon: "command",
    component: ComingSoonView
  },
  {
    action: "datetime-settings",
    label: "Date & Time",
    path: "cp/datetime-settings",
    icon: "sun",
    component: DateTimeSettings
  },
  {
    action: "productguide",
    label: "Product guide",
    icon: "academic-cap",
    link: "productguide"
  },
  {
    action: "discord",
    label: "Join us on discord",
    icon: "users",
    link: "discord"
  },
  {
    action: "privacy",
    label: "Privacy policy",
    link: "privacy"
  },
  {
    action: "feedback",
    label: "Give feedback",
    icon: "chatleftright",
    link: "feedback"
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
    label: "About",
    path: "cp/about",
    icon: "info",
    component: AboutSettings
  },
  {
    action: "STATUS_UPDATE",
    component: ToastModalPortrait
  },
  {
    action: "cmd",
    component: CommandBar
  }
];
