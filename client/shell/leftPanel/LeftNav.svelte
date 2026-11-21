<svelte:options runes={true} />

<script lang="ts">
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import view from "@21n/ui/environment/view.store";
  import LeftNavFixed from "@nucleum/shell/leftPanel/LeftNavFixed.svelte";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import type { Snippet } from "svelte";
  let {
    isHidePanel = false,
    offlineStatus = undefined
  }: {
    isHidePanel?: boolean;
    /** Sync/offline status slot forwarded to the left nav bottom bar. */
    offlineStatus?: Snippet<[{ isIconOnly?: boolean }]>;
  } = $props();
  let isRounded = false;
  const productConfig = requireProductConfig();
  const loadPanel = $derived($appStore.currentComponent?.panel);
</script>

{#if !$appStore.isMenuHidden && !$view.isPortrait && productConfig.appMenu.length > 0}
  <LeftNavFixed {isRounded} {offlineStatus}>
    {#snippet panel()}
      <div class="app-content h-full overflow-auto relative bg-bgs2">
        {#if !isHidePanel && loadPanel}
          {#await loadPanel() then { default: PanelComponent }}
            <PanelComponent />
          {:catch}
            <p class="p-4 text-fgs3" role="status">This panel couldn't load.</p>
          {/await}
        {/if}
      </div>
    {/snippet}
  </LeftNavFixed>
{/if}
