import { LocalItem } from "$lib/local/types/item.enum";

export enum GlobalItem {
  ALL = "ALL",
  globalPreferences = "globalPreferences",
  TailwindTheme = "TailwindTheme",
  appData = "appData",
  space = "space",
  spaceInContext = "spaceInContext",
  appearance = "appearance"
}

export const Item = {
  ...GlobalItem,
  ...LocalItem
};
export type ItemType = LocalItem | GlobalItem;
