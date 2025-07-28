import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
import { bundleNumber } from "./icons-list";
import { iconMappings, type IconSet, type IconMapping } from "./icons.map";
import { writable } from "svelte/store";

export const spriteVersion = bundleNumber;
export const extensionSprites = new Map<string, string>();

export const currentIconSet = writable<IconSet>("phosphor");

export function setIconSet(iconSet: IconSet) {
  currentIconSet.set(iconSet);
}

export function getIconFromMapping(
  genericName: string,
  iconSet: IconSet
): string | null {
  const mapping = iconMappings[genericName];
  if (!mapping) return null;

  return mapping[iconSet] || mapping.phosphor; // fallback to phosphor
}

export function resolveGenericIcon(genericName: string): string {
  let iconSet: IconSet = "phosphor"; // default
  currentIconSet.subscribe((value) => (iconSet = value))();

  const resolvedIcon = getIconFromMapping(genericName, iconSet);
  if (resolvedIcon) {
    // For phosphor icons, add the ph: prefix
    if (iconSet === "phosphor") {
      return `ph:${resolvedIcon}`;
    }
    // For lucide icons, add the lucide: prefix
    if (iconSet === "lucide") {
      return `lucide:${resolvedIcon}`;
    }
    // For solar icons, add the solar: prefix
    if (iconSet === "solar") {
      return `solar:${resolvedIcon}`;
    }
  }

  return genericName; // fallback to generic name
}

export function cleanExtensionSprites() {
  extensionSprites.forEach((url: any) => URL.revokeObjectURL(url));
}

export function resolveSpriteSheetPath(sheet: string) {
  if (isExtensionEnvironment()) {
    return `assets/icons/${sheet}.svg`;
  }
  return `/icons/${sheet}-v${spriteVersion}.svg`;
}
