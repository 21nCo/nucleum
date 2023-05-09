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
import { onCloseAppearancePreview, onOpenPreview } from "../utils/actions";

export const components: ComponentType[] = [
  {
    path: "404",
    component: NotFound,
  },
  {
    path: "settings",
    sections: ["appearance", "about"],
    pagePaint: PaintType.YMENU,
    thinModeBehavior: ThinModeBehavior.GRAND_CHILDREN_ON_MENU,
  },
  {
    heading: "Appearance",
    path: "settings/appearance",
    component: AppearanceSettings,
    sections: ["openPreviewMode", "basics", "theme", "accessibility"],
    pagePaint: PaintType.YSTACK,
    thinModeBehavior: ThinModeBehavior.JUMP_TO_PARENT,
  },
  {
    heading: "Open Preview Mode",
    path: "settings/appearance/openPreviewMode",
    pagePaint: PaintType.JUMP_TO_PARENT,
    component: OpenPreviewMode,
    thinModeBehavior: ThinModeBehavior.HIDE,
  },
  {
    heading: "Theme",
    path: "settings/appearance/theme",
    component: ThemeSettingView,
    pagePaint: PaintType.JUMP_TO_PARENT,
    type: BlockType.SECTION,
  },
  {
    heading: "Accessibility",
    path: "settings/appearance/accessibility",
    component: AccessibilitySettings,
    pagePaint: PaintType.JUMP_TO_PARENT,
    type: BlockType.SECTION,
  },
];
