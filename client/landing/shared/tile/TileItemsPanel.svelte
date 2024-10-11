<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import view from "$lib/client/stores/view.store";
  import { onMount } from "svelte";
  import type { ITileItem } from "../Landing.types";
  import PanelButton from "../elements/PanelButton.svelte";
  import { isProductsPanelOpen } from "../store/shared.store";
  import TileItem from "./TileItem.svelte";
  import { addAnimateClass } from "$lib/client/utils/ui.utils";

  export let currentProducts: ITileItem[];
  export let upcomingProducts: ITileItem[];

  const id: string = "products-panel";
  onMount(async () => {
    await addAnimateClass("animate-open-left", id);
  });
</script>

<div
  {id}
  class="absolute right-0 w-[740px] mo:w-full h-[100vh] flex bg-bgs1 cursor-default"
  on:click|stopPropagation
  on:keypress|stopPropagation
  role="button"
  tabindex="0"
>
  <div class="flex flex-col gap-5 w-full pt-10 px-10 mo:px-6">
    <!-- {#if $view.isPortrait} -->
    <div class="flex pb-4">
      <p class="text-[17px] tp:text-[28px] leading-6 font-extrabold">
        Products
      </p>
      {#if $view.isPortrait}
        <SvgIcon
          icon="close"
          class="ml-auto"
          on:click={async () => {
            await addAnimateClass("animate-close-right", id);
            $isProductsPanelOpen = false;
          }}
        />
      {/if}
    </div>
    <!-- {/if} -->
    <div class="flex flex-col gap-6 overflow-y-scroll">
      <p
        class="text-fgs2 text-[21px] mo:text-[15px] leading-[28px] mo:leading-5 font-medium"
      >
        Apps
      </p>
      <div class="grid grid-cols-2 gap-6">
        {#each currentProducts as product}
          <TileItem
            item={product}
            isPanelView={true}
            isEnableBackground={true}
          />
        {/each}
      </div>
      <p
        class="text-fgs2 text-[21px] mo:text-[15px] leading-[28px] mo:leading-5 font-medium mt-3"
      >
        Upcoming
      </p>
      <div class="grid grid-cols-2 gap-3">
        {#each upcomingProducts as product}
          <TileItem item={product} isPanelView={true} />
        {/each}
      </div>
    </div>
  </div>
  <PanelButton
    label="Close"
    icon="close"
    isRightPanel={true}
    on:click={async () => {
      await addAnimateClass("animate-close-right", id);
      $isProductsPanelOpen = false;
    }}
  />
</div>
