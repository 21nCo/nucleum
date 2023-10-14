import AppearanceSettings from "$lib/tidy/components/settings/appearance/AppearanceSettings.svelte";
import {
  ThinModeBehavior,
  PaintType,
  type ComponentType,
  BlockType,
} from "$lib/tidy/types/component.type";
import NotFound from "../components/error/404NotFound.svelte";
import AccessibilitySettings from "$lib/tidy/components/settings/appearance/accessibility/AccessibilitySettings.svelte";
import ThemeSettingView from "$lib/tidy/components/settings/appearance/ThemeSettingView.svelte";
import OpenPreviewMode from "../components/settings/appearance/OpenPreviewMode.svelte";
import AccountSettings from "../components/settings/account/AccountSettings.svelte";
import ControlPanel from "../components/settings/ControlPanel.svelte";
import AppMenuSettings from "../components/settings/AppMenuSettings.svelte";
import DebugLogs from "../components/error/DebugLogs.svelte";
import Offline from "../components/error/Offline.svelte";
export const components: ComponentType[] = [
  {
    path: "404",
    component: NotFound,
  },
  {
    path: "offline",
    component: Offline,
  },
  {
    path: "debuglogs",
    icon: "code",
    component: DebugLogs,
  },
  {
    path: "cp",
    label: "Control",
    icon: "settings",
    component: ControlPanel,
  },
  {
    label: "Account",
    path: "cp/account",
    component: AccountSettings,
  },
  {
    label: "Appearance",
    path: "settings/appearance",
    component: AppearanceSettings,
    sections: ["openPreviewMode", "basics", "theme", "accessibility"],
    pagePaint: PaintType.YSTACK,
    thinModeBehavior: ThinModeBehavior.JUMP_TO_PARENT,
  },
  {
    label: "Open Preview Mode",
    path: "settings/appearance/openPreviewMode",
    pagePaint: PaintType.JUMP_TO_PARENT,
    component: OpenPreviewMode,
    thinModeBehavior: ThinModeBehavior.HIDE,
  },
  {
    label: "Accessibility",
    path: "cp/accessibility",
    icon: "cube",
    component: AccessibilitySettings,
  },
  {
    label: "Theme",
    path: "cp/theme",
    icon: "palette",
    component: ThemeSettingView,
  },
  {
    label: "App Menu",
    path: "cp/appMenu",
    icon: "list",
    component: AppMenuSettings,
  },
  {
    label: "Keyboard shortcuts",
    path: "cp/shortcuts",
    icon: "command",
    component: AppMenuSettings,
  },
];
