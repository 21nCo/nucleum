import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { isExtensionEnvironment } from "@21n/shared-utils/browser-environment";
import { stringify } from "@21n/shared-utils/json.utils";

type ClientStoragePayload = Partial<Record<ClientStorageKey, string | null>>;

/** Returns browser storage when the host exposes it. */
export function getBrowserStorage(type: "localStorage" | "sessionStorage") {
  if (typeof window === "undefined") return null;
  try {
    return window[type] ?? null;
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
      return Promise.resolve(
        getBrowserStorage("localStorage")?.getItem(key) ?? null
      );
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
      getBrowserStorage("localStorage")?.setItem(key, value);
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
      getBrowserStorage("localStorage")?.removeItem(key);
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
      return Promise.resolve(
        getBrowserStorage("sessionStorage")?.getItem(key) ?? null
      );
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
      getBrowserStorage("sessionStorage")?.setItem(key, value);
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
      getBrowserStorage("sessionStorage")?.removeItem(key);
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
      getBrowserStorage("localStorage")?.clear();
      getBrowserStorage("sessionStorage")?.clear();
      return Promise.resolve(null);
    }
  }
}

/** Storage facade for browser and extension preferences. */
export const clientStorage = new ClientKeyValueStorage();
