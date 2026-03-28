<script lang="ts">
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { Arrangement } from "@21n/types/direction.enum";
  import {
    NodeType,
    type INodeThumb
  } from "@21n/products/memotron/node/node.type";
  import { cn } from "@21n/utils/ui.utils";
  import NodeThumbnail from "@21n/products/memotron/node/thumbnail/NodeThumbnail.svelte";
import { afterUpdate, onDestroy, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import view from "@21n/stores/view.store";
  import NodeThumbnailTitle from "@21n/products/memotron/node/thumbnail/NodeThumbnailTitle.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
  import { hoverable } from "@21n/actions/hover.action";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import type { IProperty } from "@21n/components/collection/properties/property.type";
import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
import { bulkEditStore } from "@21n/components/record/bulkedit.store";
import { BulkEditor } from "@21n/components/record/record.store";
import { toasts } from "@21n/stores/notification.store";
  import { logger } from "@21n/components/debug/logger.client";
  import { resolveFilePreview } from "@21n/products/memotron/node/node.utils";

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

  $: columns = Math.max(1, Math.floor(($view.width / 500) * density));

  export let gap = 12;
  let rowHeight = 4;
  let gridRef: any;
  let hoveredMasonryItem: IRecordId | undefined = undefined;

  $: if (arrangement === Arrangement.MASONRY && gridRef) {
    resizeAllMasonryItems();
  }
  $: multiSelectContext = {
    resource: Resource.node,
    accessPoint: accessPoint ?? ResourceAccessPoint.BROWSER,
    accessPointId
  };

  function selectAll() {
    return nodes.map((item) => item.id);
  }

  async function handleBulkAction(
    ids: IRecordId[],
    action: string,
    data?: unknown
  ) {
    try {
      const editor = new BulkEditor(Resource.node, bulkEditStore);
      await editor.run(action, data);
    } catch (e) {
      toasts.error("Failed to perform bulk action");
    }
  }

  function resolveBulkEditorInstance() {
    bulkEditStore.activate(multiSelectContext, {
      onAction: handleBulkAction,
      onSelectAll: selectAll,
      subContext: accessPointId?.toString()
    });
  }

  $: {
    multiSelectContext;
    nodes;
    resolveBulkEditorInstance();
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

  onDestroy(() => {
    if (bulkEditStore.matchesContext(multiSelectContext)) {
      bulkEditStore.clear();
    }
  });

  function resizeMasonryItem(item: HTMLElement) {
    if (!gridRef) return;
    const itemContentType = item.getAttribute("data-type") as NodeType;
    const hasPicture = item.getAttribute("data-has-picture");
    const contentHeight =
      itemContentType === NodeType.AUDIO && !hasPicture
        ? 180
        : (item.querySelector(".item-content")?.getBoundingClientRect()
            .height ?? 0);
    const rowSpan = Math.ceil((contentHeight + gap) / (rowHeight + gap));
    item.style.gridRowEnd = `span ${rowSpan}`;
    // item.style.height = `calc(${rowSpan} * (${rowHeight}px + ${gap}px) - ${gap}px)`;
    if (
      ![
        NodeType.IMAGE,
        NodeType.WEB_SCREENSHOT,
        NodeType.YOUTUBE_BOOKMARK,
        NodeType.WEB_PAGE,
        NodeType.KINDLE_BOOK,
        NodeType.YOUTUBE_VIDEO,
        NodeType.YOUTUBE_SHORT,
        NodeType.TWITTER_PROFILE,
        NodeType.AUDIO
      ].includes(itemContentType)
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
  function onClick(e: MouseEvent, item: any) {
    resolveBulkEditorInstance();
    logger.log({ at: "NodeItems onClick", item, multiSelectContext });
    const result = bulkEditStore.clickHandler(item.id);
    if (!result) appStore.resourceClickHandler(e, item.id);
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
        data-has-picture={resolveFilePreview(item)}
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
          on:click={(e) => onClick(e, item)}
        >
          <NodeThumbnail
            {item}
            {parentBgIndex}
            {arrangement}
            {isApplyCustomColor}
            {accessPoint}
            accessPointId={accessPointId ?? item.id}
            {isHideTitle}
            {visibleProps}
            on:load={(e) => {
              resizeMasonryItem(
                gridRef.querySelector(`[data-id="${item.id}"]`)
              );
            }}
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
      {#each nodes as item (item.id)}
        <NodeThumbnail
          {item}
          {parentBgIndex}
          {arrangement}
          {isDraggable}
          {accessPoint}
          accessPointId={accessPointId ?? item.id}
          {isHidePreview}
          {visibleProps}
          collectionContext={"board"}
          {isApplyCustomColor}
          on:click={(e) => onClick(e, item)}
        />
      {/each}
    </div>
    <ScrollViewBottomSpacer />
  </div>
{/if}
