import type { JsonValue } from "@21n/types/json.type";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { isExtensionEnvironment } from "@21n/utils/browser.utils";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { parse, stringify } from "@21n/shared-utils/json.utils";

type ClientStoragePayload = Partial<Record<ClientStorageKey, string | null>>;

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
  window?.localStorage.setItem(Resource[itemType], stringify(item));
}
export function retrieveLocally(itemType: Resource) {
  try {
    if (import.meta.env?.SSR || !import.meta.env) {
      return null;
    }
    let value = window?.localStorage.getItem(Resource[itemType]);
    if (value) {
      return parse(value);
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

class ClientKeyValueStorage {
  isExtensionEnvironment = isExtensionEnvironment();

  private isExtensionStorageAvailable() {
    return (
      this.isExtensionEnvironment &&
      typeof chrome !== "undefined" &&
      !!chrome.storage?.local
    );
  }

  get(key: ClientStorageKey): Promise<string | null> {
    if (this.isExtensionStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, function (data: ClientStoragePayload) {
          if (chrome.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(data[key] ?? null);
          }
        });
      });
    } else {
      return Promise.resolve(window?.localStorage.getItem(key));
    }
  }

  set(key: ClientStorageKey, value: any): Promise<any> {
    if (typeof value === "object") {
      value = stringify(value);
    }
    if (this.isExtensionStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, function () {
          if (chrome.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(value);
          }
        });
      });
    } else {
      window?.localStorage.setItem(key, value);
      return Promise.resolve(value);
    }
  }

  remove(key: ClientStorageKey) {
    if (this.isExtensionStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, function () {
          if (chrome.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(key);
          }
        });
      });
    } else {
      window?.localStorage.removeItem(key);
      return Promise.resolve(key);
    }
  }
  getForSession(key: ClientStorageKey) {
    if (this.isExtensionStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, function (data: ClientStoragePayload) {
          if (chrome.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(data[key] ?? null);
          }
        });
      });
    } else {
      return Promise.resolve(window?.sessionStorage.getItem(key));
    }
  }

  setForSession(key: ClientStorageKey, value: any) {
    if (this.isExtensionStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, function () {
          if (chrome.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(value);
          }
        });
      });
    } else {
      window?.sessionStorage.setItem(key, value);
      return Promise.resolve(value);
    }
  }

  removeForSession(key: ClientStorageKey) {
    if (this.isExtensionStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, function () {
          if (chrome.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(key);
          }
        });
      });
    } else {
      window?.sessionStorage.removeItem(key);
      return Promise.resolve(key);
    }
  }
  clearAll() {
    if (this.isExtensionStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.clear(function () {
          if (chrome.runtime?.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(null);
          }
        });
      });
    } else {
      window?.localStorage.clear();
      window?.sessionStorage.clear();
      return Promise.resolve(null);
    }
  }
}

export const clientStorage = new ClientKeyValueStorage();

export async function getDapId() {
  let dapId = await clientStorage.get(ClientStorageKey.DAP_ID);
  if (!dapId) {
    dapId = generateSimpleRandomId();
    clientStorage.set(ClientStorageKey.DAP_ID, dapId);
  }
  return dapId;
}
