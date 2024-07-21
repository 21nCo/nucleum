import type { JsonValue } from "$lib/client/types/json.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";

export function resetLocalStorage() {
  if (import.meta.env?.SSR || !import.meta.env || !window?.localStorage) {
    return;
  }
  window?.localStorage.clear();
  window?.location.reload();
}

export function persistLocally<T extends JsonValue>(
  itemType: Resource,
  item: T
) {
  if (import.meta.env?.SSR || !import.meta.env) {
    return;
  }
  window?.localStorage.setItem(Resource[itemType], JSON.stringify(item));
}
export function retrieveLocally(itemType: Resource) {
  try {
    if (import.meta.env?.SSR || !import.meta.env) {
      return null;
    }
    let value = window?.localStorage.getItem(Resource[itemType]);
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  } catch {
    return null;
  }
}
