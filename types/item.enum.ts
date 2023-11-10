import { LocalItem } from "$lib/local/types/item.enum";

export enum GlobalItem {
  ALL = "ALL",
  UserPreferences = "UserPreferences",
  UserLocalPreferences = "UserLocalPreferences",
}

export const Item = {
  ...GlobalItem,
  ...LocalItem,
};

export type ItemType = LocalItem | GlobalItem;
