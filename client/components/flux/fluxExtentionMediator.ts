import { logger } from "$lib/client/components/debug/logger.client";
import { flux, initFlux } from "$lib/client/components/flux/flux";
import { DexiePersistence } from "$lib/client/persistence/dexie/dexie.local";
import {
  RemotePersistenceProvider,
  type PersistenceProvider
} from "$lib/client/persistence/persistence.type";
// import { SurrealPersistence } from "$lib/client/persistence/surreal/surreal.local";
import { StoreDataType, type IStore } from "$lib/client/types/data.type";
import { ExtensionEvent } from "$lib/client/types/extension.type";
import { relayToBackgroundScript } from "$lib/client/utils/extension.utils";
import { FluxMethod, type IFluxMethod } from "./flux.type";
import { Resource } from "./resourceStores/resource.enum";
// import { getPort } from "@plasmohq/messaging/port"

export async function delegateToFlux(method: IFluxMethod) {
  try {
    logger.log({ at: "delegateToFlux", ...method });
    // return flux?.[method]?.(...args);
    if (method.method !== FluxMethod.INIT_FLUX && !flux) {
      while (!flux) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    switch (method.method) {
      case FluxMethod.CLONE_DOWN:
        const result = await flux.initializeEssentialDataForCloudUser();
        if (
          typeof result === "object" &&
          result?.ifrCloneResult?.paginateResources
        ) {
          await flux.paginateResources(
            result.ifrCloneResult.paginateResources,
            100
          );
        }
        return result;
      case FluxMethod.SYNC_DOWN:
        return flux?.syncDown();
      case FluxMethod.INIT_FLUX:
        return initFlux(
          method.args.stores,
          method.args.provider,
          new DexiePersistence(RemotePersistenceProvider.SURREAL),
          // new SurrealPersistence(),
          method.args.params
        );
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
      case FluxMethod.SEARCH:
        return flux?.search(method.args.storeId, method.args.query);
      default:
        return null;
    }
  } catch (error) {
    logger.error({ at: "delegateToFlux", method, error });
    return null;
  }
}

export function initExtensionFlux(
  stores: IStore[],
  provider: PersistenceProvider,
  params: {
    dapId: string;
    userId?: string;
  }
) {
  return relayToBackgroundScript({
    event: ExtensionEvent.FLUX_DELEGATION,
    data: {
      method: {
        method: FluxMethod.INIT_FLUX,
        args: {
          stores,
          provider,
          params
        }
      }
    }
  });
}

export function extensionFlux(method: IFluxMethod) {
  return relayToBackgroundScript({
    event: ExtensionEvent.FLUX_DELEGATION,
    data: {
      method
    }
  });
}

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
