<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  import view from "@21n/stores/view.store";
  import { onMount } from "svelte";
  import type { ITileItem } from "@21n/landing/shared/landing.type";
  import PanelButton from "@21n/landing/shared/elements/PanelButton.svelte";
  import { isProductsPanelOpen } from "@21n/landing/shared/store/shared.store";
  import TileItem from "@21n/landing/shared/tile/TileItem.svelte";
  import { addAnimateClass } from "@21n/utils/ui.utils";

  let {
    currentProducts,
    upcomingProducts,
  }: {
    currentProducts: ITileItem[];
    upcomingProducts: ITileItem[];
  } = $props();

  const id: string = "products-panel";
  onMount(async () => {
    await addAnimateClass("animate-open-left", id);
  });
</script>

<div
  {id}
  class="absolute right-0 w-[740px] mo:w-full h-[100vh] flex bg-bgs1 cursor-default"
  onclick={(event) => event.stopPropagation()}
>
  <div class="flex flex-col gap-5 w-full pt-10 px-10 mo:px-6">
    <!-- {#if $view.isPortrait} -->
    <div class="flex pb-4">
      <p class="text-h3 font-medium">Products from 21n</p>
      {#if $view.isPortrait}
        <SvgIcon
          icon="close"
          class="ml-auto"
          onclick={async () => {
            await addAnimateClass("animate-close-right", id);
            $isProductsPanelOpen = false;
          }}
        />
      {/if}
    </div>
    <!-- {/if} -->
    <div class="flex flex-col gap-20 pb-10 overflow-y-scroll">
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-2 gap-6">
          {#each currentProducts as product}
            <TileItem
              item={product}
              isPanelView={true}
              isEnableBackground={true}
            />
          {/each}
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <p class="text-fgs2 text-h4 font-medium">Upcoming</p>
        <div class="grid grid-cols-2 gap-3">
          {#each upcomingProducts as product}
            <TileItem item={product} isPanelView={true} />
          {/each}
        </div>
      </div>
    </div>
  </div>
  <PanelButton
    label="Close"
    icon="close"
    isRightPanel={true}
    onclick={async () => {
      await addAnimateClass("animate-close-right", id);
      $isProductsPanelOpen = false;
    }}
  />
</div>
