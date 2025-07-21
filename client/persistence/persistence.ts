import { Cloud } from "$lib/client/types/cloud.enum";
import { get, writable } from "svelte/store";
import type { JsonValue } from "$lib/client/types/json.type";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { interceptSurrealResponse } from "$lib/client/utils/utils";
import {
  performApiCall,
  performStaticDataOperation
} from "$lib/client/utils/network.utils";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import {
  clientStorage,
  persistLocally,
  retrieveLocally
} from "./persistence.utils";
import type {
  IResource,
  IResourceBase
} from "../components/flux/resourceStores/resource.type";
import { ClientStorageKey } from "./persistence.type";
import { extractFullTabData } from "../extensions/clipper/clipper.utils";
import {
  isContentScript,
  isExtensionEnvironment
} from "../utils/browser.utils";
import { parse } from "$lib/shared/utils/json.utils";

export const cloudProvider = writable(Cloud.surreal);

export class Persistence {
  surrealDb = new SurrealDatabase();
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
        data.userInfo = parse(localStorage.getItem("userInfo") ?? "");
      // TODO - perform singin at the source of the method - to remove circular dependency of persistance on account.store.
      // account.signIn(data, { isFromSignup: false, isIgnoreRefresh: false });
      return true;
    } catch (err) {
      logger.error({ at: "refreshToken", error: err });
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
      logger.error({ at: "getUserInfo", error: err });
    }
  };
  ping = async () => {
    try {
      const response = await performApiCall("v2/account/ping", "POST", {});
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return isValidArrayWithData(data);
    } catch (err) {
      logger.error({ at: "ping", error: err });
    }
  };

  getUserPlan = async () => {
    try {
      const response = await performApiCall("v2/plan/get", "POST", {});
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "getUserPlan", error: err });
    }
  };

  initiateSubscription = async (params: any) => {
    try {
      const response = await performApiCall("v2/plan/subscribe", "POST", {
        ...params
      });
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "initiateSubscription", error: err });
    }
  };

  modifySubscription = async (params: any) => {
    try {
      const response = await performApiCall("v2/plan/modify", "POST", {
        ...params
      });
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "modifySubscription", error: err });
    }
  };

  restorePurchase = async () => {
    try {
      const response = await performApiCall("v2/plan/restore", "POST", {});
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "restorePurchase", error: err });
    }
  };

  verifyPayment = async (nonce: string, embedTransaction?: any) => {
    try {
      const response = await performApiCall("v2/plan/verify", "POST", {
        nonce,
        embedTransaction
      });
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "verifyPayment", error: err });
    }
  };

  async runAccountAction(action: string, params: any) {
    try {
      const response = await performApiCall("account/n/action", "POST", {
        action,
        ...params
      });
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "runAccountAction", error: err });
    }
  }
  async runGeoAction(method: string, params: any) {
    try {
      const response = await performApiCall("utils/n/geo", "POST", {
        method,
        ...params
      });
      if (!response?.ok) {
        return;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      logger.error({ at: "runGeoAction", error: err });
    }
  }
  fetchAppData = async (env: string) => {
    try {
      const product = await clientStorage.get(ClientStorageKey.PRODUCT);
      if (!product) return;
      let response = await performStaticDataOperation(
        `static/${product}/${env}.json`
      );
      if (response?.ok) {
        let jsonValue = await response.json();
        if (!jsonValue) return;
        return jsonValue;
      }
    } catch (err) {
      throw err;
    }
  };
  /**
   * Creates a new Item. If Id is not provided, a new Id will be generated
   * @param item Item to be created
   * @param itemType ItemType
   * @returns Id of the created Item
   */
  create(item: IResource, itemType: Resource) {
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
          const id = Resource[itemType] + `:${item.id}`;
          item.id = id;
          return this.surrealDb.create(id, item);
        } else {
          return this.surrealDb.create(Resource[itemType], item);
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
  createMultiple<T extends IResourceBase>(items: T[], itemType: Resource) {
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
            this.surrealDb.create(Resource[itemType] + `:${item.id}`, item);
          } else {
            this.surrealDb.create(Resource[itemType], item);
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
    item: Partial<IResource> & Required<Pick<IResource, "id">>,
    itemType?: Resource
  ) {
    switch (get(cloudProvider)) {
      case Cloud.local: {
        if (!itemType) break;
        let items: IResourceBase[] = retrieveLocally(itemType);
        if (!items) {
          items = [];
        }
        items = items.filter((x: IResourceBase) => x.id != item.id);
        items.push(item);
        persistLocally(itemType, items);
        break;
      }
      case Cloud.surreal:
        item.modifiedAt = new Date().toISOString();
        return this.surrealDb.merge(
          itemType
            ? `${Resource[itemType]}:${item.id}`
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
  delete(itemId: string, itemType: Resource, userId?: string) {
    switch (get(cloudProvider)) {
      case Cloud.local: {
        let items = retrieveLocally(itemType);
        items = items.filter((x: IResourceBase) => x.id != itemId);
        persistLocally(itemType, items);
        break;
      }
      case Cloud.surreal:
        return this.surrealDb.delete(itemId, userId);
    }
  }
  retrieve(itemId: string, itemType: Resource | undefined = undefined) {
    switch (get(cloudProvider)) {
      case Cloud.local: {
        if (!itemType) break;
        let items = retrieveLocally(itemType);
        if (!items) {
          items = [];
        }
        let item = items.find((x: IResourceBase) => x.id == itemId);
        return item;
      }
      case Cloud.surreal:
        return this.surrealDb.select(itemId);
    }
  }
  retrieveAll(itemType: Resource) {
    try {
      switch (get(cloudProvider)) {
        case Cloud.local: {
          let items = retrieveLocally(itemType);
          return items;
        }
        case Cloud.surreal:
          return this.surrealDb.select(Resource[itemType]);
      }
      return [];
    } catch (error) {
      logger.error(error);
    }
  }
  async searchByLabel(
    searchString: string,
    itemType: Resource
  ): Promise<IResource[]> {
    let results: IResource[] = [];
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
        if (itemType != Resource.ALL) {
          const response = await this.surrealDb.executeReadFn(
            `select * from ${Resource[itemType]} where string::lowercase(label) CONTAINS $searchString and (isArchived is false or isArchived is none);`,
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
  async getSignedUrl(
    userId: string,
    contentType: string,
    fileName: string,
    isTemp: boolean
  ) {
    try {
      const response = await performApiCall(
        "utils/n/getsignedurl",
        "POST",
        {
          method: "PUT",
          contentType,
          fileName,
          userId,
          isTemp
        },
        { isFileApi: true }
      );
      return await response?.json();
    } catch (e) {
      logger.error({ at: "getSignedUrl", error: e });
    }
  }
  /**
   *
   * @param key key of the file including the bucket name and content type.
   * {bucket}/{userId}/{contentType}/{fileName}
   *
   * Examples:
   * tidyfilesdevsix.ap-south-1/m2d1y865ab801iq3fm4o9e2g/image/6fe1e59f-0554-4234-b7b6-366125ca0870_Chromewebstore.png
   *
   * @returns response {error?: string, url?: string}
   * If the authenticated user id does not match the userId in the key, the request will fail.
   *
   */
  async fetchSignedUrlForGet(key: string) {
    const response = await performApiCall(
      "utils/n/getsignedurl",
      "POST",
      {
        method: "GET",
        key
      },
      { isFileApi: true }
    );
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

  async retrieveUrlData(
    url: string,
    params?: {
      isReturnRawData?: boolean;
    }
  ) {
    const response = await performApiCall("utils/n/run", "POST", {
      url,
      action: "get-webpage"
    });
    let data;
    const isExtentionContentScript = isContentScript();
    const isExtensionEnv = isExtensionEnvironment();
    if (isExtensionEnv && isExtentionContentScript) {
      if (!response) return;
      data = response;
    } else {
      if (!response?.ok) return;
      data = await response.json();
    }
    if (params?.isReturnRawData) {
      return data;
    }
    let parsedData = null;
    if (data?.text) {
      parsedData = await parseHtml(data.text);
    }
    return { ...data, parsedData };
    function parseHtml(html: string) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      return extractFullTabData(doc, {
        docText: html,
        url
      });
    }
  }

  async browseUnsplash(params?: {
    query?: string;
    page?: number;
    perPage?: number;
  }) {
    const response = await performApiCall("utils/n/run", "POST", {
      action: "unsplash-browse",
      ...params
    });

    if (!response?.ok) return;
    const data = await response.json();
    return data;
  }

  async triggerUnsplashDownload(params?: { url: string }) {
    const response = await performApiCall("utils/n/run", "POST", {
      action: "unsplash-download",
      ...params
    });

    if (!response?.ok) return;
    const data = await response.json();
    return data;
  }
}

export const persistenceInstance = new Persistence();
