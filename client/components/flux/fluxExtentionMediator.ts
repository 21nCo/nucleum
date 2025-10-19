import { logger } from "@21n/components/debug/logger.client";
import { flux, initFlux } from "@21n/components/flux/flux";
import { DexiePersistence } from "@21n/persistence/dexie/dexie.local";
import { StoreDataType, type IStore } from "@21n/types/data.type";
import { ExtensionEvent } from "@21n/types/extension.type";
import { relayToBackgroundScript } from "@21n/utils/extension.utils";
import {
  FluxMethod,
  type IFluxInitArgs,
  type IFluxMethod
} from "@21n/components/flux/flux.type";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { clientStorage } from "@21n/persistence/persistence.utils";
import { ClientStorageKey } from "@21n/persistence/persistence.type";
import { Extension } from "@21n/products/product.type";
import { ExtensionStore } from "@21n/extensions/extension.store";

// import { getPort } from "@plasmohq/messaging/port"

export async function delegateToFlux(method: IFluxMethod) {
  try {
    logger.log({ at: "delegateToFlux", ...method, flux });
    if (method.method !== FluxMethod.INIT_FLUX && !flux) {
      return {
        init: -1
      };
    }
    switch (method.method) {
      case FluxMethod.CLONE_DOWN:
        const result = await flux.initializeEssentialDataForCloudUserV2();
        if (typeof result === "object" && result?.cursors) {
          await flux.paginateResourcesV2(result.cursors);
        }
        return result;
      case FluxMethod.SYNC_DOWN:
        return flux?.syncDown({
          isReturnCount: method.args?.isReturnCount ?? false
        });
      case FluxMethod.RECONCILE:
        return flux?.reconcile({
          counts: method.args.counts
        });
      case FluxMethod.INIT_FLUX:
        return initializeFlux(method.args);
      case FluxMethod.SELECT_MANY:
        return flux?.selectMany(method.args.resource, method.args.params);
      case FluxMethod.SELECT:
        return flux?.select(method.args.resourceId, method.args.properties);
      case FluxMethod.MUTATION:
        return flux?.mutation(
          method.args.resource,
          method.args.params,
          method.args.additionalParams
        );
      case FluxMethod.KV_MERGE:
        return flux?.kvMerge(method.args.storeId, method.args.data);
      default:
        return null;
    }
  } catch (error) {
    logger.error({ at: "delegateToFlux", method, error });
    return null;
  }

  async function initializeFlux(params: IFluxInitArgs) {
    logger.debug({ at: "delegateToFlux - initializeFlux" });

    return initFlux(new DexiePersistence(), {
      tables: params.tables,
      product: "extension",
      dapId: params.params.dapId,
      userId: params.params.userId,
      appVersion: "1.0.0"
    });
  }
}

/**
 * @deprecated - use extension.store instead
 * @param stores
 * @returns
 */
export function initExtensionFlux(stores: IStore[]) {
  return relayToBackgroundScript({
    event: ExtensionEvent.FLUX_DELEGATION,
    data: {
      method: {
        method: FluxMethod.INIT_FLUX,
        args: {
          stores
        }
      }
    }
  });
}

export async function extensionFlux(method: IFluxMethod) {
  const prod = await clientStorage.get(ClientStorageKey.PRODUCT);
  if (!prod) {
    return { init: -1 } as any;
  }
  return ExtensionStore.getInstance(prod as Extension).delegateFlux(method);
}

/**
 * @deprecated - use extension.store instead
 * @param store
 */
export async function loadInMemoryResourceStore(store: IStore) {
  logger.log({
    at: "fluxExtentionMediator.loadInMemoryResourceStore",
    store
  });
  if (store?.loader) {
    const data = await extensionFlux({
      method: FluxMethod.SELECT_MANY,
      args: { resource: store.id as Resource }
    });
    store.loader(data);
  }
}

/**
 * @deprecated - use extension.store instead
 * @param stores
 * @returns
 */
export async function loadInMemoryStores(stores: IStore[]) {
  try {
    let kvStores = stores.filter((x) => x.dataType === StoreDataType.KVO);
    logger.log({
      at: "fluxExtentionMediator.loadInMemoryStores",
      kvStores
    });
    if (!kvStores) return stores;
    const data = await extensionFlux({
      method: FluxMethod.SELECT_MANY,
      args: {
        resource: Resource.kv
      }
    });
    logger.log({
      at: "fluxExtentionMediator.loadInMemoryStores",
      data
    });
    if (!data || !Array.isArray(data)) return stores;
    data.forEach((record: any) => {
      const store = kvStores.find((x) => "kv:" + x.id === record.id.toString());
      if (!store?.loader) return;
      store.loader(record);
    });
    let inMemoryResouceStores = stores.filter((x) => x.isInMemory);
    logger.debug({
      at: "fluxExtentionMediator.loadInMemoryStores - resource stores",
      inMemoryResouceStores
    });
    if (!inMemoryResouceStores) return stores;
    for (const store of inMemoryResouceStores) {
      const data = await extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: store.id as Resource
        }
      });
      if (data && Array.isArray(data) && store?.loader) {
        logger.log({
          at: "fluxExtentionMediator.loadInMemoryStores - loading resource store",
          id: store.id,
          data
        });
        store.loader(data);
      }
    }
    return stores;
  } catch (e) {
    logger.error({
      at: "fluxExtentionMediator.loadInMemoryStores",
      error: e
    });
    return stores;
  }
}
