import { Cloud } from "$lib/tidy/types/cloud.enum";
import type { JsonValue } from "$lib/tidy/types/json.type";

import { get, writable } from "svelte/store";
import { account, appStore, cloudProvider } from "./app.store";
import { SurrealDatabase } from "../access/surrealHelper";
import { Item as ItemEnum, type ItemType } from "$lib/tidy/types/item.enum";
import type { DbRecordBase, DbRecordWithLabel } from "../types/dbrecord.type";
import type { DbRecordType } from "$lib/local/types/item.type";
import { performApiCall, performBlankApiCall } from "../utils/utils";
import { isValidArray } from "../utils/obj.utils";

const surrealDb = new SurrealDatabase(import.meta.env.VITE_SURREAL_URL);
export const localStore = <T extends JsonValue>(key: string, initial: T) => {
  const toString = (value: T) => JSON.stringify(value, null, 2);

  if (localStorage.getItem(key) === null) {
    localStorage.setItem(key, toString(initial));
  }

  const saved = JSON.parse(localStorage.getItem(key) ?? "");

  const { subscribe, set, update } = writable<T>(saved);

  return {
    subscribe,
    set: (value: T) => {
      localStorage.setItem(key, toString(value));
      return set(value);
    },
    update,
  };
};

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

export class Persistance {
  refreshToken = async () => {
    try {
      const token = localStorage.getItem("refresh-token");
      const response = await performApiCall(
        "account/refreshToken",
        "POST",
        JSON.stringify({ token })
      );
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      if (!data?.token) return;
      if (!data.userInfo)
        data.userInfo = JSON.parse(localStorage.getItem("userInfo") ?? "");
      account.signIn(data, false);
      return true;
    } catch (err) {
      appStore.logError(err);
    }
  };
  updateDefinitions = async () => {
    try {
      const token = localStorage.getItem("refresh-token");
      const response = await performApiCall(
        "account/updateDefinitions",
        "POST",
        JSON.stringify({ token })
      );
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return isValidArray(data);
    } catch (err) {
      appStore.logError(err);
    }
  };
  getLatestAppVersion = async (app: string) => {
    try {
      let response = await performBlankApiCall(
        "appdata",
        "POST",
        JSON.stringify({ app })
      );
      if (response?.ok) {
        let jsonValue = await response.json();
        if (!jsonValue) return;
        return jsonValue.version;
      }
    } catch (err) {
      appStore.logError(err);
    }
  };
  initializeAppData = async (app: string) => {
    try {
      let response = await performBlankApiCall(
        "appdata",
        "POST",
        JSON.stringify({ app })
      );
      if (response?.ok) {
        let jsonValue = await response.json();
        if (!jsonValue) return;
        appStore.initiatizeAppData(jsonValue);
      }
    } catch (err) {
      appStore.logError(err);
    }
  };
  /**
   * Creates a new Item. If Id is not provided, a new Id will be generated
   * @param item Item to be created
   * @param itemType ItemType
   * @returns Id of the created Item
   */
  create(item: DbRecordType, itemType: ItemType) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let items = retrieveLocally(itemType);
        if (!items) {
          items = [];
        }
        items.push(item);
        persistLocally(itemType, items);
        break;
      case Cloud.surreal:
        if (item.id) {
          const id = ItemEnum[itemType] + `:${item.id}`;
          item.id = id;
          surrealDb.create(id, item);
        } else {
          return surrealDb.create(ItemEnum[itemType], item);
        }
        break;
    }
    return item.id;
  }
  /**
   * Creates a new Item. If Id is not provided, a new Id will be generated
   * @param item Item to be created
   * @param itemType ItemType
   * @returns Id of the created Item
   */
  createMultiple<T extends DbRecordBase>(items: T[], itemType: ItemType) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let allItems = retrieveLocally(itemType);
        if (!allItems) {
          allItems = [];
        }
        allItems.push(items);
        persistLocally(itemType, allItems);
        break;
      case Cloud.surreal:
        //todo - replace with surreal query for bulk create
        items.forEach((item: T) => {
          if (item.id) {
            surrealDb.create(ItemEnum[itemType] + `:${item.id}`, item);
          } else {
            surrealDb.create(ItemEnum[itemType], item);
          }
        });
        break;
    }
    return true;
  }
  /**
   * Pass only the updated fields as item along with item ID
   * @param item Item with updated fields and item Id
   * @param itemType ItemType
   * @returns complete modified item record
   */
  update(
    item: Partial<DbRecordType> & Required<Pick<DbRecordType, "id">>,
    itemType?: ItemType
  ) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        if (!itemType) break;
        let items: DbRecordBase[] = retrieveLocally(itemType);
        if (!items) {
          items = [];
        }
        items = items.filter((x: DbRecordBase) => x.id != item.id);
        items.push(item);
        persistLocally(itemType, items);
        break;
      case Cloud.surreal:
        return surrealDb.merge(
          itemType &&
            typeof item.id === "string" &&
            item.id.includes(ItemEnum[itemType])
            ? item.id
            : itemType
            ? `${ItemEnum[itemType]}:${item.id}`
            : typeof item.id === "string"
            ? item.id
            : "",
          item
        );
    }
  }
  /**
   *
   * @param itemId Id of the Item to be deleted
   * @param itemType ItemType
   * @returns true if deleted successfully else false
   */
  delete(itemId: string, itemType: ItemType) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let items = retrieveLocally(itemType);
        items = items.filter((x: DbRecordBase) => x.id != itemId);
        persistLocally(itemType, items);
        break;
      case Cloud.surreal:
        return surrealDb.delete(itemId);
    }
  }
  retrieve(itemId: string, itemType: ItemType | undefined = undefined) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        if (!itemType) break;
        let items = retrieveLocally(itemType);
        if (!items) {
          items = [];
        }
        let item = items.find((x: DbRecordBase) => x.id == itemId);
        return item;
      case Cloud.surreal:
        return surrealDb.select(itemId);
    }
  }
  retrieveAll(itemType: ItemType) {
    try {
      switch (get(cloudProvider)) {
        case Cloud.local:
          let items = retrieveLocally(itemType);
          return items;
        case Cloud.surreal:
          return surrealDb.select(ItemEnum[itemType]);
      }
      return [];
    } catch (error) {
      appStore.logError(error);
    }
  }
  async searchByLabel(
    searchString: string,
    itemType: ItemType
  ): Promise<DbRecordWithLabel[]> {
    let results: DbRecordWithLabel[] = [];
    switch (get(cloudProvider)) {
      case Cloud.local:
        switch (itemType) {
          case ItemEnum.ALL:
            const tagList = retrieveLocally(ItemEnum.PointTag);
            const taskList = retrieveLocally(ItemEnum.PointTask);
            if (tagList) {
              const tagItems = tagList
                .filter((item: DbRecordWithLabel) =>
                  item.label.toLowerCase().includes(searchString.toLowerCase())
                )
                .map((x: DbRecordWithLabel) => {
                  return { label: x.label, id: x.id };
                });
              results = [...results, ...tagItems];
            }
            if (taskList) {
              const taskItems = taskList.filter((item: DbRecordWithLabel) =>
                item.label.toLowerCase().includes(searchString.toLowerCase())
              );
              results = [...results, ...taskItems];
            }
            break;
          default:
            let items = retrieveLocally(itemType);
            if (!items) break;
            items = items.filter((item: DbRecordWithLabel) =>
              item.label.toLowerCase().includes(searchString.toLowerCase())
            );
            results = items.map((x: DbRecordWithLabel) => {
              return { label: x.label, id: x.id };
            });
            break;
        }
        break;
      case Cloud.surreal:
        if (itemType != ItemEnum.ALL) {
          let searchResult = await surrealDb.query(
            `select * from ${ItemEnum[itemType]} where string::lowercase(label) CONTAINS $searchString`,
            {
              searchString: searchString.toLowerCase(),
            }
          );
          if (searchResult && searchResult.length > 0) {
            results = searchResult[0];
          }
        }
    }
    return results;
  }
}
