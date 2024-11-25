<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import type {
    INodeThumb,
    NodeThumbnailVariant
  } from "$lib/client/products/memotron/node/node.type";
  import { Size } from "$lib/client/types/size.enum";
  import NodeItems from "$lib/client/products/memotron/collection/NodeItems.svelte";
  import { dropzone } from "$lib/client/actions/dragAndDrop.action";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import { createEventDispatcher } from "svelte";
  import type { ISelectValue } from "$lib/client/types/select.type";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { ICollectionView } from "../collection.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IActiveCollectionStore } from "../collection.store";
  const dispatch = createEventDispatcher();
  export let collection: IActiveCollectionStore;
  export let view: ICollectionView;
  export let subGroup: any;
  export let data: any;
  export let arrangement: NodeThumbnailVariant | undefined;
  export let density: number | undefined;
  export let isApplyCustomColor = false;
  let isCollapsed = true;
  $: _data = filterSubGroupData(subGroup.value, data);

  function filterSubGroupData(val: ISelectValue, data: INodeThumb[]) {
    if (val === "unassigned") {
      return data?.filter((node: INodeThumb) => {
        return (
          !node.properties?.find(resourceInList(view.subGroupBy)) ||
          node.properties?.find(resourceInList(view.subGroupBy))?.value ===
            "unassigned"
        );
      });
    }
    const filteredData = data?.filter((node: INodeThumb) => {
      return (
        node.properties?.find(resourceInList(view.subGroupBy))?.value === val
      );
    });
    isCollapsed = filteredData?.length > 0 ? false : true;
    return filteredData;
  }

  function handleDrop(e: any) {
    dispatch("dropItem", {
      subGroup: subGroup.value,
      ...e
    });
  }
</script>

<div
  class="flex flex-col gap-2 subgroup border border-transparent rounded-md p-1 hover:border-ccs3"
  use:dropzone={{
    duringDragoverClasses: "bg-ccs3 border-ccs1",
    itemRequirement: "resource",
    onDrop: handleDrop
  }}
>
  <button
    class="label flex justify-between gap-2 w-full p-1 rounded-md"
    on:click={() => {
      isCollapsed = !isCollapsed;
    }}
  >
    <span class="flex gap-2 items-center">
      {subGroup.label}
      <!-- <span class="badge text-b3 text-fgs2 bg-ccs2 px-2 rounded-md"
        >{data.length}</span
      > -->
      <Badge text={_data.length} {isApplyCustomColor} />
    </span>
    <Button icon={!isCollapsed ? "chevdown" : "chevup"} size={Size.sm} />
  </button>
  {#if !isCollapsed}
    <div class="w-full flex flex-col gap-4">
      <NodeItems
        nodes={_data}
        {arrangement}
        {isApplyCustomColor}
        isHidePreview={view.isHideThumbnailPreview}
        isHideTitle={view.isHideThumbnailTitle}
        {density}
        isDraggable={true}
        accessPoint={ResourceAccessPoint.COLLECTION}
        accessPointId={collection?.id}
        visibleProps={$collection?.properties?.filter((x) =>
          view.properties?.some(resourceInList(x))
        )}
      />
    </div>
  {/if}
</div>
