import {
  FluxMethod,
  type IFluxMethod,
  type IResourceTableConfig
} from "$lib/client/components/flux/flux.type";
import { ExtensionEvent } from "$lib/client/types/extension.type";
import {
  relayToBackgroundScript,
  relayToSidePanel
} from "$lib/client/utils/extension.utils";
import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
import { clientStorage } from "$lib/client/persistence/persistence.utils";
import { getDapId } from "$lib/client/persistence/persistence.utils";
import { resolveCurrentUserId } from "$lib/client/utils/account.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import { resourceStores } from "$lib/client/components/flux/resourceStores/resource.store";
import { kvStores } from "$lib/client/components/flux/resourceStores/kv.store";
import type { Extension } from "$lib/client/products/product.type";
import { resolveExtensionConfig } from "$lib/client/products/product.config";

export class ExtensionStore {
  static _extension: ExtensionStore | null = null;
  private tableConfig: IResourceTableConfig[] = [];

  private constructor(product?: Extension) {
    this.tableConfig = resolveExtensionConfig(product).tableConfig;
  }

  static getInstance(product?: Extension) {
    if (ExtensionStore._extension) return ExtensionStore._extension;
    ExtensionStore._extension = new ExtensionStore(product);
    return ExtensionStore._extension;
  }

  async bootup(extension: Extension) {
    const initResult = await this.initFlux();
    // logger.log({ at: "initFlux", initResult });
    await clientStorage.set(ClientStorageKey.EXTENSION_BOOTUP, {
      inProgress: true
    });
    await clientStorage.set(ClientStorageKey.PRODUCT, extension);
    if (initResult === 0) {
      await this.delegateFlux({ method: FluxMethod.CLONE_DOWN });
    } else {
      await this.syncDown();
    }
    await this.loadInMemoryStores();
    await clientStorage.set(ClientStorageKey.EXTENSION_BOOTUP, {
      inProgress: false
    });
    relayToSidePanel({
      event: ExtensionEvent.BOOTUP
    });
  }

  async initFlux() {
    const dapId = await getDapId();
    const currentUserId = await resolveCurrentUserId();
    return this.delegateFlux({
      method: FluxMethod.INIT_FLUX,
      args: {
        tables: this.tableConfig,
        params: {
          dapId,
          userId: currentUserId
        }
      }
    });
  }

  syncDown() {
    return this.delegateFlux({
      method: FluxMethod.SYNC_DOWN,
      args: { isReturnCount: false }
    });
  }

  loaderCallback(resource: string, data: any) {
    const allStores = [...resourceStores.values(), ...kvStores.values()];
    const store = allStores.find(
      (s) => s.id === resource || `kv:${s.id}` === resource
    );
    if (store?.loader) {
      store.loader(data);
    } else {
      logger.error({
        at: "ExtensionStore.loaderCallback",
        message: `No matching store found for resource "${resource}"`,
        data
      });
    }
  }

  async loadInMemoryResourceStore(id: string) {
    logger.log({
      at: "loadInMemoryResourceStore",
      id
    });
    const table = this.tableConfig.find((x) => x.name === id);
    if (!table) {
      logger.warn({
        at: "loadInMemoryResourceStore",
        id,
        message: "Table not found in tableConfig, skipping in-memory load."
      });
      return;
    }
    if (!table.isInMemory) {
      logger.warn({
        at: "loadInMemoryResourceStore",
        id,
        message: "Table is not marked as in-memory, skipping in-memory load."
      });
      return;
    }
    const data = await this.delegateFlux({
      method: FluxMethod.SELECT_MANY,
      args: { resource: table.name as Resource }
    });
    this.loaderCallback(id, data);
  }

  async loadInMemoryStores() {
    try {
      const data = await this.delegateFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.kv
        }
      });
      logger.log({
        at: "fluxExtentionMediator.loadInMemoryStores",
        data
      });
      if (!data || !Array.isArray(data)) return;
      data.forEach((record: any) => {
        this.loaderCallback(record.id.toString(), record);
      });
      const inMemoryResouceStores = this.tableConfig.filter(
        (x) => x.isInMemory
      );
      logger.debug({
        at: "fluxExtentionMediator.loadInMemoryStores - resource stores",
        inMemoryResouceStores
      });
      if (!inMemoryResouceStores.length) return;
      for (const store of inMemoryResouceStores) {
        const data = await this.delegateFlux({
          method: FluxMethod.SELECT_MANY,
          args: {
            resource: store.name as Resource
          }
        });
        if (data && Array.isArray(data)) {
          logger.log({
            at: "fluxExtentionMediator.loadInMemoryStores - loading resource store",
            id: store.name,
            data
          });
          this.loaderCallback(store.name as Resource, data);
        }
      }
    } catch (e) {
      logger.error({
        at: "fluxExtentionMediator.loadInMemoryStores",
        error: e
      });
    }
  }

  async delegateFlux(method: IFluxMethod) {
    const result = await relayToBackgroundScript({
      event: ExtensionEvent.FLUX_DELEGATION,
      data: {
        method
      }
    });
    if (result && result.init === -1) {
      if (method.method === FluxMethod.INIT_FLUX) {
        logger.error({
          at: "extensionStore.delegateFlux",
          message: "Flux initialization failed, not retrying."
        });
        return result;
      }
      logger.debug({
        at: "extensionStore.delegateFlux",
        message: "reinit flux"
      });
      await this.initFlux();
      return relayToBackgroundScript({
        event: ExtensionEvent.FLUX_DELEGATION,
        data: {
          method
        }
      });
    }
    return result;
  }
}
