<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { ITileItem } from "./Landing.types";
  import {
    currentProductsStore,
    upcomingProductsStore
  } from "./store/shared.store";
  import TileItemsPanel from "./tile/TileItemsPanel.svelte";

  const currentProducts: ITileItem[] = $currentProductsStore;
  const upcomingProducts: ITileItem[] = $upcomingProductsStore;
  let isProductsPanelOpen: Boolean = false;
  function onClick() {
    isProductsPanelOpen = true;
  }
</script>

{#if isProductsPanelOpen}
  <div
    class="fixed w-[100vw] h-[100vh] bg-bgs1 opacity-90 z-[51] overflow-scroll"
  >
    <TileItemsPanel {currentProducts} {upcomingProducts} />
  </div>
{:else}
  <button
    class="w-[115px] h-full border-r border-brs3 flex flex-col items-center justify-center p-4 text-center text-fgs3 text-base leading-5"
    on:click={onClick}
  >
    <SvgIcon icon="ham-burger-menu" size={Size.lg} />
    Products
  </button>
{/if}
