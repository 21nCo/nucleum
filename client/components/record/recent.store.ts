import {
  isSameResource,
  resolveProductResources
} from "../flux/resourceStores/resource.utils";
import { ObservableStore } from "$lib/client/stores/client.store";
import type { IRecordId } from "$lib/client/types/data.type";
import { Resource } from "../flux/resourceStores/resource.enum";
import { resourceInList } from "../flux/resourceStores/resource.utils";
import type { IRecentsStore } from "./record.type";
import { headingNodeTypes } from "$lib/client/products/memotron/node/node.type";
import { rootNodeTypeList } from "$lib/client/products/memotron/node/node.type";
import { logger } from "../debug/logger.client";
import { resolveResourceStore } from "../flux/resourceStores/store.resolver";
import { appStore } from "$lib/client/stores/app.store";
import { get } from "svelte/store";

export class RecentsStore extends ObservableStore<IRecentsStore> {
  private readonly LIMIT = 20;
  constructor() {
    super("records-recents");
    this.set({ recents: [], isInitialized: false });
  }

  async refresh(resources: Resource[]) {
    let recents: { type: Resource; record: any; timestamp: Date }[] = [];
    for (const resource of resources) {
      const data = await this.recents(resource);
      recents = [
        ...recents,
        ...data.map((x) => ({
          type: resource,
          record: x,
          timestamp: x.modifiedAt
        }))
      ];
    }
    // const accessLogs = await accessLogStore.selectMany({
    //   filters: {
    //     resource: resources,
    //     action: ResourceActionType.OPEN
    //   },
    //   limit: 50,
    //   orderBy: {
    //     createdAt: "desc"
    //   }
    // });
    //TODO - fetch records from accessLogs by Id and merge
    this.set({ recents, isInitialized: true });
  }

  resolve(params?: { type?: Resource; exclude?: IRecordId[] }) {
    if (params?.type && params.type !== Resource.everything) {
      return this.get()
        .recents.filter((x) => x.type === params.type)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .map((x) => x.record)
        .filter((x) => !params.exclude?.some(resourceInList(x.id)));
    }
    return this.get()
      .recents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .map((x) => x.record);
  }

  add(record: any, params: { type: Resource; timestamp: Date }) {
    this.update((x) => {
      const filteredRecents = x.recents.filter(
        (y) => !isSameResource(y.record, record)
      );
      return {
        ...x,
        recents: [
          {
            type: params.type,
            timestamp: params.timestamp,
            record
          },
          ...filteredRecents
        ]
      };
    });
  }

  private async recents(resource?: Resource) {
    let data: any[] = [];
    if (resource === Resource.everything) {
      const resources = resolveProductResources(get(appStore).product);
      if (!resources) return [];
      for (const resource of resources) {
        const resourceData = await this.recentResources(resource);
        data = [...data, ...(resourceData ?? [])];
      }
    } else if (resource) {
      data = (await this.recentResources(resource)) ?? [];
    }
    return data;
  }

  private async recentResources(resource: Resource) {
    const resourceStore = resolveResourceStore(resource);
    const result = await resourceStore?.selectMany(
      {
        ...(resource === Resource.node
          ? {
              filters: {
                contentType: rootNodeTypeList.concat(headingNodeTypes),
                metaType: false
              }
            }
          : {}),
        orderBy: {
          modifiedAt: "desc"
        },
        limit: this.LIMIT
      },
      {
        isExpand: true
      }
    );
    logger.log({ at: "recentResources", result });
    return result;
  }
}

export const recentsStore = new RecentsStore();
