import { Cloud } from "$lib/tidy/types/cloud.enum";
import type { JsonValue } from "$lib/tidy/types/json.type";

import { get, writable } from "svelte/store";
import type { Item } from "../../local/types/item.type";
import { cloudProvider } from "./app.store";
import { SurrealDatabase } from "../access/surrealHelper";
import { ItemType } from "$lib/local/types/item.enum";

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
  window?.localStorage.setItem(ItemType[itemType], JSON.stringify(item));
}
export function retrieveLocally(itemType: ItemType) {
  try {
    if (import.meta.env?.SSR) {
      return null;
    }
    let value = window?.localStorage.getItem(ItemType[itemType]);
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
  /**
   * Creates a new Item. If Id is not provided, a new Id will be generated
   * @param item Item to be created
   * @param itemType ItemType
   * @returns Id of the created Item
   */
  create(item: Item, itemType: ItemType) {
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
          surrealDb.create(ItemType[itemType] + `:${item.id}`, item);
        } else {
          return surrealDb.create(ItemType[itemType], item);
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
  createMultiple(items: Item[], itemType: ItemType) {
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
        items.forEach((item: Item) => {
          if (item.id) {
            surrealDb.create(ItemType[itemType] + `:${item.id}`, item);
          } else {
            surrealDb.create(ItemType[itemType], item);
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
  update(item: any, itemType: ItemType) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let items: Item[] = retrieveLocally(itemType);
        if (!items) {
          items = [];
        }
        items = items.filter((x: Item) => x.id != item.id);
        items.push(item);
        persistLocally(itemType, items);
        break;
      case Cloud.surreal:
        return surrealDb.merge(item.id, item);
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
        items = items.filter((x: Item) => x.id != itemId);
        persistLocally(itemType, items);
        break;
      case Cloud.surreal:
        return surrealDb.delete(itemId);
    }
  }
  retrieve(itemId: string, itemType: ItemType) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let items = retrieveLocally(itemType);
        if (!items) {
          items = [];
        }
        let item = items.find((x: Item) => x.id == itemId);
        return item;
      case Cloud.surreal:
        return surrealDb.select(itemId);
    }
  }
  retrieveAll(itemType: ItemType) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let items = retrieveLocally(itemType);
        return items;
      case Cloud.surreal:
        surrealDb.select(ItemType[itemType]);
        break;
    }
    return [];
  }
  async searchByLabel(query: string, itemType: ItemType) {
    let results: Item[] = [];
    switch (get(cloudProvider)) {
      case Cloud.local:
        switch (itemType) {
          case ItemType.ALL:
            const tagList = retrieveLocally(ItemType.PointTag);
            const taskList = retrieveLocally(ItemType.PointTask);
            if (tagList) {
              const tagItems = tagList
                .filter((item: Item) =>
                  item.label.toLowerCase().includes(query.toLowerCase())
                )
                .map((x: Item) => {
                  return { label: x.label, id: x.id };
                });
              results = [...results, ...tagItems];
            }
            if (taskList) {
              const taskItems = taskList.filter((item: Item) =>
                item.label.toLowerCase().includes(query.toLowerCase())
              );
              results = [...results, ...taskItems];
            }
            break;
          default:
            let items = retrieveLocally(itemType);
            if (!items) break;
            items = items.filter((item: Item) =>
              item.label.toLowerCase().includes(query.toLowerCase())
            );
            results = items.map((x: Item) => {
              return { label: x.label, id: x.id };
            });
            break;
        }
        break;
      case Cloud.surreal:
        if (itemType != ItemType.ALL) {
          let searchResult = await surrealDb.query(
            `select * from $tb where string::lowercase(label) CONTAINS "$searchString"`,
            {
              tb: ItemType[itemType],
              searchString: query,
            }
          );
          if (searchResult && searchResult.length > 0) {
            results = searchResult[1].result;
          }
        }
    }
    return results;
  }
}
