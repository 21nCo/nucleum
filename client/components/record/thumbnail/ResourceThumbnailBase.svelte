<script lang="ts">
  import { hoverable } from "@21n/actions/hover.action";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import {
    determineResourceType,
    resourceIdToElementId,
    resourceInList,
    isSameResource
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { bulkEditStore } from "@21n/components/record/bulkedit.store";
  import Check from "@21n/icons/Check.svelte";
  import context from "@21n/stores/context.store";
  import type { IRecordId } from "@21n/types/data.type";
  import { Arrangement } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import ResourceThumbnailContextMenu from "@21n/components/record/thumbnail/ResourceThumbnailContextMenu.svelte";
  import { stringify } from "@21n/shared-utils/json.utils";

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
  let isSelected = false;
  let hasSelection = false;
  
  $: currentSelectionCount = $bulkEditStore?.length ?? 0;
  
  $: {
    currentSelectionCount;
    const state = bulkEditStore.getState();
    if (
      state.context &&
      stringify(state.context, { isPreventReplacer: true }) ===
        stringify(multiSelectContext, { isPreventReplacer: true })
    ) {
      isSelected = state.selectedIds.some(resourceInList(item.id));
      hasSelection = state.selectedIds.length > 0;
    } else {
      isSelected = false;
      hasSelection = false;
    }
  }

  function toggleSelection(shouldSelect: boolean) {
    const state = bulkEditStore.getState();
    if (
      !state.context ||
      stringify(state.context, { isPreventReplacer: true }) !==
        stringify(multiSelectContext, { isPreventReplacer: true })
    ) {
      return;
    }
    if (shouldSelect) {
      if (!state.selectedIds.some(resourceInList(item.id))) {
        bulkEditStore.select([...state.selectedIds, item.id]);
      }
      return;
    }
    if (state.selectedIds.some(resourceInList(item.id))) {
      bulkEditStore.select(
        state.selectedIds.filter((selection) => !isSameResource(selection, item.id))
      );
    }
  }
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
  {#if isSelected || hasSelection}
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
            toggleSelection(false);
          }}
        />
      {:else if hasSelection}
        <Check
          isChecked={false}
          isRounded={true}
          size={Size.lg}
          on:click={() => {
            toggleSelection(true);
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
