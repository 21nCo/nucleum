<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import { resolveMultiSelectStore } from "$lib/client/components/flux/resourceStores/resource.store";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import {
    determineResourceType,
    resourceIdToElementId,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import Check from "$lib/client/icons/Check.svelte";
  import context from "$lib/client/stores/context.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
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
  export let isPreventDefaultContextMenu: boolean = false;
  /**
   * If true, the context menu will be shown on touch devices even if the hover is not active
   */
  export let isAlwaysShowContextMenuOnTouchDevice: boolean = false;
  $: multiSelectContext = {
    resource: determineResourceType(item.id),
    accessPoint,
    accessPointId
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);

  $: isSelected = $multiSelectStore.some(resourceInList(item.id));
</script>

<div
  class={cn("relative flex flex-col w-full resource", {
    "h-full": arrangement === Arrangement.MASONRY
  })}
  id={resourceIdToElementId("thumbnail", item.id, accessPoint, accessPointId)}
  data-id={item.id}
  draggable={isDraggable}
  use:hoverable={{
    onHover: (e) => (isHovering = e)
  }}
>
  <slot />
  {#if isSelected || $multiSelectStore.length > 0}
    <button
      class="absolute inset-x-0 top-0 w-6 h-6 gap-2 bg-bgs2 border border-brs3 rounded-full m-2 flex items-center justify-center"
      on:click|stopPropagation
    >
      {#if isSelected}
        <Check
          isChecked={true}
          isRounded={true}
          size={Size.lg}
          on:click={() => {
            $multiSelectStore = $multiSelectStore.filter((x) => x != item.id);
          }}
        />
      {:else if $multiSelectStore.length > 0}
        <Check
          isChecked={false}
          isRounded={true}
          size={Size.lg}
          on:click={() => {
            $multiSelectStore = [...$multiSelectStore, item.id];
          }}
        />
      {/if}
    </button>
  {/if}
  {#if (isHovering && accessPoint !== ResourceAccessPoint.PICKER && accessPoint !== ResourceAccessPoint.MAP && !isPreventDefaultContextMenu) || (isAlwaysShowContextMenuOnTouchDevice && $context.isTouchDevice)}
    <ResourceThumbnailContextMenu
      bind:item
      {accessPoint}
      {accessPointId}
      {accessPointContext}
      {arrangement}
      {isHidePreview}
      {isApplyCustomColor}
      on:action
    >
      <slot slot="right" name="right">
        <slot name="right" />
      </slot>
    </ResourceThumbnailContextMenu>
  {/if}
</div>
