import { isExtensionEnvironment } from "@21n/shared-utils/browser-environment";
import { bundleNumber } from "@21n/ui/icons/icons-list";
import { iconMappings, type IconSet } from "@21n/ui/icons/icons.map";
import { resolveElementAssetPath } from "@21n/ui/environment/element-environment.store";

export const spriteVersion = bundleNumber;
export const extensionSprites = new Map<string, string>();

export function getIconFromMapping(
  genericName: string,
  iconSet: IconSet
): string | null {
  const mapping = iconMappings[genericName];
  if (!mapping) return null;

  return mapping[iconSet] || mapping.phosphor;
}

export function resolveGenericIcon(genericName: string): string {
  let iconSet: IconSet = "phosphor";

  const resolvedIcon = getIconFromMapping(genericName, iconSet);
  if (resolvedIcon) {
    if (resolvedIcon.includes(":")) return resolvedIcon;
    if (iconSet === "phosphor") {
      return `ph:${resolvedIcon}-light`;
    }
    if (iconSet === "lucide") {
      return `lucide:${resolvedIcon}`;
    }
    if (iconSet === "solar") {
      return `solar:${resolvedIcon}-line-duotone`;
    }
  }
  return genericName;
}

export function cleanExtensionSprites() {
  extensionSprites.forEach((url: any) => URL.revokeObjectURL(url));
}

export function resolveSpriteSheetPath(sheet: string) {
  if (isExtensionEnvironment()) {
    return `assets/icons/${sheet}.svg`;
  }
  return resolveElementAssetPath(`icons/${sheet}-v${spriteVersion}.svg`);
}
