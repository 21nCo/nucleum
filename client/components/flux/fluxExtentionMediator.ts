import { logger } from "$lib/client/components/debug/logger.client";
import { flux, initFlux } from "$lib/client/components/flux/flux";
import { DexiePersistence } from "$lib/client/persistence/dexie/dexie.local";
import {
  RemotePersistenceProvider,
  type PersistenceProvider
} from "$lib/client/persistence/persistence.type";
import type { IStore } from "$lib/client/types/data.type";
import { ExtensionEvent } from "$lib/client/types/extension.type";
import { relayToBackgroundScript } from "$lib/client/utils/extension.utils";
import { FluxMethod, type IFluxMethod } from "./flux.type";
// import { getPort } from "@plasmohq/messaging/port"

export async function delegateToFlux(method: IFluxMethod) {
  try {
    logger.log({ at: "delegateToFlux", method });
    // return flux?.[method]?.(...args);
    if (method.method !== FluxMethod.INIT_FLUX && !flux) {
      while (!flux) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    switch (method.method) {
      case FluxMethod.CLONE_DOWN:
        return flux?.cloneDown();
      case FluxMethod.SYNC_DOWN:
        return flux?.syncDown();
      case FluxMethod.INIT_FLUX:
        return initFlux(
          method.args.stores,
          method.args.provider,
          new DexiePersistence(RemotePersistenceProvider.SURREAL),
          method.args.userId,
          method.args.params
        );
      case FluxMethod.SELECT_MANY:
        return flux?.selectMany(method.args.resource, method.args.params);
      case FluxMethod.SELECT:
        return flux?.select(method.args.resourceId, method.args.properties);
      case FluxMethod.MUTATION:
        return flux?.mutation(method.args.resource, method.args.params);
      case FluxMethod.KV_MERGE:
        return flux?.kvMerge(method.args.storeId, method.args.data);
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
  userId: string,
  params?: {
    isLocalMode?: boolean;
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
          userId,
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
