<script lang="ts">
  import { onMount } from "svelte";
  import CacheLayer from "../layout/layers/CacheLayer.svelte";
  import { dataManager } from "../persistence/dataManager";
  import type { IStore } from "../types/data.type";
  import { resolveCurrentUserId, resolveToken } from "../utils/account.utils";
  import account from "../stores/account.store";
  import ExtensionThemeBase from "./ExtensionThemeBase.svelte";
  import { UserDataMode } from "../types/account.type";
  import { flux, initFlux } from "../components/flux/flux";
  import { DexiePersistence } from "../persistence/dexie/dexie.local";
  import {
    ClientStorageKey,
    PersistenceProvider,
    RemotePersistenceProvider
  } from "../persistence/persistence.type";
  import { logger } from "../components/debug/logger.client";
  import {
    extentionFlux,
    initExtensionFlux
  } from "../components/flux/fluxExtentionMediator";
  import { clientStorage } from "../persistence/persistence.utils";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { FluxMethod } from "../components/flux/flux.type";

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
      //TODO - notify user to login
      return;
    }

    logger.debug({
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
    logger.debug({ at: "initFlux", initResult });
    if (initResult === 0) {
      await extentionFlux({ method: FluxMethod.CLONE_DOWN });
    } else {
      await extentionFlux({ method: FluxMethod.SYNC_DOWN });
    }
    isMounted = true;
  });
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
