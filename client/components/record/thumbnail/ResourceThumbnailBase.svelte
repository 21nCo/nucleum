<script lang="ts">
  import type { Snippet } from "svelte";
  import { hoverable } from "@21n/actions/hover.action";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import {
    determineResourceType,
    resolveBulkSelectionAccessPointId,
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

  let {
    isHovering = $bindable(false),
    item: itemProp = $bindable(),
    isDraggable = false,
    accessPoint = ResourceAccessPoint.BROWSER,
    accessPointContext = undefined,
    arrangement = Arrangement.LIST,
    isHidePreview = false,
    isApplyCustomColor = false,
    accessPointId = undefined,
    isPreventDefaultContextMenu = false,
    isAlwaysShowContextMenuOnTouchDevice = false,
    children,
    right,
    onAction = undefined,
    onClick = undefined
  }: {
    isHovering?: boolean;
    item: any;
    isDraggable?: boolean;
    accessPoint?: ResourceAccessPoint;
    accessPointContext?: string | undefined;
    arrangement?: Arrangement;
    isHidePreview?: boolean;
    isApplyCustomColor?: boolean;
    accessPointId?: IRecordId | undefined;
    isPreventDefaultContextMenu?: boolean;
    isAlwaysShowContextMenuOnTouchDevice?: boolean;
    children?: Snippet;
    right?: Snippet;
    onAction?:
      | ((event: CustomEvent<{ action: string; id: string }>) => void)
      | undefined;
    onClick?: ((event: MouseEvent) => void) | undefined;
  } = $props();
  let item = $state(itemProp);
  let multiSelectContext = $derived({
    resource: determineResourceType(item.id),
    accessPoint,
    accessPointId: resolveBulkSelectionAccessPointId(
      accessPoint,
      accessPointId
    )
  });
  let isSelected = $state(false);
  let hasSelection = $state(false);
  let isContextMenuVisible = $state(false);
  let currentSelectionCount = $derived($bulkEditStore?.length ?? 0);

  $effect(() => {
    item = itemProp;
  });

  $effect(() => {
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
  });

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
  onclick={onClick}
  use:hoverable={{
    onHover: (e) => (isHovering = e)
  }}
>
  {@render children?.()}
  {#if isSelected || hasSelection}
    <button
      class="absolute inset-x-0 top-0 w-6 h-6 gap-2 bg-bgs2 border border-brs3 rounded-full m-2 flex items-center justify-center"
      onclick={(event) => event.stopPropagation()}
    >
      {#if isSelected}
        <Check
          isChecked={true}
          isRounded={true}
          size={Size.lg}
          onclick={() => {
            toggleSelection(false);
          }}
        />
      {:else if hasSelection}
        <Check
          isChecked={false}
          isRounded={true}
          size={Size.lg}
          onclick={() => {
            toggleSelection(true);
          }}
        />
      {/if}
    </button>
  {/if}
  {#if ((isHovering || isContextMenuVisible) && accessPoint !== ResourceAccessPoint.PICKER && accessPoint !== ResourceAccessPoint.MAP && !isPreventDefaultContextMenu) || (isAlwaysShowContextMenuOnTouchDevice && $context.isTouchDevice)}
    <ResourceThumbnailContextMenu
      bind:item
      bind:isPopoverVisible={isContextMenuVisible}
      {accessPoint}
      {accessPointId}
      {accessPointContext}
      {arrangement}
      {isHidePreview}
      {isApplyCustomColor}
      {onAction}
      {right}
    >
    </ResourceThumbnailContextMenu>
  {/if}
</div>
