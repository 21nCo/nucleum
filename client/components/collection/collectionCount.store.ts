import { linker } from "$lib/client/products/memotron/linking/link.store";
import { LinkType } from "$lib/client/products/memotron/node/node.type";
import { ObservableStore } from "$lib/client/stores/client.store";
import type { IRecordId } from "$lib/client/types/data.type";
import { activeResourceFilterV2 } from "$lib/client/utils/utils";
import { logger } from "../debug/logger.client";
import { collectionStore } from "./collection.store";
import type { ICollectionCountStore } from "./collection.type";

class CollectionCountStore extends ObservableStore<ICollectionCountStore> {
  constructor() {
    super("collection-count");
    this.set({ counts: {}, isInitialized: false });
  }

  async initialize() {
    try {
      const collections = await collectionStore.selectMany({
        properties: ["id"],
        filters: { ...activeResourceFilterV2 }
      });
      let links = await linker.selectMany({
        properties: ["in.* as node", "out"],
        filters: {
          linkType: LinkType.DIRECT,
          out: collections.map((x) => x.id.toString())
        }
      });
      if (links && Array.isArray(links)) {
        links = links.filter((x) => {
          return !x.node.isArchived && !x.node.trashInformation;
        });
        const counts = links.reduce((acc, x) => {
          acc[x.out] = (acc[x.out] || 0) + 1;
          return acc;
        }, {});
        this.set({ counts, isInitialized: true });
      }
    } catch (error) {
      logger.error(error);
      return {};
    }
  }

  resolveCount(collectionId: IRecordId) {
    return this.get().counts[collectionId.toString()] || 0;
  }
}

export const collectionCountStore = new CollectionCountStore();
