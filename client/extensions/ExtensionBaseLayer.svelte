<script lang="ts">
  import { onMount } from "svelte";
  import CacheLayer from "../layout/layers/CacheLayer.svelte";
  import { dataManager } from "../persistence/dataManager";
  import type { IStore } from "../types/data.type";
  import { resolveToken } from "../utils/account.utils";
  import account from "../stores/account.store";
  import ExtensionThemeBase from "./ExtensionThemeBase.svelte";
  export let id: string;
  export let stores: IStore[] = [];
  let isMounted: boolean = false;
  onMount(async () => {
    window.addEventListener(
      "message",
      function (event) {
        if (event.source != window) return;
        if (event.data.type && event.data.type == "signin") {
          localStorage.setItem("stoken", event.data.token.token);
          chrome.storage.sync.set(
            {
              stoken: event.data.token.token,
              userInfo: event.data.token.userInfo
            },
            function () {
              console.log("Token is stored to be used later.");
              $account.isLoggedIn = true;
            }
          );
        }
      },
      false
    );
    const token = await resolveToken();
    if (token) {
      $account.isLoggedIn = true;
    }
    await dataManager.initialize(stores);
    await dataManager.refreshClientCache();
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
