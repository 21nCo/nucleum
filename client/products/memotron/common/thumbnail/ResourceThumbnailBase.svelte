<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import {
    determineResourceType,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import Check from "$lib/client/icons/Check.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import ResourceThumbnailContextMenu from "./ResourceThumbnailContextMenu.svelte";

  export let isHovering = false;
  export let item: any;
  export let isDraggable: boolean = false;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointContext: string | undefined = undefined;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let isHidePreview: boolean = false;
  export let isApplyCustomColor: boolean = false;
  export let accessPointId: IRecordId | undefined = undefined;
  $: multiSelectContext = {
    resource: determineResourceType(item.id),
    accessPoint,
    accessPointId
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);

  $: isSelected = $multiSelectStore.some(resourceInList(item.id));
</script>

<!-- TODO - position of right click context menu at cursor instead of bottom of the thumbnail -->
<!-- <ContextMenuAction {contextMenu}> -->
<div
  class={cn("relative flex flex-col w-full resource", {
    "h-full": arrangement === Arrangement.MASONRY
  })}
  id={`thumbnail-${item.id.toString()}-${accessPoint}-${accessPointId ?? "none"}`}
  draggable={isDraggable}
  use:hoverable={{
    onHover: (e) => (isHovering = e)
  }}
>
  <slot />
  {#if isSelected || $multiSelectStore.length > 0}
    <button
      class="absolute top-0 left-0 flex gap-2 bg-bgs2 border border-brs3 rounded-full m-3 p-0.5"
      on:click|stopPropagation
    >
      {#if isSelected}
        <Check
          isChecked={true}
          isRounded={true}
          on:click={() => {
            $multiSelectStore = $multiSelectStore.filter((x) => x != item.id);
          }}
        />
      {:else if $multiSelectStore.length > 0}
        <Check
          isChecked={false}
          isRounded={true}
          on:click={() => {
            $multiSelectStore = [...$multiSelectStore, item.id];
          }}
        />
      {/if}
    </button>
  {/if}
  {#if isHovering}
    <button
      class={cn("absolute top-0 right-0 flex gap-2 p--1", {
        "border rounded-md": arrangement !== Arrangement.LIST,
        "m-3": arrangement !== Arrangement.LIST && !isHidePreview,
        "m-1": arrangement !== Arrangement.LIST && isHidePreview,
        "bg-ccs4 border-ccs2":
          arrangement != Arrangement.LIST && isApplyCustomColor,
        "bg-bgs2 border-brs3":
          arrangement != Arrangement.LIST && !isApplyCustomColor,
        "h-full flex-col justify-center": arrangement === Arrangement.LIST
      })}
      on:click|stopPropagation
    >
      <div class="flex">
        <slot name="right" />
        <div
          class={cn({
            "mx-2 border rounded-md": arrangement === Arrangement.LIST,
            "bg-ccs4 border-ccs2":
              arrangement === Arrangement.LIST && isApplyCustomColor,
            "bg-bgs2 border-brs3":
              arrangement === Arrangement.LIST && !isApplyCustomColor
          })}
        >
          <ResourceThumbnailContextMenu
            bind:item
            {accessPoint}
            {accessPointId}
            {accessPointContext}
            on:action
          />
        </div>
      </div>
    </button>
  {/if}
</div>
<!-- </ContextMenuAction> -->
