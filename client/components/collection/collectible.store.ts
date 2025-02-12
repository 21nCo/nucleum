import { ActiveResourceStore } from "../flux/resourceStores/resource.store";
import type { ResourceStore } from "../flux/resourceStores/resource.store";
import type { IRecordId } from "$lib/client/types/data.type";
import { linker } from "$lib/client/products/memotron/linking/link.store";
import { isSameResource } from "../flux/resourceStores/resource.utils";
import { collectionStore } from "../collection/collection.store";
import type { ICollectionExpanded } from "./collection.type";
import { logger } from "../debug/logger.client";
import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
import type { IAvatar } from "$lib/client/types/avatar.type";

export class CollectibleStore<
  T extends {
    id: IRecordId;
    collections?: IRecordId[];
    createdAt: string;
    modifiedAt: string;
  },
  S extends ResourceStore<T>
> extends ActiveResourceStore<T, S> {
  async linkCollection(id: IRecordId, src?: IRecordId) {
    const resource = this.get();
    const result = await linker.link(src ?? resource.id, id);
    if (result) {
      this.update((n) => ({
        ...n,
        collections: [...(n.collections ?? []), id]
      }));
      await this.refreshTypes();
    }
    return result;
  }

  async unlinkCollection(id: IRecordId, src?: IRecordId) {
    const resource = this.get();
    await linker.unlink(src ?? resource.id, id);
    this.update((n) => ({
      ...n,
      collections: n.collections?.filter((x) => !isSameResource(x, id))
    }));
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
    const avatar = await this.refreshAvatar(self.id, {
      types
    });
    this.update((n) => ({ ...n, types, avatar }));
  }

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
    const avatar = this.resolveAvatar(types);
    this.resourceStore.modifyAsSystem(id, {
      avatar
    });
    return avatar;
  }

  private resolveAvatar(types: ICollectionExpanded[]) {
    const avatars = types
      ?.flatMap((x) => [x.avatar])
      .filter((a) => a) as IAvatar[];
    const baseAvatars = types
      ?.flatMap((x) => [x.typeToExtend?.avatar])
      .filter((a) => a) as IAvatar[];
    if (baseAvatars.length > 0) {
      return baseAvatars;
    } else {
      return avatars;
    }
  }
}
