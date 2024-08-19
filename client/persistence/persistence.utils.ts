import type { JsonValue } from "$lib/client/types/json.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import { ClientStorageKey } from "./persistence.type";

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

class ClientKeyValueStorage {
  get(key: ClientStorageKey) {
    return window?.localStorage.getItem(key);
  }

  set(key: ClientStorageKey, value: any) {
    if (typeof value === "object") {
      value = JSON.stringify(value);
    }
    window?.localStorage.setItem(key, value);
  }

  remove(key: ClientStorageKey) {
    window?.localStorage.removeItem(key);
  }
  getForSession(key: ClientStorageKey) {
    return window?.sessionStorage.getItem(key);
  }

  setForSession(key: ClientStorageKey, value: any) {
    window?.sessionStorage.setItem(key, value);
  }

  removeForSession(key: ClientStorageKey) {
    window?.sessionStorage.removeItem(key);
  }
  clearAll() {
    window?.localStorage.clear();
    window?.sessionStorage.clear();
  }
}

export const clientStorage = new ClientKeyValueStorage();
