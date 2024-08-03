<script lang="ts">
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import {
    NodeType,
    type INodeThumbnail
  } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeThumbnail from "../node/thumbnail/NodeThumbnail.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { afterUpdate, onMount } from "svelte";
  import ResourceThumbnailTitle from "../common/thumbnail/ResourceThumbnailTitle.svelte";
  import { fade } from "svelte/transition";

  export let nodes: INodeThumbnail[] = [];
  export let arrangement: Arrangement = Arrangement.LIST;
  export let parentBgIndex = 1;
  export let isApplyCustomColor: boolean = false;
  //TODO - user setting - columns, gap
  export let columns = 4;
  export let gap = 12; // Gap size in pixels
  let gridRef: any;
  let hoveredMasonryItem: string | undefined = undefined;

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

    const rowHeight = gap;
    const contentHeight =
      item.querySelector(".item-content")?.getBoundingClientRect().height ?? 0;
    const rowSpan = Math.ceil((contentHeight + gap) / (rowHeight + gap));
    item.style.gridRowEnd = `span ${rowSpan}`;
    item.style.height = `calc(${rowSpan} * (${rowHeight}px + ${gap}px) - ${gap}px)`;
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
    style="grid-template-columns: repeat({columns}, minmax(0, 1fr)); grid-auto-rows: {gap}px; gap: {gap}px;"
  >
    {#each nodes as item (item.id)}
      <div class="relative grid-item w-full" data-id={item.id}>
        <HoverableElement
          class="item-content w-full border rounded-md border-brs2 hover:border-aps2"
          type="button"
          on:hover={(e) => {
            if (e.detail) hoveredMasonryItem = item.id;
            else if (e.detail === false && hoveredMasonryItem === item.id)
              hoveredMasonryItem = undefined;
          }}
          on:click={(e) =>
            appStore.resourceClickHandler(e, item.id, ResourceAccessMode.POP)}
        >
          {#if item.contentType === NodeType.IMAGE}
            <img
              alt="Node thumbnail"
              class="w-full h-auto rounded-md"
              src={item.body.url}
              on:load={() =>
                resizeMasonryItem(
                  gridRef.querySelector(`[data-id="${item.id}"]`)
                )}
            />
          {:else if "body" in item && item.body}
            <span
              class="block text-left text-b2 p-4 bg-bgs2 rounded-lg shadow-md"
            >
              {item.label}
            </span>
          {/if}
          {#if hoveredMasonryItem === item.id && item.contentType === NodeType.IMAGE}
            <div
              class="absolute bottom-0 left-0 w-full bg-bgs3 rounded-b-md h-12 p-2 truncate text-b2 border-b border-x border-aps2"
              transition:fade={{ duration: 200 }}
            >
              <!-- TODO - hover content -->
              <!-- {item.label} -->
              <ResourceThumbnailTitle {item} />
            </div>
          {/if}
        </HoverableElement>
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
          variant={arrangement}
          collectionContext={"board"}
          {isApplyCustomColor}
          on:click={(e) =>
            appStore.resourceClickHandler(e, item.id, ResourceAccessMode.POP)}
        />
      {/each}
    </div>
    <ScrollViewBottomSpacer />
  </div>
{/if}
