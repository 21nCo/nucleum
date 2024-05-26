import type { JsonValue } from "$lib/client/types/json.type";
import { Item as ItemEnum, type ItemType } from "$lib/client/types/item.enum";

export function resetLocalStorage() {
  if (import.meta.env?.SSR) {
    return;
  }
  window?.localStorage.clear();
  window?.location.reload();
}

export function persistLocally<T extends JsonValue>(
  itemType: ItemType,
  item: T
) {
  if (import.meta.env?.SSR) {
    return;
  }
  window?.localStorage.setItem(ItemEnum[itemType], JSON.stringify(item));
}
export function retrieveLocally(itemType: ItemType) {
  try {
    if (import.meta.env?.SSR) {
      return null;
    }
    let value = window?.localStorage.getItem(ItemEnum[itemType]);
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  } catch {
    return null;
  }
}
