import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";

export const spriteVersion = 13;
export const extensionSprites = new Map<string, string>();

export function cleanExtensionSprites() {
  extensionSprites.forEach((url: any) => URL.revokeObjectURL(url));
}

export function resolveSpriteSheetPath(sheet: string) {
  if (isExtensionEnvironment()) {
    return `assets/icons/${sheet}.svg`;
  }
  return `/icons/${sheet}-v${spriteVersion}.svg`;
}
