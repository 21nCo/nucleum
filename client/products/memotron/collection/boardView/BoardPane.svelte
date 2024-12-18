<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import type { ICollectionView } from "$lib/client/products/memotron/collection/collection.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import SubGroup from "./SubGroup.svelte";
  import {
    calculateGroupingCounts,
    filterNodesByPropertyValue,
    resolveOptionsForGrouping
  } from "../collection.utils";
  import NodeItems from "../NodeItems.svelte";
  import TabCountBadge from "../counts/TabCountBadge.svelte";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { createEventDispatcher } from "svelte";
  import { dropzone } from "$lib/client/actions/dragAndDrop.action";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IActiveCollectionStore } from "../collection.store";
  const dispatch = createEventDispatcher();

  export let collection: IActiveCollectionStore;
  export let view: ICollectionView;
  export let group: any;
  export let data: any;
  export let isBoardOverflow = false;
  let dev_isRenderColors = true;

  $: boardCounts = calculateGroupingCounts(data, view.subGroupBy);
  $: subGroups = resolveOptionsForGrouping(
    view.subGroupBy,
    $collection.properties,
    boardCounts,
    { isBoardView: true }
  );
  $: _groupData = filterNodesByPropertyValue(data, view.groupBy, group.value);

  function handleDropForSubGroup(e: any) {
    dispatch("dropItem", {
      subGroup: e.detail.subGroup,
      item: e.detail.id,
      group: group.value
    });
  }

  function handleDrop(e: any) {
    if (!e.id) return;
    dispatch("dropItem", {
      item: e.id,
      group: group.value
    });
  }
</script>

<CustomColorPropagator color={group.color}>
  <div
    class={cn(
      "board relative h-full min-w-[24rem] dp:w-[28rem] 2k:w-[30rem] flex flex-col gap-2 border border-brs3 px-4 mb-2 rounded-md",
      {
        "overflow-y-auto": isBoardOverflow,
        "border-ccs3 bg-ccs5": group.color && dev_isRenderColors,
        "border-brs3 bg-bgs1": !group.color || !dev_isRenderColors
      }
    )}
    style="height: calc(100vh - 120px);"
    use:dropzone={{
      duringDragoverClasses: "!border-ccs1",
      itemRequirement: "resource",
      onDrop: handleDrop,
      enabled: subGroups.length < 1
    }}
  >
    <div
      class={cn(
        "board-title sticky top-0 z-1 flex items-center w-full justify-between py-4",
        {
          "bg-bgs1": !dev_isRenderColors,
          "bg-ccs5": dev_isRenderColors
        }
      )}
    >
      <div class="flex items-center gap-2">
        <Text content={group.label} style={TextStyle.PANEL_HEADING_SMALL} />
        <TabCountBadge
          count={_groupData?.length || 0}
          isActive={false}
          hasCustomColor={!!group.color && dev_isRenderColors}
        />
      </div>
    </div>
    <div class="grow w-full flex flex-col gap-2">
      {#if isValidArrayWithData(subGroups)}
        {#each subGroups as subGroup}
          <SubGroup
            {subGroup}
            {view}
            {collection}
            data={_groupData}
            arrangement={view.arrangement}
            density={1}
            isApplyCustomColor={group.color}
            on:dropItem={handleDropForSubGroup}
          />
        {/each}
      {:else if isValidArrayWithData(_groupData)}
        <NodeItems
          nodes={_groupData}
          arrangement={view.arrangement}
          isHidePreview={view.isHideThumbnailPreview}
          isHideTitle={view.isHideThumbnailTitle}
          density={1}
          isDraggable={true}
          accessPoint={ResourceAccessPoint.COLLECTION}
          accessPointId={collection.id}
          isApplyCustomColor={dev_isRenderColors && group.color}
          visibleProps={$collection.properties?.filter((x) =>
            view.properties?.some(resourceInList(x))
          )}
        />
      {:else}
        <EmptyStatusView size={Size.sm} subText="No items meet this criteria" />
      {/if}
    </div>
  </div>
</CustomColorPropagator>
