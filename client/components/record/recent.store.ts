import { isSameResource } from "../flux/resourceStores/resource.utils";
import { ObservableStore } from "$lib/client/stores/client.store";
import type { IRecordId } from "$lib/client/types/data.type";
import { Resource } from "../flux/resourceStores/resource.enum";
import { resourceInList } from "../flux/resourceStores/resource.utils";
import type { IRecentsStore } from "./record.type";
import { headingNodeTypes } from "$lib/client/products/memotron/node/node.type";
import { flux } from "../flux/flux";
import { rootNodeTypeList } from "$lib/client/products/memotron/node/node.type";
import { activeResourceFilterV2 } from "$lib/client/utils/utils";
import { logger } from "../debug/logger.client";
import { accessLogStore } from "../accessLogging/accesslog.store";
import { localCacheableStores, remoteOnlyStores } from "$local/localStoresMap";
import type { ResourceStore } from "../flux/resourceStores/resource.store";
import { searcheableResources } from "$local/local";

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
      const nodes = await this.recentNodes();
      for (const resource of searcheableResources) {
        const resourceData = await this.recentResources(resource);
        data = [...nodes, ...(resourceData ?? [])];
      }
    } else if (resource === Resource.node) {
      data = await this.recentNodes();
    } else if (resource) {
      data = (await this.recentResources(resource)) ?? [];
    }
    return data;
  }

  private async recentNodes() {
    const result = await flux.selectMany(Resource.node, {
      properties: ["*", "parent.* as parent"],
      filters: {
        contentType: rootNodeTypeList.concat(headingNodeTypes),
        ...activeResourceFilterV2,
        creationContext: false
      },
      orderBy: {
        modifiedAt: "desc"
      },
      limit: this.LIMIT
    });
    logger.log({ at: "recentNodes", result });
    return result;
  }

  private async recentResources(resource: Resource) {
    const resourceStore = [...localCacheableStores, ...remoteOnlyStores].find(
      (store) => store.id === resource
    ) as ResourceStore<any>;
    const result = await resourceStore?.selectMany({
      orderBy: {
        modifiedAt: "desc"
      },
      limit: this.LIMIT
    });
    logger.log({ at: "recentResources", result });
    return result;
  }
}

export const recentsStore = new RecentsStore();
