import AppearanceSettings from "$lib/tidy/components/settings/appearance/AppearanceSettings.svelte";
import {
  ThinModeBehavior,
  PaintType,
  type ComponentType,
} from "$lib/tidy/types/component.type";
import NotFound from "../components/error/404NotFound.svelte";
import AccessibilitySettings from "$lib/tidy/components/settings/appearance/accessibility/AccessibilitySettings.svelte";
import ThemeSettingView from "$lib/tidy/components/settings/appearance/ThemeSettingView.svelte";

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
    label: "Appearance",
    path: "settings/appearance",
    component: AppearanceSettings,
    sections: ["basics", "theme", "accessibility"],
    pagePaint: PaintType.YSTACK,
    thinModeBehavior: ThinModeBehavior.JUMP_TO_PARENT,
  },
  {
    path: "settings/appearance/theme",
    component: ThemeSettingView,
    pagePaint: PaintType.JUMP_TO_PARENT,
  },
  {
    path: "settings/appearance/accessibility",
    component: AccessibilitySettings,
    pagePaint: PaintType.JUMP_TO_PARENT,
  },
];
