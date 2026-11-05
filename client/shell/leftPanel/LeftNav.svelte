<svelte:options runes={true} />

<script lang="ts">
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import view from "@21n/ui/environment/view.store";
  import LeftNavFixed from "@nucleum/shell/leftPanel/LeftNavFixed.svelte";
  import PortraitBottomNav from "@nucleum/shell/leftPanel/PortraitBottomNav.svelte";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import type { Snippet } from "svelte";
  let {
    isHidePanel = false,
    offlineStatus = undefined,
    capture = undefined
  }: {
    isHidePanel?: boolean;
    /** Sync/offline status slot forwarded to the left nav bottom bar. */
    offlineStatus?: Snippet<[{ isIconOnly?: boolean }]>;
    /** Quick capture slot forwarded to the portrait bottom nav menu. */
    capture?: Snippet;
  } = $props();
  let isRounded = false;
  const productConfig = requireProductConfig();
</script>

{#if !$appStore.isMenuHidden}
  {#if $view.isPortrait && productConfig.appMenuPt.length > 0}
    <PortraitBottomNav {capture} />
  {:else if !$view.isPortrait && productConfig.appMenu.length > 0}
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
{/if}
