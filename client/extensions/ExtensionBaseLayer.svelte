<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { StoreDataType, type IStore } from "../types/data.type";
  import {
    isTokenExpired,
    resolveCurrentUserId,
    resolveToken
  } from "../utils/account.utils";
  import account from "../stores/account.store";
  import ExtensionThemeBase from "./ExtensionThemeBase.svelte";
  import {
    ClientStorageKey,
    PersistenceProvider
  } from "../persistence/persistence.type";
  import { logger } from "../components/debug/logger.client";
  import {
    extensionFlux,
    initExtensionFlux,
    loadInMemoryResourceStore,
    loadInMemoryStores
  } from "../components/flux/fluxExtentionMediator";
  import { clientStorage, getDapId } from "../persistence/persistence.utils";
  import { FluxMethod } from "../components/flux/flux.type";
  import { createEventDispatcher } from "svelte";
  import { Resource } from "../components/flux/resourceStores/resource.enum";
  import { extractProduct } from "$lib/shared/utils/utils";
  import { relayToSidePanel } from "../utils/extension.utils";
  import { ExtensionEvent } from "../types/extension.type";
  import {
    cleanExtensionSprites,
    extensionSprites
  } from "../iconsV2/icon.store";
  //!Below working with dev but not build or package
  // import sprite from "data-text:/assets/icons/sprite.svg";
  // import spritePhBase from "data-text:/assets/icons/sprite-ph-base.svg";
  // import spritePhFill from "data-text:/assets/icons/sprite-ph-fill.svg";
  // import spritePhLight from "data-text:/assets/icons/sprite-ph-light.svg";
  import { resolveIconSvgSheetText } from "./iconSvgSheetTextResolver";
  import { appStore } from "../stores/app.store";
  const dispatch = createEventDispatcher();
  export let id: string;
  export let stores: IStore[] = [];
  export let isLoggedIn: boolean = false;
  export let product: { product: string; env: string };
  $: product = extractProduct(window.location.hostname);
  $: isSelfPage =
    product.product === "memotron" || process.env.NODE_ENV === "development";

  const sprites = [
    "sprite",
    "sprite-ph-base",
    "sprite-ph-light",
    "sprite-ph-fill"
  ];

  sprites.forEach((key) => {
    const content = resolveIconSvgSheetText(key);
    if (!content) return;
    const blob = new Blob([content], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    extensionSprites.set(key, url);
  });

  onMount(async () => {
    appStore.initializeProductInformation(product);
    window.addEventListener(
      "message",
      async function (event) {
        // console.log("message - extension", event);
        if (event.source != window || !isSelfPage) return;
        if (event.data.type && event.data.type == "signin") {
          await clientStorage.set(
            ClientStorageKey.STOKEN,
            event.data.token.token
          );
          await clientStorage.set(
            ClientStorageKey.USER_INFO,
            event.data.token.userInfo
          );
          dispatch("login", {
            code: 1
          });
          await bootup();
        }
      },
      false
    );
    await refreshUserSession();
  });

  onDestroy(() => {
    cleanExtensionSprites();
  });

  async function refreshUserSession() {
    const dapId = await getDapId();
    const token = await resolveToken();
    let isSessionExpired = false;
    if (token) isSessionExpired = await checkIfSessionExpired(token);
    if (!token || isSessionExpired) {
      dispatch("login", {
        code: -1
      });
      return;
    }
    await bootup();
    return true;
  }

  async function checkIfSessionExpired(token: string) {
    logger.log({ at: "checkIfSessionExpired" });
    const isExpired = isTokenExpired(token);
    if (isExpired) {
      await clientStorage.remove(ClientStorageKey.STOKEN);
      return true;
    }
    return false;
  }

  export async function onTabUpdate() {
    const token = await resolveToken();
    if (token) {
      await extensionFlux({ method: FluxMethod.SYNC_DOWN });
    }
    return token;
  }

  async function bootup() {
    try {
      await account.init();
      isLoggedIn = true;
      logger.log({
        at: "ExtensionBaseLayer.svelte bootup",
        account: $account
      });

      const currentUserId = await resolveCurrentUserId();
      // const initResult = await initFlux(
      //   stores,
      //   PersistenceProvider.DEXIE_SURREAL,
      //   new DexiePersistence(RemotePersistenceProvider.SURREAL),
      //   currentUserId
      // );
      const dapId = await getDapId();
      const initResult = await initExtensionFlux(
        stores,
        PersistenceProvider.DEXIE_SURREAL,
        {
          dapId,
          userId: currentUserId
        }
      );
      logger.log({ at: "initFlux", initResult });
      if (initResult === 0) {
        await extensionFlux({ method: FluxMethod.CLONE_DOWN });
      } else {
        await extensionFlux({ method: FluxMethod.SYNC_DOWN });
      }
      await loadInMemoryStores(stores);
      relayToSidePanel({
        event: ExtensionEvent.BOOTUP
      });
    } catch (e) {
      logger.error({
        at: "ExtensionBaseLayer.bootup",
        error: e
      });
    }
  }

  export async function loadInMemoryStore(resource: Resource) {
    logger.log({
      at: "ExtensionBaseLayer.loadInMemoryResourceStore",
      resource
    });
    if (!resource) return;
    const store = stores.find((x) => x.id === resource);
    if (!store || !store.isInMemory || !store.loader) return;
    await loadInMemoryResourceStore(store);
  }

  async function loadInMemoryStoresv1() {
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
      logger.log({
        at: "loadInMemorystores - resource stores",
        inMemoryResouceStores
      });
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
</ExtensionThemeBase>
