<script lang="ts">
  import { onMount } from "svelte";
  import CacheLayer from "../layout/layers/CacheLayer.svelte";
  import { StoreDataType, type IStore } from "../types/data.type";
  import { resolveCurrentUserId, resolveToken } from "../utils/account.utils";
  import account from "../stores/account.store";
  import ExtensionThemeBase from "./ExtensionThemeBase.svelte";
  import {
    ClientStorageKey,
    PersistenceProvider
  } from "../persistence/persistence.type";
  import { logger } from "../components/debug/logger.client";
  import {
    extensionFlux,
    initExtensionFlux
  } from "../components/flux/fluxExtentionMediator";
  import { clientStorage } from "../persistence/persistence.utils";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { FluxMethod } from "../components/flux/flux.type";
  import { createEventDispatcher } from "svelte";
  import { Resource } from "../components/flux/resourceStores/resource.enum";
  const dispatch = createEventDispatcher();
  export let id: string;
  export let stores: IStore[] = [];
  let isMounted: boolean = false;
  onMount(async () => {
    window.addEventListener(
      "message",
      async function (event) {
        if (event.source != window) return;
        if (event.data.type && event.data.type == "signin") {
          await clientStorage.set(
            ClientStorageKey.STOKEN,
            event.data.token.token
          );
          await clientStorage.set(
            ClientStorageKey.USER_INFO,
            event.data.token.userInfo
          );
          await account.init();
          // chrome.storage.sync.set(
          //   {
          //     stoken: event.data.token.token,
          //     userInfo: event.data.token.userInfo
          //   },
          //   function () {
          //     console.log("Token is stored to be used later.");
          //     dataManager.runDboUpdate();
          //     $account.dataMode = UserDataMode.CLOUD;
          //   }
          // );
        }
      },
      false
    );
    let dapId = await clientStorage.get(ClientStorageKey.DAP_ID);
    if (!dapId) {
      dapId = generateSimpleRandomId();
      await clientStorage.set(ClientStorageKey.DAP_ID, dapId);
    }
    const token = await resolveToken();
    if (!token) {
      dispatch("login", {
        message: "No Login found."
      });
      return;
    }

    logger.log({
      at: "ExtensionBaseLayer.svelte",
      token,
      account: $account
    });
    await account.init();

    const currentUserId = await resolveCurrentUserId();
    // const initResult = await initFlux(
    //   stores,
    //   PersistenceProvider.DEXIE_SURREAL,
    //   new DexiePersistence(RemotePersistenceProvider.SURREAL),
    //   currentUserId
    // );
    const initResult = await initExtensionFlux(
      stores,
      PersistenceProvider.DEXIE_SURREAL,
      currentUserId
    );
    logger.log({ at: "initFlux", initResult });
    if (initResult === 0) {
      await extensionFlux({ method: FluxMethod.CLONE_DOWN });
    } else {
      await extensionFlux({ method: FluxMethod.SYNC_DOWN });
      await loadInMemoryStores();
    }
    isMounted = true;
  });

  async function loadInMemoryStores() {
    try {
      let kvStores = stores.filter((x) => x.dataType === StoreDataType.KVO);
      logger.log({
        at: "ExtensionBaseLayer.loadInMemoryStores",
        kvStores
      });
      if (!kvStores) return;
      const data = await extensionFlux({
        method: FluxMethod.SELECT_MANY,
        args: {
          resource: Resource.kv
        }
      });
      logger.log({
        at: "ExtensionBaseLayer.loadInMemoryStores",
        data
      });
      if (!data || !Array.isArray(data)) return;
      data.forEach((record: any) => {
        const store = kvStores.find(
          (x) => "kv:" + x.id === record.id.toString()
        );
        if (!store?.loader) return;
        store.loader(record);
      });
      let inMemoryResouceStores = stores.filter((x) => x.isInMemory);
      if (!inMemoryResouceStores) return;
      for (const store of inMemoryResouceStores) {
        const data = await extensionFlux({
          method: FluxMethod.SELECT_MANY,
          args: {
            resource: store.id as Resource
          }
        });
        if (data && Array.isArray(data) && store?.loader) {
          logger.log({
            at: "ExtensionBaseLayer.loadInMemoryStores - loading resource store",
            id: store.id,
            data
          });
          store.loader(data);
        }
      }
    } catch (e) {
      logger.error({
        at: "ExtensionBaseLayer.loadInMemoryStores",
        error: e
      });
    }
  }
</script>

<!-- <div
  {id}
  class={cn(
    "text-base text-fgs1 relative",
    $appearance.theme,
    $appearance.colorScheme.tailwindSelector
  )}
>
  <ThemeLayer extensionContext={id}>
    <slot />
  </ThemeLayer>
  {#if isMounted}
    <CacheLayer />
  {/if}
</div> -->
<ExtensionThemeBase {id}>
  <slot />
  {#if isMounted}
    <CacheLayer />
  {/if}
</ExtensionThemeBase>
