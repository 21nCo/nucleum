import { Cloud } from "$lib/client/types/cloud.enum";
import { get, writable } from "svelte/store";
import type { JsonValue } from "$lib/client/types/json.type";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { Item } from "$lib/client/types/item.enum";
import type {
  DbRecord,
  DbRecordBase,
  DbRecordWithLabel
} from "../types/dbrecord.type";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import { performApiCall } from "$lib/client/utils/network.utils";
import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
import { logger } from "$lib/client/stores/log.store";
import {
  persistLocally,
  retrieveLocally
} from "$lib/client/utils/storage.utils";

export const cloudProvider = writable(Cloud.surreal);

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
    update
  };
};

export class Persistence {
  surrealDb = new SurrealDatabase(import.meta.env.VITE_SURREAL_URL);
  refreshToken = async () => {
    try {
      const token = localStorage.getItem("refresh-token");
      const response = await performApiCall("account/refreshToken", "POST", {
        token
      });
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      if (!data?.token) return;
      if (!data.userInfo)
        data.userInfo = JSON.parse(localStorage.getItem("userInfo") ?? "");
      // TODO - perform singin at the source of the method - to remove circular dependency of persistance on account.store.
      // account.signIn(data, { isFromSignup: false, isIgnoreRefresh: false });
      return true;
    } catch (err) {
      logger.logError(err);
    }
  };
  getUserInfo = async (token: string) => {
    try {
      const response = await performApiCall("account/n/refresh", "POST", {
        token
      });
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      if (!data?.userInfo) return;
      return data;
    } catch (err) {
      logger.logError(err);
    }
  };
  updateDbo = async (fromVersion: number | undefined = undefined) => {
    try {
      const response = await performApiCall("account/n/updateDb", "POST", {
        fromVersion: fromVersion ?? 1
      });
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.logError(err);
    }
  };
  ping = async () => {
    try {
      const response = await performApiCall("account/ping", "POST", {});
      console.log({ response });
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return isValidArrayWithData(data);
    } catch (err) {
      logger.logError(err);
    }
  };
  getLatestAppVersion = async (app: string) => {
    try {
      let response = await performApiCall("utils/n/retrieveAppData", "POST", {
        app
      });
      if (response?.ok) {
        let jsonValue = await response.json();
        if (!jsonValue) return;
        return jsonValue.version;
      }
    } catch (err) {
      logger.logError(err);
    }
  };
  fetchAppData = async () => {
    try {
      const app = import.meta.env.VITE_APP ?? window.location.hostname;
      console.log({ app });
      if (!app) return;
      let response = await performApiCall("utils/n/retrieveAppData", "POST", {
        app
      });
      if (response?.ok) {
        let jsonValue = await response.json();
        if (!jsonValue) return;
        return jsonValue;
      }
    } catch (err) {
      logger.logError(err);
    }
  };
  /**
   * Creates a new Item. If Id is not provided, a new Id will be generated
   * @param item Item to be created
   * @param itemType ItemType
   * @returns Id of the created Item
   */
  create(item: DbRecord, itemType: Item) {
    item = {
      ...item,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };
    switch (get(cloudProvider)) {
      case Cloud.local:
        // let items = retrieveLocally(itemType);
        // if (!items) {
        //   items = [];
        // }
        // items.push(item);
        // persistLocally(itemType, items);
        break;
      case Cloud.surreal:
        if (item.id) {
          const id = Item[itemType] + `:${item.id}`;
          item.id = id;
          return this.surrealDb.create(id, item);
        } else {
          return this.surrealDb.create(Item[itemType], item);
        }
    }
    return item.id;
  }
  /**
   * Creates a new Item. If Id is not provided, a new Id will be generated
   * @param item Item to be created
   * @param itemType ItemType
   * @returns Id of the created Item
   */
  createMultiple<T extends DbRecordBase>(items: T[], itemType: Item) {
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
            this.surrealDb.create(Item[itemType] + `:${item.id}`, item);
          } else {
            this.surrealDb.create(Item[itemType], item);
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
    item: Partial<DbRecord> & Required<Pick<DbRecord, "id">>,
    itemType?: Item
  ) {
    switch (get(cloudProvider)) {
      case Cloud.local: {
        if (!itemType) break;
        let items: DbRecordBase[] = retrieveLocally(itemType);
        if (!items) {
          items = [];
        }
        items = items.filter((x: DbRecordBase) => x.id != item.id);
        items.push(item);
        persistLocally(itemType, items);
        break;
      }
      case Cloud.surreal:
        item.modifiedAt = new Date().toISOString();
        return this.surrealDb.merge(
          itemType
            ? `${Item[itemType]}:${item.id}`
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
  delete(itemId: string, itemType: Item, userId?: string) {
    switch (get(cloudProvider)) {
      case Cloud.local: {
        let items = retrieveLocally(itemType);
        items = items.filter((x: DbRecordBase) => x.id != itemId);
        persistLocally(itemType, items);
        break;
      }
      case Cloud.surreal:
        return this.surrealDb.delete(itemId, userId);
    }
  }
  retrieve(itemId: string, itemType: Item | undefined = undefined) {
    switch (get(cloudProvider)) {
      case Cloud.local: {
        if (!itemType) break;
        let items = retrieveLocally(itemType);
        if (!items) {
          items = [];
        }
        let item = items.find((x: DbRecordBase) => x.id == itemId);
        return item;
      }
      case Cloud.surreal:
        return this.surrealDb.select(itemId);
    }
  }
  retrieveAll(itemType: Item) {
    try {
      switch (get(cloudProvider)) {
        case Cloud.local: {
          let items = retrieveLocally(itemType);
          return items;
        }
        case Cloud.surreal:
          return this.surrealDb.select(Item[itemType]);
      }
      return [];
    } catch (error) {
      logger.logError(error);
    }
  }
  async searchByLabel(
    searchString: string,
    itemType: Item
  ): Promise<DbRecordWithLabel[]> {
    let results: DbRecordWithLabel[] = [];
    switch (get(cloudProvider)) {
      case Cloud.local:
      // switch (itemType) {
      //   case ItemEnum.ALL: {
      //     const tagList = retrieveLocally(ItemEnum.PointTag);
      //     const taskList = retrieveLocally(ItemEnum.PointTask);
      //     if (tagList) {
      //       const tagItems = tagList
      //         .filter((item: DbRecordWithLabel) =>
      //           item.label.toLowerCase().includes(searchString.toLowerCase())
      //         )
      //         .map((x: DbRecordWithLabel) => {
      //           return { label: x.label, id: x.id };
      //         });
      //       results = [...results, ...tagItems];
      //     }
      //     if (taskList) {
      //       const taskItems = taskList.filter((item: DbRecordWithLabel) =>
      //         item.label.toLowerCase().includes(searchString.toLowerCase())
      //       );
      //       results = [...results, ...taskItems];
      //     }
      //     break;
      //   }
      //   default: {
      //     let items = retrieveLocally(itemType);
      //     if (!items) break;
      //     items = items.filter((item: DbRecordWithLabel) =>
      //       item.label.toLowerCase().includes(searchString.toLowerCase())
      //     );
      //     results = items.map((x: DbRecordWithLabel) => {
      //       return { label: x.label, id: x.id };
      //     });
      //     break;
      //   }
      // }
      // break;
      case Cloud.surreal:
        if (itemType != Item.ALL) {
          const response = await this.surrealDb.executeReadFn(
            `select * from ${Item[itemType]} where string::lowercase(label) CONTAINS $searchString and (isArchived is false or isArchived is none);`,
            {
              searchString: searchString.toLowerCase()
            }
          );
          results = interceptSurrealResponse(response);
        }
        break;
      default:
        break;
    }
    return results;
  }
  async fetchDailyJournal(context: string, start: Date, end: Date) {
    const query = "return fn::global::journal::daily($context, $start, $end)";
    const response = await this.surrealDb.executeReadFn(query, {
      context,
      start: start.toISOString(),
      end: end.toISOString()
    });
    return interceptSurrealResponse(response, query);
  }
  async fetchJournal(
    context: string,
    scale: "MONTHS" | "YEARS",
    start: number,
    end: number
  ) {
    const query = "return fn::global::journal($context, $scale, $start, $end)";
    const response = await this.surrealDb.executeReadFn(query, {
      context,
      scale,
      start,
      end
    });
    return interceptSurrealResponse(response, query);
  }
  async getSignedUrl(userId: string, contentType: string, fileName: string) {
    const response = await performApiCall("utils/n/getsignedurl", "POST", {
      contentType,
      fileName,
      userId
    });
    return await response?.json();
  }
  async uploadFile(uploadUrl: string, contentType: string, blob: any) {
    const result = await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: {
        "Content-Type": contentType
        // "x-amz-acl": "public-read"
      }
    });
    if (result.status === 200) {
      return uploadUrl;
    } else {
      return null;
    }
  }
}
