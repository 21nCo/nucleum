<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import {
    NodeType,
    type INodeThumb
  } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeThumbnail from "../node/thumbnail/NodeThumbnail.svelte";
  import { afterUpdate, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import view from "$lib/client/stores/view.store";
  import NodeThumbnailTitle from "../node/thumbnail/NodeThumbnailTitle.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { hoverable } from "$lib/client/actions/hover.action";
  import type { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IProperty } from "./properties/property.type";

  export let nodes: INodeThumb[] = [];
  export let arrangement: Arrangement = Arrangement.LIST;
  export let density = 1;
  export let isHidePreview: boolean = false;
  export let isHideTitle: boolean = false;
  export let parentBgIndex = 1;
  export let isApplyCustomColor: boolean = false;
  export let isDraggable: boolean = false;
  export let accessPointId: IRecordId | undefined = undefined;
  export let accessPoint: ResourceAccessPoint | undefined = undefined;
  export let visibleProps: IProperty[] = [];

  $: columns = Math.floor(($view.width / 500) * density);

  export let gap = 12;
  let rowHeight = 4;
  let gridRef: any;
  let hoveredMasonryItem: IRecordId | undefined = undefined;

  $: if (arrangement === Arrangement.MASONRY && gridRef) {
    resizeAllMasonryItems();
  }

  afterUpdate(() => {
    if (arrangement === Arrangement.MASONRY) {
      resizeAllMasonryItems();
    }
  });

  onMount(() => {
    if (arrangement != Arrangement.MASONRY) return;
    resizeAllMasonryItems();
    window.addEventListener("resize", resizeAllMasonryItems);

    return () => {
      window.removeEventListener("resize", resizeAllMasonryItems);
    };
  });

  function resizeMasonryItem(item: HTMLElement) {
    if (!gridRef) return;

    const contentHeight =
      item.querySelector(".item-content")?.getBoundingClientRect().height ?? 0;
    const rowSpan = Math.ceil((contentHeight + gap) / (rowHeight + gap));
    item.style.gridRowEnd = `span ${rowSpan}`;
    // item.style.height = `calc(${rowSpan} * (${rowHeight}px + ${gap}px) - ${gap}px)`;
    if (
      ![
        NodeType.IMAGE,
        NodeType.WEB_SCREENSHOT_CLIP,
        NodeType.YOUTUBE_TIMESTAMP_CLIP,
        NodeType.WEB_PAGE,
        NodeType.KINDLE_BOOK,
        NodeType.YOUTUBE_VIDEO,
        NodeType.TWITTER_PROFILE
      ].includes(item.getAttribute("data-type") as NodeType)
    ) {
      const child = item.querySelector(".item-content");
      if (child && child instanceof HTMLElement) {
        child.style.height = "100%";
        // child.style.minHeight = "40px";
      }
    }
  }

  function resizeAllMasonryItems() {
    if (!gridRef) return;
    const allItems = gridRef.getElementsByClassName("grid-item");
    for (let item of allItems) {
      resizeMasonryItem(item as HTMLElement);
    }
  }
</script>

{#if arrangement === Arrangement.MASONRY}
  <div
    bind:this={gridRef}
    class="w-full h-full grid gap-4"
    style="grid-template-columns: repeat({columns}, minmax(0, 1fr)); grid-auto-rows: {rowHeight}px; gap: {gap}px;"
  >
    {#each nodes as item (item.id)}
      <div
        class="relative grid-item w-full"
        data-id={item.id}
        data-type={item.contentType}
        draggable={isDraggable}
      >
        <button
          class="item-content w-full border rounded-md border-brs2 hover:border-aps2"
          type="button"
          use:hoverable={{
            onHover: (e) => {
              if (e) hoveredMasonryItem = item.id;
              else if (
                e === false &&
                hoveredMasonryItem &&
                isSameResource(hoveredMasonryItem, item.id)
              )
                hoveredMasonryItem = undefined;
            }
          }}
          on:click={(e) => appStore.resourceClickHandler(e, item.id)}
        >
          <NodeThumbnail
            {item}
            {parentBgIndex}
            {arrangement}
            {accessPoint}
            {accessPointId}
            {isHideTitle}
            {visibleProps}
            on:load={() =>
              resizeMasonryItem(
                gridRef.querySelector(`[data-id="${item.id}"]`)
              )}
          />
        </button>
      </div>
    {/each}
  </div>
{:else}
  <div class="flex flex-col w-full h-full">
    <div
      class={cn("flex h-full w-full gap-4", {
        "flex-col justify-start":
          arrangement === Arrangement.LIST ||
          arrangement === Arrangement.TIMELINE,
        "flex--row flex--wrap h-full w-full gap-4 grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] content-start":
          arrangement === Arrangement.GRID
      })}
    >
      {#each nodes as item}
        <NodeThumbnail
          {item}
          {parentBgIndex}
          {arrangement}
          {isDraggable}
          {accessPoint}
          {accessPointId}
          {isHidePreview}
          {visibleProps}
          collectionContext={"board"}
          {isApplyCustomColor}
          on:click={(e) => appStore.resourceClickHandler(e, item.id)}
        />
      {/each}
    </div>
    <ScrollViewBottomSpacer />
  </div>
{/if}
