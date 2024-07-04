import type { JsonValue } from "$lib/client/types/json.type";
import { Item } from "$lib/client/types/item.enum";

export function resetLocalStorage() {
if (import.meta.env?.SSR || !import.meta.env || !window?.localStorage) {
    return;
  }
  window?.localStorage.clear();
  window?.location.reload();
}

export function persistLocally<T extends JsonValue>(itemType: Item, item: T) {
  if (import.meta.env?.SSR  || !import.meta.env) {
    return;
  }
  window?.localStorage.setItem(Item[itemType], JSON.stringify(item));
}
export function retrieveLocally(itemType: Item) {
  try {
    if (import.meta.env?.SSR  || !import.meta.env) {
      return null;
    }
    let value = window?.localStorage.getItem(Item[itemType]);
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  } catch {
    return null;
  }
}
