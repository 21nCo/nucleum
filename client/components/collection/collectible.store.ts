import { ActiveResourceStore } from "@21n/components/flux/resourceStores/resource.store";
import type { ResourceStore } from "@21n/components/flux/resourceStores/resource.store";
import type { IRecordId } from "@21n/types/data.type";
import { linker } from "@21n/products/memotron/linking/link.store";
import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
import { collectionStore } from "@21n/components/collection/collection.store";
import type {
  ICollectible,
  ICollectionExpanded,
  ICollectionItemPropertyValue
} from "@21n/components/collection/collection.type";
import { logger } from "@21n/components/debug/logger.client";
import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
import { resolveAvatar } from "@21n/components/collection/collection.utils";
import type {
  IResource,
  IResourceCaptureV2
} from "@21n/components/flux/resourceStores/resource.type";

export class CollectibleStore<
  T extends IResource & ICollectible,
  S extends ResourceStore<T, IResourceCaptureV2<T>>,
  V extends IResource & ICollectible
> extends ActiveResourceStore<T, S, V> {
  async linkCollection(id: IRecordId, src?: IRecordId) {
    const resource = this.get();
    const result = await linker.link(src ?? resource.id, id);
    if (result) {
      const collections = [...(resource.collections ?? []), id];
      this.modify({
        collections
      } as Partial<T>);
      await this.refreshTypes();
    }
    return result;
  }

  async unlinkCollection(id: IRecordId, src?: IRecordId) {
    const resource = this.get();
    await linker.unlink(src ?? resource.id, id);
    this.modify({
      collections: resource.collections?.filter((x) => !isSameResource(x, id))
    } as Partial<T>);
    await this.refreshTypes();
  }

  protected async refreshTypes() {
    const self = this.get();
    const collections = self.collections;
    if (!collections || collections.length === 0) {
      this.update((n) => ({ ...n, types: [] }));
      return;
    }
    const types = await collectionStore.resolveTypes(collections);
    // const avatar = await this.refreshAvatar(self.id, {
    //   types
    // });
    this.update((n) => ({ ...n, types }));
  }

  /**
   * @deprecated - using collections array at record source instead to avoid duplicate avatar, other type inherited settings for nodes, goals etc.
   * @param id
   * @param params
   * @returns
   */
  async refreshAvatar(
    id: IRecordId,
    params: {
      collections?: IRecordId[];
      types?: ICollectionExpanded[];
    }
  ) {
    logger.log({
      at: "CollectibleStore.refreshAvatar",
      params
    });
    let types = params?.types;
    if (!types && params.collections) {
      types = await collectionStore.resolveTypes(params.collections);
    }
    if (!types || !isValidArrayWithData(types)) return;
    const avatar = resolveAvatar(types);
    this.resourceStore.modifyAsSystem(id, {
      avatar
    } as unknown as Partial<T>);
    return avatar;
  }

  updateProperty = async (property: ICollectionItemPropertyValue) => {
    let properties = this.get().properties ?? [];
    properties = properties.filter((x) => !isSameResource(x, property));
    this.update((prev) => ({ ...prev, properties: [...properties, property] }));
    return this.resourceStore.modify(
      this.id,
      {
        properties: [...properties, property]
      } as Partial<T>,
      {
        isDebounced: true,
        debounceKey: "property" + property.id.toString()
      }
    );
  };
}
