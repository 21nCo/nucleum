<script lang="ts">
  import Modal from "$lib/client/components/modal/Modal.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITileItem } from "./Landing.types";
  import PanelButton from "./elements/PanelButton.svelte";
  import {
    currentProductsStore,
    upcomingProductsStore
  } from "./store/shared.store";
  import TileItemsPanel from "./tile/TileItemsPanel.svelte";

  const currentProducts: ITileItem[] = $currentProductsStore;
  const upcomingProducts: ITileItem[] = $upcomingProductsStore;
  let isProductsPanelOpen: Boolean = false;
  function onClick() {
    console.log("onClick");
    isProductsPanelOpen = true;
  }
</script>

{#if isProductsPanelOpen}
  <div
    class={cn(
      "fixed w-[100vw] h-[100vh] z-[51]",
      !$appearance.colorScheme.isDark && "bg-[hsla(0,0%,0%,0.3)]",
      $appearance.colorScheme.isDark && "bg-[hsla(0,0%,100%,0.3)]"
    )}
    on:click={() => (isProductsPanelOpen = false)}
    on:keypress
  >
    <TileItemsPanel
      bind:isProductsPanelOpen
      {currentProducts}
      {upcomingProducts}
    />
  </div>
{/if}
<PanelButton label="Products" icon="ham-burger-menu" on:click={onClick} />
