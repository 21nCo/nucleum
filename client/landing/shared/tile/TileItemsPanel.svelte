<script lang="ts">
  import type { ITileItem } from "../Landing.types";
  import PanelButton from "../elements/PanelButton.svelte";
  import { isProductsPanelOpen } from "../store/shared.store";
  import TileItem from "./TileItem.svelte";

  export let currentProducts: ITileItem[];
  export let upcomingProducts: ITileItem[];
</script>

<div
  class="absolute right-0 w-[740px] h-[100vh] flex bg-bgs1"
  on:click|stopPropagation
  on:keypress|stopPropagation
>
  <div class="flex flex-col gap-3 w-full overflow-scroll p-10">
    <p class="text-fgs2 text-[21px] leading-[28px] font-medium">
      Current Products
    </p>
    <div class="grid grid-cols-2 gap-6">
      {#each currentProducts as product}
        <TileItem item={product} isPanelView={true} isEnableBackground={true} />
      {/each}
    </div>
    <p class="text-fgs2 text-[21px] leading-[28px] font-medium mt-6">
      Upcoming Products
    </p>
    <div class="grid grid-cols-2 gap-3">
      {#each upcomingProducts as product}
        <TileItem item={product} isPanelView={true} />
      {/each}
    </div>
  </div>
  <PanelButton
    label="Close"
    icon="close"
    on:click={() => ($isProductsPanelOpen = false)}
  />
</div>
