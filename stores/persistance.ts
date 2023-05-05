import { Cloud } from "$lib/tidy/types/cloud.enum";
import type { JsonValue } from "$lib/tidy/types/json.type";
import { ItemType } from "$lib/tidy/types/item.enum";
import { get, writable } from "svelte/store";
import { cloudProvider } from "$lib/local/stores/session.store";
import type { Item } from "../types/item.type";
import type { Tag } from "$lib/local/types/tag.type";

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
  window?.localStorage.clear();
  window?.location.reload();
}

export function persistLocally<T extends JsonValue>(
  itemType: ItemType,
  item: T
) {
  window?.localStorage.setItem(ItemType[itemType], JSON.stringify(item));
}
export function retrieveLocally(itemType: ItemType) {
  try {
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
    }
    return item.id;
  }
  update(item: Item, itemType: ItemType) {
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
    }
  }
  delete(itemId: string, itemType: ItemType) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let items = retrieveLocally(itemType);
        items = items.filter((x: Item) => x.id != itemId);
        persistLocally(itemType, items);
        break;
    }
  }
  retrieve(itemType: ItemType) {
    switch (get(cloudProvider)) {
      case Cloud.local:
        let items = retrieveLocally(itemType);
        return items;
    }
    return [];
  }
  search(query: string, itemType: ItemType) {
    let results: Item[] = [];
    switch (get(cloudProvider)) {
      case Cloud.local:
        switch (itemType) {
          case ItemType.ALL:
            const tagList = retrieveLocally(ItemType.Tag);
            const taskList = retrieveLocally(ItemType.Task);
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
    }
    return results;
  }
}
