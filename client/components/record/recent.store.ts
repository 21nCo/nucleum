import {
  isSameResource,
  resolveProductResources
} from "@21n/components/flux/resourceStores/resource.utils";
import { ObservableStore } from "@21n/stores/client.store";
import type { IRecordId } from "@21n/types/data.type";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
import type { IRecentsStore } from "@21n/components/record/record.type";
import { rootNodeTypeList } from "@21n/products/memotron/node/node.type";
import { logger } from "@21n/components/debug/logger.client";
import { appStore } from "@21n/stores/app.store";
import { datafn } from "@21n/stores/datafn.store";
import { get } from "svelte/store";

function resolveTimestamp(value: unknown): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export class RecentsStore extends ObservableStore<IRecentsStore> {
  private readonly LIMIT = 20;
  constructor() {
    super("records-recents");
    this.set({ recents: [], isInitialized: false });
  }

  async refresh(resources: Resource[]) {
    let recents: { type: Resource; record: any; timestamp: Date }[] = [];
    for (const resource of resources) {
      try {
        const data = await this.recents(resource);
        recents = [
          ...recents,
          ...data.flatMap((x) => {
            const timestamp = resolveTimestamp(x.updatedAt ?? x.modifiedAt);
            if (!timestamp) return [];
            return [
              {
                type: resource,
                record: x,
                timestamp
              }
            ];
          })
        ];
      } catch (error) {
        logger.error({ at: "recentsStore.refresh", resource }, error);
      }
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
    const recents = this.get()
      .recents.map((entry) => ({
        ...entry,
        timestamp: resolveTimestamp(entry.timestamp)
      }))
      .filter((entry) => entry.record && entry.timestamp);
    if (params?.type && params.type !== Resource.everything) {
      return recents
        .filter((x) => x.type === params.type)
        .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())
        .map((x) => x.record)
        .filter((x) => !params.exclude?.some(resourceInList(x.id)));
    }
    return recents
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())
      .map((x) => x.record);
  }

  add(record: any, params: { type: Resource; timestamp: Date }) {
    const timestamp = resolveTimestamp(params.timestamp);
    if (!timestamp) return;
    this.update((x) => {
      const filteredRecents = x.recents.filter(
        (y) => !isSameResource(y.record, record)
      );
      return {
        ...x,
        recents: [
          {
            type: params.type,
            timestamp,
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
    const datafnResource =
      resource === Resource.goal ? "objective" : resource.toString();
    const result = await datafn.table(datafnResource).query({
      filters: {
        trashedAt: null,
        isArchived: false
      },
      sort: ["-updatedAt"],
      limit: this.LIMIT
    });
    logger.log({ at: "recentResources", resource, result });
    return result.data;
  }
}

export const recentsStore = new RecentsStore();
