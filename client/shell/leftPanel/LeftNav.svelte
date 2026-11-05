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
</script>

{#if !$appStore.isMenuHidden && !$view.isPortrait && productConfig.appMenu.length > 0}
  <LeftNavFixed {isRounded} {offlineStatus}>
    {#snippet panel()}
      <div class="h-full overflow-auto relative">
        {#if !isHidePanel && $appStore.currentComponent?.panel}
          {@const PanelComponent = $appStore.currentComponent.panel}
          <PanelComponent />
        {/if}
      </div>
    {/snippet}
  </LeftNavFixed>
{/if}
