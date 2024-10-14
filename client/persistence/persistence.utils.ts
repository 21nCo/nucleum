import type { JsonValue } from "$lib/client/types/json.type";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { ClientStorageKey } from "./persistence.type";
import { isExtensionEnvironment } from "../utils/browser.utils";

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
  isExtensionEnvironment = isExtensionEnvironment();

  get(key: ClientStorageKey): Promise<string | null> {
    if (this.isExtensionEnvironment) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, function (data) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(data[key]);
          }
        });
      });
    } else {
      return Promise.resolve(window?.localStorage.getItem(key));
    }
  }

  set(key: ClientStorageKey, value: any): Promise<any> {
    if (typeof value === "object") {
      value = JSON.stringify(value);
    }
    if (this.isExtensionEnvironment) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, function () {
          if (chrome.runtime.lastError) {
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
    if (this.isExtensionEnvironment) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, function () {
          if (chrome.runtime.lastError) {
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
    if (this.isExtensionEnvironment) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, function (data) {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(data[key]);
          }
        });
      });
    } else {
      return Promise.resolve(window?.sessionStorage.getItem(key));
    }
  }

  setForSession(key: ClientStorageKey, value: any) {
    if (this.isExtensionEnvironment) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, function () {
          if (chrome.runtime.lastError) {
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
    if (this.isExtensionEnvironment) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, function () {
          if (chrome.runtime.lastError) {
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
    if (this.isExtensionEnvironment) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.clear(function () {
          if (chrome.runtime.lastError) {
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
